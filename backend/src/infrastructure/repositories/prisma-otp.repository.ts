import { Injectable } from '@nestjs/common';
import { IOtpRepository } from '../../domain/repositories/otp.repository.interface';
import { OtpEntity } from '../../domain/entities/otp.entity';
import { Role } from '../../domain/enums/role.enum';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { PrismaBaseRepository } from './base.repository';

export type OtpPersistenceModel = Prisma.OtpGetPayload<{
  include: {
    role: true;
  };
}>;

@Injectable()
export class PrismaOtpRepository
  extends PrismaBaseRepository<OtpEntity, OtpPersistenceModel>
  implements IOtpRepository
{
  constructor(prisma: PrismaService) {
    super(prisma, prisma.otp);
  }

  protected mapToDomain(otp: OtpPersistenceModel): OtpEntity {
    if (!otp.role || !otp.role.code) {
      throw new Error(
        `OTP record ${otp.id} has no associated role or role code`,
      );
    }

    return new OtpEntity({
      id: otp.id,
      email: otp.email,
      otp: otp.otp,
      firstName: otp.firstName,
      lastName: otp.lastName,
      passwordHash: otp.passwordHash,
      role: otp.role.code as Role,
      attempts: otp.attempts,
      expiresAt: otp.expiresAt,
      createdAt: otp.createdAt,
    });
  }

  async findByEmail(email: string): Promise<OtpEntity | null> {
    const otp = await this.prisma.otp.findUnique({
      where: { email },
      include: { role: true },
    });
    if (!otp) return null;
    return this.mapToDomain(otp);
  }

  override async findById(id: string): Promise<OtpEntity | null> {
    const otp = await this.prisma.otp.findUnique({
      where: { id },
      include: { role: true },
    });
    if (!otp) return null;
    return this.mapToDomain(otp);
  }

  override async findAll(): Promise<OtpEntity[]> {
    const otps = await this.prisma.otp.findMany({
      include: { role: true },
    });
    return otps.map((otp) => this.mapToDomain(otp));
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
        include: { role: true },
      });
      return this.mapToDomain(updated);
    } catch {
      return null;
    }
  }

  override async create(data: Partial<OtpEntity>): Promise<OtpEntity> {
    const roleCode = data.role ?? Role.WORKER;

    const otp = await this.prisma.otp.create({
      data: {
        email: data.email!,
        otp: data.otp!,
        firstName: data.firstName!,
        lastName: data.lastName!,
        passwordHash: data.passwordHash!,
        role: {
          connect: {
            code: roleCode,
          },
        },
        attempts: data.attempts ?? 0,
        expiresAt: data.expiresAt!,
      },
      include: {
        role: true,
      },
    });
    return this.mapToDomain(otp);
  }
}
