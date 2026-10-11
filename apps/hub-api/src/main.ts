import Fastify from 'fastify';
import cors from '@fastify/cors';
import { Server as SocketIOServer } from 'socket.io';
import { 
  CreateOrderSchema, 
  UpdateTicketStatusSchema, 
  RecordPaymentSchema, 
  HybridLogicalClock,
  CorkageRate,
  ChatMessageSchema
} from '@monks/shared';
import { MockPrinter, UsbEscPosPrinter, type IPrinterService } from '@monks/printing';
import * as crypto from 'node:crypto';

const PORT = parseInt(process.env.PORT || '3000', 10);
const HUB_ID = process.env.HUB_ID || 'hub-01';
const hlc = new HybridLogicalClock(HUB_ID);

// In-memory runtime state (persisted to Postgres in production)
interface InMemoryDb {
  orders: Map<string, any>;
  orderDedupe: Set<string>; // command_id
  tickets: Map<string, any>;
  eventLog: Array<{ seq: number; type: string; room: string; payload: any }>;
  currentSeq: number;
}

const db: InMemoryDb = {
  orders: new Map(),
  orderDedupe: new Set(),
  tickets: new Map(),
  eventLog: [],
  currentSeq: 0,
};

// Select printer: USB if device exists or fallback to Mock
const printer: IPrinterService = process.env.PRINTER_DEVICE
  ? new UsbEscPosPrinter(process.env.PRINTER_DEVICE)
  : new MockPrinter();

const fastify = Fastify({ logger: true });

// Attach CORS
await fastify.register(cors, {
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
});

// Attach Socket.IO
const io = new SocketIOServer(fastify.server, {
  cors: { origin: '*' },
});

io.on('connection', (socket) => {
  fastify.log.info({ socketId: socket.id }, 'Client connected to WebSocket');

  socket.on('join', (room: string) => {
    socket.join(room);
    fastify.log.info({ socketId: socket.id, room }, 'Joined room');
  });

  // Replay missed events on reconnection
  socket.on('sync.resume', ({ lastSeq, rooms }: { lastSeq: number; rooms: string[] }) => {
    const missed = db.eventLog.filter(e => e.seq > lastSeq && rooms.includes(e.room));
    socket.emit('sync.replay', missed);
  });

  // Team Chat message
  socket.on('chat.send', (payload: any) => {
    const parse = ChatMessageSchema.safeParse(payload);
    if (!parse.success) return;
    const msg = { ...parse.data, id: crypto.randomUUID(), timestamp: new Date().toISOString() };
    io.to(`chat:${parse.data.channel}`).to('chat:all').emit('chat.message', msg);
  });
});

function broadcastEvent(type: string, room: string, payload: any) {
  db.currentSeq++;
  const event = { seq: db.currentSeq, type, room, payload };
  db.eventLog.push(event);
  io.to(room).emit(type, event);
  return db.currentSeq;
}

// ---------------- REST API ROUTES ----------------

// Health
fastify.get('/health/live', async () => ({ status: 'ok', time: new Date().toISOString() }));
fastify.get('/health/ready', async () => ({ status: 'ready', hubId: HUB_ID, currentSeq: db.currentSeq }));

// Bootstrap state for tablets
fastify.get('/api/v1/bootstrap', async () => {
  return {
    hubId: HUB_ID,
    currentSeq: db.currentSeq,
    corkageRate: CorkageRate,
    openOrders: Array.from(db.orders.values()),
    openTickets: Array.from(db.tickets.values()),
  };
});

// 1. Submit Order (HTTP REST + Idempotency-Key)
fastify.post('/api/v1/orders', async (request, reply) => {
  const idempotencyKey = (request.headers['idempotency-key'] as string) || crypto.randomUUID();
  
  if (db.orderDedupe.has(idempotencyKey)) {
    return reply.status(200).send({ status: 'duplicate_ignored', idempotencyKey });
  }

  const parsed = CreateOrderSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ error: parsed.error.format() });
  }

  const orderData = parsed.data;
  const orderId = crypto.randomUUID();
  const timestampHlc = hlc.now();

  let subtotal = 0;
  let corkageAmount = 0;

  // Process items and station fan-out
  const stationItemsMap: Record<string, any[]> = { cafe: [], bar: [], food: [] };

  const processedItems = orderData.items.map(item => {
    const itemTotal = item.price * item.quantity;
    subtotal += itemTotal;

    let itemCorkage = 0;
    if (item.isCorkageItem) {
      itemCorkage = Math.round(itemTotal * CorkageRate);
      corkageAmount += itemCorkage;
    }

    const orderItem = {
      id: crypto.randomUUID(),
      ...item,
      total: itemTotal,
      corkage: itemCorkage,
    };

    // Fan-out to designated station queues
    for (const st of item.stations) {
      if (stationItemsMap[st]) {
        stationItemsMap[st]!.push(orderItem);
      }
    }

    return orderItem;
  });

  const order = {
    id: orderId,
    commandId: idempotencyKey,
    tableNumber: orderData.tableNumber,
    tabName: orderData.tabName || 'Main Tab',
    waiterId: orderData.waiterId,
    items: processedItems,
    subtotal,
    corkageAmount,
    totalAmount: subtotal + corkageAmount,
    status: 'OPEN',
    createdAt: new Date().toISOString(),
    hlc: timestampHlc,
  };

  db.orders.set(orderId, order);
  db.orderDedupe.add(idempotencyKey);

  // Generate station tickets and broadcast to KDS
  for (const [st, items] of Object.entries(stationItemsMap)) {
    if (items.length === 0) continue;

    const ticketId = crypto.randomUUID();
    const ticket = {
      id: ticketId,
      orderId,
      station: st,
      tableNumber: order.tableNumber,
      items,
      status: 'NEW',
      createdAt: new Date().toISOString(),
    };

    db.tickets.set(ticketId, ticket);
    broadcastEvent('ticket.created', `station:${st}`, ticket);
  }

  // Update table visual status on floor
  broadcastEvent('floor.table_updated', 'floor', {
    tableNumber: order.tableNumber,
    status: 'PREPARING',
  });

  return reply.status(201).send({
    orderId,
    tableNumber: order.tableNumber,
    totalAmount: order.totalAmount,
    hlc: timestampHlc,
  });
});

// 2. KDS Status Update (HTTP REST)
fastify.post('/api/v1/tickets/:id/status', async (request, reply) => {
  const { id } = request.params as { id: string };
  const parsed = UpdateTicketStatusSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ error: parsed.error.format() });
  }

  const ticket = db.tickets.get(id);
  if (!ticket) {
    return reply.status(404).send({ error: 'Ticket not found' });
  }

  ticket.status = parsed.data.status;
  ticket.updatedAt = new Date().toISOString();

  // Broadcast to KDS and floor
  broadcastEvent('ticket.updated', `station:${ticket.station}`, ticket);

  if (ticket.status === 'READY') {
    broadcastEvent('floor.table_updated', 'floor', {
      tableNumber: ticket.tableNumber,
      status: 'READY',
      ticketId: ticket.id,
    });
  }

  return reply.status(200).send({ ticketId: ticket.id, status: ticket.status });
});

// 3. Payments & Thermal Receipt Printing (HTTP REST)
fastify.post('/api/v1/tabs/:id/payments', async (request, reply) => {
  const { id } = request.params as { id: string };
  const parsed = RecordPaymentSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ error: parsed.error.format() });
  }

  const order = db.orders.get(id);
  if (!order) {
    return reply.status(404).send({ error: 'Tab/Order not found' });
  }

  const payment = parsed.data;
  const change = Math.max(0, payment.tenderedAmount - order.totalAmount);
  order.status = 'CLOSED';

  // Queue physical print job for USB receipt printer
  const receiptPayload = {
    receiptNumber: `REC-${Date.now().toString().slice(-6)}`,
    tableNumber: order.tableNumber,
    tabName: order.tabName,
    waiterName: 'Staff',
    items: order.items,
    subtotal: order.subtotal,
    corkageFee: order.corkageAmount,
    total: order.totalAmount,
    tendered: payment.tenderedAmount,
    change,
    paymentMethod: payment.method,
    timestamp: new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' }),
  };

  try {
    await printer.printReceipt(receiptPayload);
  } catch (err) {
    fastify.log.error(err, 'Printer output failed, digital receipt still issued');
  }

  broadcastEvent('floor.table_updated', 'floor', {
    tableNumber: order.tableNumber,
    status: 'EMPTY',
  });

  return reply.status(200).send({
    status: 'PAID',
    receipt: receiptPayload,
  });
});

// Start Server
try {
  await fastify.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`[Hub API] Server running on http://0.0.0.0:${PORT}`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
