import { Controller, Get, Post, Body, Request, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { LogInventoryDto } from './audit.dto';

@ApiTags('Audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Roles('admin')
  @Get()
  @ApiOperation({ summary: 'Get all audit logs' })
  getLogs() {
    return this.auditService.getLogs();
  }

  @Roles('admin', 'storekeeper')
  @Post('inventory')
  @ApiOperation({ summary: 'Log inventory session results' })
  logInventory(@Request() req: any, @Body() dto: LogInventoryDto) {
    return this.auditService.logInventory(req.user.id, dto);
  }
}
