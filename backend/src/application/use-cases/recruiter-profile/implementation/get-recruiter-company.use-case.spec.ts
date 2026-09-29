import { NotFoundException } from '@nestjs/common';
import { IRecruiterProfileRepository } from '../../../../domain/repositories/recruiter-profile.repository.interface';
import { ICompanyRepository } from '../../../../domain/repositories/company.repository.interface';
import { RecruiterProfileEntity } from '../../../../domain/entities/recruiter-profile.entity';
import { CompanyEntity } from '../../../../domain/entities/company.entity';
import { GetRecruiterCompanyUseCase } from './get-recruiter-company.use-case';
import { CompanyResponseDto } from '../../../dto/recruiter-profile/company-response.dto';

describe('GetRecruiterCompanyUseCase', () => {
  let useCase: GetRecruiterCompanyUseCase;
  let recruiterProfileRepository: jest.Mocked<IRecruiterProfileRepository>;
  let companyRepository: jest.Mocked<ICompanyRepository>;

  const mockCompany = new CompanyEntity({
    id: 'company-uuid-1',
    name: 'Acme Corp',
    industry: 'Technology',
    companySize: '50-100',
    website: 'https://acme.example.com',
    headquartersLocation: 'New York, NY',
    about: 'Leading company.',
    logoUrl: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  });

  const mockProfileWithCompany = new RecruiterProfileEntity({
    id: 'recruiter-profile-uuid-1',
    userId: 'recruiter-user-1',
    companyId: 'company-uuid-1',
    roleTitle: 'Lead Recruiter',
    yearsExperience: 5,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  });

  const mockProfileWithoutCompany = new RecruiterProfileEntity({
    id: 'recruiter-profile-uuid-2',
    userId: 'recruiter-user-2',
    companyId: null,
    roleTitle: 'Independent Recruiter',
    yearsExperience: 2,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
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

    useCase = new GetRecruiterCompanyUseCase(
      recruiterProfileRepository,
      companyRepository,
    );
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should throw NotFoundException if recruiter profile does not exist', async () => {
    recruiterProfileRepository.findByUserId.mockResolvedValue(null);

    await expect(useCase.execute('non-existent-user')).rejects.toThrow(
      NotFoundException,
    );
    await expect(useCase.execute('non-existent-user')).rejects.toThrow(
      'Recruiter profile not found',
    );
    expect(companyRepository.findById).not.toHaveBeenCalled();
  });

  it('should throw NotFoundException if recruiter profile has no companyId associated', async () => {
    recruiterProfileRepository.findByUserId.mockResolvedValue(
      mockProfileWithoutCompany,
    );

    await expect(useCase.execute('recruiter-user-2')).rejects.toThrow(
      NotFoundException,
    );
    await expect(useCase.execute('recruiter-user-2')).rejects.toThrow(
      'Company profile not configured for this recruiter',
    );
    expect(companyRepository.findById).not.toHaveBeenCalled();
  });

  it('should throw NotFoundException if associated company is not found in repository', async () => {
    recruiterProfileRepository.findByUserId.mockResolvedValue(
      mockProfileWithCompany,
    );
    companyRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('recruiter-user-1')).rejects.toThrow(
      NotFoundException,
    );
    await expect(useCase.execute('recruiter-user-1')).rejects.toThrow(
      'Company not found',
    );
    expect(companyRepository.findById).toHaveBeenCalledWith('company-uuid-1');
  });

  it('should successfully return CompanyResponseDto when recruiter and company exist', async () => {
    recruiterProfileRepository.findByUserId.mockResolvedValue(
      mockProfileWithCompany,
    );
    companyRepository.findById.mockResolvedValue(mockCompany);

    const result = await useCase.execute('recruiter-user-1');

    expect(recruiterProfileRepository.findByUserId).toHaveBeenCalledWith(
      'recruiter-user-1',
    );
    expect(companyRepository.findById).toHaveBeenCalledWith('company-uuid-1');
    expect(result).toBeInstanceOf(CompanyResponseDto);
    expect(result.id).toBe('company-uuid-1');
    expect(result.name).toBe('Acme Corp');
    expect(result.industry).toBe('Technology');
    expect(result.companySize).toBe('50-100');
    expect(result.website).toBe('https://acme.example.com');
    expect(result.headquartersLocation).toBe('New York, NY');
    expect(result.about).toBe('Leading company.');
  });
});
