import { Controller, Post, Body } from '@nestjs/common';
import { RegisterUseCase } from '../../application/use-cases/auth/register.use-case';
import { LoginUseCase } from '../../application/use-cases/auth/login.use-case';
import { RefreshUseCase } from '../../application/use-cases/auth/refresh.use-case';
import { RegisterInputDto } from '../../application/dto/auth/register-input.dto';
import { LoginInputDto } from '../../application/dto/auth/login-input.dto';
import { RefreshInputDto } from '../../application/dto/auth/refresh-input.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshUseCase: RefreshUseCase,
  ) {}

  @Post('register')
  async register(@Body() body: RegisterInputDto) {
    return this.registerUseCase.execute(body);
  }

  @Post('login')
  async login(@Body() body: LoginInputDto) {
    return this.loginUseCase.execute(body);
  }

  @Post('refresh')
  async refresh(@Body() body: RefreshInputDto) {
    return this.refreshUseCase.execute(body);
  }
}
