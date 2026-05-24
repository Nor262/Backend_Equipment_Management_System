import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private mailService: MailService,
  ) {}

  /**
   * Chạy lúc 8:00 sáng hàng ngày.
   * Quét các giao dịch đang active mà đã quá due_date:
   * 1. Chuyển trạng thái sang 'overdue'
   * 2. Gửi thông báo in-app + Push Notification qua FCM cho người mượn
   */
  @Cron('0 8 * * *')
  async handleOverdueTransactions() {
    this.logger.debug('Running overdue transactions check...');

    const overdueTransactions = await this.prisma.transaction.findMany({
      where: {
        status: 'active',
        due_date: { lt: new Date() },
      },
      include: {
        borrower: true,
        equipment: { select: { id: true, name: true } },
      },
    });

    if (overdueTransactions.length === 0) {
      this.logger.debug('No overdue transactions found.');
      return;
    }

    this.logger.warn(`Found ${overdueTransactions.length} overdue transaction(s).`);

    for (const tx of overdueTransactions) {
      // 1. Cập nhật trạng thái giao dịch
      await this.prisma.transaction.update({
        where: { id: tx.id },
        data: { status: 'overdue' },
      });

      // 2. Gửi thông báo in-app + Push Notification (FCM)
      await this.notifications.createNotification(
        tx.borrower_id,
        '⚠️ Cảnh báo quá hạn',
        `Bạn đang giữ thiết bị "${tx.equipment.name}" quá hạn. Vui lòng trả ngay để tránh bị phạt.`,
        'overdue',
        {
          transaction_id: String(tx.id),
          equipment_id: String(tx.equipment_id),
        },
      );

      // 3. Gửi Email Fallback nếu user cho phép
      if (tx.borrower.email_notifications_enabled) {
        await this.mailService.sendEmailFallback(tx.borrower.email, tx.equipment.name, tx.due_date);
      }
    }
  }

  /**
   * Chạy lúc 8:00 sáng hàng ngày.
   * Nhắc nhở các giao dịch sắp đến hạn trả (trong vòng 24h tới).
   */
  @Cron('0 8 * * *')
  async handleUpcomingDueReminders() {
    this.logger.debug('Running upcoming due date reminders...');

    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const upcomingTransactions = await this.prisma.transaction.findMany({
      where: {
        status: 'active',
        due_date: {
          gte: now,
          lte: tomorrow,
        },
      },
      include: {
        borrower: true,
        equipment: { select: { id: true, name: true } },
      },
    });

    if (upcomingTransactions.length === 0) {
      this.logger.debug('No upcoming due transactions found.');
      return;
    }

    this.logger.log(`Found ${upcomingTransactions.length} transaction(s) due within 24h.`);

    for (const tx of upcomingTransactions) {
      await this.notifications.createNotification(
        tx.borrower_id,
        '🔔 Nhắc nhở trả đồ',
        `Thiết bị "${tx.equipment.name}" của bạn sắp đến hạn trả. Vui lòng chuẩn bị hoàn trả đúng hạn.`,
        'reminder',
        {
          transaction_id: String(tx.id),
          equipment_id: String(tx.equipment_id),
        },
      );
    }
  }

  /**
   * Chạy mỗi giờ.
   * Dọn dẹp "Zombie Bookings": Các giao dịch đã được duyệt (approved) 
   * nhưng quá 24h kể từ start_date mà sinh viên không đến lấy máy.
   * 1. Đổi trạng thái thành 'cancelled'
   * 2. Cộng 5 điểm phạt vì giữ chỗ ảo
   * 3. Gửi thông báo
   */
  @Cron('0 * * * *')
  async handleZombieBookings() {
    this.logger.debug('Running zombie bookings cleanup...');
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const zombieTransactions = await this.prisma.transaction.findMany({
      where: {
        status: 'approved',
        start_date: { lt: twentyFourHoursAgo },
      },
      include: {
        borrower: true,
        equipment: { select: { id: true, name: true } },
      },
    });

    if (zombieTransactions.length === 0) {
      this.logger.debug('No zombie bookings found.');
      return;
    }

    this.logger.warn(`Found ${zombieTransactions.length} zombie booking(s). Cancelling them...`);

    for (const tx of zombieTransactions) {
      await this.prisma.$transaction(async (prismaTx) => {
        // Hủy đơn
        await prismaTx.transaction.update({
          where: { id: tx.id },
          data: { status: 'cancelled' },
        });

        // Phạt 5 điểm vì giữ chỗ ảo
        const penaltyPoints = 5;
        const user = await prismaTx.user.update({
          where: { id: tx.borrower_id },
          data: { penalty_points: { increment: penaltyPoints } },
        });

        // Khóa tài khoản nếu vượt 100 điểm
        if (user.penalty_points >= 100 && user.is_active) {
          await prismaTx.user.update({
            where: { id: user.id },
            data: { is_active: false },
          });
          
          await this.notifications.createNotification(
            user.id,
            'Tài khoản bị tạm khóa',
            'Tài khoản của bạn đã bị khóa do điểm phạt vượt quá giới hạn (100 điểm).',
            'system'
          );
        }
      });

      // Gửi thông báo
      await this.notifications.createNotification(
        tx.borrower_id,
        '❌ Hủy đơn mượn do không nhận thiết bị',
        `Đơn mượn thiết bị "${tx.equipment.name}" của bạn đã bị hủy tự động do không đến lấy máy sau hơn 24h. Bạn bị trừ 5 điểm uy tín.`,
        'system'
      );
    }
  }
}
