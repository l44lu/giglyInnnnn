import { Injectable } from '@nestjs/common';
import { IRecruiterProfileRepository } from '../../domain/repositories/recruiter-profile.repository.interface';
import { RecruiterProfileEntity } from '../../domain/entities/recruiter-profile.entity';
import { PrismaService } from '../prisma/prisma.service';
import { RecruiterProfile, Prisma } from '@prisma/client';
import { PrismaBaseRepository } from './base.repository';

@Injectable()
export class PrismaRecruiterProfileRepository
  extends PrismaBaseRepository<RecruiterProfileEntity, RecruiterProfile>
  implements IRecruiterProfileRepository
{
  constructor(prisma: PrismaService) {
    super(prisma, prisma.recruiterProfile);
  }

  protected mapToDomain(profile: RecruiterProfile): RecruiterProfileEntity {
    return new RecruiterProfileEntity({
      id: profile.id,
      userId: profile.userId,
      companyId: profile.companyId,
      roleTitle: profile.roleTitle,
      yearsExperience: profile.yearsExperience,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    });
  }

  async findByUserId(userId: string): Promise<RecruiterProfileEntity | null> {
    const profile = await this.prisma.recruiterProfile.findUnique({
      where: { userId },
    });
    if (!profile) return null;
    return this.mapToDomain(profile);
  }

  override async create(
    data: Partial<RecruiterProfileEntity>,
  ): Promise<RecruiterProfileEntity> {
    const profile = await this.prisma.recruiterProfile.create({
      data: {
        userId: data.userId!,
        companyId: data.companyId ?? null,
        roleTitle: data.roleTitle ?? null,
        yearsExperience: data.yearsExperience ?? null,
      },
    });
    return this.mapToDomain(profile);
  }

  override async update(
    id: string,
    data: Partial<RecruiterProfileEntity>,
  ): Promise<RecruiterProfileEntity> {
    const updateData: Prisma.RecruiterProfileUncheckedUpdateInput = {
      ...(data.companyId !== undefined && { companyId: data.companyId }),
      ...(data.roleTitle !== undefined && { roleTitle: data.roleTitle }),
      ...(data.yearsExperience !== undefined && {
        yearsExperience: data.yearsExperience,
      }),
    };

    const profile = await this.prisma.recruiterProfile.update({
      where: { id },
      data: updateData,
    });
    return this.mapToDomain(profile);
  }

  async upsert(
    userId: string,
    data: Partial<RecruiterProfileEntity>,
  ): Promise<RecruiterProfileEntity> {
    const updateData: Prisma.RecruiterProfileUncheckedUpdateInput = {
      ...(data.companyId !== undefined && { companyId: data.companyId }),
      ...(data.roleTitle !== undefined && { roleTitle: data.roleTitle }),
      ...(data.yearsExperience !== undefined && {
        yearsExperience: data.yearsExperience,
      }),
    };

    const createData: Prisma.RecruiterProfileUncheckedCreateInput = {
      userId,
      companyId: data.companyId ?? null,
      roleTitle: data.roleTitle ?? null,
      yearsExperience: data.yearsExperience ?? null,
    };

    const profile = await this.prisma.recruiterProfile.upsert({
      where: { userId },
      create: createData,
      update: updateData,
    });

    return this.mapToDomain(profile);
  }
}
