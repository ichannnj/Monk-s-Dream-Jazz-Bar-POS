import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { RealtimeService } from './realtime.service.js';
import { ChatMessageSchema } from '@monks/shared';
import * as crypto from 'node:crypto';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class RealtimeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(private readonly realtimeService: RealtimeService) {}

  afterInit(server: Server) {
    this.realtimeService.setServer(server);
    this.logger.log('WebSocket Gateway initialized successfully.');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join')
  handleJoin(@MessageBody() room: string, @ConnectedSocket() client: Socket) {
    client.join(room);
    this.logger.log(`Client [${client.id}] joined room: [${room}]`);
    return { status: 'joined', room };
  }

  @SubscribeMessage('sync.resume')
  handleSyncResume(
    @MessageBody() data: { lastSeq: number; rooms: string[] },
    @ConnectedSocket() client: Socket
  ) {
    const missed = this.realtimeService.getMissedEvents(data.lastSeq, data.rooms);
    client.emit('sync.replay', missed);
    this.logger.log(
      `Replayed ${missed.length} missed events to client [${client.id}]`
    );
  }

  @SubscribeMessage('chat.send')
  async handleChatSend(
    @MessageBody() payload: any,
    @ConnectedSocket() client: Socket
  ) {
    const parsed = ChatMessageSchema.safeParse(payload);
    if (!parsed.success) {
      client.emit('chat.error', { error: parsed.error.format() });
      return;
    }

    const message = {
      ...parsed.data,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };

    // Broadcast to specific channel and all-channel room
    await this.realtimeService.broadcast(
      'chat.message',
      `chat:${parsed.data.channel}`,
      message
    );
    if (parsed.data.channel !== 'all') {
      await this.realtimeService.broadcast('chat.message', 'chat:all', message);
    }
  }
}
