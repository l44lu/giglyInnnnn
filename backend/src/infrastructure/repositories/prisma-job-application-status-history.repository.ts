import { Injectable } from '@nestjs/common';
import { JobApplicationStatusHistory, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateJobApplicationStatusHistoryData,
  IJobApplicationStatusHistoryRepository,
} from '../../domain/repositories/job-application-status-history.repository.interface';
import { JobApplicationStatusHistoryEntity } from '../../domain/entities/job-application-status-history.entity';
import { JobApplicationStatus } from '../../domain/enums/job-application-status.enum';

/**
 * Append-only Prisma repository for JobApplicationStatusHistory.
 * Intentionally does NOT extend PrismaBaseRepository so historical rows
 * cannot be updated or deleted via repository methods.
 */
@Injectable()
export class PrismaJobApplicationStatusHistoryRepository implements IJobApplicationStatusHistoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toMetadataObject(
    value: Prisma.JsonValue | null | undefined,
  ): Record<string, unknown> | null {
    if (
      value === null ||
      value === undefined ||
      typeof value !== 'object' ||
      Array.isArray(value)
    ) {
      return null;
    }
    return value as Record<string, unknown>;
  }

  private mapToDomain(
    record: JobApplicationStatusHistory,
  ): JobApplicationStatusHistoryEntity {
    return new JobApplicationStatusHistoryEntity({
      id: record.id,
      applicationId: record.applicationId,
      fromStatus: record.fromStatus
        ? (record.fromStatus as JobApplicationStatus)
        : null,
      toStatus: record.toStatus as JobApplicationStatus,
      reasonCode: record.reasonCode,
      reasonNote: record.reasonNote ?? null,
      changedByUserId: record.changedByUserId ?? null,
      metadata: this.toMetadataObject(record.metadata),
      createdAt: record.createdAt,
    });
  }

  async append(
    data: CreateJobApplicationStatusHistoryData,
  ): Promise<JobApplicationStatusHistoryEntity> {
    const record = await this.prisma.jobApplicationStatusHistory.create({
      data: {
        applicationId: data.applicationId,
        fromStatus: data.fromStatus,
        toStatus: data.toStatus,
        reasonCode: data.reasonCode,
        reasonNote: data.reasonNote ?? null,
        changedByUserId: data.changedByUserId ?? null,
        ...(data.metadata !== undefined &&
          data.metadata !== null && {
            metadata: data.metadata as Prisma.InputJsonValue,
          }),
      },
    });

    return this.mapToDomain(record);
  }

  async findByApplicationId(
    applicationId: string,
  ): Promise<JobApplicationStatusHistoryEntity[]> {
    const records = await this.prisma.jobApplicationStatusHistory.findMany({
      where: { applicationId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });

    return records.map((record) => this.mapToDomain(record));
  }
}
