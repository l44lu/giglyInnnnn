import { Controller, Post, Body } from '@nestjs/common';
import { RegisterUseCase } from '../../application/use-cases/auth/register.use-case';
import type { RegisterInput } from '../../application/use-cases/auth/register.use-case';
import { LoginUseCase } from '../../application/use-cases/auth/login.use-case';
import type { LoginInput } from '../../application/use-cases/auth/login.use-case';
import { RefreshUseCase } from '../../application/use-cases/auth/refresh.use-case';
import type { RefreshInput } from '../../application/use-cases/auth/refresh.use-case';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshUseCase: RefreshUseCase,
  ) {}

  @Post('register')
  async register(@Body() body: RegisterInput) {
    return this.registerUseCase.execute(body);
  }

  @Post('login')
  async login(@Body() body: LoginInput) {
    return this.loginUseCase.execute(body);
  }

  @Post('refresh')
  async refresh(@Body() body: RefreshInput) {
    return this.refreshUseCase.execute(body);
  }
}
