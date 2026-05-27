import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter;
  private readonly logger = new Logger(MailService.name);

  constructor() {
    const port = Number(process.env.SMTP_PORT) || 587;
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port,
      secure: port === 465, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER, 
        pass: process.env.SMTP_PASS, 
      },
      connectionTimeout: 5000, // 5 seconds
      greetingTimeout: 5000,   // 5 seconds
      socketTimeout: 5000,     // 5 seconds
    });
  }

  private async executeSendMail(to: string, subject: string, text: string, html: string): Promise<void> {
    const senderName = process.env.EMAIL_SENDER_NAME || 'BTL Equipment System';

    // 1. Try Resend HTTP API if key is available
    if (process.env.RESEND_API_KEY) {
      this.logger.log(`Attempting to send email to ${to} via Resend HTTP API`);
      try {
        const from = process.env.RESEND_FROM
          ? (process.env.RESEND_FROM.includes('<') ? process.env.RESEND_FROM : `"${senderName}" <${process.env.RESEND_FROM}>`)
          : `"${senderName}" <onboarding@resend.dev>`;

        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from,
            to: [to],
            subject,
            text,
            html,
          }),
        });

        if (response.ok) {
          this.logger.log(`Email successfully sent to ${to} via Resend`);
          return;
        }

        const errorText = await response.text();
        this.logger.warn(`Resend API failed with status ${response.status}: ${errorText}. Falling back to SMTP.`);
      } catch (error: any) {
        this.logger.error(`Resend API encountered error: ${error.message}. Falling back to SMTP.`, error.stack);
      }
    }

    // 2. Fallback to direct SMTP (Gmail)
    this.logger.log(`Sending email to ${to} via SMTP`);
    await this.transporter.sendMail({
      from: `"${senderName}" <${process.env.SMTP_USER || 'no-reply@ptit.edu.vn'}>`,
      to,
      subject,
      text,
      html,
    });
    this.logger.log(`Email successfully sent to ${to} via SMTP`);
  }

  async sendOtp(to: string, otp: string, type: 'reset' | 'register' = 'reset') {
    const subject = type === 'reset' 
      ? 'Mã xác nhận đặt lại mật khẩu (OTP) - BTL' 
      : 'Mã xác nhận đăng ký tài khoản mới (OTP) - BTL';
    
    const actionText = type === 'reset' ? 'đặt lại mật khẩu' : 'hoàn tất đăng ký tài khoản mới';

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Mã Xác Nhận OTP - PTIT</title>
    </head>
    <body style="font-family: Arial, sans-serif; background-color: #f7f9fa; margin: 0; padding: 20px 10px;">
      <div style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); overflow: hidden; border: 1px solid #e2e8f0;">
        <div style="background-color: #c00c0c; padding: 30px 20px; text-align: center; border-bottom: 4px solid #e2a300;">
          <div style="margin: 0 0 6px 0; font-size: 12px; font-weight: bold; letter-spacing: 1.5px; color: #fecaca; text-transform: uppercase;">
            Học viện Công nghệ Bưu chính Viễn thông
          </div>
          <h1 style="margin: 0; font-size: 20px; font-weight: bold; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px;">
            Hệ thống Quản lý Thiết bị BTL
          </h1>
        </div>
        <div style="padding: 35px 25px; color: #334155; line-height: 1.6;">
          <h2 style="margin: 0 0 20px 0; font-size: 16px; font-weight: bold; color: #0f172a; border-left: 4px solid #c00c0c; padding-left: 10px; text-transform: uppercase;">
            MÃ XÁC NHẬN OTP
          </h2>
          <p style="font-size: 14px; margin: 0 0 16px 0; color: #334155;">Xin chào,</p>
          <p style="font-size: 14px; margin: 0 0 20px 0; color: #334155;">
            Bạn đã yêu cầu nhận mã OTP để <strong style="color: #0f172a;">${actionText}</strong> trên hệ thống của chúng tôi. Vui lòng sử dụng mã OTP dưới đây để hoàn tất quá trình:
          </p>
          
          <div style="background-color: #fff5f5; border: 2px dashed #fca5a5; border-radius: 8px; padding: 25px; text-align: center; margin: 25px 0;">
            <div style="font-size: 36px; font-weight: bold; color: #c00c0c; letter-spacing: 8px; margin: 0 0 8px 0; font-family: 'Courier New', Courier, monospace;">
              ${otp}
            </div>
            <div style="font-size: 12px; color: #64748b; font-weight: bold; margin: 0;">
              Mã OTP này có hiệu lực trong vòng 5 phút
            </div>
          </div>
          
          <p style="color: #c00c0c; font-size: 12px; font-weight: bold; margin: 0 0 20px 0;">
            * Lưu ý: Vì lý do bảo mật, tuyệt đối không chia sẻ mã xác nhận này với bất kỳ ai.
          </p>
          <p style="color: #64748b; font-size: 13px; margin: 0;">Nếu bạn không thực hiện yêu cầu này, bạn có thể an tâm bỏ qua email này.</p>
        </div>
        <div style="background-color: #f8fafc; padding: 20px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0 0 6px 0;">&copy; 2026 PTIT Equipment Management System. All rights reserved.</p>
          <p style="margin: 0;">Cần hỗ trợ? <a href="mailto:support@student.ptit.edu.vn" style="color: #c00c0c; text-decoration: none; font-weight: bold;">support@student.ptit.edu.vn</a></p>
        </div>
      </div>
    </body>
    </html>
    `;

    try {
      await this.executeSendMail(
        to,
        subject,
        `Mã OTP của bạn là: ${otp}. Mã này sẽ hết hạn sau 5 phút.`,
        htmlContent
      );
      this.logger.log(`OTP (${type}) sent to ${to}`);
    } catch (error: any) {
      this.logger.error(`Failed to send OTP to ${to}`, error.stack);
      throw new InternalServerErrorException(`Gửi mã OTP qua Email thất bại: ${error.message}`);
    }
  }

  async sendPasswordResetOtp(to: string, otp: string) {
    return this.sendOtp(to, otp, 'reset');
  }


  async sendEmailFallback(to: string, equipmentName: string, dueDate: Date) {
    try {
      await this.executeSendMail(
        to,
        '[CẢNH BÁO QUÁ HẠN] Trả thiết bị',
        `Thiết bị ${equipmentName} của bạn đã quá hạn trả (${dueDate.toLocaleString()}). Vui lòng trả thiết bị sớm nhất có thể.`,
        `<b>Cảnh báo!</b> Thiết bị <b>${equipmentName}</b> của bạn đã quá hạn trả vào <b>${dueDate.toLocaleString()}</b>.<br/>Vui lòng mang thiết bị đến phòng kỹ thuật để hoàn trả sớm nhất.`
      );
      this.logger.log(`Email fallback sent to ${to}`);
    } catch (error: any) {
      this.logger.error(`Failed to send email fallback to ${to}`, error.stack);
      throw new InternalServerErrorException(`Gửi email cảnh báo thất bại: ${error.message}`);
    }
  }

  async sendEmail(to: string, subject: string, body: string) {
    try {
      await this.executeSendMail(to, subject, body, body);
      this.logger.log(`Email sent to ${to}`);
    } catch (error: any) {
      this.logger.error(`Failed to send email to ${to}`, error.stack);
      throw new InternalServerErrorException(`Gửi email thông báo thất bại: ${error.message}`);
    }
  }
}
