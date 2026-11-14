import { Inject, Injectable } from '@nestjs/common';
import { IRecruiterProfileRepository } from '../../../../domain/repositories/recruiter-profile.repository.interface';
import { IJobApplicationRepository } from '../../../../domain/repositories/job-application.repository.interface';
import { JobApplicationReasonCode } from '../../../../domain/enums/job-application-reason-code.enum';
import {
  AcceptJobApplicationOutput,
  ManageJobApplicationCommand,
} from '../interface/job-application-hiring.types';
import { IAcceptJobApplicationUseCase } from '../interface/accept-job-application.use-case.interface';
import { executeRecruiterApplicationTransition } from './recruiter-application-transition.helper';

@Injectable()
export class AcceptJobApplicationUseCase implements IAcceptJobApplicationUseCase {
  constructor(
    @Inject(IRecruiterProfileRepository)
    private readonly recruiterProfileRepository: IRecruiterProfileRepository,
    @Inject(IJobApplicationRepository)
    private readonly jobApplicationRepository: IJobApplicationRepository,
  ) {}

  async execute(
    command: ManageJobApplicationCommand,
  ): Promise<AcceptJobApplicationOutput> {
    const result = await executeRecruiterApplicationTransition(
      this.recruiterProfileRepository,
      command,
      (params) => this.jobApplicationRepository.acceptApplication(params),
    );

    return {
      applicationId: result.application.id,
      jobPostId: result.application.jobPostId,
      previousStatus: result.previousStatus,
      status: result.application.status,
      reasonCode: JobApplicationReasonCode.RECRUITER_ACCEPTED,
      jobStatus: result.jobStatus,
      updatedAt: result.application.updatedAt,
      workersNeeded: result.workersNeeded,
      acceptedCount: result.acceptedCount,
      jobFilled: result.jobFilled,
      autoRejectedCount: result.autoRejectedCount,
      autoRejectedApplicationIds: result.autoRejectedApplicationIds,
    };
  }
}
