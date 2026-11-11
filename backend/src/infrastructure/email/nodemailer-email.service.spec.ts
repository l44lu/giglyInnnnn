import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { NodemailerEmailService } from './nodemailer-email.service';

jest.mock('nodemailer');

describe('NodemailerEmailService', () => {
  let service: NodemailerEmailService;
  let mockSendMail: jest.Mock;
  let loggerLogSpy: jest.SpyInstance;
  let loggerErrorSpy: jest.SpyInstance;

  const createMockConfigService = () => {
    return {
      get: jest.fn((key: string) => {
        if (key === 'SMTP_HOST') return 'smtp.example.com';
        if (key === 'SMTP_PORT') return 587;
        if (key === 'SMTP_USER') return 'test@example.com';
        if (key === 'SMTP_PASS') return 'test-pass';
        if (key === 'SMTP_FROM') return 'noreply@example.com';
        return null;
      }),
    } as unknown as ConfigService;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockSendMail = jest.fn().mockResolvedValue({ messageId: 'test-msg-id' });
    (nodemailer.createTransport as jest.Mock).mockReturnValue({
      sendMail: mockSendMail,
    });

    loggerLogSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();

    service = new NodemailerEmailService(createMockConfigService());
  });

  afterEach(() => {
    loggerLogSpy.mockRestore();
    loggerErrorSpy.mockRestore();
  });

  describe('sendOtpEmail (Registration OTP Security)', () => {
    const testEmail = 'newuser@example.com';
    const testOtp = '849201';

    it('should dispatch email with recipient, subject, and HTML content', async () => {
      await service.sendOtpEmail(testEmail, testOtp);

      expect(mockSendMail).toHaveBeenCalledTimes(1);
      const mailOptions = mockSendMail.mock.calls[0][0];
      expect(mailOptions.to).toBe(testEmail);
      expect(mailOptions.subject).toBe('Gigly - Verify your email');
      expect(mailOptions.html).toContain(testOtp);
    });

    it('Security Invariant: should log event WITHOUT exposing plaintext OTP in logs', async () => {
      await service.sendOtpEmail(testEmail, testOtp);

      // Verify safe operational log
      expect(loggerLogSpy).toHaveBeenCalledWith('OTP email sent successfully');
      expect(loggerErrorSpy).not.toHaveBeenCalled();

      // Strictly verify that the plaintext OTP and sensitive data NEVER appear in any logger call
      for (const call of loggerLogSpy.mock.calls) {
        const logMessage = String((call as unknown[])[0]);
        expect(logMessage).not.toContain(testOtp);
        expect(logMessage).not.toContain('with otp');
        expect(logMessage).not.toContain(testEmail);
      }
    });

    it('should log error and rethrow if sendMail fails', async () => {
      const error = new Error('SMTP connection timed out');
      mockSendMail.mockRejectedValue(error);

      await expect(service.sendOtpEmail(testEmail, testOtp)).rejects.toThrow(
        error,
      );

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Failed to send OTP email',
        error,
      );
      expect(loggerLogSpy).not.toHaveBeenCalled();

      for (const call of loggerErrorSpy.mock.calls) {
        const logMessage = String((call as unknown[])[0]);
        expect(logMessage).not.toContain(testOtp);
        expect(logMessage).not.toContain(testEmail);
      }
    });
  });

  describe('sendPasswordResetOtpEmail (Password Reset OTP Security)', () => {
    const testEmail = 'existinguser@example.com';
    const resetOtp = '517392';

    it('should dispatch password reset email correctly', async () => {
      await service.sendPasswordResetOtpEmail(testEmail, resetOtp);

      expect(mockSendMail).toHaveBeenCalledTimes(1);
      const mailOptions = mockSendMail.mock.calls[0][0];
      expect(mailOptions.to).toBe(testEmail);
      expect(mailOptions.subject).toBe('Gigly - Password Reset Code');
      expect(mailOptions.html).toContain(resetOtp);
    });

    it('Security Invariant: should log event WITHOUT exposing plaintext reset OTP in logs', async () => {
      await service.sendPasswordResetOtpEmail(testEmail, resetOtp);

      // Verify safe operational log
      expect(loggerLogSpy).toHaveBeenCalledWith(
        'Password reset OTP email sent successfully',
      );
      expect(loggerErrorSpy).not.toHaveBeenCalled();

      // Strictly verify that the reset OTP and sensitive data NEVER appear in any logger call
      for (const call of loggerLogSpy.mock.calls) {
        const logMessage = String((call as unknown[])[0]);
        expect(logMessage).not.toContain(resetOtp);
        expect(logMessage).not.toContain('with otp');
        expect(logMessage).not.toContain(testEmail);
      }
    });

    it('should log error and rethrow if password reset email fails', async () => {
      const error = new Error('SMTP rejected');
      mockSendMail.mockRejectedValue(error);

      await expect(
        service.sendPasswordResetOtpEmail(testEmail, resetOtp),
      ).rejects.toThrow(error);

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Failed to send password reset OTP email',
        error,
      );
      expect(loggerLogSpy).not.toHaveBeenCalled();

      for (const call of loggerErrorSpy.mock.calls) {
        const logMessage = String((call as unknown[])[0]);
        expect(logMessage).not.toContain(resetOtp);
        expect(logMessage).not.toContain(testEmail);
      }
    });
  });
});
