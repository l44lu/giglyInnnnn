import {
  FindJobApplicationsResult,
  JobApplicationReadModel,
} from '../../domain/repositories/job-application.repository.interface';
import { PaginationMetadataDto } from '../dto/job-discovery/find-jobs-response.dto';
import {
  AcceptJobApplicationOutput,
  ManageJobApplicationResult,
} from '../use-cases/job-posting/interface/job-application-hiring.types';
import {
  AcceptJobApplicationResponseDto,
  JobApplicationStatusActionResponseDto,
} from '../dto/job-posting/job-application-action-response.dto';
import {
  ApplicantSkillDto,
  ApplicantWorkerDto,
  ApplicationHistorySummaryDto,
  GetJobApplicationsResponseDto,
  JobApplicationJobInfoDto,
  JobApplicationsSummaryDto,
  RecruiterJobApplicationItemDto,
} from '../dto/job-posting/job-applications-response.dto';

export class RecruiterJobApplicationMapper {
  static toItemDto(
    record: JobApplicationReadModel,
  ): RecruiterJobApplicationItemDto {
    const worker = new ApplicantWorkerDto({
      id: record.worker.id,
      firstName: record.worker.firstName,
      lastName: record.worker.lastName,
      location: record.worker.location ?? null,
      bio: record.worker.bio ?? null,
      headline: record.worker.headline ?? null,
      yearsExperience: record.worker.yearsExperience ?? null,
      responseTimeHours: record.worker.responseTimeHours ?? null,
      availabilityStatus: record.worker.availabilityStatus,
      isOpenToWork: record.worker.isOpenToWork,
      totalCompletedGigs: record.worker.totalCompletedGigs,
      hasAvatar: Boolean(record.worker.hasAvatar),
      skills: record.worker.skills.map(
        (skill) =>
          new ApplicantSkillDto({
            id: skill.id,
            name: skill.name,
            skillType: skill.skillType,
          }),
      ),
    });

    const historySummary = record.historySummary
      ? new ApplicationHistorySummaryDto({
          lastChangedAt: record.historySummary.lastChangedAt,
          latestReasonCode: record.historySummary.latestReasonCode,
          transitionCount: record.historySummary.transitionCount,
        })
      : null;

    return new RecruiterJobApplicationItemDto({
      id: record.id,
      jobPostId: record.jobPostId,
      status: record.status,
      expectedPay: record.expectedPay ?? null,
      availableDate: record.availableDate ?? null,
      appliedAt: record.appliedAt,
      updatedAt: record.updatedAt,
      worker,
      historySummary,
    });
  }

  static toResponseDto(
    result: FindJobApplicationsResult,
  ): GetJobApplicationsResponseDto {
    const totalPages =
      result.total === 0 ? 0 : Math.ceil(result.total / result.limit);

    return new GetJobApplicationsResponseDto({
      job: new JobApplicationJobInfoDto({
        id: result.job.id,
        title: result.job.title,
        status: result.job.status,
        workersNeeded: result.job.workersNeeded,
        workType: result.job.workType,
        paymentStructure: result.job.paymentStructure,
        budgetAmount: result.job.budgetAmount ?? null,
        hourlyRate: result.job.hourlyRate ?? null,
        acceptedCount: result.job.acceptedCount,
      }),
      summary: new JobApplicationsSummaryDto({
        total: result.summary.total,
        pending: result.summary.pending,
        shortlisted: result.summary.shortlisted,
        accepted: result.summary.accepted,
        rejected: result.summary.rejected,
        withdrawn: result.summary.withdrawn,
      }),
      items: result.items.map((item) => this.toItemDto(item)),
      pagination: new PaginationMetadataDto({
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages,
      }),
    });
  }

  static toStatusActionResponseDto(
    result: ManageJobApplicationResult,
  ): JobApplicationStatusActionResponseDto {
    return new JobApplicationStatusActionResponseDto({
      applicationId: result.applicationId,
      jobPostId: result.jobPostId,
      status: result.status,
      jobStatus: result.jobStatus,
      updatedAt: result.updatedAt,
    });
  }

  static toAcceptResponseDto(
    result: AcceptJobApplicationOutput,
  ): AcceptJobApplicationResponseDto {
    return new AcceptJobApplicationResponseDto({
      applicationId: result.applicationId,
      jobPostId: result.jobPostId,
      status: result.status,
      jobStatus: result.jobStatus,
      workersNeeded: result.workersNeeded,
      acceptedCount: result.acceptedCount,
      jobFilled: result.jobFilled,
      autoRejectedCount: result.autoRejectedCount,
      updatedAt: result.updatedAt,
    });
  }
}
