import { Module } from '@nestjs/common';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
import { PrismaService } from './infrastructure/prisma/prisma.service';
import { AuthController } from './presentation/auth/auth.controller';
import { RegisterUseCase } from './application/use-cases/auth/register.use-case';
import { LoginUseCase } from './application/use-cases/auth/login.use-case';
import { RefreshUseCase } from './application/use-cases/auth/refresh.use-case';
import { LoggerModule } from './infrastructure/logger/logger.module';
import { ConfigModule, ConfigService } from '@nestjs/config';

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
  providers: [PrismaService, RegisterUseCase, LoginUseCase, RefreshUseCase],
})
export class AppModule {}
