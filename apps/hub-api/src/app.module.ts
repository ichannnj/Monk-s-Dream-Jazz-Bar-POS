import { Module, Global } from '@nestjs/common';
import { DatabaseModule } from './database/database.module.js';
import { RealtimeModule } from './realtime/realtime.module.js';
import { HardwareModule } from './hardware/hardware.module.js';
import { AuthModule } from './auth/auth.module.js';
import { TablesModule } from './tables/tables.module.js';
import { MenuModule } from './menu/menu.module.js';
import { OrdersModule } from './orders/orders.module.js';
import { TicketsModule } from './tickets/tickets.module.js';
import { PaymentsModule } from './payments/payments.module.js';
import { BootstrapModule } from './bootstrap/bootstrap.module.js';
import { HlcProvider } from './common/hlc.provider.js';

@Global()
@Module({
  imports: [
    DatabaseModule,
    RealtimeModule,
    HardwareModule,
    AuthModule,
    TablesModule,
    MenuModule,
    OrdersModule,
    TicketsModule,
    PaymentsModule,
    BootstrapModule,
  ],
  providers: [HlcProvider],
  exports: [HlcProvider],
})
export class AppModule {}
