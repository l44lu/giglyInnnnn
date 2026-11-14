import { Inject, Injectable } from '@nestjs/common';
import { IRecruiterProfileRepository } from '../../../../domain/repositories/recruiter-profile.repository.interface';
import { IJobApplicationRepository } from '../../../../domain/repositories/job-application.repository.interface';
import { JobApplicationReasonCode } from '../../../../domain/enums/job-application-reason-code.enum';
import {
  ManageJobApplicationCommand,
  ManageJobApplicationResult,
} from '../interface/job-application-hiring.types';
import { IShortlistJobApplicationUseCase } from '../interface/shortlist-job-application.use-case.interface';
import { executeRecruiterApplicationTransition } from './recruiter-application-transition.helper';

@Injectable()
export class ShortlistJobApplicationUseCase implements IShortlistJobApplicationUseCase {
  constructor(
    @Inject(IRecruiterProfileRepository)
    private readonly recruiterProfileRepository: IRecruiterProfileRepository,
    @Inject(IJobApplicationRepository)
    private readonly jobApplicationRepository: IJobApplicationRepository,
  ) {}

  async execute(
    command: ManageJobApplicationCommand,
  ): Promise<ManageJobApplicationResult> {
    const result = await executeRecruiterApplicationTransition(
      this.recruiterProfileRepository,
      command,
      (params) => this.jobApplicationRepository.shortlistApplication(params),
    );

    return {
      applicationId: result.application.id,
      jobPostId: result.application.jobPostId,
      previousStatus: result.previousStatus,
      status: result.application.status,
      reasonCode: JobApplicationReasonCode.RECRUITER_SHORTLISTED,
      jobStatus: result.jobStatus,
      updatedAt: result.application.updatedAt,
    };
  }
}
