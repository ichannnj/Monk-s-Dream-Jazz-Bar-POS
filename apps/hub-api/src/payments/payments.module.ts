import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service.js';
import { PaymentsController } from './payments.controller.js';
import { HardwareModule } from '../hardware/hardware.module.js';
import { TablesModule } from '../tables/tables.module.js';

@Module({
  imports: [HardwareModule, TablesModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
