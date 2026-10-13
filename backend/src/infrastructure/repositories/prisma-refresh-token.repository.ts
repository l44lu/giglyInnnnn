import { Injectable } from '@nestjs/common';
import {
  IRefreshTokenRepository,
  RotateRefreshTokenData,
} from '../../domain/repositories/refresh-token.repository.interface';
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
      tokenHash: token.tokenHash,
      userId: token.userId,
      expiresAt: token.expiresAt,
      createdAt: token.createdAt,
      sessionId: token.sessionId,
      revokedAt: token.revokedAt,
      revokedReason: token.revokedReason,
    });
  }

  async findByTokenHash(tokenHash: string): Promise<RefreshTokenEntity | null> {
    const refreshToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });
    if (!refreshToken) return null;
    return this.mapToDomain(refreshToken);
  }

  async deleteByTokenHash(tokenHash: string): Promise<boolean> {
    try {
      await this.prisma.refreshToken.delete({
        where: { tokenHash },
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

  async create(data: Partial<RefreshTokenEntity>): Promise<RefreshTokenEntity> {
    const refreshToken = await this.prisma.refreshToken.create({
      data: {
        tokenHash: data.tokenHash!,
        userId: data.userId!,
        expiresAt: data.expiresAt!,
        sessionId: data.sessionId!,
        revokedAt: data.revokedAt ?? null,
        revokedReason: data.revokedReason ?? null,
      },
    });
    return this.mapToDomain(refreshToken);
  }

  async rotate(
    oldTokenHash: string,
    newTokenData: RotateRefreshTokenData,
    reason: string = 'ROTATED',
  ): Promise<boolean> {
    const { tokenHash, sessionId, userId, expiresAt } = newTokenData;

    return await this.prisma.$transaction(async (tx) => {
      // 1. Atomically consume old token: only update if currently active (revokedAt is null)
      const updateResult = await tx.refreshToken.updateMany({
        where: {
          tokenHash: oldTokenHash,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
          revokedReason: reason,
        },
      });

      // 2. If count is 0, the token does not exist or was already revoked (conditional invariant)
      if (updateResult.count === 0) {
        return false;
      }

      // 3. Persist replacement token with same sessionId and active state (revokedAt: null)
      await tx.refreshToken.create({
        data: {
          tokenHash,
          userId,
          expiresAt,
          sessionId,
          revokedAt: null,
          revokedReason: null,
        },
      });

      return true;
    });
  }

  async revokeSession(sessionId: string, reason?: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: {
        sessionId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
        revokedReason: reason ?? null,
      },
    });
  }

  async revokeAllForUser(userId: string, reason?: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
        revokedReason: reason ?? null,
      },
    });
  }
}
