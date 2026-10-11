import { Controller, Get, Patch, Param, Body } from '@nestjs/common';
import { MenuService } from './menu.service.js';

@Controller('api/v1/menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Get()
  async getMenu() {
    return await this.menuService.getMenuItems();
  }

  @Patch(':id/availability')
  async toggleAvailability(
    @Param('id') id: string,
    @Body() body: { isAvailable: boolean }
  ) {
    return await this.menuService.setItemAvailability(id, body.isAvailable);
  }
}
