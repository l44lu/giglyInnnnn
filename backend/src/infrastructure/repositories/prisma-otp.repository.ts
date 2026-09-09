import { Injectable } from '@nestjs/common';
import { IOtpRepository } from '../../domain/repositories/otp.repository.interface';
import { OtpEntity } from '../../domain/entities/otp.entity';
import { PrismaService } from '../prisma/prisma.service';
import { Otp } from '@prisma/client';
import { PrismaBaseRepository } from './base.repository';

@Injectable()
export class PrismaOtpRepository
  extends PrismaBaseRepository<OtpEntity, Otp>
  implements IOtpRepository
{
  constructor(prisma: PrismaService) {
    super(prisma, prisma.otp);
  }

  protected mapToDomain(otp: Otp): OtpEntity {
    return new OtpEntity({
      id: otp.id,
      email: otp.email,
      otp: otp.otp,
      firstName: otp.firstName,
      lastName: otp.lastName,
      passwordHash: otp.passwordHash,
      role: otp.role,
      attempts: otp.attempts,
      expiresAt: otp.expiresAt,
      createdAt: otp.createdAt,
    });
  }

  async findByEmail(email: string): Promise<OtpEntity | null> {
    const otp = await this.prisma.otp.findUnique({
      where: { email },
    });
    if (!otp) return null;
    return this.mapToDomain(otp);
  }

  async deleteByEmail(email: string): Promise<void> {
    await this.prisma.otp.deleteMany({
      where: { email },
    });
  }

  async updateAttempts(
    email: string,
    attempts: number,
  ): Promise<OtpEntity | null> {
    try {
      const updated = await this.prisma.otp.update({
        where: { email },
        data: { attempts },
      });
      return this.mapToDomain(updated);
    } catch {
      return null;
    }
  }

  async create(data: Partial<OtpEntity>): Promise<OtpEntity> {
    const otp = await this.prisma.otp.create({
      data: {
        email: data.email!,
        otp: data.otp!,
        firstName: data.firstName!,
        lastName: data.lastName!,
        passwordHash: data.passwordHash!,
        role: data.role,
        attempts: data.attempts ?? 0,
        expiresAt: data.expiresAt!,
      },
    });
    return this.mapToDomain(otp);
  }
}
