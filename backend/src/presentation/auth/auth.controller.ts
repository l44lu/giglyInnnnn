import { Controller, Post, Body, Inject } from '@nestjs/common';
import { IRegisterUseCase } from '../../application/use-cases/auth/interface/register.use-case.interface';
import { ILoginUseCase } from '../../application/use-cases/auth/interface/login.use-case.interface';
import { IRefreshUseCase } from '../../application/use-cases/auth/interface/refresh.use-case.interface';
import { RegisterInputDto } from '../../application/dto/auth/register-input.dto';
import { LoginInputDto } from '../../application/dto/auth/login-input.dto';
import { RefreshInputDto } from '../../application/dto/auth/refresh-input.dto';

@Controller('auth')
export class AuthController {
  constructor(
    @Inject(IRegisterUseCase)
    private readonly registerUseCase: IRegisterUseCase,
    @Inject(ILoginUseCase)
    private readonly loginUseCase: ILoginUseCase,
    @Inject(IRefreshUseCase)
    private readonly refreshUseCase: IRefreshUseCase,
  ) { }

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
