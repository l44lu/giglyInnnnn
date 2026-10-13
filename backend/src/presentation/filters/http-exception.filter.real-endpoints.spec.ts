import {
  INestApplication,
  NotFoundException,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { HttpExceptionFilter } from './http-exception.filter';
import { ResponseInterceptor } from '../interceptors/response.interceptor';
import { AuthCookieService } from '../auth/services/auth-cookie.service';
import { AuthController } from '../auth/auth.controller';
import { SkillsController } from '../skills/skills.controller';
import { AdminUserManagementController } from '../admin/admin-user-management.controller';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { OtpRateLimitGuard } from '../guards/otp-rate-limit.guard';
import { LoginRateLimitGuard } from '../guards/login-rate-limit.guard';
import { Role } from '../../domain/enums/role.enum';
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
import { IGetSkillsCatalogUseCase } from '../../application/use-cases/worker-profile/interface/get-skills-catalog.use-case.interface';
import { IGetWorkerSkillsUseCase } from '../../application/use-cases/worker-profile/interface/get-worker-skills.use-case.interface';
import { IUpdateWorkerSkillsUseCase } from '../../application/use-cases/worker-profile/interface/update-worker-skills.use-case.interface';
import { IListAdminUserUseCase } from '../../application/use-cases/admin-user-management/interface/list-admin-users.use-case.interface';
import { IGetAdminUserUseCase } from '../../application/use-cases/admin-user-management/interface/get-admin-user.use-case.interface';
import { IUpdateAdminUserUseCase } from '../../application/use-cases/admin-user-management/interface/update-admin-user.use-case.interface';
import { IChangeAdminUserRoleUseCase } from '../../application/use-cases/admin-user-management/interface/change-admin-user-role.use-case.interface';
import { ISetAdminUserBlockStatusUseCase } from '../../application/use-cases/admin-user-management/interface/set-admin-user-block-status.use-case.interface';
import { IDeactivateAdminUserUseCase } from '../../application/use-cases/admin-user-management/interface/deactivate-admin-user.use-case.interface';
import { JwtService } from '@nestjs/jwt';

describe('HttpExceptionFilter with Real Production Controllers & Guards', () => {
  let app: INestApplication;
  let loginUseCase: { execute: jest.Mock };
  let getWorkerSkillsUseCase: { execute: jest.Mock };
  let authenticatedUser: { id: string; role: Role } | null = null;

  beforeAll(async () => {
    loginUseCase = { execute: jest.fn() };
    getWorkerSkillsUseCase = { execute: jest.fn() };

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [
        AuthController,
        SkillsController,
        AdminUserManagementController,
      ],
      providers: [
        { provide: ILoginUseCase, useValue: loginUseCase },
        { provide: IRefreshUseCase, useValue: { execute: jest.fn() } },
        { provide: ISendOtpUseCase, useValue: { execute: jest.fn() } },
        {
          provide: IVerifyOtpAndRegisterUseCase,
          useValue: { execute: jest.fn() },
        },
        { provide: IGetMeUseCase, useValue: { execute: jest.fn() } },
        { provide: ILogoutUseCase, useValue: { execute: jest.fn() } },
        { provide: IForgotPasswordUseCase, useValue: { execute: jest.fn() } },
        {
          provide: IVerifyPasswordResetOtpUseCase,
          useValue: { execute: jest.fn() },
        },
        { provide: IResetPasswordUseCase, useValue: { execute: jest.fn() } },
        { provide: IChangePasswordUseCase, useValue: { execute: jest.fn() } },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('test') },
        },
        { provide: AuthCookieService, useClass: AuthCookieService },
        { provide: JwtService, useValue: { verifyAsync: jest.fn() } },
        { provide: IGetSkillsCatalogUseCase, useValue: { execute: jest.fn() } },
        { provide: IGetWorkerSkillsUseCase, useValue: getWorkerSkillsUseCase },
        {
          provide: IUpdateWorkerSkillsUseCase,
          useValue: { execute: jest.fn() },
        },
        { provide: IListAdminUserUseCase, useValue: { execute: jest.fn() } },
        { provide: IGetAdminUserUseCase, useValue: { execute: jest.fn() } },
        { provide: IUpdateAdminUserUseCase, useValue: { execute: jest.fn() } },
        {
          provide: IChangeAdminUserRoleUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: ISetAdminUserBlockStatusUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: IDeactivateAdminUserUseCase,
          useValue: { execute: jest.fn() },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: any) => {
          if (!authenticatedUser) {
            throw new UnauthorizedException('Authentication token is missing');
          }
          const req = context.switchToHttp().getRequest();
          req.user = authenticatedUser;
          return true;
        },
      })
      .overrideGuard(OtpRateLimitGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(LoginRateLimitGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    const reflector = app.get(Reflector);

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalInterceptors(new ResponseInterceptor(reflector));
    app.useGlobalFilters(new HttpExceptionFilter());

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    authenticatedUser = null;
  });

  it('1. Authentication Failure: POST /auth/login with invalid credentials returns 401 ApiErrorResponse', async () => {
    loginUseCase.execute.mockRejectedValue(
      new UnauthorizedException('Invalid credentials'),
    );

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'valid@example.com', password: 'wrongpassword' })
      .expect(401);

    expect(res.body).toEqual({
      success: false,
      statusCode: 401,
      message: 'Invalid credentials',
      data: null,
    });
  });

  it('2. Authentication Requirement: GET /auth/me without authentication returns 401 ApiErrorResponse', async () => {
    authenticatedUser = null;

    const res = await request(app.getHttpServer()).get('/auth/me').expect(401);

    expect(res.body).toEqual({
      success: false,
      statusCode: 401,
      message: 'Authentication token is missing',
      data: null,
    });
  });

  it('3. Authorization Failure: GET /admin/users with WORKER role returns 403 ApiErrorResponse', async () => {
    authenticatedUser = { id: 'usr_worker_1', role: Role.WORKER };

    const res = await request(app.getHttpServer())
      .get('/admin/users')
      .expect(403);

    expect(res.body).toEqual({
      success: false,
      statusCode: 403,
      message:
        'Forbidden resource. Requires one of the following roles: [ADMIN]',
      data: null,
    });
  });

  it('4. Not Found: GET /worker/skills when worker profile does not exist returns 404 ApiErrorResponse', async () => {
    authenticatedUser = { id: 'usr_worker_missing', role: Role.WORKER };
    getWorkerSkillsUseCase.execute.mockRejectedValue(
      new NotFoundException('Worker profile not found'),
    );

    const res = await request(app.getHttpServer())
      .get('/worker/skills')
      .expect(404);

    expect(res.body).toEqual({
      success: false,
      statusCode: 404,
      message: 'Worker profile not found',
      data: null,
    });
  });

  it('5. Validation Failure: POST /auth/login with invalid email format returns 400 ApiErrorResponse with validation errors', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'not-an-email', password: 'secret' })
      .expect(400);

    expect(res.body).toEqual({
      success: false,
      statusCode: 400,
      message: 'Validation failed',
      errors: expect.arrayContaining([expect.stringContaining('email')]),
      data: null,
    });
  });
});
