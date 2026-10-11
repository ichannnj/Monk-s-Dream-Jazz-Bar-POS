import { Controller, Post, Get, Body, HttpException, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { PinLoginSchema } from '@monks/shared';

@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('pin')
  async loginWithPin(@Body() body: any) {
    const parsed = PinLoginSchema.safeParse(body);
    if (!parsed.success) {
      throw new HttpException(parsed.error.format(), HttpStatus.BAD_REQUEST);
    }
    return await this.authService.authenticatePin(parsed.data.pin);
  }

  @Get('users')
  async getStaff() {
    return await this.authService.getStaffList();
  }
}
