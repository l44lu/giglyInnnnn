import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  ParseUUIDPipe,
  Inject,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Role } from '../../domain/enums/role.enum';
import { IFindOpenJobsUseCase } from '../../application/use-cases/job-discovery/interface/find-open-jobs.use-case.interface';
import { IGetWorkerJobDetailsUseCase } from '../../application/use-cases/job-discovery/interface/get-worker-job-details.use-case.interface';
import { IReportJobUseCase } from '../../application/use-cases/job-discovery/interface/report-job.use-case.interface';
import { IApplyJobUseCase } from '../../application/use-cases/job-discovery/interface/apply-job.use-case.interface';
import { FindJobsQueryDto } from '../../application/dto/job-discovery/find-jobs-query.dto';
import { FindJobsResponseDto } from '../../application/dto/job-discovery/find-jobs-response.dto';
import { WorkerJobDetailsResponseDto } from '../../application/dto/job-discovery/worker-job-details-response.dto';
import { ReportJobInputDto } from '../../application/dto/job-discovery/report-job-input.dto';
import { ReportJobResponseDto } from '../../application/dto/job-discovery/report-job-response.dto';
import { ApplyJobInputDto } from '../../application/dto/job-discovery/apply-job-input.dto';
import { JobApplicationResponseDto } from '../../application/dto/job-discovery/job-application-response.dto';
import {
  ApplicationValidationError,
  ApplicationNotFoundError,
  ApplicationAuthorizationError,
  ApplicationConflictError,
} from '../../application/errors/application.errors';

export interface UploadedMulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}
@Controller('worker/jobs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.WORKER)
export class JobDiscoveryController {
  constructor(
    @Inject(IFindOpenJobsUseCase)
    private readonly findOpenJobsUseCase: IFindOpenJobsUseCase,
    @Inject(IGetWorkerJobDetailsUseCase)
    private readonly getWorkerJobDetailsUseCase: IGetWorkerJobDetailsUseCase,
    @Inject(IReportJobUseCase)
    private readonly reportJobUseCase: IReportJobUseCase,
    @Inject(IApplyJobUseCase)
    private readonly applyJobUseCase: IApplyJobUseCase,
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

  @Get()
  async findJobs(
    @Query() query: FindJobsQueryDto,
  ): Promise<FindJobsResponseDto> {
    try {
      return await this.findOpenJobsUseCase.execute(query);
    } catch (error) {
      this.handleApplicationError(error);
    }
  }

  @Get(':id')
  async getJobDetails(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<WorkerJobDetailsResponseDto> {
    try {
      return await this.getWorkerJobDetailsUseCase.execute(id);
    } catch (error) {
      this.handleApplicationError(error);
    }
  }

  @Post(':id/report')
  @UseInterceptors(
    FileInterceptor('evidence', {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async reportJob(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') reporterId: string,
    @Body() dto: ReportJobInputDto,
    @UploadedFile() file?: UploadedMulterFile,
  ): Promise<ReportJobResponseDto> {
    try {
      return await this.reportJobUseCase.execute({
        reporterId,
        jobPostId: id,
        description: dto.description,
        evidenceFile: file
          ? {
              buffer: file.buffer,
              mimetype: file.mimetype,
              size: file.size,
              originalname: file.originalname,
            }
          : undefined,
      });
    } catch (error) {
      this.handleApplicationError(error);
    }
  }

  @Post(':id/apply')
  @HttpCode(HttpStatus.CREATED)
  async applyJob(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('sub') userId: string,
    @Body() dto?: ApplyJobInputDto,
  ): Promise<JobApplicationResponseDto> {
    try {
      return await this.applyJobUseCase.execute(userId, id, dto);
    } catch (error) {
      this.handleApplicationError(error);
    }
  }
}
