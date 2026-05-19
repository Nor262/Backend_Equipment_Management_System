import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { EquipmentModule } from './equipment/equipment.module';
import { TransactionsModule } from './transactions/transactions.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { NotificationsModule } from './notifications/notifications.module';
import { QueueModule } from './queue/queue.module';
import { CategoriesModule } from './categories/categories.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { LocationsModule } from './locations/locations.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { AuditModule } from './audit/audit.module';
import { ReportsModule } from './reports/reports.module';
import { ConfigModule } from '@nestjs/config';
import { FirebaseModule } from './firebase/firebase.module';
import { MailModule } from './mail/mail.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MailModule,
    FirebaseModule,
    PrismaModule,
    AuthModule,
    UsersModule,
    EquipmentModule,
    TransactionsModule,
    AnalyticsModule,
    NotificationsModule,
    QueueModule,
    CategoriesModule,
    SuppliersModule,
    LocationsModule,
    MaintenanceModule,
    CloudinaryModule,
    AuditModule,
    ReportsModule,
    MailModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
