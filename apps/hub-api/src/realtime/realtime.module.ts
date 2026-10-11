import { Module, Global } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway.js';
import { RealtimeService } from './realtime.service.js';
import { OperationsSseController } from './operations-sse.controller.js';

@Global()
@Module({
  controllers: [OperationsSseController],
  providers: [RealtimeGateway, RealtimeService],
  exports: [RealtimeService],
})
export class RealtimeModule {}
