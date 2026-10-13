import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { IUserRepository } from '../../../../domain/repositories/user.repository.interface';
import { IRefreshTokenRepository } from '../../../../domain/repositories/refresh-token.repository.interface';
import { IRefreshTokenHashingService } from '../../../../domain/services/refresh-token-hashing.service.interface';
import { ITokenService } from '../../../../domain/services/token.service.interface';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { LoginInputDto } from '../../../dto/auth/login-input.dto';
import { AuthResponseDto } from '../../../dto/auth/auth-response.dto';
import { UserMapper } from '../../../mappers/user.mapper';
import { ILoginUseCase } from '../interface/login.use-case.interface';

@Injectable()
export class LoginUseCase implements ILoginUseCase {
  constructor(
    @Inject(IUserRepository) private readonly userRepository: IUserRepository,
    @Inject(IRefreshTokenRepository)
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    @Inject(IRefreshTokenHashingService)
    private readonly refreshTokenHashingService: IRefreshTokenHashingService,
    @Inject(ITokenService)
    private readonly tokenService: ITokenService,
  ) {}

  async execute(data: LoginInputDto): Promise<AuthResponseDto> {
    // 1. Find user by email
    const user = await this.userRepository.findByEmail(data.email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 2. Check if the password is valid
    const isPasswordValid = await bcrypt.compare(
      data.password,
      user.passWordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 3. Account status check: User must be active and not blocked
    if (!user.canAuthenticate()) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 4. Issue access token through ITokenService
    const access_token = await this.tokenService.issueAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    // 5. Issue refresh token through ITokenService
    const refreshTokenResult = await this.tokenService.issueRefreshToken({
      sub: user.id,
    });

    // 6. Hash refresh token before database persistence (never store raw refresh JWT)
    const tokenHash = this.refreshTokenHashingService.hash(
      refreshTokenResult.token,
    );

    // 7. Generate a new unique sessionId for this login session
    const sessionId = crypto.randomUUID();

    // 8. Save refresh token hash, user ID, session ID, and token service expiry to DB
    await this.refreshTokenRepository.create({
      tokenHash,
      userId: user.id,
      expiresAt: refreshTokenResult.expiresAt,
      sessionId,
    });

    return {
      access_token,
      refresh_token: refreshTokenResult.token,
      user: UserMapper.toResponseDto(user),
    };
  }
}
