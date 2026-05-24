import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FirebaseService } from '../firebase/firebase.service';

export interface INotificationService {
  sendPushNotification(token: string, title: string, body: string, data?: Record<string, string>): Promise<void>;
  sendEmail(email: string, subject: string, body: string): Promise<void>;
  createNotification(userId: number, title: string, message: string, type: string, extraData?: Record<string, string>): Promise<void>;
  getUserNotifications(userId: number): Promise<any[]>;
  markAsRead(notificationId: number): Promise<any>;
}

@Injectable()
export class NotificationsService implements INotificationService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private prisma: PrismaService,
    private firebase: FirebaseService,
  ) {}

  /**
   * Tạo thông báo trong DB và đồng thời gửi Push Notification qua FCM.
   * Nếu token FCM đã hết hạn, tự động xóa token khỏi DB để không gửi lại lần sau.
   */
  async createNotification(
    userId: number,
    title: string,
    message: string,
    type: string,
    extraData?: Record<string, string>,
  ): Promise<void> {
    // 1. Lưu thông báo vào DB (luôn thực hiện, bất kể FCM có hoạt động không)
    const notification = await this.prisma.notification.create({
      data: {
        user_id: userId,
        title,
        message,
        type,
      },
    });

    // 2. Gửi Push Notification nếu user có FCM token
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.fcm_token) {
      const success = await this.firebase.sendPushNotification(
        user.fcm_token,
        title,
        message,
        {
          type,
          notification_id: String(notification.id),
          ...extraData,
        },
      );

      // Nếu token không hợp lệ, xóa khỏi DB
      if (!success && user.fcm_token) {
        await this.prisma.user.update({
          where: { id: userId },
          data: { fcm_token: null },
        });
        this.logger.warn(`Cleared invalid FCM token for user #${userId}`);
      }
    }
  }

  async getUserNotifications(userId: number): Promise<any[]> {
    return this.prisma.notification.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: 50,
    });
  }

  async markAsRead(notificationId: number): Promise<any> {
    const updated = await this.prisma.notification.update({
      where: { id: notificationId },
      data: { is_read: true },
    });

    return updated;
  }

  async markAllAsRead(userId: number): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { user_id: userId, is_read: false },
      data: { is_read: true },
    });
  }

  /**
   * Gửi Push Notification trực tiếp qua FCM (dùng trong Queue Processor).
   */
  async sendPushNotification(
    token: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    await this.firebase.sendPushNotification(token, title, body, data);
  }

  async sendEmail(email: string, subject: string, body: string): Promise<void> {
    // TODO: Tích hợp SMTP (SendGrid/Nodemailer) khi cần
    this.logger.log(`[EMAIL] to ${email}: ${subject} - ${body}`);
  }

  /**
   * Đăng ký hoặc cập nhật FCM Token cho user (gọi từ Mobile App khi khởi động).
   */
  async registerFcmToken(userId: number, fcmToken: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { fcm_token: fcmToken },
    });
    this.logger.log(`FCM token registered for user #${userId}`);
  }

  /**
   * Xóa FCM Token khi user đăng xuất (ngưng nhận thông báo).
   */
  async removeFcmToken(userId: number): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { fcm_token: null },
    });
    this.logger.log(`FCM token removed for user #${userId}`);
  }

  async getUnreadCount(userId: number): Promise<number> {
    return this.prisma.notification.count({
      where: { user_id: userId, is_read: false },
    });
  }
}
