import {
  Controller,
  Post,
  Get,
  Body,
  Inject,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ILoginUseCase } from '../../application/use-cases/auth/interface/login.use-case.interface';
import { IRefreshUseCase } from '../../application/use-cases/auth/interface/refresh.use-case.interface';
import { ISendOtpUseCase } from '../../application/use-cases/auth/interface/send-otp.use-case.interface';
import { IVerifyOtpAndRegisterUseCase } from '../../application/use-cases/auth/interface/verify-otp-register.use-case.interface';
import { IGetMeUseCase } from '../../application/use-cases/auth/interface/get-me.use-case.interface';
import { ILogoutUseCase } from '../../application/use-cases/auth/interface/logout.use-case.interface';
import { IForgotPasswordUseCase } from '../../application/use-cases/auth/interface/forgot-password.use-case.interface';
import { IVerifyPasswordResetOtpUseCase } from '../../application/use-cases/auth/interface/verify-password-reset-otp.use-case.interface';
import { IResetPasswordUseCase } from '../../application/use-cases/auth/interface/reset-password.use-case.interface';
import { IChangePasswordUseCase } from '../../application/use-cases/auth/interface/change-password.use-case.interface';
import { LoginInputDto } from '../../application/dto/auth/login-input.dto';
import { SendOtpInputDto } from '../../application/dto/auth/send-otp-input.dto';
import { VerifyOtpInputDto } from '../../application/dto/auth/verify-otp-input.dto';
import { ForgotPasswordInputDto } from '../../application/dto/auth/forgot-password-input.dto';
import { VerifyResetOtpInputDto } from '../../application/dto/auth/verify-reset-otp-input.dto';
import { ResetPasswordInputDto } from '../../application/dto/auth/reset-password-input.dto';
import { ChangePasswordInputDto } from '../../application/dto/auth/change-password-input.dto';
import { Role } from '../../domain/enums/role.enum';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { OtpRateLimitGuard } from '../guards/otp-rate-limit.guard';
import { LoginRateLimitGuard } from '../guards/login-rate-limit.guard';
import { RefreshRateLimitGuard } from '../guards/refresh-rate-limit.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { ResponseMessage } from '../decorators/response-message.decorator';
import { AuthCookieService } from './services/auth-cookie.service';

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
    @Inject(IGetMeUseCase)
    private readonly getMeUseCase: IGetMeUseCase,
    @Inject(ILogoutUseCase)
    private readonly logoutUseCase: ILogoutUseCase,
    @Inject(IForgotPasswordUseCase)
    private readonly forgotPasswordUseCase: IForgotPasswordUseCase,
    @Inject(IVerifyPasswordResetOtpUseCase)
    private readonly verifyPasswordResetOtpUseCase: IVerifyPasswordResetOtpUseCase,
    @Inject(IResetPasswordUseCase)
    private readonly resetPasswordUseCase: IResetPasswordUseCase,
    @Inject(IChangePasswordUseCase)
    private readonly changePasswordUseCase: IChangePasswordUseCase,
    private readonly authCookieService: AuthCookieService,
  ) {}

  @Post('register/send-otp')
  @UseGuards(OtpRateLimitGuard)
  async sendOtp(@Body() body: SendOtpInputDto) {
    return this.sendOtpUseCase.execute(body);
  }

  @Post('register/verify-otp')
  @UseGuards(OtpRateLimitGuard)
  async verifyOtpAndRegister(@Body() body: VerifyOtpInputDto) {
    return this.verifyOtpAndRegisterUseCase.execute(body);
  }

  @Post('login')
  @UseGuards(LoginRateLimitGuard)
  async login(
    @Body() body: LoginInputDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.loginUseCase.execute(body);

    if (result.access_token) {
      this.authCookieService.setAccessCookie(res, result.access_token);
    }

    if (result.refresh_token) {
      this.authCookieService.setRefreshCookie(res, result.refresh_token);
    }

    return {
      user: result.user,
    };
  }

  @Post('refresh')
  @UseGuards(RefreshRateLimitGuard)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = this.authCookieService.getRefreshToken(req);
    if (
      !refreshToken ||
      typeof refreshToken !== 'string' ||
      !refreshToken.trim()
    ) {
      throw new UnauthorizedException('Refresh token is required');
    }

    const result = await this.refreshUseCase.execute({
      refresh_token: refreshToken,
    });

    if (result.access_token) {
      this.authCookieService.setAccessCookie(res, result.access_token);
    }

    if (result.refresh_token) {
      this.authCookieService.setRefreshCookie(res, result.refresh_token);
    }

    return {
      message: 'Tokens refreshed successfully',
    };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.WORKER, Role.RECRUITER)
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Logged out successfully')
  async logout(
    @CurrentUser('id') userId: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const refreshToken = this.authCookieService.getRefreshToken(req);
    if (
      !refreshToken ||
      typeof refreshToken !== 'string' ||
      !refreshToken.trim()
    ) {
      throw new UnauthorizedException('Refresh token is required');
    }

    await this.logoutUseCase.execute(userId, {
      refresh_token: refreshToken,
    });

    this.authCookieService.clearAuthCookies(res);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.WORKER, Role.RECRUITER)
  async getMe(@CurrentUser('id') userId: string) {
    return this.getMeUseCase.execute(userId);
  }

  @Post('forgot-password')
  @UseGuards(OtpRateLimitGuard)
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() body: ForgotPasswordInputDto) {
    return this.forgotPasswordUseCase.execute(body);
  }

  @Post('verify-reset-otp')
  @UseGuards(OtpRateLimitGuard)
  @HttpCode(HttpStatus.OK)
  async verifyResetOtp(@Body() body: VerifyResetOtpInputDto) {
    return this.verifyPasswordResetOtpUseCase.execute(body);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() body: ResetPasswordInputDto) {
    return this.resetPasswordUseCase.execute(body);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.WORKER, Role.RECRUITER)
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() body: ChangePasswordInputDto,
  ) {
    return this.changePasswordUseCase.execute(userId, body);
  }
}
