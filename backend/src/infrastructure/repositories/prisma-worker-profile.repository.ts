import { Injectable } from '@nestjs/common';
import { IWorkerProfileRepository } from '../../domain/repositories/worker-profile.repository.interface';
import { WorkerProfileEntity } from '../../domain/entities/worker-profile.entity';
import { PrismaService } from '../prisma/prisma.service';
import { WorkerProfile, Prisma } from '@prisma/client';
import { PrismaBaseRepository } from './base.repository';

@Injectable()
export class PrismaWorkerProfileRepository
  extends PrismaBaseRepository<WorkerProfileEntity, WorkerProfile>
  implements IWorkerProfileRepository
{
  constructor(prisma: PrismaService) {
    super(prisma, prisma.workerProfile);
  }

  protected mapToDomain(profile: WorkerProfile): WorkerProfileEntity {
    return new WorkerProfileEntity({
      id: profile.id,
      userId: profile.userId,
      headline: profile.headline,
      yearsExperience: profile.yearsExperience,
      responseTimeHours: profile.responseTimeHours,
      availabilityStatus: profile.availabilityStatus,
      isOpenToWork: profile.isOpenToWork,
      totalCompletedGigs: profile.totalCompletedGigs,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    });
  }

  async findByUserId(userId: string): Promise<WorkerProfileEntity | null> {
    const profile = await this.prisma.workerProfile.findUnique({
      where: { userId },
    });
    if (!profile) return null;
    return this.mapToDomain(profile);
  }

  override async create(
    data: Partial<WorkerProfileEntity>,
  ): Promise<WorkerProfileEntity> {
    const profile = await this.prisma.workerProfile.create({
      data: {
        userId: data.userId!,
        headline: data.headline ?? null,
        yearsExperience: data.yearsExperience ?? null,
        responseTimeHours: data.responseTimeHours ?? null,
        availabilityStatus: data.availabilityStatus ?? 'available',
        isOpenToWork: data.isOpenToWork ?? true,
        totalCompletedGigs: data.totalCompletedGigs ?? 0,
      },
    });
    return this.mapToDomain(profile);
  }

  override async update(
    id: string,
    data: Partial<WorkerProfileEntity>,
  ): Promise<WorkerProfileEntity> {
    const updateData: Prisma.WorkerProfileUncheckedUpdateInput = {
      ...(data.headline !== undefined && { headline: data.headline }),
      ...(data.yearsExperience !== undefined && {
        yearsExperience: data.yearsExperience,
      }),
      ...(data.responseTimeHours !== undefined && {
        responseTimeHours: data.responseTimeHours,
      }),
      ...(data.availabilityStatus !== undefined && {
        availabilityStatus: data.availabilityStatus,
      }),
      ...(data.isOpenToWork !== undefined && {
        isOpenToWork: data.isOpenToWork,
      }),
      ...(data.totalCompletedGigs !== undefined && {
        totalCompletedGigs: data.totalCompletedGigs,
      }),
    };

    const profile = await this.prisma.workerProfile.update({
      where: { id },
      data: updateData,
    });
    return this.mapToDomain(profile);
  }

  async upsert(
    userId: string,
    data: Partial<WorkerProfileEntity>,
  ): Promise<WorkerProfileEntity> {
    const updateData: Prisma.WorkerProfileUncheckedUpdateInput = {
      ...(data.headline !== undefined && { headline: data.headline }),
      ...(data.yearsExperience !== undefined && {
        yearsExperience: data.yearsExperience,
      }),
      ...(data.responseTimeHours !== undefined && {
        responseTimeHours: data.responseTimeHours,
      }),
      ...(data.availabilityStatus !== undefined && {
        availabilityStatus: data.availabilityStatus,
      }),
      ...(data.isOpenToWork !== undefined && {
        isOpenToWork: data.isOpenToWork,
      }),
      ...(data.totalCompletedGigs !== undefined && {
        totalCompletedGigs: data.totalCompletedGigs,
      }),
    };

    const createData: Prisma.WorkerProfileUncheckedCreateInput = {
      userId,
      headline: data.headline ?? null,
      yearsExperience: data.yearsExperience ?? null,
      responseTimeHours: data.responseTimeHours ?? null,
      availabilityStatus: data.availabilityStatus ?? 'available',
      isOpenToWork: data.isOpenToWork ?? true,
      totalCompletedGigs: data.totalCompletedGigs ?? 0,
    };

    const profile = await this.prisma.workerProfile.upsert({
      where: { userId },
      create: createData,
      update: updateData,
    });

    return this.mapToDomain(profile);
  }
}
