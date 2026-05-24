import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import type { Response } from 'express';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Roles('admin', 'storekeeper')
  @Get('excel')
  exportEquipmentExcel(@Res() res: Response) {
    return this.reportsService.exportEquipmentExcel(res);
  }

  @Roles('admin', 'storekeeper')
  @Get('dashboard')
  getDashboardStats() {
    return this.reportsService.getDashboardStats();
  }
}
