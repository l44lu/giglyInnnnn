import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './app.module';
import { PrismaService } from './infrastructure/prisma/prisma.service';
import { IGetRecruiterCompanyUseCase } from './application/use-cases/recruiter-profile/interface/get-recruiter-company.use-case.interface';
import { GetRecruiterCompanyUseCase } from './application/use-cases/recruiter-profile/implementation/get-recruiter-company.use-case';
import { IUpdateRecruiterCompanyUseCase } from './application/use-cases/recruiter-profile/interface/update-recruiter-company.use-case.interface';
import { UpdateRecruiterCompanyUseCase } from './application/use-cases/recruiter-profile/implementation/update-recruiter-company.use-case';

import { IUploadRecruiterCompanyLogoUseCase } from './application/use-cases/recruiter-profile/interface/upload-recruiter-company-logo.use-case.interface';
import { UploadRecruiterCompanyLogoUseCase } from './application/use-cases/recruiter-profile/implementation/upload-recruiter-company-logo.use-case';
import { IGetRecruiterCompanyLogoUseCase } from './application/use-cases/recruiter-profile/interface/get-recruiter-company-logo.use-case.interface';
import { GetRecruiterCompanyLogoUseCase } from './application/use-cases/recruiter-profile/implementation/get-recruiter-company-logo.use-case';
import { IChangeAdminUserRoleUseCase } from './application/use-cases/admin-user-management/interface/change-admin-user-role.use-case.interface';
import { ChangeAdminUserRoleUseCase } from './application/use-cases/admin-user-management/implementation/change-admin-user-role.use-case';
import { ISetAdminUserBlockStatusUseCase } from './application/use-cases/admin-user-management/interface/set-admin-user-block-status.use-case.interface';
import { SetAdminUserBlockStatusUseCase } from './application/use-cases/admin-user-management/implementation/set-admin-user-block-status.use-case';
import { IDeactivateAdminUserUseCase } from './application/use-cases/admin-user-management/interface/deactivate-admin-user.use-case.interface';
import { DeactivateAdminUserUseCase } from './application/use-cases/admin-user-management/implementation/deactivate-admin-user.use-case';
import { IJobCategoryRepository } from './domain/repositories/job-category.repository.interface';
import { PrismaJobCategoryRepository } from './infrastructure/repositories/prisma-job-category.repository';
import { IJobPostRepository } from './domain/repositories/job-post.repository.interface';
import { PrismaJobPostRepository } from './infrastructure/repositories/prisma-job-post.repository';
import { IGetJobCategoriesUseCase } from './application/use-cases/job-posting/interface/get-job-categories.use-case.interface';
import { GetJobCategoriesUseCase } from './application/use-cases/job-posting/implementation/get-job-categories.use-case';
import { ICreateDraftJobPostUseCase } from './application/use-cases/job-posting/interface/create-draft-job-post.use-case.interface';
import { CreateDraftJobPostUseCase } from './application/use-cases/job-posting/implementation/create-draft-job-post.use-case';
import { IPublishJobPostUseCase } from './application/use-cases/job-posting/interface/publish-job-post.use-case.interface';
import { PublishJobPostUseCase } from './application/use-cases/job-posting/implementation/publish-job-post.use-case';
import { IGetRecruiterJobPostsUseCase } from './application/use-cases/job-posting/interface/get-recruiter-job-posts.use-case.interface';
import { GetRecruiterJobPostsUseCase } from './application/use-cases/job-posting/implementation/get-recruiter-job-posts.use-case';
import { IGetRecruiterJobPostByIdUseCase } from './application/use-cases/job-posting/interface/get-recruiter-job-post-by-id.use-case.interface';
import { GetRecruiterJobPostByIdUseCase } from './application/use-cases/job-posting/implementation/get-recruiter-job-post-by-id.use-case';
import { IUpdateJobPostUseCase } from './application/use-cases/job-posting/interface/update-job-post.use-case.interface';
import { UpdateJobPostUseCase } from './application/use-cases/job-posting/implementation/update-job-post.use-case';
import { ITransitionJobPostStatusUseCase } from './application/use-cases/job-posting/interface/transition-job-post-status.use-case.interface';
import { TransitionJobPostStatusUseCase } from './application/use-cases/job-posting/implementation/transition-job-post-status.use-case';
import { IGetJobApplicationsUseCase } from './application/use-cases/job-posting/interface/get-job-applications.use-case.interface';
import { GetJobApplicationsUseCase } from './application/use-cases/job-posting/implementation/get-job-applications.use-case';
import { IShortlistJobApplicationUseCase } from './application/use-cases/job-posting/interface/shortlist-job-application.use-case.interface';
import { ShortlistJobApplicationUseCase } from './application/use-cases/job-posting/implementation/shortlist-job-application.use-case';
import { IAcceptJobApplicationUseCase } from './application/use-cases/job-posting/interface/accept-job-application.use-case.interface';
import { AcceptJobApplicationUseCase } from './application/use-cases/job-posting/implementation/accept-job-application.use-case';
import { IRejectJobApplicationUseCase } from './application/use-cases/job-posting/interface/reject-job-application.use-case.interface';
import { RejectJobApplicationUseCase } from './application/use-cases/job-posting/implementation/reject-job-application.use-case';
import { JobPostingController } from './presentation/job-posting/job-posting.controller';
import { IFindOpenJobsUseCase } from './application/use-cases/job-discovery/interface/find-open-jobs.use-case.interface';
import { FindOpenJobsUseCase } from './application/use-cases/job-discovery/implementation/find-open-jobs.use-case';
import { IGetWorkerJobDetailsUseCase } from './application/use-cases/job-discovery/interface/get-worker-job-details.use-case.interface';
import { GetWorkerJobDetailsUseCase } from './application/use-cases/job-discovery/implementation/get-worker-job-details.use-case';
import { IReportRepository } from './domain/repositories/report.repository.interface';
import { PrismaReportRepository } from './infrastructure/repositories/prisma-report.repository';
import { IReportJobUseCase } from './application/use-cases/job-discovery/interface/report-job.use-case.interface';
import { ReportJobUseCase } from './application/use-cases/job-discovery/implementation/report-job.use-case';
import { JobDiscoveryController } from './presentation/job-discovery/job-discovery.controller';

describe('AppModule DI Registration', () => {
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        $connect: jest.fn(),
        onModuleInit: jest.fn(),
      })
      .compile();
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should resolve IGetRecruiterCompanyUseCase to GetRecruiterCompanyUseCase', () => {
    const useCase = module.get<IGetRecruiterCompanyUseCase>(
      IGetRecruiterCompanyUseCase,
    );
    expect(useCase).toBeDefined();
    expect(useCase).toBeInstanceOf(GetRecruiterCompanyUseCase);
  });

  it('should resolve IUpdateRecruiterCompanyUseCase to UpdateRecruiterCompanyUseCase', () => {
    const useCase = module.get<IUpdateRecruiterCompanyUseCase>(
      IUpdateRecruiterCompanyUseCase,
    );
    expect(useCase).toBeDefined();
    expect(useCase).toBeInstanceOf(UpdateRecruiterCompanyUseCase);
  });

  it('should resolve IUploadRecruiterCompanyLogoUseCase to UploadRecruiterCompanyLogoUseCase', () => {
    const useCase = module.get<IUploadRecruiterCompanyLogoUseCase>(
      IUploadRecruiterCompanyLogoUseCase,
    );
    expect(useCase).toBeDefined();
    expect(useCase).toBeInstanceOf(UploadRecruiterCompanyLogoUseCase);
  });

  it('should resolve IGetRecruiterCompanyLogoUseCase to GetRecruiterCompanyLogoUseCase', () => {
    const useCase = module.get<IGetRecruiterCompanyLogoUseCase>(
      IGetRecruiterCompanyLogoUseCase,
    );
    expect(useCase).toBeDefined();
    expect(useCase).toBeInstanceOf(GetRecruiterCompanyLogoUseCase);
  });

  it('should resolve IChangeAdminUserRoleUseCase to ChangeAdminUserRoleUseCase', () => {
    const useCase = module.get<IChangeAdminUserRoleUseCase>(
      IChangeAdminUserRoleUseCase,
    );
    expect(useCase).toBeDefined();
    expect(useCase).toBeInstanceOf(ChangeAdminUserRoleUseCase);
  });

  it('should resolve ISetAdminUserBlockStatusUseCase to SetAdminUserBlockStatusUseCase', () => {
    const useCase = module.get<ISetAdminUserBlockStatusUseCase>(
      ISetAdminUserBlockStatusUseCase,
    );
    expect(useCase).toBeDefined();
    expect(useCase).toBeInstanceOf(SetAdminUserBlockStatusUseCase);
  });

  it('should resolve IDeactivateAdminUserUseCase to DeactivateAdminUserUseCase', () => {
    const useCase = module.get<IDeactivateAdminUserUseCase>(
      IDeactivateAdminUserUseCase,
    );
    expect(useCase).toBeDefined();
    expect(useCase).toBeInstanceOf(DeactivateAdminUserUseCase);
  });

  it('should resolve IJobCategoryRepository to PrismaJobCategoryRepository', () => {
    const repo = module.get<IJobCategoryRepository>(IJobCategoryRepository);
    expect(repo).toBeDefined();
    expect(repo).toBeInstanceOf(PrismaJobCategoryRepository);
  });

  it('should resolve IJobPostRepository to PrismaJobPostRepository', () => {
    const repo = module.get<IJobPostRepository>(IJobPostRepository);
    expect(repo).toBeDefined();
    expect(repo).toBeInstanceOf(PrismaJobPostRepository);
  });

  it('should resolve IGetJobCategoriesUseCase to GetJobCategoriesUseCase', () => {
    const useCase = module.get<IGetJobCategoriesUseCase>(
      IGetJobCategoriesUseCase,
    );
    expect(useCase).toBeDefined();
    expect(useCase).toBeInstanceOf(GetJobCategoriesUseCase);
  });

  it('should resolve ICreateDraftJobPostUseCase to CreateDraftJobPostUseCase', () => {
    const useCase = module.get<ICreateDraftJobPostUseCase>(
      ICreateDraftJobPostUseCase,
    );
    expect(useCase).toBeDefined();
    expect(useCase).toBeInstanceOf(CreateDraftJobPostUseCase);
  });

  it('should resolve IPublishJobPostUseCase to PublishJobPostUseCase', () => {
    const useCase = module.get<IPublishJobPostUseCase>(IPublishJobPostUseCase);
    expect(useCase).toBeDefined();
    expect(useCase).toBeInstanceOf(PublishJobPostUseCase);
  });

  it('should resolve IGetRecruiterJobPostsUseCase to GetRecruiterJobPostsUseCase', () => {
    const useCase = module.get<IGetRecruiterJobPostsUseCase>(
      IGetRecruiterJobPostsUseCase,
    );
    expect(useCase).toBeDefined();
    expect(useCase).toBeInstanceOf(GetRecruiterJobPostsUseCase);
  });

  it('should resolve IGetRecruiterJobPostByIdUseCase to GetRecruiterJobPostByIdUseCase', () => {
    const useCase = module.get<IGetRecruiterJobPostByIdUseCase>(
      IGetRecruiterJobPostByIdUseCase,
    );
    expect(useCase).toBeDefined();
    expect(useCase).toBeInstanceOf(GetRecruiterJobPostByIdUseCase);
  });

  it('should resolve IUpdateJobPostUseCase to UpdateJobPostUseCase', () => {
    const useCase = module.get<IUpdateJobPostUseCase>(IUpdateJobPostUseCase);
    expect(useCase).toBeDefined();
    expect(useCase).toBeInstanceOf(UpdateJobPostUseCase);
  });

  it('should resolve ITransitionJobPostStatusUseCase to TransitionJobPostStatusUseCase', () => {
    const useCase = module.get<ITransitionJobPostStatusUseCase>(
      ITransitionJobPostStatusUseCase,
    );
    expect(useCase).toBeDefined();
    expect(useCase).toBeInstanceOf(TransitionJobPostStatusUseCase);
  });

  it('should resolve IGetJobApplicationsUseCase to GetJobApplicationsUseCase', () => {
    const useCase = module.get<IGetJobApplicationsUseCase>(
      IGetJobApplicationsUseCase,
    );
    expect(useCase).toBeDefined();
    expect(useCase).toBeInstanceOf(GetJobApplicationsUseCase);
  });

  it('should resolve IShortlistJobApplicationUseCase to ShortlistJobApplicationUseCase', () => {
    const useCase = module.get<IShortlistJobApplicationUseCase>(
      IShortlistJobApplicationUseCase,
    );
    expect(useCase).toBeDefined();
    expect(useCase).toBeInstanceOf(ShortlistJobApplicationUseCase);
  });

  it('should resolve IAcceptJobApplicationUseCase to AcceptJobApplicationUseCase', () => {
    const useCase = module.get<IAcceptJobApplicationUseCase>(
      IAcceptJobApplicationUseCase,
    );
    expect(useCase).toBeDefined();
    expect(useCase).toBeInstanceOf(AcceptJobApplicationUseCase);
  });

  it('should resolve IRejectJobApplicationUseCase to RejectJobApplicationUseCase', () => {
    const useCase = module.get<IRejectJobApplicationUseCase>(
      IRejectJobApplicationUseCase,
    );
    expect(useCase).toBeDefined();
    expect(useCase).toBeInstanceOf(RejectJobApplicationUseCase);
  });

  it('should resolve IFindOpenJobsUseCase to FindOpenJobsUseCase', () => {
    const useCase = module.get<IFindOpenJobsUseCase>(IFindOpenJobsUseCase);
    expect(useCase).toBeDefined();
    expect(useCase).toBeInstanceOf(FindOpenJobsUseCase);
  });

  it('should resolve IGetWorkerJobDetailsUseCase to GetWorkerJobDetailsUseCase', () => {
    const useCase = module.get<IGetWorkerJobDetailsUseCase>(
      IGetWorkerJobDetailsUseCase,
    );
    expect(useCase).toBeDefined();
    expect(useCase).toBeInstanceOf(GetWorkerJobDetailsUseCase);
  });

  it('should resolve IReportRepository to PrismaReportRepository', () => {
    const repository = module.get<IReportRepository>(IReportRepository);
    expect(repository).toBeDefined();
    expect(repository).toBeInstanceOf(PrismaReportRepository);
  });

  it('should resolve IReportJobUseCase to ReportJobUseCase', () => {
    const useCase = module.get<IReportJobUseCase>(IReportJobUseCase);
    expect(useCase).toBeDefined();
    expect(useCase).toBeInstanceOf(ReportJobUseCase);
  });

  it('should resolve JobDiscoveryController', () => {
    const controller = module.get<JobDiscoveryController>(
      JobDiscoveryController,
    );
    expect(controller).toBeDefined();
    expect(controller).toBeInstanceOf(JobDiscoveryController);
  });

  it('should resolve JobPostingController', () => {
    const controller = module.get<JobPostingController>(JobPostingController);
    expect(controller).toBeDefined();
    expect(controller).toBeInstanceOf(JobPostingController);
  });
});
