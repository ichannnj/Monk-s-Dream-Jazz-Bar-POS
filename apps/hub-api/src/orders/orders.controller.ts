import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Headers,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { OrdersService } from './orders.service.js';
import { CreateOrderSchema, VoidOrderItemSchema } from '@monks/shared';
import * as crypto from 'node:crypto';

@Controller('api/v1/orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  async createOrder(
    @Body() body: any,
    @Headers('idempotency-key') idempotencyKey?: string
  ) {
    const key = idempotencyKey || crypto.randomUUID();
    const parsed = CreateOrderSchema.safeParse(body);
    if (!parsed.success) {
      throw new HttpException(parsed.error.format(), HttpStatus.BAD_REQUEST);
    }
    return await this.ordersService.createOrder(key, parsed.data);
  }

  @Get()
  async getOrders() {
    return await this.ordersService.getActiveOrders();
  }

  @Get(':id')
  async getOrder(@Param('id') id: string) {
    const order = await this.ordersService.getOrder(id);
    if (!order) {
      throw new HttpException('Order not found', HttpStatus.NOT_FOUND);
    }
    return order;
  }

  @Post(':id/void-item')
  async voidItem(@Param('id') id: string, @Body() body: any) {
    const parsed = VoidOrderItemSchema.safeParse(body);
    if (!parsed.success) {
      throw new HttpException(parsed.error.format(), HttpStatus.BAD_REQUEST);
    }
    return await this.ordersService.voidOrderItem(id, parsed.data);
  }
}
