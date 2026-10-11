/**
 * Typed REST API Client for operations and writes
 * Commands are POSTed to Fastify/NestJS with idempotency keys.
 * State updates are subsequently pushed down via SSE (operations) and WebSockets (chat).
 */

export interface CreateOrderPayload {
  tableNumber: number;
  tabName?: string;
  waiterId: string;
  items: {
    menuItemId: string;
    name: string;
    price: number;
    quantity: number;
    notes?: string;
    stations: ('bar' | 'cafe' | 'food')[];
    isCorkageItem?: boolean;
  }[];
}

export interface RecordPaymentPayload {
  tabId: string;
  tenderedAmount: number;
  totalDue: number;
  method: 'CASH' | 'CARD' | 'E_WALLET';
  referenceNumber?: string;
  cashierId: string;
}

export class PosApiClient {
  private baseUrl: string;

  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  setBaseUrl(url: string) {
    this.baseUrl = url;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'Idempotency-Key': `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      ...(options.headers || {}),
    };

    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`API Error [${res.status}] ${res.statusText}: ${errBody}`);
    }
    return res.json();
  }

  // --- Orders & Tabs ---
  async createOrder(payload: CreateOrderPayload) {
    return this.request('/api/v1/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getActiveOrders() {
    return this.request('/api/v1/orders', { method: 'GET' });
  }

  async voidOrderItem(orderId: string, payload: { orderItemId: string; reason: string; approverPin: string; requesterId: string }) {
    return this.request(`/api/v1/orders/${orderId}/void-item`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // --- KDS Station Tickets ---
  async getTickets(station?: string) {
    const q = station ? `?station=${station}` : '';
    return this.request(`/api/v1/tickets${q}`, { method: 'GET' });
  }

  async updateTicketStatus(ticketId: string, status: 'NEW' | 'PREPARING' | 'READY' | 'SERVED' | 'CANCELLED', updatedBy: string) {
    return this.request(`/api/v1/tickets/${ticketId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, updatedBy }),
    });
  }

  // --- Tables & Floor Plan ---
  async getTables() {
    return this.request('/api/v1/tables', { method: 'GET' });
  }

  async updateTableStatus(tableNumber: number, status: string) {
    return this.request(`/api/v1/tables/${tableNumber}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  // --- Payments & Cashier ---
  async recordPayment(payload: RecordPaymentPayload) {
    return this.request('/api/v1/payments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // --- Menu & 86 Item Availability ---
  async getMenu() {
    return this.request('/api/v1/menu', { method: 'GET' });
  }

  async setItemAvailability(itemId: string, isAvailable: boolean) {
    return this.request(`/api/v1/menu/${itemId}/availability`, {
      method: 'PATCH',
      body: JSON.stringify({ isAvailable }),
    });
  }

  // --- PC Counter Hardware (Admin/Cashier) ---
  async kickCashDrawer(pin: string, userId: string, reason = 'Manual Open / Change') {
    return this.request('/api/v1/hardware/kick-drawer', {
      method: 'POST',
      body: JSON.stringify({ pin, userId, reason }),
    });
  }

  async reprintReceipt(orderId: string, reason: string, requestedBy: string, approverPin?: string) {
    return this.request('/api/v1/hardware/reprint', {
      method: 'POST',
      body: JSON.stringify({ orderId, reason, requestedBy, approverPin }),
    });
  }
}

export const posApi = new PosApiClient();
