import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
import { PrismaService } from './infrastructure/prisma/prisma.service';
import { SecurityHeadersMiddleware } from './presentation/middleware/security-headers.middleware';
import { AuthController } from './presentation/auth/auth.controller';
import { LoginUseCase } from './application/use-cases/auth/implementation/login.use-case';
import { RefreshUseCase } from './application/use-cases/auth/implementation/refresh.use-case';
import { SendOtpUseCase } from './application/use-cases/auth/implementation/send-otp.use-case';
import { VerifyOtpAndRegisterUseCase } from './application/use-cases/auth/implementation/verify-otp-register.use-case';
import { GetMeUseCase } from './application/use-cases/auth/implementation/get-me.use-case';
import { LogoutUseCase } from './application/use-cases/auth/implementation/logout.use-case';
import { ForgotPasswordUseCase } from './application/use-cases/auth/implementation/forgot-password.use-case';
import { VerifyPasswordResetOtpUseCase } from './application/use-cases/auth/implementation/verify-password-reset-otp.use-case';
import { ResetPasswordUseCase } from './application/use-cases/auth/implementation/reset-password.use-case';
import { ILoginUseCase } from './application/use-cases/auth/interface/login.use-case.interface';
import { IRefreshUseCase } from './application/use-cases/auth/interface/refresh.use-case.interface';
import { ISendOtpUseCase } from './application/use-cases/auth/interface/send-otp.use-case.interface';
import { IVerifyOtpAndRegisterUseCase } from './application/use-cases/auth/interface/verify-otp-register.use-case.interface';
import { IGetMeUseCase } from './application/use-cases/auth/interface/get-me.use-case.interface';
import { ILogoutUseCase } from './application/use-cases/auth/interface/logout.use-case.interface';
import { IForgotPasswordUseCase } from './application/use-cases/auth/interface/forgot-password.use-case.interface';
import { IVerifyPasswordResetOtpUseCase } from './application/use-cases/auth/interface/verify-password-reset-otp.use-case.interface';
import { IResetPasswordUseCase } from './application/use-cases/auth/interface/reset-password.use-case.interface';
import { JwtAuthGuard } from './presentation/guards/jwt-auth.guard';
import { RolesGuard } from './presentation/guards/roles.guard';
import { OtpRateLimitGuard } from './presentation/guards/otp-rate-limit.guard';
import { LoginRateLimitGuard } from './presentation/guards/login-rate-limit.guard';
import { LoggerModule } from './infrastructure/logger/logger.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { IUserRepository } from './domain/repositories/user.repository.interface';
import { PrismaUserRepository } from './infrastructure/repositories/prisma-user.repository';
import { IRefreshTokenRepository } from './domain/repositories/refresh-token.repository.interface';
import { PrismaRefreshTokenRepository } from './infrastructure/repositories/prisma-refresh-token.repository';
import { IOtpRepository } from './domain/repositories/otp.repository.interface';
import { PrismaOtpRepository } from './infrastructure/repositories/prisma-otp.repository';
import { IPasswordResetRepository } from './domain/repositories/password-reset.repository.interface';
import { PrismaPasswordResetRepository } from './infrastructure/repositories/prisma-password-reset.repository';
import { IEmailService } from './domain/services/email.service.interface';
import { NodemailerEmailService } from './infrastructure/email/nodemailer-email.service';
import { IOtpHashingService } from './domain/services/otp-hashing.service.interface';
import { OtpHashingService } from './infrastructure/crypto/otp-hashing.service';
import { IRefreshTokenHashingService } from './domain/services/refresh-token-hashing.service.interface';
import { RefreshTokenHashingService } from './infrastructure/crypto/refresh-token-hashing.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    LoggerModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const issuer = configService.get<string>('JWT_ISSUER') ?? 'gigly-auth';
        const audience =
          configService.get<string>('JWT_AUDIENCE') ?? 'gigly-app';
        return {
          secret: configService.get<string>('JWT_SECRET'),
          signOptions: {
            algorithm: 'HS256',
            expiresIn: (configService.get<string>('JWT_EXPIRES_IN') ??
              '1h') as JwtSignOptions['expiresIn'],
            issuer,
            audience,
          },
          verifyOptions: {
            algorithms: ['HS256'],
            issuer,
            audience,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    PrismaService,
    {
      provide: ISendOtpUseCase,
      useClass: SendOtpUseCase,
    },
    {
      provide: IVerifyOtpAndRegisterUseCase,
      useClass: VerifyOtpAndRegisterUseCase,
    },
    {
      provide: ILoginUseCase,
      useClass: LoginUseCase,
    },
    {
      provide: IRefreshUseCase,
      useClass: RefreshUseCase,
    },
    {
      provide: IUserRepository,
      useClass: PrismaUserRepository,
    },
    {
      provide: IRefreshTokenRepository,
      useClass: PrismaRefreshTokenRepository,
    },
    {
      provide: IOtpRepository,
      useClass: PrismaOtpRepository,
    },
    {
      provide: IPasswordResetRepository,
      useClass: PrismaPasswordResetRepository,
    },
    {
      provide: IEmailService,
      useClass: NodemailerEmailService,
    },
    {
      provide: IOtpHashingService,
      useClass: OtpHashingService,
    },
    {
      provide: IRefreshTokenHashingService,
      useClass: RefreshTokenHashingService,
    },
    {
      provide: IGetMeUseCase,
      useClass: GetMeUseCase,
    },
    {
      provide: ILogoutUseCase,
      useClass: LogoutUseCase,
    },
    {
      provide: IForgotPasswordUseCase,
      useClass: ForgotPasswordUseCase,
    },
    {
      provide: IVerifyPasswordResetOtpUseCase,
      useClass: VerifyPasswordResetOtpUseCase,
    },
    {
      provide: IResetPasswordUseCase,
      useClass: ResetPasswordUseCase,
    },
    JwtAuthGuard,
    RolesGuard,
    OtpRateLimitGuard,
    LoginRateLimitGuard,
    SecurityHeadersMiddleware,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SecurityHeadersMiddleware).forRoutes('*');
  }
}
