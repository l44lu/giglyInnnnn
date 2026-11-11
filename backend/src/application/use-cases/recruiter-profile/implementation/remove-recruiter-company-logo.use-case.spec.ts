import { NotFoundException, Logger } from '@nestjs/common';
import { IRecruiterProfileRepository } from '../../../../domain/repositories/recruiter-profile.repository.interface';
import { ICompanyRepository } from '../../../../domain/repositories/company.repository.interface';
import { IFileStorageService } from '../../../../domain/services/file-storage.service.interface';
import { RecruiterProfileEntity } from '../../../../domain/entities/recruiter-profile.entity';
import { CompanyEntity } from '../../../../domain/entities/company.entity';
import { RemoveRecruiterCompanyLogoUseCase } from './remove-recruiter-company-logo.use-case';

describe('RemoveRecruiterCompanyLogoUseCase', () => {
  let useCase: RemoveRecruiterCompanyLogoUseCase;
  let recruiterProfileRepository: jest.Mocked<IRecruiterProfileRepository>;
  let companyRepository: jest.Mocked<ICompanyRepository>;
  let fileStorageService: jest.Mocked<IFileStorageService>;

  const mockProfile = new RecruiterProfileEntity({
    id: 'profile-uuid-1',
    userId: 'recruiter-user-1',
    companyId: 'company-uuid-1',
  });

  const mockProfileNoCompany = new RecruiterProfileEntity({
    id: 'profile-uuid-2',
    userId: 'recruiter-user-2',
    companyId: null,
  });

  const mockCompanyWithLogo = new CompanyEntity({
    id: 'company-uuid-1',
    name: 'Acme Corp',
    logoUrl: 'logos/company/company-uuid-1/old-logo.png',
  });

  const mockCompanyNoLogo = new CompanyEntity({
    id: 'company-uuid-1',
    name: 'Acme Corp',
    logoUrl: null,
  });

  beforeEach(() => {
    recruiterProfileRepository = {
      findById: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findByUserId: jest.fn(),
      upsert: jest.fn(),
    };

    companyRepository = {
      findById: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findByName: jest.fn(),
    };

    fileStorageService = {
      uploadFile: jest.fn(),
      deleteFile: jest.fn(),
      getFile: jest.fn(),
    };

    useCase = new RemoveRecruiterCompanyLogoUseCase(
      recruiterProfileRepository,
      companyRepository,
      fileStorageService,
    );
  });

  it('1. Existing company logo reference is cleared and S3 object deleted after successful DB update', async () => {
    recruiterProfileRepository.findByUserId.mockResolvedValueOnce(mockProfile);
    companyRepository.findById.mockResolvedValueOnce(mockCompanyWithLogo);
    companyRepository.update.mockResolvedValueOnce(
      new CompanyEntity({ ...mockCompanyWithLogo, logoUrl: null }),
    );
    fileStorageService.deleteFile.mockResolvedValueOnce(undefined);

    const result = await useCase.execute(mockProfile.userId);

    expect(result).toEqual({ logoUrl: null });
    expect(companyRepository.update).toHaveBeenCalledWith(
      mockCompanyWithLogo.id,
      { logoUrl: null },
    );
    expect(fileStorageService.deleteFile).toHaveBeenCalledWith(
      'logos/company/company-uuid-1/old-logo.png',
    );
  });

  it('2. Operation order: Database update occurs BEFORE S3 deletion', async () => {
    recruiterProfileRepository.findByUserId.mockResolvedValueOnce(mockProfile);
    companyRepository.findById.mockResolvedValueOnce(mockCompanyWithLogo);
    const callOrder: string[] = [];

    companyRepository.update.mockImplementationOnce(() => {
      callOrder.push('db.update');
      return Promise.resolve(
        new CompanyEntity({ ...mockCompanyWithLogo, logoUrl: null }),
      );
    });

    fileStorageService.deleteFile.mockImplementationOnce(() => {
      callOrder.push('s3.deleteFile');
      return Promise.resolve();
    });

    await useCase.execute(mockProfile.userId);

    expect(callOrder).toEqual(['db.update', 's3.deleteFile']);
  });

  it('3. Database failure prevents S3 deletion', async () => {
    recruiterProfileRepository.findByUserId.mockResolvedValueOnce(mockProfile);
    companyRepository.findById.mockResolvedValueOnce(mockCompanyWithLogo);
    companyRepository.update.mockRejectedValueOnce(
      new Error('Prisma database error'),
    );

    await expect(useCase.execute(mockProfile.userId)).rejects.toThrow(
      'Prisma database error',
    );

    expect(fileStorageService.deleteFile).not.toHaveBeenCalled();
  });

  it('4. S3 cleanup failure does not restore cleared DB reference and logs warning', async () => {
    recruiterProfileRepository.findByUserId.mockResolvedValueOnce(mockProfile);
    companyRepository.findById.mockResolvedValueOnce(mockCompanyWithLogo);
    companyRepository.update.mockResolvedValueOnce(
      new CompanyEntity({ ...mockCompanyWithLogo, logoUrl: null }),
    );
    fileStorageService.deleteFile.mockRejectedValueOnce(
      new Error('S3 AccessDenied error'),
    );

    const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    const result = await useCase.execute(mockProfile.userId);

    expect(result).toEqual({ logoUrl: null });
    expect(companyRepository.update).toHaveBeenCalledTimes(1);
    expect(companyRepository.update).toHaveBeenCalledWith(
      mockCompanyWithLogo.id,
      { logoUrl: null },
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'Failed to delete old company logo "logos/company/company-uuid-1/old-logo.png" from S3',
      ),
    );

    warnSpy.mockRestore();
  });

  it('5. Throws NotFoundException if recruiter profile does not exist', async () => {
    recruiterProfileRepository.findByUserId.mockResolvedValueOnce(null);

    await expect(useCase.execute('unknown-user')).rejects.toThrow(
      new NotFoundException('Recruiter profile not found'),
    );
    expect(companyRepository.update).not.toHaveBeenCalled();
    expect(fileStorageService.deleteFile).not.toHaveBeenCalled();
  });

  it('6. Throws NotFoundException if company is not configured for recruiter', async () => {
    recruiterProfileRepository.findByUserId.mockResolvedValueOnce(
      mockProfileNoCompany,
    );

    await expect(useCase.execute(mockProfileNoCompany.userId)).rejects.toThrow(
      new NotFoundException(
        'Company profile not configured for this recruiter',
      ),
    );
    expect(companyRepository.update).not.toHaveBeenCalled();
    expect(fileStorageService.deleteFile).not.toHaveBeenCalled();
  });

  it('7. Throws NotFoundException if associated company is not found in database', async () => {
    recruiterProfileRepository.findByUserId.mockResolvedValueOnce(mockProfile);
    companyRepository.findById.mockResolvedValueOnce(null);

    await expect(useCase.execute(mockProfile.userId)).rejects.toThrow(
      new NotFoundException('Company not found'),
    );
    expect(companyRepository.update).not.toHaveBeenCalled();
    expect(fileStorageService.deleteFile).not.toHaveBeenCalled();
  });

  it('8. No logo exists: handled safely and idempotently without DB or S3 calls', async () => {
    recruiterProfileRepository.findByUserId.mockResolvedValueOnce(mockProfile);
    companyRepository.findById.mockResolvedValueOnce(mockCompanyNoLogo);

    const result = await useCase.execute(mockProfile.userId);

    expect(result).toEqual({ logoUrl: null });
    expect(companyRepository.update).not.toHaveBeenCalled();
    expect(fileStorageService.deleteFile).not.toHaveBeenCalled();
  });

  it('9. Empty string logoUrl is handled safely and idempotently', async () => {
    const companyWithEmptyLogo = new CompanyEntity({
      ...mockCompanyNoLogo,
      logoUrl: '   ',
    });
    recruiterProfileRepository.findByUserId.mockResolvedValueOnce(mockProfile);
    companyRepository.findById.mockResolvedValueOnce(companyWithEmptyLogo);

    const result = await useCase.execute(mockProfile.userId);

    expect(result).toEqual({ logoUrl: null });
    expect(companyRepository.update).not.toHaveBeenCalled();
    expect(fileStorageService.deleteFile).not.toHaveBeenCalled();
  });

  it('10. Derives company strictly from recruiter profile association (no arbitrary companyId)', async () => {
    recruiterProfileRepository.findByUserId.mockResolvedValueOnce(mockProfile);
    companyRepository.findById.mockResolvedValueOnce(mockCompanyWithLogo);
    companyRepository.update.mockResolvedValueOnce(
      new CompanyEntity({ ...mockCompanyWithLogo, logoUrl: null }),
    );
    fileStorageService.deleteFile.mockResolvedValueOnce(undefined);

    await useCase.execute(mockProfile.userId);

    // Verify companyRepository was queried using profile.companyId and NOT any input
    expect(companyRepository.findById).toHaveBeenCalledWith('company-uuid-1');
    expect(companyRepository.update).toHaveBeenCalledWith('company-uuid-1', {
      logoUrl: null,
    });
  });
});
