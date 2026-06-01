import { Module } from '@nestjs/common';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
import { PrismaService } from './infrastructure/prisma/prisma.service';
import { AuthController } from './presentation/auth/auth.controller';
import { LoginUseCase } from './application/use-cases/auth/implementation/login.use-case';
import { RefreshUseCase } from './application/use-cases/auth/implementation/refresh.use-case';
import { SendOtpUseCase } from './application/use-cases/auth/implementation/send-otp.use-case';
import { VerifyOtpAndRegisterUseCase } from './application/use-cases/auth/implementation/verify-otp-register.use-case';
import { ILoginUseCase } from './application/use-cases/auth/interface/login.use-case.interface';
import { IRefreshUseCase } from './application/use-cases/auth/interface/refresh.use-case.interface';
import { ISendOtpUseCase } from './application/use-cases/auth/interface/send-otp.use-case.interface';
import { IVerifyOtpAndRegisterUseCase } from './application/use-cases/auth/interface/verify-otp-register.use-case.interface';
import { LoggerModule } from './infrastructure/logger/logger.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { IUserRepository } from './domain/repositories/user.repository.interface';
import { PrismaUserRepository } from './infrastructure/repositories/prisma-user.repository';
import { IRefreshTokenRepository } from './domain/repositories/refresh-token.repository.interface';
import { PrismaRefreshTokenRepository } from './infrastructure/repositories/prisma-refresh-token.repository';
import { IOtpRepository } from './domain/repositories/otp.repository.interface';
import { PrismaOtpRepository } from './infrastructure/repositories/prisma-otp.repository';
import { IEmailService } from './domain/services/email.service.interface';
import { NodemailerEmailService } from './infrastructure/email/nodemailer-email.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    LoggerModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: (configService.get<string>('JWT_EXPIRES_IN') ??
            '1h') as JwtSignOptions['expiresIn'],
        },
      }),
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
      provide: IEmailService,
      useClass: NodemailerEmailService,
    },
  ],
})
export class AppModule {}
