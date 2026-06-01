import { Controller, Post, Body, Inject } from '@nestjs/common';
import { ILoginUseCase } from '../../application/use-cases/auth/interface/login.use-case.interface';
import { IRefreshUseCase } from '../../application/use-cases/auth/interface/refresh.use-case.interface';
import { ISendOtpUseCase } from '../../application/use-cases/auth/interface/send-otp.use-case.interface';
import { IVerifyOtpAndRegisterUseCase } from '../../application/use-cases/auth/interface/verify-otp-register.use-case.interface';
import { LoginInputDto } from '../../application/dto/auth/login-input.dto';
import { RefreshInputDto } from '../../application/dto/auth/refresh-input.dto';
import { SendOtpInputDto } from '../../application/dto/auth/send-otp-input.dto';
import { VerifyOtpInputDto } from '../../application/dto/auth/verify-otp-input.dto';

@Controller('auth')
export class AuthController {
  constructor(
    @Inject(ILoginUseCase)
    private readonly loginUseCase: ILoginUseCase,
    @Inject(IRefreshUseCase)
    private readonly refreshUseCase: IRefreshUseCase,
    @Inject(ISendOtpUseCase)
    private readonly sendOtpUseCase: ISendOtpUseCase,
    @Inject(IVerifyOtpAndRegisterUseCase)
    private readonly verifyOtpAndRegisterUseCase: IVerifyOtpAndRegisterUseCase,
  ) {}

  @Post('register/send-otp')
  async sendOtp(@Body() body: SendOtpInputDto) {
    return this.sendOtpUseCase.execute(body);
  }

  @Post('register/verify-otp')
  async verifyOtpAndRegister(@Body() body: VerifyOtpInputDto) {
    return this.verifyOtpAndRegisterUseCase.execute(body);
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
