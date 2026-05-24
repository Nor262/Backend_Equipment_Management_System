import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private isInitialized = false;

  onModuleInit() {
    this.initializeFirebase();
  }

  private initializeFirebase() {
    try {
      // Ưu tiên 1: Dùng file service account JSON (production)
      const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
      // Ưu tiên 2: Dùng biến môi trường inline (CI/CD, Docker)
      const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

      if (serviceAccountPath) {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const serviceAccount = require(serviceAccountPath);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        this.isInitialized = true;
        this.logger.log('Firebase Admin SDK initialized with service account file.');
      } else if (serviceAccountJson) {
        const serviceAccount = JSON.parse(serviceAccountJson);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        this.isInitialized = true;
        this.logger.log('Firebase Admin SDK initialized with inline credentials.');
      } else {
        this.logger.warn(
          'Firebase credentials not found. Push notifications will be logged but NOT delivered. ' +
          'Set FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_SERVICE_ACCOUNT_JSON in .env to enable FCM.',
        );
      }
    } catch (error: any) {
      this.logger.error(`Failed to initialize Firebase: ${error.message}`);
    }
  }

  /**
   * Gửi Push Notification tới một thiết bị qua FCM Token.
   * Nếu token hết hạn hoặc không hợp lệ, trả về false.
   */
  async sendPushNotification(
    token: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<boolean> {
    if (!this.isInitialized) {
      this.logger.log(`[FCM DISABLED] Would send to ${token.substring(0, 20)}...: ${title}`);
      return false;
    }

    try {
      const message: admin.messaging.Message = {
        token,
        notification: {
          title,
          body,
        },
        data: data || {},
        // Cấu hình cho Android
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'equipment_alerts',
          },
        },
        // Cấu hình cho iOS (APNs)
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await admin.messaging().send(message);
      this.logger.log(`[FCM OK] Message sent: ${response}`);
      return true;
    } catch (error: any) {
      // Token hết hạn hoặc không hợp lệ
      if (
        error.code === 'messaging/registration-token-not-registered' ||
        error.code === 'messaging/invalid-registration-token'
      ) {
        this.logger.warn(`[FCM] Invalid/expired token: ${token.substring(0, 20)}...`);
        return false;
      }
      this.logger.error(`[FCM ERROR] ${error.code}: ${error.message}`);
      return false;
    }
  }

  /**
   * Gửi Push Notification tới nhiều thiết bị cùng lúc (tối đa 500 tokens/lần).
   * Trả về danh sách các token bị lỗi để cleanup.
   */
  async sendMulticast(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<string[]> {
    if (!this.isInitialized || tokens.length === 0) {
      this.logger.log(`[FCM DISABLED] Would multicast to ${tokens.length} devices: ${title}`);
      return [];
    }

    const failedTokens: string[] = [];

    try {
      const message: admin.messaging.MulticastMessage = {
        tokens,
        notification: { title, body },
        data: data || {},
        android: {
          priority: 'high',
          notification: { sound: 'default', channelId: 'equipment_alerts' },
        },
        apns: {
          payload: { aps: { sound: 'default', badge: 1 } },
        },
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      this.logger.log(
        `[FCM Multicast] Success: ${response.successCount}, Failure: ${response.failureCount}`,
      );

      // Thu thập các token lỗi để xóa khỏi DB
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(tokens[idx]);
        }
      });
    } catch (error: any) {
      this.logger.error(`[FCM Multicast ERROR] ${error.message}`);
    }

    return failedTokens;
  }
}
