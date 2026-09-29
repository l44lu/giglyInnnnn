import { BadRequestException, NotFoundException } from '@nestjs/common';
import { IRecruiterProfileRepository } from '../../../../domain/repositories/recruiter-profile.repository.interface';
import { ICompanyRepository } from '../../../../domain/repositories/company.repository.interface';
import { RecruiterProfileEntity } from '../../../../domain/entities/recruiter-profile.entity';
import { CompanyEntity } from '../../../../domain/entities/company.entity';
import { UpdateRecruiterCompanyUseCase } from './update-recruiter-company.use-case';
import { CompanyResponseDto } from '../../../dto/recruiter-profile/company-response.dto';
import { UpdateCompanyInputDto } from '../../../dto/recruiter-profile/update-company-input.dto';

describe('UpdateRecruiterCompanyUseCase', () => {
  let useCase: UpdateRecruiterCompanyUseCase;
  let recruiterProfileRepository: jest.Mocked<IRecruiterProfileRepository>;
  let companyRepository: jest.Mocked<ICompanyRepository>;

  const mockExistingCompanyA = new CompanyEntity({
    id: 'COMPANY_A',
    name: 'Company Alpha',
    industry: 'Technology',
    companySize: '100-200',
    website: 'https://alpha.example.com',
    headquartersLocation: 'San Francisco, CA',
    about: 'Original Alpha about text.',
    logoUrl: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  });

  const mockProfileWithCompanyA = new RecruiterProfileEntity({
    id: 'recruiter-profile-uuid-1',
    userId: 'recruiter-user-1',
    companyId: 'COMPANY_A',
    roleTitle: 'Technical Recruiter',
    yearsExperience: 4,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  });

  const mockProfileWithoutCompany = new RecruiterProfileEntity({
    id: 'recruiter-profile-uuid-2',
    userId: 'recruiter-user-2',
    companyId: null,
    roleTitle: 'Headhunter',
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

    useCase = new UpdateRecruiterCompanyUseCase(
      recruiterProfileRepository,
      companyRepository,
    );
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should throw NotFoundException if recruiter profile does not exist', async () => {
    recruiterProfileRepository.findByUserId.mockResolvedValue(null);

    const dto: UpdateCompanyInputDto = { name: 'Acme Corp' };

    await expect(useCase.execute('unknown-user', dto)).rejects.toThrow(
      NotFoundException,
    );
    await expect(useCase.execute('unknown-user', dto)).rejects.toThrow(
      'Recruiter profile not found',
    );
    expect(companyRepository.create).not.toHaveBeenCalled();
    expect(companyRepository.update).not.toHaveBeenCalled();
  });

  describe('When recruiterProfile.companyId is null (Company Creation & Linking)', () => {
    it('should throw BadRequestException if company name is omitted or whitespace-only on creation', async () => {
      recruiterProfileRepository.findByUserId.mockResolvedValue(
        mockProfileWithoutCompany,
      );

      const dtoWithoutName: UpdateCompanyInputDto = {
        industry: 'FinTech',
      };

      await expect(
        useCase.execute('recruiter-user-2', dtoWithoutName),
      ).rejects.toThrow(BadRequestException);
      await expect(
        useCase.execute('recruiter-user-2', dtoWithoutName),
      ).rejects.toThrow('Company name is required to create a company profile');

      const dtoWithBlankName: UpdateCompanyInputDto = {
        name: '   ',
      };

      await expect(
        useCase.execute('recruiter-user-2', dtoWithBlankName),
      ).rejects.toThrow(BadRequestException);
      await expect(
        useCase.execute('recruiter-user-2', dtoWithBlankName),
      ).rejects.toThrow('Company name is required to create a company profile');

      expect(companyRepository.create).not.toHaveBeenCalled();
      expect(recruiterProfileRepository.upsert).not.toHaveBeenCalled();
    });

    it('should create new company, link its ID to recruiter profile, and return CompanyResponseDto', async () => {
      recruiterProfileRepository.findByUserId.mockResolvedValue(
        mockProfileWithoutCompany,
      );

      const newCompanyEntity = new CompanyEntity({
        id: 'new-company-uuid-99',
        name: 'Beta Innovations',
        industry: 'Healthcare',
        companySize: '10-50',
        website: 'https://beta.example.com',
        headquartersLocation: 'Boston, MA',
        about: 'Health innovation leaders.',
        logoUrl: null,
        createdAt: new Date('2026-03-01T00:00:00.000Z'),
        updatedAt: new Date('2026-03-01T00:00:00.000Z'),
      });

      companyRepository.create.mockResolvedValue(newCompanyEntity);
      recruiterProfileRepository.upsert.mockResolvedValue(
        new RecruiterProfileEntity({
          ...mockProfileWithoutCompany,
          companyId: 'new-company-uuid-99',
        }),
      );

      const inputDto: UpdateCompanyInputDto = {
        name: '  Beta Innovations  ',
        industry: 'Healthcare',
        companySize: '10-50',
        website: 'https://beta.example.com',
        headquartersLocation: 'Boston, MA',
        about: 'Health innovation leaders.',
      };

      const result = await useCase.execute('recruiter-user-2', inputDto);

      expect(companyRepository.create).toHaveBeenCalledWith({
        name: 'Beta Innovations',
        industry: 'Healthcare',
        companySize: '10-50',
        website: 'https://beta.example.com',
        headquartersLocation: 'Boston, MA',
        about: 'Health innovation leaders.',
      });

      expect(recruiterProfileRepository.upsert).toHaveBeenCalledWith(
        'recruiter-user-2',
        {
          companyId: 'new-company-uuid-99',
        },
      );

      expect(result).toBeInstanceOf(CompanyResponseDto);
      expect(result.id).toBe('new-company-uuid-99');
      expect(result.name).toBe('Beta Innovations');
      expect(result.industry).toBe('Healthcare');
    });

    it('REGRESSION: should create new company and ignore any client-supplied companyId attempt during creation', async () => {
      recruiterProfileRepository.findByUserId.mockResolvedValue(
        mockProfileWithoutCompany,
      );

      const newCompanyEntity = new CompanyEntity({
        id: 'new-generated-id',
        name: 'Legit Company',
        createdAt: new Date('2026-03-01T00:00:00.000Z'),
        updatedAt: new Date('2026-03-01T00:00:00.000Z'),
      });
      companyRepository.create.mockResolvedValue(newCompanyEntity);

      const payloadWithAttackerCompanyId = {
        name: 'Legit Company',
        companyId: 'arbitrary-victim-company-id',
      } as unknown as UpdateCompanyInputDto;

      const result = await useCase.execute(
        'recruiter-user-2',
        payloadWithAttackerCompanyId,
      );

      // Must create a new company with generated ID, not link to victim
      expect(companyRepository.create).toHaveBeenCalledWith({
        name: 'Legit Company',
      });
      expect(recruiterProfileRepository.upsert).toHaveBeenCalledWith(
        'recruiter-user-2',
        {
          companyId: 'new-generated-id',
        },
      );
      expect(recruiterProfileRepository.upsert).not.toHaveBeenCalledWith(
        'recruiter-user-2',
        expect.objectContaining({ companyId: 'arbitrary-victim-company-id' }),
      );
      expect(result.id).toBe('new-generated-id');
    });
  });

  describe('When recruiterProfile.companyId exists (Update Existing Company)', () => {
    it('should throw NotFoundException if associated company no longer exists', async () => {
      recruiterProfileRepository.findByUserId.mockResolvedValue(
        mockProfileWithCompanyA,
      );
      companyRepository.findById.mockResolvedValue(null);

      const dto: UpdateCompanyInputDto = { name: 'Updated Name' };

      await expect(useCase.execute('recruiter-user-1', dto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(useCase.execute('recruiter-user-1', dto)).rejects.toThrow(
        'Associated company not found',
      );
      expect(companyRepository.findById).toHaveBeenCalledWith('COMPANY_A');
      expect(companyRepository.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if name is provided as an empty string', async () => {
      recruiterProfileRepository.findByUserId.mockResolvedValue(
        mockProfileWithCompanyA,
      );
      companyRepository.findById.mockResolvedValue(mockExistingCompanyA);

      const dto: UpdateCompanyInputDto = { name: '   ' };

      await expect(useCase.execute('recruiter-user-1', dto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(useCase.execute('recruiter-user-1', dto)).rejects.toThrow(
        'Company name cannot be empty',
      );
      expect(companyRepository.update).not.toHaveBeenCalled();
    });

    it('should update associated company and return CompanyResponseDto', async () => {
      recruiterProfileRepository.findByUserId.mockResolvedValue(
        mockProfileWithCompanyA,
      );
      companyRepository.findById.mockResolvedValue(mockExistingCompanyA);

      const updatedCompanyEntity = new CompanyEntity({
        ...mockExistingCompanyA,
        name: 'Company Alpha Renamed',
        about: 'Updated description for Alpha.',
      });
      companyRepository.update.mockResolvedValue(updatedCompanyEntity);

      const dto: UpdateCompanyInputDto = {
        name: 'Company Alpha Renamed',
        about: 'Updated description for Alpha.',
      };

      const result = await useCase.execute('recruiter-user-1', dto);

      expect(companyRepository.findById).toHaveBeenCalledWith('COMPANY_A');
      expect(companyRepository.update).toHaveBeenCalledWith('COMPANY_A', {
        name: 'Company Alpha Renamed',
        about: 'Updated description for Alpha.',
      });
      expect(result).toBeInstanceOf(CompanyResponseDto);
      expect(result.id).toBe('COMPANY_A');
      expect(result.name).toBe('Company Alpha Renamed');
      expect(result.about).toBe('Updated description for Alpha.');
    });

    it('should preserve existing values on partial update when fields are omitted', async () => {
      recruiterProfileRepository.findByUserId.mockResolvedValue(
        mockProfileWithCompanyA,
      );
      companyRepository.findById.mockResolvedValue(mockExistingCompanyA);

      const updatedCompanyEntity = new CompanyEntity({
        ...mockExistingCompanyA,
        website: 'https://new-alpha.example.com',
      });
      companyRepository.update.mockResolvedValue(updatedCompanyEntity);

      const dto: UpdateCompanyInputDto = {
        website: 'https://new-alpha.example.com',
      };

      const result = await useCase.execute('recruiter-user-1', dto);

      expect(companyRepository.update).toHaveBeenCalledWith('COMPANY_A', {
        website: 'https://new-alpha.example.com',
      });
      expect(result.website).toBe('https://new-alpha.example.com');
      expect(result.name).toBe('Company Alpha');
    });

    it('SECURITY REGRESSION: when companyId is COMPANY_A and payload contains COMPANY_B, MUST update COMPANY_A, NEVER COMPANY_B', async () => {
      recruiterProfileRepository.findByUserId.mockResolvedValue(
        mockProfileWithCompanyA,
      );
      companyRepository.findById.mockResolvedValue(mockExistingCompanyA);

      const updatedCompanyEntity = new CompanyEntity({
        ...mockExistingCompanyA,
        name: 'Updated Alpha Name',
      });
      companyRepository.update.mockResolvedValue(updatedCompanyEntity);

      const maliciousPayload = {
        name: 'Updated Alpha Name',
        companyId: 'COMPANY_B',
      } as unknown as UpdateCompanyInputDto;

      const result = await useCase.execute(
        'recruiter-user-1',
        maliciousPayload,
      );

      // Verify that lookup and update are strictly targetting COMPANY_A
      expect(companyRepository.findById).toHaveBeenCalledWith('COMPANY_A');
      expect(companyRepository.findById).not.toHaveBeenCalledWith('COMPANY_B');

      expect(companyRepository.update).toHaveBeenCalledWith('COMPANY_A', {
        name: 'Updated Alpha Name',
      });
      expect(companyRepository.update).not.toHaveBeenCalledWith(
        'COMPANY_B',
        expect.anything(),
      );

      // Verify companyId is not in update payload
      const updateDataArg = companyRepository.update.mock.calls[0][1];
      expect(updateDataArg).not.toHaveProperty('companyId');

      // Profile relationship was NOT modified
      expect(recruiterProfileRepository.upsert).not.toHaveBeenCalled();

      expect(result.id).toBe('COMPANY_A');
    });
  });
});
