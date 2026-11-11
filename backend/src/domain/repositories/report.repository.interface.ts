import { ReportEntity } from '../entities/report.entity';
import { IBaseRepository } from './base.repository.interface';

export interface IReportRepository extends IBaseRepository<ReportEntity> {
  findPendingByReporterAndJob(
    reporterId: string,
    jobPostId: string,
  ): Promise<ReportEntity | null>;
}

export const IReportRepository = Symbol('IReportRepository');
