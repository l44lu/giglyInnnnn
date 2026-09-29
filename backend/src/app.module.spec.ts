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
});
