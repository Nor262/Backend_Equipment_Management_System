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
      <title>Mã Xác Nhận OTP</title>
      <style>
        body {
          font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background-color: #f4f7fa;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 580px;
          margin: 30px auto;
          background: #ffffff;
          border-radius: 16px;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
          overflow: hidden;
          border: 1px solid #eef2f6;
        }
        .header {
          background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
          padding: 35px 20px;
          text-align: center;
          color: #ffffff;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 700;
          letter-spacing: -0.5px;
        }
        .content {
          padding: 40px 35px;
          color: #333333;
          line-height: 1.6;
        }
        .content p {
          font-size: 15px;
          margin-bottom: 20px;
        }
        .otp-container {
          background: #f0f5ff;
          border: 1px dashed #adc6ff;
          border-radius: 12px;
          padding: 24px;
          text-align: center;
          margin: 30px 0;
        }
        .otp-code {
          font-size: 38px;
          font-weight: 800;
          color: #1890ff;
          letter-spacing: 8px;
          margin: 0;
          font-family: 'Courier New', Courier, monospace;
        }
        .otp-expiry {
          font-size: 13px;
          color: #8c8c8c;
          margin-top: 10px;
          font-weight: 500;
        }
        .footer {
          background: #fafafa;
          padding: 24px;
          text-align: center;
          font-size: 12px;
          color: #8c8c8c;
          border-top: 1px solid #f0f0f0;
        }
        .footer a {
          color: #1890ff;
          text-decoration: none;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>HỆ THỐNG QUẢN LÝ THIẾT BỊ BTL</h1>
        </div>
        <div class="content">
          <h2 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: #111;">Xác nhận mã OTP</h2>
          <p>Xin chào,</p>
          <p>Bạn đã yêu cầu nhận mã OTP để <strong>${actionText}</strong> trên hệ thống của chúng tôi. Vui lòng sử dụng mã OTP dưới đây để hoàn tất quá trình:</p>
          
          <div class="otp-container">
            <div class="otp-code">${otp}</div>
            <div class="otp-expiry">Mã OTP này có hiệu lực trong vòng 5 phút</div>
          </div>
          
          <p style="color: #ff4d4f; font-size: 13px;">* Lưu ý: Không chia sẻ mã OTP này với bất kỳ ai để bảo vệ an toàn tài khoản.</p>
          <p>Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này.</p>
        </div>
        <div class="footer">
          <p>&copy; 2026 BTL Equipment Management System. All rights reserved.</p>
          <p>Cần hỗ trợ? <a href="mailto:support@yourdomain.com">Liên hệ chúng tôi</a></p>
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
}
