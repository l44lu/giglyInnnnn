import { Controller, Post, Body } from '@nestjs/common';
import type {
  RegisterUseCase,
  RegisterInput,
} from 'src/application/auth/register.use-case';
import type {
  LoginUseCase,
  LoginInput,
} from 'src/application/auth/login.use-case';

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
