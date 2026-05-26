import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto, ReviewTransactionDto, CheckInOutDto, RatingDto, ExtendBookingDto } from './transactions.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class TransactionsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private cloudinary: CloudinaryService
  ) { }

  async createBorrowRequest(userId: number, dto: CreateTransactionDto) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Pessimistic Lock on Equipment
      const equipment = await tx.$queryRaw<any[]>`
        SELECT * FROM equipment WHERE id = ${dto.equipment_id} FOR UPDATE
      `;

      if (!equipment || equipment.length === 0) {
        throw new NotFoundException('Equipment not found');
      }

      if (['broken', 'maintenance'].includes(equipment[0].status)) {
        throw new BadRequestException('Equipment is broken or under maintenance');
      }

      const reqStart = new Date(dto.start_date);
      const reqDue = new Date(dto.due_date);

      if (reqStart >= reqDue) {
        throw new BadRequestException('Start date must be before due date');
      }

      // Check overlaps — only against approved/active transactions
      // Pending requests are allowed to overlap; conflict is resolved at approval time
      const overlapping = await tx.transaction.findFirst({
        where: {
          equipment_id: dto.equipment_id,
          status: { in: ['approved', 'active'] },
          start_date: { lt: reqDue },
          due_date: { gt: reqStart },
        }
      });

      if (overlapping) {
        throw new BadRequestException('Equipment is already booked for the selected dates');
      }

      return tx.transaction.create({
        data: {
          equipment_id: dto.equipment_id,
          borrower_id: userId,
          type: 'borrow',
          status: 'pending',
          start_date: reqStart,
          due_date: reqDue,
          notes: dto.notes,
          created_by: userId,
        },
      });
    });
  }

  async reviewRequest(transactionId: number, reviewerId: number, dto: ReviewTransactionDto) {
    return this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.findUnique({ where: { id: transactionId } });
      if (!transaction) throw new NotFoundException('Transaction not found');
      if (transaction.status !== 'pending') throw new BadRequestException('Transaction is not pending');

      // When approving, check for scheduling conflicts against already-approved/active bookings
      if (dto.status === 'approved') {
        const overlapping = await tx.transaction.findFirst({
          where: {
            equipment_id: transaction.equipment_id,
            status: { in: ['approved', 'active'] },
            start_date: { lt: transaction.due_date },
            due_date: { gt: transaction.start_date },
            id: { not: transactionId },
          }
        });

        if (overlapping) {
          throw new BadRequestException(
            'Không thể duyệt: thiết bị đã có lịch mượn được duyệt trùng khung giờ này.'
          );
        }
      }

      const updatedTx = await tx.transaction.update({
        where: { id: transactionId },
        data: {
          status: dto.status,
          approver_id: reviewerId,
          approval_date: new Date(),
          notes: dto.notes,
          updated_by: reviewerId,
        },
        include: { equipment: true }
      });

      // Note: Equipment status is NOT changed to 'in_use' here.
      // It will be updated to 'in_use' only when the borrower actually checks out the equipment.

      // Notify borrower
      await this.notifications.createNotification(
        transaction.borrower_id,
        dto.status === 'approved' ? 'Yêu cầu mượn được chấp nhận' : 'Yêu cầu mượn bị từ chối',
        `Yêu cầu mượn thiết bị ${updatedTx.equipment.name} của bạn đã được ${dto.status === 'approved' ? 'chấp nhận' : 'từ chối'}.`,
        'borrow'
      );

      return updatedTx;
    });
  }

  async checkOut(transactionId: number, storekeeperId: number, dto: CheckInOutDto, file?: Express.Multer.File) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { equipment: true }
    });
    if (!transaction) throw new NotFoundException('Transaction not found');
    if (transaction.status !== 'approved') throw new BadRequestException('Transaction not approved');
    if (transaction.equipment.qr_code_data !== dto.qr_code_data && transaction.equipment.serial_number !== dto.qr_code_data) {
      throw new BadRequestException('QR Code mismatch');
    }

    let imageUrl = null;
    if (file) {
      const uploadResult = await this.cloudinary.uploadFile(file);
      imageUrl = uploadResult.secure_url;
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.equipment.update({
        where: { id: transaction.equipment_id },
        data: { status: 'in_use' },
      });

      const updatedTx = await tx.transaction.update({
        where: { id: transactionId },
        data: {
          status: 'active',
          storekeeper_id: storekeeperId,
          actual_check_out: new Date(),
          condition_at_check_out: dto.condition,
          image_url_before: imageUrl,
          updated_by: storekeeperId,
        },
        include: { equipment: true }
      });

      // Notify borrower
      await this.notifications.createNotification(
        transaction.borrower_id,
        'Thiết bị đã được bàn giao',
        `Bạn đã nhận thiết bị ${updatedTx.equipment.name}. Vui lòng bảo quản cẩn thận và trả đúng hạn.`,
        'borrow'
      );

      return updatedTx;
    });
  }

  async checkIn(transactionId: number, operatorId: number, operatorRole: string, dto: CheckInOutDto, file?: Express.Multer.File) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { equipment: true }
    });
    if (!transaction) throw new NotFoundException('Transaction not found');
    if (transaction.status !== 'active' && transaction.status !== 'overdue') {
      throw new BadRequestException('Transaction not active');
    }
    if (transaction.equipment.qr_code_data !== dto.qr_code_data && transaction.equipment.serial_number !== dto.qr_code_data) {
      throw new BadRequestException('QR Code mismatch');
    }

    let imageUrl = null;
    if (file) {
      const uploadResult = await this.cloudinary.uploadFile(file);
      imageUrl = uploadResult.secure_url;
    }

    return this.prisma.$transaction(async (tx) => {
      const actualCheckIn = new Date();
      let lateDays = 0;
      let penaltyPoints = 0;

      if (actualCheckIn > transaction.due_date) {
        const diffTime = Math.abs(actualCheckIn.getTime() - transaction.due_date.getTime());
        lateDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        penaltyPoints = lateDays * 10;
      }

      const damageKeywords = ['hỏng', 'lỗi', 'broken', 'vỡ', 'nứt', 'cháy', 'mất'];
      const isDamaged = damageKeywords.some(kw => dto.condition?.toLowerCase().includes(kw));
      const nextStatus = isDamaged ? 'maintenance' : 'available';

      await tx.equipment.update({
        where: { id: transaction.equipment_id },
        data: { status: nextStatus },
      });

      const updatedTx = await tx.transaction.update({
        where: { id: transactionId },
        data: {
          status: 'completed',
          storekeeper_id: operatorRole === 'borrower' ? null : operatorId,
          actual_check_in: actualCheckIn,
          condition_at_check_in: dto.condition,
          image_url_after: imageUrl,
          updated_by: operatorId,
        },
        include: { equipment: true }
      });

      if (penaltyPoints > 0) {
        const user = await tx.user.update({
          where: { id: transaction.borrower_id },
          data: { penalty_points: { increment: penaltyPoints } }
        });

        // Tự động khóa tài khoản nếu vượt 10 điểm phạt
        if (user.penalty_points >= 10 && user.is_active) {
          await tx.user.update({
            where: { id: user.id },
            data: { is_active: false }
          });

          await this.notifications.createNotification(
            user.id,
            'Tài khoản bị tạm khóa',
            'Tài khoản của bạn đã bị khóa do điểm phạt vượt quá giới hạn (10 điểm). Vui lòng liên hệ Admin.',
            'system'
          );
        }
      }

      // Notify borrower
      const penaltyMsg = penaltyPoints > 0 ? ` Bạn đã trả muộn ${lateDays} ngày và bị trừ ${penaltyPoints} điểm uy tín.` : '';
      await this.notifications.createNotification(
        transaction.borrower_id,
        'Hoàn tất trả thiết bị',
        `Cảm ơn bạn đã trả thiết bị ${updatedTx.equipment.name}. Giao dịch đã hoàn tất.${penaltyMsg}`,
        'return'
      );

      return updatedTx;
    });
  }

  async extendBooking(transactionId: number, userId: number, dto: ExtendBookingDto) {
    const transaction = await this.prisma.transaction.findUnique({ where: { id: transactionId } });
    if (!transaction) throw new NotFoundException('Transaction not found');
    if (transaction.borrower_id !== userId) throw new BadRequestException('Not your transaction');
    if (transaction.status !== 'active') throw new BadRequestException('Transaction is not active');
    if (transaction.is_extended) throw new BadRequestException('Transaction already extended once');

    const newDueDate = new Date(dto.new_due_date);
    if (newDueDate <= transaction.due_date) throw new BadRequestException('New due date must be after current due date');

    // Check overlaps — only against approved/active, not pending
    const overlapping = await this.prisma.transaction.findFirst({
      where: {
        equipment_id: transaction.equipment_id,
        status: { in: ['approved', 'active'] },
        start_date: { lt: newDueDate },
        due_date: { gt: transaction.due_date },
        id: { not: transactionId }
      }
    });

    if (overlapping) {
      throw new BadRequestException('Cannot extend: Equipment is already booked by someone else during this period');
    }

    const updatedTx = await this.prisma.transaction.update({
      where: { id: transactionId },
      data: {
        due_date: newDueDate,
        is_extended: true,
      }
    });

    return updatedTx;
  }

  async cancelTransaction(transactionId: number, userId: number) {
    return this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.findUnique({
        where: { id: transactionId },
        include: { equipment: true }
      });

      if (!transaction) throw new NotFoundException('Transaction not found');
      if (transaction.borrower_id !== userId) throw new BadRequestException('Not your transaction');
      if (!['pending', 'approved'].includes(transaction.status)) {
        throw new BadRequestException('Only pending or approved transactions can be cancelled');
      }

      const updatedTx = await tx.transaction.update({
        where: { id: transactionId },
        data: {
          status: 'cancelled',
          updated_by: userId,
        },
      });

      return updatedTx;
    });
  }

  async rateTransaction(transactionId: number, userId: number, dto: RatingDto) {
    const transaction = await this.prisma.transaction.findUnique({ where: { id: transactionId } });
    if (!transaction) throw new NotFoundException('Transaction not found');
    if (transaction.borrower_id !== userId) throw new BadRequestException('Not your transaction');
    if (transaction.status !== 'completed') throw new BadRequestException('You can only rate completed transactions');

    return this.prisma.transaction.update({
      where: { id: transactionId },
      data: {
        rating: dto.rating,
        feedback: dto.feedback,
      }
    });
  }

  async findAll() {
    return this.prisma.transaction.findMany({
      include: { equipment: true, borrower: true, approver: true, storekeeper: true },
    });
  }

  async findMyTransactions(userId: number) {
    return this.prisma.transaction.findMany({
      where: { borrower_id: userId },
      include: {
        equipment: { select: { id: true, name: true, serial_number: true, status: true, image_url: true } },
        borrower: true,
        approver: true,
        storekeeper: true
      },
      orderBy: { request_date: 'desc' },
    });
  }

  async findByEquipment(equipmentId: number) {
    return this.prisma.transaction.findMany({
      where: {
        equipment_id: equipmentId,
      },
      select: {
        id: true,
        request_date: true,
        actual_check_in: true,
        actual_check_out: true,
        status: true,
        borrower: {
          select: {
            full_name: true,
          }
        }
      },
      orderBy: { request_date: 'desc' },
      take: 10,
    });
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

  async verifyItem(serialNumber: string) {

    const equipment = await this.prisma.equipment.findFirst({
      where: {
        OR: [
          { serial_number: serialNumber },
          { qr_code_data: serialNumber }
        ]
      },
    });
    if (!equipment) throw new NotFoundException('Equipment not found with this serial number');

    // Find active/approved transaction for this equipment
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
      transaction_id: activeTransaction?.id || null,
      transaction_status: activeTransaction?.status || null,
    };
  }

  async remindTransaction(transactionId: number) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { borrower: true, equipment: true },
    });
    if (!transaction) throw new NotFoundException('Transaction not found');

    if (transaction.status !== 'active' && transaction.status !== 'overdue') {
      throw new BadRequestException('Transaction is not active or overdue');
    }

    const title = transaction.status === 'overdue' ? '⚠️ Cảnh báo quá hạn (Nhắc nhở)' : '🔔 Nhắc nhở trả thiết bị';
    const message = transaction.status === 'overdue'
      ? `Nhắc nhở: Bạn đang giữ thiết bị "${transaction.equipment.name}" quá hạn. Vui lòng trả ngay.`
      : `Nhắc nhở: Thiết bị "${transaction.equipment.name}" của bạn đang mượn cần được hoàn trả đúng hạn.`;

    await this.notifications.createNotification(
      transaction.borrower_id,
      title,
      message,
      'reminder',
      {
        transaction_id: String(transaction.id),
        equipment_id: String(transaction.equipment_id),
      }
    );

    return {
      status: 'success',
      message: 'Sent return reminder successfully',
    };
  }

  async syncTransactionStatus(dto: { transaction_ids: number[] }) {
    const transactions = await this.prisma.transaction.findMany({
      where: {
        id: { in: dto.transaction_ids },
      },
      include: { equipment: true }
    });

    return transactions.map(t => {
      let processingStatus: 'pending' | 'verifying' | 'success' | 'failed' = 'pending';
      if (t.status === 'active' || t.status === 'completed') {
        processingStatus = 'success';
      } else if (t.status === 'rejected' || t.status === 'cancelled') {
        processingStatus = 'failed';
      } else {
        processingStatus = 'verifying';
      }
      return {
        serial_number: t.equipment.serial_number,
        status: processingStatus,
      };
    });
  }
}

