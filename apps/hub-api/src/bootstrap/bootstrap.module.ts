import { Module } from '@nestjs/common';
import { BootstrapController } from './bootstrap.controller.js';
import { TablesModule } from '../tables/tables.module.js';
import { MenuModule } from '../menu/menu.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { OrdersModule } from '../orders/orders.module.js';
import { TicketsModule } from '../tickets/tickets.module.js';

@Module({
  imports: [TablesModule, MenuModule, AuthModule, OrdersModule, TicketsModule],
  controllers: [BootstrapController],
})
export class BootstrapModule {}
