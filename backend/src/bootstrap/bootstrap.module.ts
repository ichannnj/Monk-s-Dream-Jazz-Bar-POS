import { Module } from '@nestjs/common';
import { BootstrapController } from './bootstrap.controller.js';

@Module({
  controllers: [BootstrapController],
})
export class BootstrapModule {}
