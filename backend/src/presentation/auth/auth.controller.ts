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
import type { Request, Response, CookieOptions } from 'express';
import { ConfigService } from '@nestjs/config';
import { ILoginUseCase } from '../../application/use-cases/auth/interface/login.use-case.interface';
import { IRefreshUseCase } from '../../application/use-cases/auth/interface/refresh.use-case.interface';
import { ISendOtpUseCase } from '../../application/use-cases/auth/interface/send-otp.use-case.interface';
import { IVerifyOtpAndRegisterUseCase } from '../../application/use-cases/auth/interface/verify-otp-register.use-case.interface';
import { IGetMeUseCase } from '../../application/use-cases/auth/interface/get-me.use-case.interface';
import { ILogoutUseCase } from '../../application/use-cases/auth/interface/logout.use-case.interface';
import { IForgotPasswordUseCase } from '../../application/use-cases/auth/interface/forgot-password.use-case.interface';
import { IVerifyPasswordResetOtpUseCase } from '../../application/use-cases/auth/interface/verify-password-reset-otp.use-case.interface';
import { IResetPasswordUseCase } from '../../application/use-cases/auth/interface/reset-password.use-case.interface';
import { LoginInputDto } from '../../application/dto/auth/login-input.dto';
import { SendOtpInputDto } from '../../application/dto/auth/send-otp-input.dto';
import { VerifyOtpInputDto } from '../../application/dto/auth/verify-otp-input.dto';
import { ForgotPasswordInputDto } from '../../application/dto/auth/forgot-password-input.dto';
import { VerifyResetOtpInputDto } from '../../application/dto/auth/verify-reset-otp-input.dto';
import { ResetPasswordInputDto } from '../../application/dto/auth/reset-password-input.dto';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { OtpRateLimitGuard } from '../guards/otp-rate-limit.guard';
import { LoginRateLimitGuard } from '../guards/login-rate-limit.guard';
import { CurrentUser } from '../decorators/current-user.decorator';

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
    private readonly configService: ConfigService,
  ) {}

  private getRefreshCookieOptions(): CookieOptions {
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';
    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      path: '/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    };
  }

  private getClearCookieOptions(): CookieOptions {
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';
    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      path: '/auth',
    };
  }

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

    if (result.refresh_token) {
      res.cookie(
        'refresh_token',
        result.refresh_token,
        this.getRefreshCookieOptions(),
      );
    }

    return {
      access_token: result.access_token,
      user: result.user,
    };
  }

  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.refresh_token as string | undefined;
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

    if (result.refresh_token) {
      res.cookie(
        'refresh_token',
        result.refresh_token,
        this.getRefreshCookieOptions(),
      );
    }

    return {
      access_token: result.access_token,
    };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.WORKER, Role.RECRUITER)
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser('id') userId: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.refresh_token as string | undefined;
    if (
      !refreshToken ||
      typeof refreshToken !== 'string' ||
      !refreshToken.trim()
    ) {
      throw new UnauthorizedException('Refresh token is required');
    }

    const result = await this.logoutUseCase.execute(userId, {
      refresh_token: refreshToken,
    });

    res.clearCookie('refresh_token', this.getClearCookieOptions());

    return result;
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
}
