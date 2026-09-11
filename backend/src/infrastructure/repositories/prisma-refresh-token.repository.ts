import { Injectable } from '@nestjs/common';
import { IRefreshTokenRepository } from '../../domain/repositories/refresh-token.repository.interface';
import { RefreshTokenEntity } from '../../domain/entities/refresh-token.entity';
import { PrismaService } from '../prisma/prisma.service';
import { RefreshToken, Prisma } from '@prisma/client';
import { PrismaBaseRepository } from './base.repository';

@Injectable()
export class PrismaRefreshTokenRepository
  extends PrismaBaseRepository<RefreshTokenEntity, RefreshToken>
  implements IRefreshTokenRepository
{
  constructor(prisma: PrismaService) {
    super(prisma, prisma.refreshToken);
  }

  protected mapToDomain(token: RefreshToken): RefreshTokenEntity {
    return new RefreshTokenEntity({
      id: token.id,
      token: token.token,
      userId: token.userId,
      expiresAt: token.expiresAt,
      createdAt: token.createdAt,
      familyId: token.familyId,
      revokedAt: token.revokedAt,
    });
  }

  async findByTokenHash(tokenHash: string): Promise<RefreshTokenEntity | null> {
    const refreshToken = await this.prisma.refreshToken.findUnique({
      where: { token: tokenHash },
    });
    if (!refreshToken) return null;
    return this.mapToDomain(refreshToken);
  }

  async findByToken(token: string): Promise<RefreshTokenEntity | null> {
    return this.findByTokenHash(token);
  }

  async deleteByTokenHash(tokenHash: string): Promise<boolean> {
    try {
      await this.prisma.refreshToken.delete({
        where: { token: tokenHash },
      });
      return true;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        return false;
      }
      throw error;
    }
  }

  async deleteByToken(token: string): Promise<boolean> {
    return this.deleteByTokenHash(token);
  }

  async create(data: Partial<RefreshTokenEntity>): Promise<RefreshTokenEntity> {
    const refreshToken = await this.prisma.refreshToken.create({
      data: {
        token: data.token!,
        userId: data.userId!,
        expiresAt: data.expiresAt!,
        familyId: data.familyId!,
        revokedAt: data.revokedAt ?? null,
      },
    });
    return this.mapToDomain(refreshToken);
  }

  async rotate(
    oldTokenHash: string,
    newTokenData: Partial<RefreshTokenEntity>,
  ): Promise<boolean> {
    return await this.prisma.$transaction(async (tx) => {
      // Atomically consume old token: only update if currently active (revokedAt is null)
      const updateResult = await tx.refreshToken.updateMany({
        where: {
          token: oldTokenHash,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });

      // If count is 0, the token does not exist or was already revoked
      if (updateResult.count === 0) {
        return false;
      }

      // Persist replacement token with same familyId and active state (revokedAt: null)
      await tx.refreshToken.create({
        data: {
          token: newTokenData.token!,
          userId: newTokenData.userId!,
          expiresAt: newTokenData.expiresAt!,
          familyId: newTokenData.familyId!,
          revokedAt: null,
        },
      });

      return true;
    });
  }

  async revokeFamily(familyId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: {
        familyId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }
}
