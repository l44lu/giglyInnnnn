import { INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { ResponseInterceptor } from './response.interceptor';
import { AuthCookieService } from '../auth/services/auth-cookie.service';
import { AuthController } from '../auth/auth.controller';
import { WorkerProfileController } from '../worker/worker-profile.controller';
import { HealthController } from '../health/health.controller';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { OtpRateLimitGuard } from '../guards/otp-rate-limit.guard';
import { LoginRateLimitGuard } from '../guards/login-rate-limit.guard';
import { ILoginUseCase } from '../../application/use-cases/auth/interface/login.use-case.interface';
import { IRefreshUseCase } from '../../application/use-cases/auth/interface/refresh.use-case.interface';
import { ISendOtpUseCase } from '../../application/use-cases/auth/interface/send-otp.use-case.interface';
import { IVerifyOtpAndRegisterUseCase } from '../../application/use-cases/auth/interface/verify-otp-register.use-case.interface';
import { IGetMeUseCase } from '../../application/use-cases/auth/interface/get-me.use-case.interface';
import { ILogoutUseCase } from '../../application/use-cases/auth/interface/logout.use-case.interface';
import { IForgotPasswordUseCase } from '../../application/use-cases/auth/interface/forgot-password.use-case.interface';
import { IVerifyPasswordResetOtpUseCase } from '../../application/use-cases/auth/interface/verify-password-reset-otp.use-case.interface';
import { IResetPasswordUseCase } from '../../application/use-cases/auth/interface/reset-password.use-case.interface';
import { IChangePasswordUseCase } from '../../application/use-cases/auth/interface/change-password.use-case.interface';
import { IGetWorkerProfileUseCase } from '../../application/use-cases/worker-profile/interface/get-worker-profile.use-case.interface';
import { IUpdateWorkerProfileUseCase } from '../../application/use-cases/worker-profile/interface/update-worker-profile.use-case.interface';
import { IUpdateWorkerPersonalProfileUseCase } from '../../application/use-cases/worker-profile/interface/update-worker-personal-profile.use-case.interface';
import { IUploadWorkerAvatarUseCase } from '../../application/use-cases/worker-profile/interface/upload-worker-avatar.use-case.interface';
import { IGetWorkerAvatarUseCase } from '../../application/use-cases/worker-profile/interface/get-worker-avatar.use-case.interface';

describe('ResponseInterceptor with Real Production Controllers', () => {
  let app: INestApplication;
  let logoutUseCase: { execute: jest.Mock };
  let verifyPasswordResetOtpUseCase: { execute: jest.Mock };
  let getWorkerAvatarUseCase: { execute: jest.Mock };

  beforeAll(async () => {
    logoutUseCase = { execute: jest.fn() };
    verifyPasswordResetOtpUseCase = { execute: jest.fn() };
    getWorkerAvatarUseCase = { execute: jest.fn() };

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AuthController, WorkerProfileController, HealthController],
      providers: [
        { provide: ILoginUseCase, useValue: { execute: jest.fn() } },
        { provide: IRefreshUseCase, useValue: { execute: jest.fn() } },
        { provide: ISendOtpUseCase, useValue: { execute: jest.fn() } },
        {
          provide: IVerifyOtpAndRegisterUseCase,
          useValue: { execute: jest.fn() },
        },
        { provide: IGetMeUseCase, useValue: { execute: jest.fn() } },
        { provide: ILogoutUseCase, useValue: logoutUseCase },
        { provide: IForgotPasswordUseCase, useValue: { execute: jest.fn() } },
        {
          provide: IVerifyPasswordResetOtpUseCase,
          useValue: verifyPasswordResetOtpUseCase,
        },
        { provide: IResetPasswordUseCase, useValue: { execute: jest.fn() } },
        { provide: IChangePasswordUseCase, useValue: { execute: jest.fn() } },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('test') },
        },
        { provide: AuthCookieService, useClass: AuthCookieService },
        { provide: IGetWorkerProfileUseCase, useValue: { execute: jest.fn() } },
        {
          provide: IUpdateWorkerProfileUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: IUpdateWorkerPersonalProfileUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: IUploadWorkerAvatarUseCase,
          useValue: { execute: jest.fn() },
        },
        { provide: IGetWorkerAvatarUseCase, useValue: getWorkerAvatarUseCase },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: any) => {
          const req = context.switchToHttp().getRequest();
          req.user = { id: 'usr_test_123' };
          return true;
        },
      })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(OtpRateLimitGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(LoginRateLimitGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    const reflector = app.get(Reflector);
    app.useGlobalInterceptors(new ResponseInterceptor(reflector));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('Real Message-Only: POST /auth/logout produces { success: true, statusCode: 200, message: "Logged out successfully", data: null }', async () => {
    logoutUseCase.execute.mockResolvedValue({
      message: 'Logged out successfully',
    });

    const res = await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Cookie', ['refresh_token=test_refresh_token'])
      .expect(200);

    expect(res.body).toEqual({
      success: true,
      statusCode: 200,
      message: 'Logged out successfully',
      data: null,
    });
  });

  it('Real Binary Bypass: GET /worker/profile/avatar bypasses envelope and streams raw binary', async () => {
    const rawImageBytes = Buffer.from('fake-jpeg-image-bytes');
    getWorkerAvatarUseCase.execute.mockResolvedValue({
      buffer: rawImageBytes,
      contentType: 'image/jpeg',
    });

    const res = await request(app.getHttpServer())
      .get('/worker/profile/avatar')
      .expect(200);

    expect(res.headers['content-type']).toContain('image/jpeg');
    expect(res.body).toEqual(rawImageBytes);
    expect(res.body.success).toBeUndefined();
    expect(res.body.statusCode).toBeUndefined();
  });

  it('Real Normal JSON: GET /health returns standard wrapped envelope', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);

    expect(res.body).toEqual({
      success: true,
      statusCode: 200,
      message: 'Request successful',
      data: {
        status: 'ok',
        timestamp: expect.any(String),
      },
    });
  });

  it('Real Legitimate Message Property: POST /auth/verify-reset-otp wraps object preserving message in data', async () => {
    verifyPasswordResetOtpUseCase.execute.mockResolvedValue({
      resetToken: 'test-reset-token-abc',
      message: 'Verification successful. You may now reset your password.',
    });

    const res = await request(app.getHttpServer())
      .post('/auth/verify-reset-otp')
      .send({ email: 'worker@example.com', otp: '123456' })
      .expect(200);

    expect(res.body).toEqual({
      success: true,
      statusCode: 200,
      message: 'Request successful',
      data: {
        resetToken: 'test-reset-token-abc',
        message: 'Verification successful. You may now reset your password.',
      },
    });
  });
});
