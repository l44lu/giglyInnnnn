import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Report } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaBaseRepository } from './base.repository';
import { IReportRepository } from '../../domain/repositories/report.repository.interface';
import {
  ReportEntity,
  ReportStatus,
} from '../../domain/entities/report.entity';
import { ApplicationConflictError } from '../../application/errors/application.errors';

@Injectable()
export class PrismaReportRepository
  extends PrismaBaseRepository<ReportEntity, Report>
  implements IReportRepository
{
  constructor(prisma: PrismaService) {
    super(prisma, prisma.report);
  }

  protected mapToDomain(record: Report): ReportEntity {
    return new ReportEntity({
      id: record.id,
      displayId: record.displayId,
      reporterId: record.reporterId,
      reportedUserId: record.reportedUserId,
      jobPostId: record.jobPostId,
      reportType: record.reportType,
      description: record.description,
      evidenceFileUrl: record.evidenceFileUrl,
      status: record.status as ReportStatus,
      adminNotes: record.adminNotes,
      resolvedBy: record.resolvedBy,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  override async create(data: Partial<ReportEntity>): Promise<ReportEntity> {
    try {
      const record = await this.prisma.report.create({
        data: {
          id: data.id,
          displayId: data.displayId!,
          reporterId: data.reporterId!,
          reportedUserId: data.reportedUserId!,
          jobPostId: data.jobPostId ?? null,
          reportType: data.reportType!,
          description: data.description!,
          evidenceFileUrl: data.evidenceFileUrl ?? null,
          status: data.status ?? ReportStatus.PENDING,
          adminNotes: data.adminNotes ?? null,
          resolvedBy: data.resolvedBy ?? null,
        },
      });
      return this.mapToDomain(record);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const target =
          (error.meta?.target as string[] | string | undefined) ?? [];
        const targetStr = Array.isArray(target)
          ? target.join(',')
          : String(target);
        if (
          targetStr.includes('reporterId') ||
          targetStr.includes('jobPostId') ||
          targetStr.includes('Report_reporterId_jobPostId_pending_key') ||
          error.message.includes('Report_reporterId_jobPostId_pending_key')
        ) {
          throw new ApplicationConflictError(
            'You already have a pending report for this job',
          );
        }
      }
      throw error;
    }
  }

  async findPendingByReporterAndJob(
    reporterId: string,
    jobPostId: string,
  ): Promise<ReportEntity | null> {
    const record = await this.prisma.report.findFirst({
      where: {
        reporterId,
        jobPostId,
        status: ReportStatus.PENDING,
      },
    });

    if (!record) {
      return null;
    }

    return this.mapToDomain(record);
  }
}
