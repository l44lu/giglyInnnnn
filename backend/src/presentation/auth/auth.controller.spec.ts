import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { ILoginUseCase } from '../../application/use-cases/auth/interface/login.use-case.interface';
import { IRefreshUseCase } from '../../application/use-cases/auth/interface/refresh.use-case.interface';
import { ISendOtpUseCase } from '../../application/use-cases/auth/interface/send-otp.use-case.interface';
import { IVerifyOtpAndRegisterUseCase } from '../../application/use-cases/auth/interface/verify-otp-register.use-case.interface';
import { IGetMeUseCase } from '../../application/use-cases/auth/interface/get-me.use-case.interface';
import { ILogoutUseCase } from '../../application/use-cases/auth/interface/logout.use-case.interface';
import { IForgotPasswordUseCase } from '../../application/use-cases/auth/interface/forgot-password.use-case.interface';
import { IVerifyPasswordResetOtpUseCase } from '../../application/use-cases/auth/interface/verify-password-reset-otp.use-case.interface';
import { IResetPasswordUseCase } from '../../application/use-cases/auth/interface/reset-password.use-case.interface';
import { IUserRepository } from '../../domain/repositories/user.repository.interface';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import { UserResponseDto } from '../../application/dto/user/user-response.dto';
import type { Request, Response } from 'express';

describe('AuthController - /auth/login, /auth/refresh, /auth/logout, /auth/me', () => {
  let controller: AuthController;
  let loginUseCase: jest.Mocked<ILoginUseCase>;
  let refreshUseCase: jest.Mocked<IRefreshUseCase>;
  let getMeUseCase: jest.Mocked<IGetMeUseCase>;
  let logoutUseCase: jest.Mocked<ILogoutUseCase>;
  let forgotPasswordUseCase: jest.Mocked<IForgotPasswordUseCase>;
  let verifyPasswordResetOtpUseCase: jest.Mocked<IVerifyPasswordResetOtpUseCase>;
  let resetPasswordUseCase: jest.Mocked<IResetPasswordUseCase>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    loginUseCase = {
      execute: jest.fn(),
    };

    refreshUseCase = {
      execute: jest.fn(),
    };

    getMeUseCase = {
      execute: jest.fn(),
    };

    logoutUseCase = {
      execute: jest.fn(),
    };

    forgotPasswordUseCase = {
      execute: jest.fn(),
    };

    verifyPasswordResetOtpUseCase = {
      execute: jest.fn(),
    };

    resetPasswordUseCase = {
      execute: jest.fn(),
    };

    configService = {
      get: jest.fn(),
    } as unknown as jest.Mocked<ConfigService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: ILoginUseCase, useValue: loginUseCase },
        { provide: IRefreshUseCase, useValue: refreshUseCase },
        { provide: ISendOtpUseCase, useValue: { execute: jest.fn() } },
        {
          provide: IVerifyOtpAndRegisterUseCase,
          useValue: { execute: jest.fn() },
        },
        { provide: IGetMeUseCase, useValue: getMeUseCase },
        { provide: ILogoutUseCase, useValue: logoutUseCase },
        { provide: IForgotPasswordUseCase, useValue: forgotPasswordUseCase },
        {
          provide: IVerifyPasswordResetOtpUseCase,
          useValue: verifyPasswordResetOtpUseCase,
        },
        { provide: IResetPasswordUseCase, useValue: resetPasswordUseCase },
        {
          provide: IUserRepository,
          useValue: { findById: jest.fn(), findByEmail: jest.fn() },
        },
        { provide: JwtService, useValue: { verifyAsync: jest.fn() } },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /auth/login', () => {
    it('should set HttpOnly refresh_token cookie and return access_token and user without refresh_token in body', async () => {
      configService.get.mockReturnValue('development');
      const userResponse = new UserResponseDto({
        id: 'user-1',
        email: 'user@example.com',
        role: Role.WORKER,
        firstName: 'John',
        lastName: 'Doe',
        createdAt: new Date(),
      });

      loginUseCase.execute.mockResolvedValue({
        access_token: 'access.jwt.token',
        refresh_token: 'raw.refresh.jwt.token',
        user: userResponse,
      });

      const mockRes = {
        cookie: jest.fn(),
      } as unknown as Response;

      const body = { email: 'user@example.com', password: 'Password123!' };
      const result = await controller.login(body, mockRes);

      expect(loginUseCase.execute).toHaveBeenCalledWith(body);
      expect(mockRes.cookie).toHaveBeenCalledWith(
        'refresh_token',
        'raw.refresh.jwt.token',
        {
          httpOnly: true,
          secure: false,
          sameSite: 'strict',
          path: '/auth',
          maxAge: 7 * 24 * 60 * 60 * 1000,
        },
      );

      expect(result).toEqual({
        access_token: 'access.jwt.token',
        user: userResponse,
      });
      expect(
        (result as unknown as Record<string, unknown>).refresh_token,
      ).toBeUndefined();
    });

    it('should set secure: true when NODE_ENV is production', async () => {
      configService.get.mockReturnValue('production');
      const userResponse = new UserResponseDto({
        id: 'user-1',
        email: 'user@example.com',
        role: Role.WORKER,
        firstName: 'John',
        lastName: 'Doe',
        createdAt: new Date(),
      });

      loginUseCase.execute.mockResolvedValue({
        access_token: 'access.jwt.token',
        refresh_token: 'raw.refresh.jwt.token',
        user: userResponse,
      });

      const mockRes = {
        cookie: jest.fn(),
      } as unknown as Response;

      await controller.login(
        { email: 'user@example.com', password: 'Password123!' },
        mockRes,
      );

      expect(mockRes.cookie).toHaveBeenCalledWith(
        'refresh_token',
        'raw.refresh.jwt.token',
        expect.objectContaining({
          secure: true,
          httpOnly: true,
          sameSite: 'strict',
          path: '/auth',
        }),
      );
    });
  });

  describe('POST /auth/refresh', () => {
    it('should read refresh_token from cookie, rotate token, set new cookie, and return access_token only', async () => {
      configService.get.mockReturnValue('development');
      refreshUseCase.execute.mockResolvedValue({
        access_token: 'new.access.token',
        refresh_token: 'replacement.refresh.token',
      });

      const mockReq = {
        cookies: {
          refresh_token: 'old.refresh.token',
        },
      } as unknown as Request;

      const mockRes = {
        cookie: jest.fn(),
      } as unknown as Response;

      const result = await controller.refresh(mockReq, mockRes);

      expect(refreshUseCase.execute).toHaveBeenCalledWith({
        refresh_token: 'old.refresh.token',
      });
      expect(mockRes.cookie).toHaveBeenCalledWith(
        'refresh_token',
        'replacement.refresh.token',
        {
          httpOnly: true,
          secure: false,
          sameSite: 'strict',
          path: '/auth',
          maxAge: 7 * 24 * 60 * 60 * 1000,
        },
      );
      expect(result).toEqual({
        access_token: 'new.access.token',
      });
      expect(
        (result as unknown as Record<string, unknown>).refresh_token,
      ).toBeUndefined();
    });

    it('should throw UnauthorizedException when refresh_token cookie is missing', async () => {
      const mockReq = {
        cookies: {},
      } as unknown as Request;

      const mockRes = {
        cookie: jest.fn(),
      } as unknown as Response;

      await expect(controller.refresh(mockReq, mockRes)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(refreshUseCase.execute).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when req.cookies is undefined', async () => {
      const mockReq = {} as Request;
      const mockRes = {
        cookie: jest.fn(),
      } as unknown as Response;

      await expect(controller.refresh(mockReq, mockRes)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(refreshUseCase.execute).not.toHaveBeenCalled();
    });
  });

  describe('POST /auth/logout', () => {
    it('should read refresh_token from cookie, delegate to logoutUseCase, clear cookie, and return success message', async () => {
      configService.get.mockReturnValue('development');
      logoutUseCase.execute.mockResolvedValue({
        message: 'Logged out successfully',
      });

      const mockReq = {
        cookies: {
          refresh_token: 'active.refresh.token',
        },
      } as unknown as Request;

      const mockRes = {
        clearCookie: jest.fn(),
      } as unknown as Response;

      const result = await controller.logout('user-123', mockReq, mockRes);

      expect(result).toEqual({ message: 'Logged out successfully' });
      expect(logoutUseCase.execute).toHaveBeenCalledWith('user-123', {
        refresh_token: 'active.refresh.token',
      });
      expect(mockRes.clearCookie).toHaveBeenCalledWith('refresh_token', {
        httpOnly: true,
        secure: false,
        sameSite: 'strict',
        path: '/auth',
      });
    });

    it('should throw UnauthorizedException when refresh_token cookie is missing on logout', async () => {
      const mockReq = {
        cookies: {},
      } as unknown as Request;

      const mockRes = {
        clearCookie: jest.fn(),
      } as unknown as Response;

      await expect(
        controller.logout('user-123', mockReq, mockRes),
      ).rejects.toThrow(UnauthorizedException);
      expect(logoutUseCase.execute).not.toHaveBeenCalled();
    });
  });

  describe('GET /auth/me', () => {
    it('should return the current authenticated ADMIN user', async () => {
      const adminUser = new UserResponseDto({
        id: 'admin-id-1',
        email: 'admin@gigly.com',
        role: Role.ADMIN,
        firstName: 'Sarah',
        lastName: 'Jenkins',
        createdAt: new Date(),
      });

      getMeUseCase.execute.mockResolvedValue(adminUser);

      const result = await controller.getMe('admin-id-1');

      expect(result).toEqual(adminUser);
      expect(result.role).toBe(Role.ADMIN);
      expect(
        (result as unknown as Record<string, unknown>).passwordHash,
      ).toBeUndefined();
      expect(getMeUseCase.execute).toHaveBeenCalledWith('admin-id-1');
    });

    it('should return the current authenticated WORKER user', async () => {
      const workerUser = new UserResponseDto({
        id: 'worker-id-2',
        email: 'worker@gigly.com',
        role: Role.WORKER,
        firstName: 'Alex',
        lastName: 'Johnson',
        createdAt: new Date(),
      });

      getMeUseCase.execute.mockResolvedValue(workerUser);

      const result = await controller.getMe('worker-id-2');

      expect(result.role).toBe(Role.WORKER);
      expect(getMeUseCase.execute).toHaveBeenCalledWith('worker-id-2');
    });

    it('should return the current authenticated RECRUITER user', async () => {
      const recruiterUser = new UserResponseDto({
        id: 'recruiter-id-3',
        email: 'recruiter@gigly.com',
        role: Role.RECRUITER,
        firstName: 'Emma',
        lastName: 'Watson',
        createdAt: new Date(),
      });

      getMeUseCase.execute.mockResolvedValue(recruiterUser);

      const result = await controller.getMe('recruiter-id-3');

      expect(result.role).toBe(Role.RECRUITER);
      expect(getMeUseCase.execute).toHaveBeenCalledWith('recruiter-id-3');
    });
  });

  describe('POST /auth/forgot-password', () => {
    it('should delegate to forgotPasswordUseCase and return generic success message', async () => {
      const genericResponse = {
        message:
          'If an account with that email exists, a password reset code has been sent.',
      };
      forgotPasswordUseCase.execute.mockResolvedValue(genericResponse);

      const body = { email: 'user@example.com' };
      const result = await controller.forgotPassword(body);

      expect(forgotPasswordUseCase.execute).toHaveBeenCalledWith(body);
      expect(result).toEqual(genericResponse);
    });

    it('should propagate exceptions thrown by forgotPasswordUseCase', async () => {
      forgotPasswordUseCase.execute.mockRejectedValue(
        new Error('SMTP service error'),
      );

      await expect(
        controller.forgotPassword({ email: 'user@example.com' }),
      ).rejects.toThrow('SMTP service error');
    });
  });

  describe('POST /auth/verify-reset-otp', () => {
    it('should delegate to verifyPasswordResetOtpUseCase and return resetToken and success message', async () => {
      const verifyResponse = {
        resetToken: 'a'.repeat(64),
        message: 'Verification successful. You may now reset your password.',
      };
      verifyPasswordResetOtpUseCase.execute.mockResolvedValue(verifyResponse);

      const body = { email: 'user@example.com', otp: '123456' };
      const result = await controller.verifyResetOtp(body);

      expect(verifyPasswordResetOtpUseCase.execute).toHaveBeenCalledWith(body);
      expect(result).toEqual(verifyResponse);
    });

    it('should propagate exceptions thrown by verifyPasswordResetOtpUseCase', async () => {
      verifyPasswordResetOtpUseCase.execute.mockRejectedValue(
        new UnauthorizedException('Invalid or expired password reset request.'),
      );

      await expect(
        controller.verifyResetOtp({
          email: 'user@example.com',
          otp: '000000',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('POST /auth/reset-password', () => {
    it('should delegate to resetPasswordUseCase and return success confirmation', async () => {
      const resetResponse = {
        message:
          'Password has been reset successfully. Please log in with your new password.',
      };
      resetPasswordUseCase.execute.mockResolvedValue(resetResponse);

      const body = {
        resetToken: 'a'.repeat(64),
        newPassword: 'NewSecurePassword123!',
        confirmPassword: 'NewSecurePassword123!',
      };
      const result = await controller.resetPassword(body);

      expect(resetPasswordUseCase.execute).toHaveBeenCalledWith(body);
      expect(result).toEqual(resetResponse);
    });

    it('should propagate exceptions thrown by resetPasswordUseCase', async () => {
      resetPasswordUseCase.execute.mockRejectedValue(
        new UnauthorizedException('Invalid or expired password reset token.'),
      );

      const body = {
        resetToken: 'invalid-token',
        newPassword: 'NewSecurePassword123!',
        confirmPassword: 'NewSecurePassword123!',
      };
      await expect(controller.resetPassword(body)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
