import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LogInventoryDto } from './audit.dto';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async logAction(userId: number, action: string, targetType: string, targetId?: number, details?: string) {
    return this.prisma.auditLog.create({
      data: {
        user_id: userId,
        action,
        target_type: targetType,
        target_id: targetId,
        details,
      },
    });
  }

  async getLogs() {
    return this.prisma.auditLog.findMany({
      orderBy: { created_at: 'desc' },
      include: { user: { select: { id: true, username: true, role: true } } },
    });
  }

  async logInventory(userId: number, dto: LogInventoryDto) {
    const details = `Kiểm kê kho - Khớp: ${dto.matched_count}/${dto.total_items}, Mất: ${dto.missing_count}, Bỏ qua: ${dto.skipped_count}.`;
    
    if (dto.missing_item_ids && dto.missing_item_ids.length > 0) {
      await this.prisma.equipment.updateMany({
        where: { id: { in: dto.missing_item_ids } },
        data: { status: 'broken', current_condition: 'Mất trong kỳ kiểm kê' }
      });
    }

    return this.prisma.auditLog.create({
      data: {
        user_id: userId,
        action: 'INVENTORY_CHECK',
        target_type: 'Equipment',
        details: details,
      }
    });
  }
}
