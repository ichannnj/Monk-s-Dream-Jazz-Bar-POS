import { Controller, Get, Patch, Param, Body, ParseIntPipe } from '@nestjs/common';
import { TablesService } from './tables.service.js';

@Controller('api/v1/tables')
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  @Get()
  async getTables() {
    return await this.tablesService.getAllTables();
  }

  @Get(':tableNumber')
  async getTable(@Param('tableNumber', ParseIntPipe) tableNumber: number) {
    return await this.tablesService.getTable(tableNumber);
  }

  @Patch(':tableNumber/status')
  async updateStatus(
    @Param('tableNumber', ParseIntPipe) tableNumber: number,
    @Body() body: { status: string; currentOrderId?: string | null }
  ) {
    return await this.tablesService.updateTableStatus(
      tableNumber,
      body.status,
      body.currentOrderId
    );
  }
}
