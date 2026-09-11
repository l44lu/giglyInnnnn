import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { IUserRepository } from '../../../../domain/repositories/user.repository.interface';
import { IRefreshTokenRepository } from '../../../../domain/repositories/refresh-token.repository.interface';
import { IRefreshTokenHashingService } from '../../../../domain/services/refresh-token-hashing.service.interface';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { LoginInputDto } from '../../../dto/auth/login-input.dto';
import { AuthResponseDto } from '../../../dto/auth/auth-response.dto';
import { UserMapper } from '../../../mappers/user.mapper';
import { ILoginUseCase } from '../interface/login.use-case.interface';

@Injectable()
export class LoginUseCase implements ILoginUseCase {
  constructor(
    @Inject(IUserRepository) private userRepository: IUserRepository,
    @Inject(IRefreshTokenRepository)
    private refreshTokenRepository: IRefreshTokenRepository,
    @Inject(IRefreshTokenHashingService)
    private refreshTokenHashingService: IRefreshTokenHashingService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async execute(data: LoginInputDto): Promise<AuthResponseDto> {
    // find user by email
    const user = await this.userRepository.findByEmail(data.email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    // check if the password is valid
    const isPasswordValid = await bcrypt.compare(
      data.password,
      user.passWordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Account status check (9.4): User must be active and not blocked
    if (!user.canAuthenticate()) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // generate the token
    const payload = { sub: user.id, email: user.email, role: user.role };
    const access_token = await this.jwtService.signAsync(payload);

    // generate refresh token
    const refresh_token = await this.jwtService.signAsync(
      { sub: user.id },
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: (this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ??
          '7d') as JwtSignOptions['expiresIn'],
        jwtid: crypto.randomUUID(),
      },
    );

    // calculate expiration date from DB already mentioned in the .env but still gotta be sure uk :)
    const expiresInDays = 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // Hash refresh token before database persistence (never store raw refresh JWT)
    const tokenHash = this.refreshTokenHashingService.hash(refresh_token);

    // Generate a new unique familyId for this login session
    const familyId = crypto.randomUUID();

    // save refresh token hash to db
    await this.refreshTokenRepository.create({
      token: tokenHash,
      userId: user.id,
      expiresAt,
      familyId,
    });

    return {
      access_token,
      refresh_token,
      user: UserMapper.toResponseDto(user),
    };
  }
}
