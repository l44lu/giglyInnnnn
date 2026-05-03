import { Injectable } from '@nestjs/common';
import { IRefreshTokenRepository } from '../../domain/repositories/refresh-token.repository.interface';
import { RefreshTokenEntity } from '../../domain/entities/refresh-token.entity';
import { PrismaService } from '../prisma/prisma.service';
import { RefreshToken } from '@prisma/client';

@Injectable()
export class PrismaRefreshTokenRepository implements IRefreshTokenRepository {
  constructor(private prisma: PrismaService) {}

  private mapToDomain(token: RefreshToken): RefreshTokenEntity {
    return new RefreshTokenEntity({
      id: token.id,
      token: token.token,
      userId: token.userId,
      expiresAt: token.expiresAt,
      createdAt: token.createdAt,
    });
  }

  async findByToken(token: string): Promise<RefreshTokenEntity | null> {
    const refreshToken = await this.prisma.refreshToken.findUnique({
      where: { token },
    });
    if (!refreshToken) return null;
    return this.mapToDomain(refreshToken);
  }

  async create(data: Partial<RefreshTokenEntity>): Promise<RefreshTokenEntity> {
    const refreshToken = await this.prisma.refreshToken.create({
      data: {
        token: data.token!,
        userId: data.userId!,
        expiresAt: data.expiresAt!,
      },
    });
    return this.mapToDomain(refreshToken);
  }
}
