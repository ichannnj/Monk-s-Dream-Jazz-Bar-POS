import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PaymentsService } from './payments.service.js';
import { RecordPaymentSchema } from '@monks/shared';

@Controller('api/v1/tabs')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get(':id/bill')
  async getBillPreview(@Param('id') id: string) {
    return await this.paymentsService.getBillPreview(id);
  }

  @Post(':id/payments')
  async recordPayment(@Param('id') id: string, @Body() body: any) {
    const parsed = RecordPaymentSchema.safeParse(body);
    if (!parsed.success) {
      throw new HttpException(parsed.error.format(), HttpStatus.BAD_REQUEST);
    }
    return await this.paymentsService.processPayment(id, parsed.data);
  }
}
