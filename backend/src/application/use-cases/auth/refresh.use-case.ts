import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

export interface RefreshInput {
  refresh_token: string;
}

@Injectable()
export class RefreshUseCase {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async execute(data: RefreshInput) {
    if (!data.refresh_token) {
      throw new UnauthorizedException('Refresh token is required');
    }

    try {
      // verifing the refresh token signature and expiration
      const payload = await this.jwtService.verifyAsync<{ sub: string }>(
        data.refresh_token,
        {
          secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        },
      );

      // this section check if the token exists in the database or not
      const savedToken = await this.prisma.refreshToken.findUnique({
        where: { token: data.refresh_token },
      });

      if (!savedToken) {
        throw new UnauthorizedException('Invalid or revoked refresh token');
      }

      // finding the user
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // section for generating new access token
      const newPayload = { sub: user.id, email: user.email, role: user.role };
      const access_token = await this.jwtService.signAsync(newPayload);

      // (optional) refresh token rotation could be added here but may add if neccessary not decided btw !!!!!!!!

      return {
        access_token,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new UnauthorizedException('Invalid refresh token', errorMessage);
    }
  }
}
