import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEquipmentDto, UpdateEquipmentDto } from './equipment.dto';
import * as QRCode from 'qrcode';
import { AuditService } from '../audit/audit.service';
import * as ExcelJS from 'exceljs';

@Injectable()
export class EquipmentService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService
  ) {}

  async create(data: CreateEquipmentDto) {
    // Convert date string if present
    const purchaseDate = data.purchase_date ? new Date(data.purchase_date) : undefined;
    const { purchase_date, ...restData } = data;

    return this.prisma.equipment.create({
      data: {
        ...restData,
        purchase_date: purchaseDate,
        qr_code_data: data.serial_number,
      },
    });
  }

  async findAll() {
    return this.prisma.equipment.findMany({
      include: { category: true, location: true },
    });
  }

  async findOne(id: number) {
    const equipment = await this.prisma.equipment.findUnique({
      where: { id },
      include: { category: true, location: true },
    });
    if (!equipment) throw new NotFoundException('Equipment not found');
    return equipment;
  }

  private extractSerial(qrData: string): string {
    if (!qrData) return '';
    let data = qrData.trim();
    try {
      const parsed = JSON.parse(data);
      if (parsed && typeof parsed === 'object') {
        if (parsed.serial) {
          data = String(parsed.serial).trim();
        }
      }
    } catch (e) {
      // not JSON
    }
    if (data.toUpperCase().startsWith('QR-')) {
      data = data.substring(3);
    }
    return data;
  }

  async verifyEquipment(qrData: string) {
    const extracted = this.extractSerial(qrData);
    let equipment = await this.prisma.equipment.findUnique({
      where: { serial_number: extracted },
      include: { category: true, location: true },
    });

    if (!equipment) {
      equipment = await this.prisma.equipment.findFirst({
        where: { qr_code_data: qrData },
        include: { category: true, location: true },
      });
    }

    if (!equipment) throw new NotFoundException('Equipment not found with this QR data');

    // Find active or approved transaction for this equipment
    const activeTransaction = await this.prisma.transaction.findFirst({
      where: {
        equipment_id: equipment.id,
        status: { in: ['approved', 'active'] },
      },
      orderBy: { request_date: 'desc' },
    });

    return {
      equipment_id: equipment.id,
      name: equipment.name,
      serial_number: equipment.serial_number,
      status: equipment.status,
      qr_code_data: equipment.qr_code_data,
      transaction_id: activeTransaction?.id || null,
      transaction_status: activeTransaction?.status || null,
      category: equipment.category,
      location: equipment.location,
    };
  }


  async update(id: number, data: Partial<UpdateEquipmentDto>) {
    const purchaseDate = data.purchase_date ? new Date(data.purchase_date) : undefined;
    const { purchase_date, ...restData } = data;

    return this.prisma.equipment.update({
      where: { id },
      data: {
        ...restData,
        ...(purchaseDate && { purchase_date: purchaseDate }),
      },
    });
  }

  async remove(id: number, adminId: number) {
    const equipment = await this.prisma.equipment.findUnique({ where: { id } });
    if (!equipment) throw new NotFoundException('Equipment not found');

    const deleted = await this.prisma.equipment.delete({
      where: { id },
    });

    await this.auditService.logAction(
      adminId,
      'DELETE_EQUIPMENT',
      'Equipment',
      id,
      `Deleted equipment: ${equipment.name} (${equipment.serial_number})`
    );

    return deleted;
  }

  async getAvailability(id: number) {
    const transactions = await this.prisma.transaction.findMany({
      where: {
        equipment_id: id,
        status: { in: ['pending', 'approved', 'active', 'overdue'] },
      },
      select: {
        start_date: true,
        due_date: true,
      },
    });

    return transactions.map((t) => ({
      start: t.start_date,
      end: t.due_date,
    }));
  }

  async resolveMaintenance(id: number) {
    const equipment = await this.prisma.equipment.findUnique({ where: { id } });
    if (!equipment) throw new NotFoundException('Equipment not found');
    if (equipment.status !== 'maintenance') throw new BadRequestException('Equipment is not in maintenance');

    return this.prisma.equipment.update({
      where: { id },
      data: { status: 'available' },
    });
  }

  async importBulkExcel(buffer: Buffer, adminId: number) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);
    const worksheet = workbook.worksheets[0];
    if (!worksheet) throw new BadRequestException('Invalid Excel file');

    const equipmentList: any[] = [];
    
    // Giả sử row 1 là header: Name, Serial, Category ID, Location ID, Status, Condition, Price
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header
      
      const values = row.values as any[];
      const name = values[1];
      const serial = values[2];
      const categoryId = values[3];
      const locationId = values[4];
      const status = values[5] || 'available';
      const condition = values[6] || 'new';
      const price = values[7] || 0;

      if (name && serial) {
        equipmentList.push({
          name: name.toString(),
          serial_number: serial.toString(),
          category_id: categoryId ? parseInt(categoryId) : null,
          location_id: locationId ? parseInt(locationId) : null,
          status: status.toString(),
          current_condition: condition.toString(),
          price: parseFloat(price) || 0,
        });
      }
    });

    let successCount = 0;
    for (const item of equipmentList) {
      try {
        await this.prisma.equipment.create({
          data: {
            ...item,
            qr_code_data: item.serial_number,
          }
        });
        successCount++;
      } catch (err) {
        // Bỏ qua lỗi duplicate serial
        console.error(`Error importing ${item.serial_number}`, err);
      }
    }

    await this.auditService.logAction(
      adminId,
      'IMPORT_EQUIPMENT',
      'Equipment',
      0,
      `Bulk imported ${successCount} equipment items`
    );

    return { message: `Successfully imported ${successCount} equipment items`, successCount };
  }
}
