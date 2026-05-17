import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as ExcelJS from 'exceljs';
import { Response } from 'express';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async exportEquipmentExcel(res: Response) {
    const equipment = await this.prisma.equipment.findMany({
      include: {
        category: true,
        location: true,
      },
      orderBy: { id: 'asc' },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Equipment List');

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Serial Number', key: 'serial', width: 25 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Location', key: 'location', width: 20 },
      { header: 'Condition', key: 'condition', width: 25 },
    ];

    equipment.forEach((item) => {
      worksheet.addRow({
        id: item.id,
        name: item.name,
        category: item.category?.name || 'N/A',
        serial: item.serial_number,
        status: item.status,
        location: item.location?.name || 'N/A',
        condition: item.current_condition || 'N/A',
      });
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=' + 'equipment_report.xlsx'
    );

    await workbook.xlsx.write(res);
    res.end();
  }

  async getDashboardStats() {
    const [
      totalEquipment,
      equipmentByStatusRaw,
      totalTransactions,
      transactionsByStatusRaw,
      totalUsers,
    ] = await Promise.all([
      this.prisma.equipment.count(),
      this.prisma.equipment.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      this.prisma.transaction.count(),
      this.prisma.transaction.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      this.prisma.user.count(),
    ]);

    const topBorrowedRaw = await this.prisma.transaction.groupBy({
      by: ['equipment_id'],
      _count: { equipment_id: true },
      orderBy: { _count: { equipment_id: 'desc' } },
      take: 5,
    });

    const equipmentDetails = await this.prisma.equipment.findMany({
      where: { id: { in: topBorrowedRaw.map(t => t.equipment_id) } },
      select: { id: true, name: true, serial_number: true },
    });

    const topBorrowed = topBorrowedRaw.map(t => {
      const eq = equipmentDetails.find(e => e.id === t.equipment_id);
      return {
        ...eq,
        borrowCount: t._count.equipment_id,
      };
    });

    return {
      summary: {
        total_equipment: totalEquipment,
        available_count: equipmentByStatusRaw.find(s => s.status === 'available')?._count.id || 0,
        in_use_count: equipmentByStatusRaw.find(s => s.status === 'in_use')?._count.id || 0,
        maintenance_count: equipmentByStatusRaw.find(s => s.status === 'maintenance')?._count.id || 0,
      },
      alerts: {
        pending_requests: transactionsByStatusRaw.find(s => s.status === 'pending')?._count.id || 0,
        overdue_transactions: transactionsByStatusRaw.find(s => s.status === 'overdue')?._count.id || 0,
      },
      charts: {
        top_borrowed: topBorrowed.map(t => ({ name: t.name, borrow_count: t.borrowCount })),
        borrow_frequency_by_month: []
      }
    };
  }
}
