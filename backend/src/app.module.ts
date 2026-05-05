import { Module } from '@nestjs/common';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
import { PrismaService } from './infrastructure/prisma/prisma.service';
import { AuthController } from './presentation/auth/auth.controller';
import { RegisterUseCase } from './application/use-cases/auth/implementation/register.use-case';
import { LoginUseCase } from './application/use-cases/auth/implementation/login.use-case';
import { RefreshUseCase } from './application/use-cases/auth/implementation/refresh.use-case';
import { IRegisterUseCase } from './application/use-cases/auth/interface/register.use-case.interface';
import { ILoginUseCase } from './application/use-cases/auth/interface/login.use-case.interface';
import { IRefreshUseCase } from './application/use-cases/auth/interface/refresh.use-case.interface';
import { LoggerModule } from './infrastructure/logger/logger.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { IUserRepository } from './domain/repositories/user.repository.interface';
import { PrismaUserRepository } from './infrastructure/repositories/prisma-user.repository';
import { IRefreshTokenRepository } from './domain/repositories/refresh-token.repository.interface';
import { PrismaRefreshTokenRepository } from './infrastructure/repositories/prisma-refresh-token.repository';

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
      provide: IRegisterUseCase,
      useClass: RegisterUseCase,
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
  ],
})
export class AppModule {}
