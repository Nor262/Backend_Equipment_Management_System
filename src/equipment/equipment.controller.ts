import { Controller, Get, Post, Body, Param, Put, Patch, Delete, UseGuards, Request, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { EquipmentService } from './equipment.service';
import { CreateEquipmentDto, UpdateEquipmentDto } from './equipment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Equipment')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('equipment')
export class EquipmentController {
  constructor(private readonly equipmentService: EquipmentService) {}

  @Roles('admin', 'storekeeper')
  @Post()
  create(@Body() createEquipmentDto: CreateEquipmentDto) {
    return this.equipmentService.create(createEquipmentDto);
  }

  @Get()
  findAll() {
    return this.equipmentService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.equipmentService.findOne(+id);
  }

  @Roles('admin', 'storekeeper')
  @Put(':id')
  update(@Param('id') id: string, @Body() updateEquipmentDto: Partial<UpdateEquipmentDto>) {
    return this.equipmentService.update(+id, updateEquipmentDto);
  }

  @Roles('admin')
  @Delete(':id')
  remove(@Request() req: any, @Param('id') id: string) {
    return this.equipmentService.remove(+id, req.user.id);
  }

  @Get(':id/availability')
  getAvailability(@Param('id') id: string) {
    return this.equipmentService.getAvailability(+id);
  }

  @Roles('admin', 'storekeeper')
  @Patch(':id/resolve-maintenance')
  resolveMaintenance(@Param('id') id: string) {
    return this.equipmentService.resolveMaintenance(+id);
  }

  @Roles('admin', 'storekeeper')
  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  importBulkExcel(@Request() req: any, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    return this.equipmentService.importBulkExcel(file.buffer, req.user.id);
  }
}
