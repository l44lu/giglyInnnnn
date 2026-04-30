import { Controller, Post, Body } from '@nestjs/common';
import { RegisterUseCase } from '../../application/use-cases/auth/register.use-case';
import type { RegisterInput } from '../../application/use-cases/auth/register.use-case';
import { LoginUseCase } from '../../application/use-cases/auth/login.use-case';
import type { LoginInput } from '../../application/use-cases/auth/login.use-case';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly loginUseCase: LoginUseCase,
  ) {}

  @Post('register')
  async register(@Body() body: RegisterInput) {
    return this.registerUseCase.execute(body);
  }

  @Post('login')
  async login(@Body() body: LoginInput) {
    return this.loginUseCase.execute(body);
  }
}
