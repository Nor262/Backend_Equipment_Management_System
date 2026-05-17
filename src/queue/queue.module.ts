import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsQueueProcessor } from './notifications.processor';
import { CronService } from './cron.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
      },
    }),
    BullModule.registerQueue({
      name: 'notifications',
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    NotificationsModule,
    MailModule,
  ],
  providers: [NotificationsQueueProcessor, CronService],
})
export class QueueModule {}
