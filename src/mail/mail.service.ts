import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter;
  private readonly logger = new Logger(MailService.name);

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER, 
        pass: process.env.SMTP_PASS, 
      },
    });
  }

  async sendPasswordResetOtp(to: string, otp: string) {
    try {
      await this.transporter.sendMail({
        from: `"BTL Equipment System" <${process.env.SMTP_USER}>`,
        to,
        subject: 'Mã xác nhận cấp lại mật khẩu (OTP)',
        text: `Mã OTP của bạn là: ${otp}. Mã này sẽ hết hạn sau 5 phút.`,
        html: `<b>Mã OTP của bạn là: <span style="font-size: 24px; color: blue;">${otp}</span></b><br/>Mã này sẽ hết hạn sau 5 phút.`,
      });
      this.logger.log(`Password reset OTP sent to ${to}`);
    } catch (error: any) {
      this.logger.error(`Failed to send OTP to ${to}`, error.stack);
    }
  }

  async sendEmailFallback(to: string, equipmentName: string, dueDate: Date) {
    try {
      await this.transporter.sendMail({
        from: `"BTL Equipment System" <${process.env.SMTP_USER}>`,
        to,
        subject: '[CẢNH BÁO QUÁ HẠN] Trả thiết bị',
        text: `Thiết bị ${equipmentName} của bạn đã quá hạn trả (${dueDate.toLocaleString()}). Vui lòng trả thiết bị sớm nhất có thể.`,
        html: `<b>Cảnh báo!</b> Thiết bị <b>${equipmentName}</b> của bạn đã quá hạn trả vào <b>${dueDate.toLocaleString()}</b>.<br/>Vui lòng mang thiết bị đến phòng kỹ thuật để hoàn trả sớm nhất.`,
      });
      this.logger.log(`Email fallback sent to ${to}`);
    } catch (error: any) {
      this.logger.error(`Failed to send email fallback to ${to}`, error.stack);
    }
  }
}
