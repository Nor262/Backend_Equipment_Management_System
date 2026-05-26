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
      <style>
        body {
          font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background-color: #f7f9fa;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 580px;
          margin: 30px auto;
          background: #ffffff;
          border-radius: 16px;
          box-shadow: 0 10px 30px rgba(192, 12, 12, 0.04), 0 4px 12px rgba(0, 0, 0, 0.03);
          overflow: hidden;
          border: 1px solid #f1f5f9;
        }
        .header {
          background: linear-gradient(135deg, #c00c0c 0%, #8b0000 100%);
          padding: 35px 20px;
          text-align: center;
          color: #ffffff;
          border-bottom: 4px solid #e2a300; /* PTIT Gold accent bar */
        }
        .header .school-name {
          margin: 0 0 6px 0;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 1.5px;
          color: rgba(255, 255, 255, 0.9);
          text-transform: uppercase;
        }
        .header h1 {
          margin: 0;
          font-size: 22px;
          font-weight: 800;
          letter-spacing: -0.2px;
          color: #ffffff;
          text-transform: uppercase;
        }
        .content {
          padding: 40px 35px;
          color: #334155;
          line-height: 1.6;
        }
        .content p {
          font-size: 15px;
          margin-bottom: 20px;
        }
        .otp-container {
          background: #fff9f9;
          border: 2px dashed #fca5a5;
          border-radius: 12px;
          padding: 26px;
          text-align: center;
          margin: 30px 0;
        }
        .otp-code {
          font-size: 40px;
          font-weight: 800;
          color: #c00c0c;
          letter-spacing: 10px;
          margin: 0;
          font-family: 'SF Mono', Consolas, 'Courier New', monospace;
        }
        .otp-expiry {
          font-size: 13px;
          color: #64748b;
          margin-top: 12px;
          font-weight: 600;
        }
        .footer {
          background: #f8fafc;
          padding: 24px;
          text-align: center;
          font-size: 12px;
          color: #64748b;
          border-top: 1px solid #f1f5f9;
        }
        .footer a {
          color: #c00c0c;
          text-decoration: none;
          font-weight: 600;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="school-name">Học viện Công nghệ Bưu chính Viễn thông</div>
          <h1>Hệ thống Quản lý Thiết bị BTL</h1>
        </div>
        <div class="content">
          <h2 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 700; color: #0f172a; border-left: 4px solid #c00c0c; padding-left: 12px;">
            MÃ XÁC NHẬN OTP
          </h2>
          <p>Xin chào,</p>
          <p>Bạn đã yêu cầu nhận mã OTP để <strong>${actionText}</strong> trên hệ thống của chúng tôi. Vui lòng sử dụng mã OTP dưới đây để hoàn tất quá trình:</p>
          
          <div class="otp-container">
            <div class="otp-code">${otp}</div>
            <div class="otp-expiry">Mã OTP này có hiệu lực trong vòng 5 phút</div>
          </div>
          
          <p style="color: #c00c0c; font-size: 13px; font-weight: 600; margin-bottom: 20px;">
            * Lưu ý: Vì lý do bảo mật, tuyệt đối không chia sẻ mã xác nhận này với bất kỳ ai.
          </p>
          <p style="color: #64748b; font-size: 14px;">Nếu bạn không thực hiện yêu cầu này, bạn có thể an tâm bỏ qua email này.</p>
        </div>
        <div class="footer">
          <p style="margin: 0 0 8px 0;">&copy; 2026 PTIT Equipment Management System. All rights reserved.</p>
          <p style="margin: 0;">Cần hỗ trợ? <a href="mailto:support@student.ptit.edu.vn">support@student.ptit.edu.vn</a></p>
        </div>
      </div>
    </body>
    </html>
    `;

    try {
      await this.transporter.sendMail({
        from: `"BTL Equipment System" <${process.env.SMTP_USER}>`,
        to,
        subject,
        text: `Mã OTP của bạn là: ${otp}. Mã này sẽ hết hạn sau 5 phút.`,
        html: htmlContent,
      });
      this.logger.log(`OTP (${type}) sent to ${to}`);
    } catch (error: any) {
      this.logger.error(`Failed to send OTP to ${to}`, error.stack);
    }
  }

  async sendPasswordResetOtp(to: string, otp: string) {
    return this.sendOtp(to, otp, 'reset');
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

  async sendEmail(to: string, subject: string, body: string) {
    try {
      await this.transporter.sendMail({
        from: `"BTL Equipment System" <${process.env.SMTP_USER}>`,
        to,
        subject,
        text: body,
        html: body,
      });
      this.logger.log(`Email sent to ${to}`);
    } catch (error: any) {
      this.logger.error(`Failed to send email to ${to}`, error.stack);
    }
  }
}
