import { Controller, Get } from '@nestjs/common';
import { HUB_ID } from '../common/constants.js';
import { CorkageRate } from '@monks/shared';
import { TablesService } from '../tables/tables.service.js';
import { MenuService } from '../menu/menu.service.js';
import { AuthService } from '../auth/auth.service.js';
import { OrdersService } from '../orders/orders.service.js';
import { TicketsService } from '../tickets/tickets.service.js';
import { RealtimeService } from '../realtime/realtime.service.js';

@Controller()
export class BootstrapController {
  constructor(
    private readonly tablesService: TablesService,
    private readonly menuService: MenuService,
    private readonly authService: AuthService,
    private readonly ordersService: OrdersService,
    private readonly ticketsService: TicketsService,
    private readonly realtimeService: RealtimeService
  ) {}

  @Get('health/live')
  healthLive() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('health/ready')
  healthReady() {
    return {
      status: 'ready',
      hubId: HUB_ID,
      currentSeq: this.realtimeService.getCurrentSeq(),
    };
  }

  @Get('api/v1/bootstrap')
  async getBootstrap() {
    const [tables, menu, staff, openOrders, openTickets] = await Promise.all([
      this.tablesService.getAllTables(),
      this.menuService.getMenuItems(),
      this.authService.getStaffList(),
      this.ordersService.getActiveOrders(),
      this.ticketsService.getTickets(),
    ]);

    return {
      hubId: HUB_ID,
      currentSeq: this.realtimeService.getCurrentSeq(),
      corkageRate: CorkageRate,
      tables,
      menu,
      staff,
      openOrders,
      openTickets,
    };
  }
}
