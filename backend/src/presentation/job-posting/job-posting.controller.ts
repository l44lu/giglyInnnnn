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
import { CreateDraftJobPostInputDto } from '../../application/dto/job-posting/create-draft-job-post-input.dto';
import { UpdateJobPostInputDto } from '../../application/dto/job-posting/update-job-post-input.dto';
import { GetRecruiterJobsQueryDto } from '../../application/dto/job-posting/get-recruiter-jobs-query.dto';
import { JobCategoryResponseDto } from '../../application/dto/job-posting/job-category-response.dto';
import { JobPostResponseDto } from '../../application/dto/job-posting/job-post-response.dto';
import { GetRecruiterJobPostsResponseDto } from '../../application/dto/job-posting/recruiter-job-posts-response.dto';
import {
  ApplicationValidationError,
  ApplicationNotFoundError,
  ApplicationAuthorizationError,
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
