import { Controller, Sse, Query } from '@nestjs/common';
import { Observable } from 'rxjs';
import { RealtimeService, SseMessageEvent } from './realtime.service.js';

@Controller('api/v1/operations')
export class OperationsSseController {
  constructor(private readonly realtimeService: RealtimeService) {}

  /**
   * Server-Sent Events (SSE) stream endpoint for live POS & KDS operations:
   * - GET /api/v1/operations/stream
   * - GET /api/v1/operations/stream?station=barista
   * - GET /api/v1/operations/stream?station=kitchen
   * - GET /api/v1/operations/stream?station=bartender
   */
  @Sse('stream')
  streamOperations(
    @Query('station') station?: string,
    @Query('room') room?: string
  ): Observable<SseMessageEvent> {
    return this.realtimeService.getOperationsStream(station, room);
  }
}
