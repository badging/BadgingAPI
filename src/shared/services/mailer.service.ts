import { Service } from 'typedi';
import nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import * as fs from 'fs';
import * as path from 'path';
import { getEnvVar } from '../config/environment';
import { IEmailOptions } from '../types';
import { logger } from '../logger';

@Service()
export class MailerService {
  private transporter: nodemailer.Transporter<SMTPTransport.SentMessageInfo> | null = null;
  private templatesDir: string;

  constructor() {
    this.templatesDir = path.resolve(__dirname, '../templates/email');
    this.initializeTransporter();
  }

  private initializeTransporter(): void {
    const emailHost = getEnvVar('EMAIL_HOST', false);
    const emailAddress = getEnvVar('EMAIL_ADDRESS', false);
    const emailPassword = getEnvVar('EMAIL_PASSWORD', false);

    if (!emailHost || !emailAddress || !emailPassword) {
      logger.warn('Email service is not configured - emails will not be sent');
      return;
    }

    this.transporter = nodemailer.createTransport({
      service: emailHost,
      auth: {
        user: emailAddress,
        pass: emailPassword,
      },
    });
  }

  /**
   * Send a success email with badge links
   */
  async sendSuccessEmail(options: IEmailOptions): Promise<boolean> {
    if (!this.transporter) {
      logger.error('Email service is not configured');
      return false;
    }

    try {
      const templatePath = path.resolve(this.templatesDir, 'success.html');
      const html = fs.readFileSync(templatePath, { encoding: 'utf-8' });

      const replacedHTML = html
        .replace('{{recipientName}}', options.recipientName)
        .replace('{{badgeName}}', options.badgeName)
        .replace('{{markdownLink}}', options.markdownLink || '')
        .replace('{{htmlLink}}', options.htmlLink || '');

      const mailOptions = {
        from: getEnvVar('EMAIL_ADDRESS'),
        to: options.to,
        subject: 'DEI Badging report',
        html: replacedHTML,
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info('Email sent:', { response: info.response });
      return true;
    } catch (error) {
      logger.error('Error sending success email:', { error });
      return false;
    }
  }

  /**
   * Send a failure email with results/reasons
   */
  async sendFailureEmail(options: IEmailOptions): Promise<boolean> {
    if (!this.transporter) {
      logger.error('Email service is not configured');
      return false;
    }

    try {
      const templatePath = path.resolve(this.templatesDir, 'failure.html');
      const html = fs.readFileSync(templatePath, { encoding: 'utf-8' });

      const replacedHTML = html
        .replace('{{recipientName}}', options.recipientName)
        .replace('{{badgeName}}', options.badgeName)
        .replace('{{results}}', options.results || '');

      const mailOptions = {
        from: getEnvVar('EMAIL_ADDRESS'),
        to: options.to,
        subject: 'DEI Badging report',
        html: replacedHTML,
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info('Email sent:', { response: info.response });
      return true;
    } catch (error) {
      logger.error('Error sending failure email:', { error });
      return false;
    }
  }

  /**
   * Send badging email - determines success or failure based on results param
   */
  async sendBadgingEmail(
    email: string,
    recipientName: string,
    badgeName: string,
    markdownLink: string | null,
    htmlLink: string | null,
    results: string | null = null
  ): Promise<boolean> {
    const options: IEmailOptions = {
      to: email,
      recipientName,
      badgeName,
      markdownLink,
      htmlLink,
      results,
    };

    if (results) {
      return this.sendFailureEmail(options);
    }
    return this.sendSuccessEmail(options);
  }
}
