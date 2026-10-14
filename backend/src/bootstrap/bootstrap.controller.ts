import { Controller, Get } from '@nestjs/common';
import { HUB_ID } from '../common/constants.js';

@Controller()
export class BootstrapController {
  @Get('health/live')
  healthLive() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('health/ready')
  healthReady() {
    return {
      status: 'ready',
      hubId: HUB_ID,
      system: "Monk's Dream Jazz Bar Backend",
      timestamp: new Date().toISOString(),
    };
  }

  @Get('api/v1/health')
  healthApi() {
    return {
      status: 'healthy',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };
  }
}
