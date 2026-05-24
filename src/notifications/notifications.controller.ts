import { Controller, Get, Post, Param, Patch, Body, UseGuards, Request } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) { }

  @Get()
  async getMyNotifications(@Request() req: any) {
    const userId = req.user.id;
    return this.notificationsService.getUserNotifications(userId);
  }

  @Get('unread-count')
  async getUnreadCount(@Request() req: any) {
    const count = await this.notificationsService.getUnreadCount(req.user.id);
    return { count };
  }

  @Patch(':id/read')
  async markAsRead(@Param('id') id: string) {
    const result = await this.notificationsService.markAsRead(+id);
    return {
      status: 'success',
      message: 'Notification marked as read',
      data: result,
    };
  }

  @Patch('read-all')
  async markAllAsRead(@Request() req: any) {
    await this.notificationsService.markAllAsRead(req.user.id);
    return { message: 'All notifications marked as read' };
  }

  /**
   * Mobile App gọi endpoint này khi khởi động để đăng ký FCM Token.
   * Token này dùng để server gửi Push Notification xuống điện thoại.
   */
  @Post('register-token')
  async registerFcmToken(@Request() req: any, @Body() body: { fcm_token: string }) {
    await this.notificationsService.registerFcmToken(req.user.id, body.fcm_token);
    return { message: 'FCM token registered successfully' };
  }

  /**
   * Mobile App gọi khi user đăng xuất để ngưng nhận Push Notification.
   */
  @Post('remove-token')
  async removeFcmToken(@Request() req: any) {
    await this.notificationsService.removeFcmToken(req.user.id);
    return { message: 'FCM token removed' };
  }
}
