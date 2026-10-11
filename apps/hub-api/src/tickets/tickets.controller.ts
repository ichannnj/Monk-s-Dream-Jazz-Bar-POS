import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { TicketsService } from './tickets.service.js';
import { UpdateTicketStatusSchema } from '@monks/shared';

@Controller('api/v1/tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  async getTickets(
    @Query('station') station?: string,
    @Query('status') status?: string
  ) {
    return await this.ticketsService.getTickets(station, status);
  }

  @Post(':id/status')
  async updateStatus(@Param('id') id: string, @Body() body: any) {
    const parsed = UpdateTicketStatusSchema.safeParse(body);
    if (!parsed.success) {
      throw new HttpException(parsed.error.format(), HttpStatus.BAD_REQUEST);
    }
    return await this.ticketsService.updateTicketStatus(
      id,
      parsed.data.status,
      parsed.data.updatedBy
    );
  }
}
