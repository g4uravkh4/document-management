import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export type MailPurpose = 'SIGNUP' | 'RESET_PASSWORD';

export interface SendCodeResult {
  delivered: boolean;
  devCode?: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter | null;
  private readonly from: string;

  constructor(config: ConfigService) {
    const host = config.get<string>('SMTP_HOST');
    this.from = config.get<string>('MAIL_FROM') ?? 'no-reply@cafirm.local';

    if (host) {
      const port = Number(config.get('SMTP_PORT') ?? '587');
      const secure = config.get<string>('SMTP_SECURE') === 'true';
      const timeout = Number(config.get('SMTP_TIMEOUT_MS') ?? '10000');
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        connectionTimeout: timeout,
        greetingTimeout: timeout,
        socketTimeout: timeout,
        auth: {
          user: config.getOrThrow<string>('SMTP_USER'),
          pass: config.getOrThrow<string>('SMTP_PASS'),
        },
      });
    } else {
      this.transporter = null;
    }
  }

  get isEnabled(): boolean {
    return this.transporter !== null;
  }

  async sendVerificationCode(
    to: string,
    code: string,
    purpose: MailPurpose,
  ): Promise<SendCodeResult> {
    if (!this.transporter) {
      this.logger.log(`[dev mail] ${purpose} code for ${to}: ${code}`);
      return { delivered: false, devCode: code };
    }

    const { subject, message } = this.messageFor(purpose, code);
    try {
      await this.transporter.sendMail({
        from: this.from,
        to,
        subject,
        text: message,
        html: this.htmlMessage(subject, message),
      });
    } catch (error) {
      this.logger.error(`Unable to send ${purpose} email`, error);
      throw new ServiceUnavailableException(
        'Email delivery is temporarily unavailable. Please try again later.',
      );
    }
    return { delivered: true };
  }

  private messageFor(
    purpose: MailPurpose,
    code: string,
  ): {
    subject: string;
    message: string;
  } {
    if (purpose === 'SIGNUP') {
      return {
        subject: 'Your CA Firm verification code',
        message: `Your verification code is ${code}. It expires in 15 minutes.`,
      };
    }
    return {
      subject: 'Reset your CA Firm password',
      message: `Your password reset code is ${code}. It expires in 15 minutes. If you did not request this, you can ignore this email.`,
    };
  }

  private htmlMessage(subject: string, text: string): string {
    return `<div style="font-family:Arial,sans-serif;padding:24px">
      <h2 style="margin-top:0">${subject}</h2>
      <p>${text}</p>
    </div>`;
  }
}
