import { Injectable } from '@nestjs/common';
import { IPasswordResetRepository } from '../../domain/repositories/password-reset.repository.interface';
import { PasswordResetEntity } from '../../domain/entities/password-reset.entity';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordReset } from '@prisma/client';
import { PrismaBaseRepository } from './base.repository';

@Injectable()
export class PrismaPasswordResetRepository
  extends PrismaBaseRepository<PasswordResetEntity, PasswordReset>
  implements IPasswordResetRepository
{
  constructor(prisma: PrismaService) {
    super(prisma, prisma.passwordReset);
  }

  protected mapToDomain(reset: PasswordReset): PasswordResetEntity {
    return new PasswordResetEntity({
      id: reset.id,
      userId: reset.userId,
      otpHash: reset.otpHash,
      tokenHash: reset.tokenHash,
      attempts: reset.attempts,
      expiresAt: reset.expiresAt,
      createdAt: reset.createdAt,
    });
  }

  async findByUserId(userId: string): Promise<PasswordResetEntity | null> {
    const record = await this.prisma.passwordReset.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    if (!record) return null;
    return this.mapToDomain(record);
  }

  async findByTokenHash(
    tokenHash: string,
  ): Promise<PasswordResetEntity | null> {
    const record = await this.prisma.passwordReset.findUnique({
      where: { tokenHash },
    });
    if (!record) return null;
    return this.mapToDomain(record);
  }

  async updateAttempts(id: string, attempts: number): Promise<void> {
    await this.prisma.passwordReset.update({
      where: { id },
      data: { attempts },
    });
  }

  async setTokenHash(id: string, tokenHash: string): Promise<void> {
    await this.prisma.passwordReset.update({
      where: { id },
      data: { tokenHash },
    });
  }

  async consumeOtpAndSetTokenHash(
    id: string,
    tokenHash: string,
    expiresAt?: Date,
  ): Promise<boolean> {
    const result = await this.prisma.passwordReset.updateMany({
      where: {
        id,
        tokenHash: null,
      },
      data: {
        tokenHash,
        ...(expiresAt ? { expiresAt } : {}),
      },
    });
    return result.count > 0;
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.prisma.passwordReset.deleteMany({
      where: { userId },
    });
  }

  async create(
    data: Partial<PasswordResetEntity>,
  ): Promise<PasswordResetEntity> {
    const record = await this.prisma.passwordReset.create({
      data: {
        userId: data.userId!,
        otpHash: data.otpHash!,
        tokenHash: data.tokenHash ?? null,
        attempts: data.attempts ?? 0,
        expiresAt: data.expiresAt!,
      },
    });
    return this.mapToDomain(record);
  }
}
