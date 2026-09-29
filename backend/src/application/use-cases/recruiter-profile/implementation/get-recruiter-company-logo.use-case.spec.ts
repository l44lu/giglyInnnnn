import { NotFoundException } from '@nestjs/common';
import { IRecruiterProfileRepository } from '../../../../domain/repositories/recruiter-profile.repository.interface';
import { ICompanyRepository } from '../../../../domain/repositories/company.repository.interface';
import { IFileStorageService } from '../../../../domain/services/file-storage.service.interface';
import { RecruiterProfileEntity } from '../../../../domain/entities/recruiter-profile.entity';
import { CompanyEntity } from '../../../../domain/entities/company.entity';
import { GetRecruiterCompanyLogoUseCase } from './get-recruiter-company-logo.use-case';

describe('GetRecruiterCompanyLogoUseCase', () => {
  let useCase: GetRecruiterCompanyLogoUseCase;
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
    logoUrl: 'logos/company/company-uuid-1/logo-123.png',
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
      getFile: jest.fn(),
      deleteFile: jest.fn(),
    };

    useCase = new GetRecruiterCompanyLogoUseCase(
      recruiterProfileRepository,
      companyRepository,
      fileStorageService,
    );
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should throw NotFoundException if recruiter profile does not exist', async () => {
    recruiterProfileRepository.findByUserId.mockResolvedValue(null);

    await expect(useCase.execute('unknown-user')).rejects.toThrow(
      NotFoundException,
    );
    await expect(useCase.execute('unknown-user')).rejects.toThrow(
      'Recruiter profile not found',
    );
  });

  it('should throw NotFoundException if recruiter profile has no companyId', async () => {
    recruiterProfileRepository.findByUserId.mockResolvedValue(
      mockProfileNoCompany,
    );

    await expect(useCase.execute('recruiter-user-2')).rejects.toThrow(
      NotFoundException,
    );
    await expect(useCase.execute('recruiter-user-2')).rejects.toThrow(
      'Company profile not configured for this recruiter',
    );
  });

  it('should throw NotFoundException if company does not exist in repository', async () => {
    recruiterProfileRepository.findByUserId.mockResolvedValue(mockProfile);
    companyRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('recruiter-user-1')).rejects.toThrow(
      NotFoundException,
    );
    await expect(useCase.execute('recruiter-user-1')).rejects.toThrow(
      'Company not found',
    );
  });

  it('should throw NotFoundException if company has no logoUrl configured', async () => {
    recruiterProfileRepository.findByUserId.mockResolvedValue(mockProfile);
    companyRepository.findById.mockResolvedValue(mockCompanyNoLogo);

    await expect(useCase.execute('recruiter-user-1')).rejects.toThrow(
      NotFoundException,
    );
    await expect(useCase.execute('recruiter-user-1')).rejects.toThrow(
      'No logo found for this company',
    );
  });

  it('should successfully retrieve company logo from S3 and return binary data', async () => {
    recruiterProfileRepository.findByUserId.mockResolvedValue(mockProfile);
    companyRepository.findById.mockResolvedValue(mockCompanyWithLogo);

    const mockFileResult = {
      buffer: Buffer.from('mock-logo-data'),
      contentType: 'image/png',
    };
    fileStorageService.getFile.mockResolvedValue(mockFileResult);

    const result = await useCase.execute('recruiter-user-1');

    expect(fileStorageService.getFile).toHaveBeenCalledWith(
      'logos/company/company-uuid-1/logo-123.png',
    );
    expect(result).toBe(mockFileResult);
    expect(result.contentType).toBe('image/png');
  });
});
