import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from './infrastructure/prisma/prisma.service';
import { AuthController } from './presentation/auth/auth.controller';
import { RegisterUseCase } from './application/auth/register.use-case';
import { LoginUseCase } from './application/auth/login.use-case';

@Module({
  imports: [
    JwtModule.register({
      secret: 'SECRET_JWT_KEY',
      signOptions: { expiresIn: '2d' },
    }),
  ],
  controllers: [AuthController],
  providers: [PrismaService, RegisterUseCase, LoginUseCase],
})
export class AppModule {}
