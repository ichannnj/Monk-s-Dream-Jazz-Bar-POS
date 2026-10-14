import { Module, Global } from '@nestjs/common';
import { DatabaseModule } from './database/database.module.js';
import { AuthModule } from './auth/auth.module.js';
import { BootstrapModule } from './bootstrap/bootstrap.module.js';

@Global()
@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    BootstrapModule,
  ],
})
export class AppModule {}
