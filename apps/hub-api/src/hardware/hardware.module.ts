import { Module } from '@nestjs/common';
import { HardwareService } from './hardware.service.js';
import { HardwareController } from './hardware.controller.js';

@Module({
  controllers: [HardwareController],
  providers: [HardwareService],
  exports: [HardwareService],
})
export class HardwareModule {}
