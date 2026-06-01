import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { IEmailService } from '../../domain/services/email.service.interface';

@Injectable()
export class NodemailerEmailService implements IEmailService {
  private readonly logger = new Logger(NodemailerEmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT'),
      secure: false,
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });
  }

  async sendOtpEmail(email: string, otp: string): Promise<void> {
    const mailOptions = {
      from: `"Gigly" <${this.configService.get<string>('SMTP_FROM') || this.configService.get<string>('SMTP_USER')}>`,
      to: email,
      subject: 'Gigly - Verify your email',
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 30px; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="font-size: 28px; font-weight: 800; color: #1e293b; margin: 0;">Gigly</h1>
          </div>
          <h2 style="font-size: 20px; font-weight: 600; color: #1e293b; text-align: center; margin-bottom: 8px;">
            Verify your email address
          </h2>
          <p style="font-size: 14px; color: #64748b; text-align: center; margin-bottom: 32px; line-height: 1.6;">
            Use the verification code below to complete your registration. This code expires in <strong>10 minutes</strong>.
          </p>
          <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); border-radius: 10px; padding: 24px; text-align: center; margin-bottom: 32px;">
            <span style="font-size: 36px; font-weight: 700; letter-spacing: 10px; color: #ffffff; font-family: 'Courier New', monospace;">${otp}</span>
          </div>
          <p style="font-size: 13px; color: #94a3b8; text-align: center; line-height: 1.6;">
            If you didn't request this code, you can safely ignore this email.
          </p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="font-size: 12px; color: #cbd5e1; text-align: center;">
            &copy; ${new Date().getFullYear()} Gigly. All rights reserved.
          </p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`OTP email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send OTP email to ${email}`, error);
      throw error;
    }
  }
}
