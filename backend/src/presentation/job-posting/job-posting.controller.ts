import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Inject,
  UseGuards,
  ParseUUIDPipe,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Role } from '../../domain/enums/role.enum';
import { IGetJobCategoriesUseCase } from '../../application/use-cases/job-posting/interface/get-job-categories.use-case.interface';
import { ICreateDraftJobPostUseCase } from '../../application/use-cases/job-posting/interface/create-draft-job-post.use-case.interface';
import { IPublishJobPostUseCase } from '../../application/use-cases/job-posting/interface/publish-job-post.use-case.interface';
import { IGetRecruiterProfileUseCase } from '../../application/use-cases/recruiter-profile/interface/get-recruiter-profile.use-case.interface';
import { IGetRecruiterJobPostsUseCase } from '../../application/use-cases/job-posting/interface/get-recruiter-job-posts.use-case.interface';
import { IGetRecruiterJobPostByIdUseCase } from '../../application/use-cases/job-posting/interface/get-recruiter-job-post-by-id.use-case.interface';
import { IUpdateJobPostUseCase } from '../../application/use-cases/job-posting/interface/update-job-post.use-case.interface';
import {
  ITransitionJobPostStatusUseCase,
  JobPostStatusAction,
} from '../../application/use-cases/job-posting/interface/transition-job-post-status.use-case.interface';
import { IGetJobApplicationsUseCase } from '../../application/use-cases/job-posting/interface/get-job-applications.use-case.interface';
import { IShortlistJobApplicationUseCase } from '../../application/use-cases/job-posting/interface/shortlist-job-application.use-case.interface';
import { IAcceptJobApplicationUseCase } from '../../application/use-cases/job-posting/interface/accept-job-application.use-case.interface';
import { IRejectJobApplicationUseCase } from '../../application/use-cases/job-posting/interface/reject-job-application.use-case.interface';
import { ManageJobApplicationResult } from '../../application/use-cases/job-posting/interface/job-application-hiring.types';
import { CreateDraftJobPostInputDto } from '../../application/dto/job-posting/create-draft-job-post-input.dto';
import { UpdateJobPostInputDto } from '../../application/dto/job-posting/update-job-post-input.dto';
import { GetRecruiterJobsQueryDto } from '../../application/dto/job-posting/get-recruiter-jobs-query.dto';
import { GetJobApplicationsQueryDto } from '../../application/dto/job-posting/get-job-applications-query.dto';
import { UpdateJobApplicationStatusInputDto } from '../../application/dto/job-posting/update-job-application-status-input.dto';
import { JobCategoryResponseDto } from '../../application/dto/job-posting/job-category-response.dto';
import { JobPostResponseDto } from '../../application/dto/job-posting/job-post-response.dto';
import { GetRecruiterJobPostsResponseDto } from '../../application/dto/job-posting/recruiter-job-posts-response.dto';
import { GetJobApplicationsResponseDto } from '../../application/dto/job-posting/job-applications-response.dto';
import {
  AcceptJobApplicationResponseDto,
  JobApplicationStatusActionResponseDto,
} from '../../application/dto/job-posting/job-application-action-response.dto';
import { RecruiterJobApplicationMapper } from '../../application/mappers/recruiter-job-application.mapper';
import {
  ApplicationValidationError,
  ApplicationNotFoundError,
  ApplicationAuthorizationError,
  ApplicationConflictError,
} from '../../application/errors/application.errors';

@Controller()
export class JobPostingController {
  constructor(
    @Inject(IGetJobCategoriesUseCase)
    private readonly getJobCategoriesUseCase: IGetJobCategoriesUseCase,
    @Inject(IGetRecruiterProfileUseCase)
    private readonly getRecruiterProfileUseCase: IGetRecruiterProfileUseCase,
    @Inject(ICreateDraftJobPostUseCase)
    private readonly createDraftJobPostUseCase: ICreateDraftJobPostUseCase,
    @Inject(IPublishJobPostUseCase)
    private readonly publishJobPostUseCase: IPublishJobPostUseCase,
    @Inject(IGetRecruiterJobPostsUseCase)
    private readonly getRecruiterJobPostsUseCase: IGetRecruiterJobPostsUseCase,
    @Inject(IGetRecruiterJobPostByIdUseCase)
    private readonly getRecruiterJobPostByIdUseCase: IGetRecruiterJobPostByIdUseCase,
    @Inject(IUpdateJobPostUseCase)
    private readonly updateJobPostUseCase: IUpdateJobPostUseCase,
    @Inject(ITransitionJobPostStatusUseCase)
    private readonly transitionJobPostStatusUseCase: ITransitionJobPostStatusUseCase,
    @Inject(IGetJobApplicationsUseCase)
    private readonly getJobApplicationsUseCase: IGetJobApplicationsUseCase,
    @Inject(IShortlistJobApplicationUseCase)
    private readonly shortlistJobApplicationUseCase: IShortlistJobApplicationUseCase,
    @Inject(IAcceptJobApplicationUseCase)
    private readonly acceptJobApplicationUseCase: IAcceptJobApplicationUseCase,
    @Inject(IRejectJobApplicationUseCase)
    private readonly rejectJobApplicationUseCase: IRejectJobApplicationUseCase,
  ) {}

  private handleApplicationError(error: unknown): never {
    if (error instanceof ApplicationValidationError) {
      throw new BadRequestException(error.message);
    }
    if (error instanceof ApplicationNotFoundError) {
      throw new NotFoundException(error.message);
    }
    if (error instanceof ApplicationAuthorizationError) {
      throw new ForbiddenException(error.message);
    }
    if (error instanceof ApplicationConflictError) {
      throw new ConflictException(error.message);
    }
    throw error;
  }

  @Get('job-categories')
  async getJobCategories(): Promise<JobCategoryResponseDto[]> {
    try {
      return await this.getJobCategoriesUseCase.execute();
    } catch (error) {
      this.handleApplicationError(error);
    }
  }

  @Get('recruiter/jobs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RECRUITER)
  async getRecruiterJobs(
    @CurrentUser('id') userId: string,
    @Query() query: GetRecruiterJobsQueryDto,
  ): Promise<GetRecruiterJobPostsResponseDto> {
    try {
      const recruiterProfile =
        await this.getRecruiterProfileUseCase.execute(userId);
      return await this.getRecruiterJobPostsUseCase.execute(
        recruiterProfile.id,
        query,
      );
    } catch (error) {
      this.handleApplicationError(error);
    }
  }

  @Get('recruiter/jobs/:id/applications')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RECRUITER)
  async getJobApplications(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @Query() query: GetJobApplicationsQueryDto,
  ): Promise<GetJobApplicationsResponseDto> {
    try {
      return await this.getJobApplicationsUseCase.execute(userId, id, query);
    } catch (error) {
      this.handleApplicationError(error);
    }
  }

  @Patch('recruiter/jobs/:id/applications/:applicationId/shortlist')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RECRUITER)
  async shortlistApplication(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto?: UpdateJobApplicationStatusInputDto,
  ): Promise<JobApplicationStatusActionResponseDto> {
    return this.executeApplicationStatusAction(() =>
      this.shortlistJobApplicationUseCase.execute({
        userId,
        jobPostId: id,
        applicationId,
        reasonNote: dto?.reasonNote,
      }),
    );
  }

  @Patch('recruiter/jobs/:id/applications/:applicationId/accept')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RECRUITER)
  async acceptApplication(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto?: UpdateJobApplicationStatusInputDto,
  ): Promise<AcceptJobApplicationResponseDto> {
    try {
      const result = await this.acceptJobApplicationUseCase.execute({
        userId,
        jobPostId: id,
        applicationId,
        reasonNote: dto?.reasonNote,
      });
      return RecruiterJobApplicationMapper.toAcceptResponseDto(result);
    } catch (error) {
      this.handleApplicationError(error);
    }
  }

  @Patch('recruiter/jobs/:id/applications/:applicationId/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RECRUITER)
  async rejectApplication(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto?: UpdateJobApplicationStatusInputDto,
  ): Promise<JobApplicationStatusActionResponseDto> {
    return this.executeApplicationStatusAction(() =>
      this.rejectJobApplicationUseCase.execute({
        userId,
        jobPostId: id,
        applicationId,
        reasonNote: dto?.reasonNote,
      }),
    );
  }

  private async executeApplicationStatusAction(
    runAction: () => Promise<ManageJobApplicationResult>,
  ): Promise<JobApplicationStatusActionResponseDto> {
    try {
      const result = await runAction();
      return RecruiterJobApplicationMapper.toStatusActionResponseDto(result);
    } catch (error) {
      this.handleApplicationError(error);
    }
  }

  @Get('recruiter/jobs/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RECRUITER)
  async getRecruiterJobById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<JobPostResponseDto> {
    try {
      const recruiterProfile =
        await this.getRecruiterProfileUseCase.execute(userId);
      return await this.getRecruiterJobPostByIdUseCase.execute(
        id,
        recruiterProfile.id,
      );
    } catch (error) {
      this.handleApplicationError(error);
    }
  }

  @Post('recruiter/jobs/draft')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RECRUITER)
  async createDraft(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateDraftJobPostInputDto,
  ): Promise<JobPostResponseDto> {
    try {
      const recruiterProfile =
        await this.getRecruiterProfileUseCase.execute(userId);
      return await this.createDraftJobPostUseCase.execute(
        recruiterProfile.id,
        dto,
      );
    } catch (error) {
      this.handleApplicationError(error);
    }
  }

  @Patch('recruiter/jobs/:id/publish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RECRUITER)
  async publishJob(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<JobPostResponseDto> {
    try {
      const recruiterProfile =
        await this.getRecruiterProfileUseCase.execute(userId);
      return await this.publishJobPostUseCase.execute(id, recruiterProfile.id);
    } catch (error) {
      this.handleApplicationError(error);
    }
  }

  @Patch('recruiter/jobs/:id/pause')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RECRUITER)
  async pauseJob(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<JobPostResponseDto> {
    try {
      const recruiterProfile =
        await this.getRecruiterProfileUseCase.execute(userId);
      return await this.transitionJobPostStatusUseCase.execute(
        id,
        recruiterProfile.id,
        JobPostStatusAction.PAUSE,
      );
    } catch (error) {
      this.handleApplicationError(error);
    }
  }

  @Patch('recruiter/jobs/:id/reopen')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RECRUITER)
  async reopenJob(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<JobPostResponseDto> {
    try {
      const recruiterProfile =
        await this.getRecruiterProfileUseCase.execute(userId);
      return await this.transitionJobPostStatusUseCase.execute(
        id,
        recruiterProfile.id,
        JobPostStatusAction.REOPEN,
      );
    } catch (error) {
      this.handleApplicationError(error);
    }
  }

  @Patch('recruiter/jobs/:id/close')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RECRUITER)
  async closeJob(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<JobPostResponseDto> {
    try {
      const recruiterProfile =
        await this.getRecruiterProfileUseCase.execute(userId);
      return await this.transitionJobPostStatusUseCase.execute(
        id,
        recruiterProfile.id,
        JobPostStatusAction.CLOSE,
      );
    } catch (error) {
      this.handleApplicationError(error);
    }
  }

  @Patch('recruiter/jobs/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RECRUITER)
  async updateJob(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateJobPostInputDto,
  ): Promise<JobPostResponseDto> {
    try {
      const recruiterProfile =
        await this.getRecruiterProfileUseCase.execute(userId);
      return await this.updateJobPostUseCase.execute(
        id,
        recruiterProfile.id,
        dto,
      );
    } catch (error) {
      this.handleApplicationError(error);
    }
  }
}
