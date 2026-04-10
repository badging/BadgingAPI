import nodemailer from 'nodemailer';
import * as fs from 'fs';
import { MailerService } from '../../../../src/shared/services/mailer.service';
import * as envConfig from '../../../../src/shared/config/environment';

jest.mock('nodemailer');
jest.mock('fs');

describe('MailerService', () => {
  let service: MailerService;
  let mockTransporter: any;

  const mockEnv: { [key: string]: string } = {
    EMAIL_HOST: 'smtp.gmail.com',
    EMAIL_ADDRESS: 'test@chaoss.org',
    EMAIL_PASSWORD: 'password123',
  };

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.clearAllMocks();

    jest.spyOn(envConfig, 'getEnvVar').mockImplementation((key: string) => mockEnv[key] || '');

    mockTransporter = {
      sendMail: jest.fn().mockResolvedValue({ response: '250 OK' }),
    };
    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);

    service = new MailerService();
  });


  test('sendSuccessEmail() should read template and replace placeholders', async () => {
    const rawTemplate = 'Hello {{recipientName}}, you got {{badgeName}}! {{markdownLink}}';
    (fs.readFileSync as jest.Mock).mockReturnValue(rawTemplate);

    const options = {
      to: 'applicant@example.com',
      recipientName: 'Alice',
      badgeName: 'Gold',
      markdownLink: '[badge](link)',
    };

    const result = await service.sendSuccessEmail(options);

    expect(result).toBe(true);
    expect(fs.readFileSync).toHaveBeenCalled();
    expect(mockTransporter.sendMail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'applicant@example.com',
      html: 'Hello Alice, you got Gold! [badge](link)',
    }));
  });

  test('sendBadgingEmail() should route to success when no results/errors are provided', async () => {
    const successSpy = jest.spyOn(service as any, 'sendSuccessEmail').mockResolvedValue(true);

    await service.sendBadgingEmail('a@b.com', 'Alice', 'Gold', 'md', 'html', null);

    expect(successSpy).toHaveBeenCalled();
  });

  

  test('should return false and log warning if SMTP is not configured', () => {

    jest.spyOn(envConfig, 'getEnvVar').mockReturnValue('');
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

    const unconfiguredService = new MailerService();
    
    expect(unconfiguredService['transporter']).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Email service is not configured'));
    warnSpy.mockRestore();
  });

  test('sendSuccessEmail() should return false if nodemailer fails', async () => {
    (fs.readFileSync as jest.Mock).mockReturnValue('template');
    mockTransporter.sendMail.mockRejectedValue(new Error('SMTP Error'));
    const errorSpy = jest.spyOn(console, 'error').mockImplementation();

    const result = await service.sendSuccessEmail({ to: 'test@test.com' } as any);

    expect(result).toBe(false);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

 

  test('sendFailureEmail() should handle missing optional results string', async () => {
    (fs.readFileSync as jest.Mock).mockReturnValue('Reasons: {{results}}');
    
    await service.sendFailureEmail({ 
        to: 'test@test.com', 
        recipientName: 'Bob', 
        badgeName: 'None',
        results: undefined
    } as any);

    expect(mockTransporter.sendMail).toHaveBeenCalledWith(expect.objectContaining({
      html: 'Reasons: '
    }));
  });
});