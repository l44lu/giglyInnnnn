import { IRecruiterProfileRepository } from '../../../../domain/repositories/recruiter-profile.repository.interface';
import { RecruiterProfileEntity } from '../../../../domain/entities/recruiter-profile.entity';
import { UpdateRecruiterProfileUseCase } from './update-recruiter-profile.use-case';
import { RecruiterProfileResponseDto } from '../../../dto/recruiter-profile/recruiter-profile-response.dto';
import { UpdateRecruiterProfileInputDto } from '../../../dto/recruiter-profile/update-recruiter-profile-input.dto';

describe('UpdateRecruiterProfileUseCase', () => {
  let useCase: UpdateRecruiterProfileUseCase;
  let recruiterProfileRepository: jest.Mocked<IRecruiterProfileRepository>;

  const mockUpdatedProfile = new RecruiterProfileEntity({
    id: 'profile-uuid-1',
    userId: 'recruiter-user-1',
    companyId: 'company-uuid-1',
    roleTitle: 'Senior Talent Acquisition Lead',
    yearsExperience: 8,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-02-01T00:00:00.000Z'),
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

    useCase = new UpdateRecruiterProfileUseCase(recruiterProfileRepository);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should pass authenticated userId to repository.upsert and return RecruiterProfileResponseDto', async () => {
    recruiterProfileRepository.upsert.mockResolvedValue(mockUpdatedProfile);

    const updateDto: UpdateRecruiterProfileInputDto = {
      roleTitle: 'Senior Talent Acquisition Lead',
      yearsExperience: 8,
    };

    const result = await useCase.execute('recruiter-user-1', updateDto);

    expect(recruiterProfileRepository.upsert).toHaveBeenCalledWith(
      'recruiter-user-1',
      {
        roleTitle: 'Senior Talent Acquisition Lead',
        yearsExperience: 8,
      },
    );
    expect(result).toBeInstanceOf(RecruiterProfileResponseDto);
    expect(result.id).toBe('profile-uuid-1');
    expect(result.userId).toBe('recruiter-user-1');
    expect(result.roleTitle).toBe('Senior Talent Acquisition Lead');
    expect(result.yearsExperience).toBe(8);
    expect(result.companyId).toBe('company-uuid-1');
  });

  it('should only forward defined update fields to repository.upsert (partial update)', async () => {
    const partiallyUpdatedProfile = new RecruiterProfileEntity({
      ...mockUpdatedProfile,
      roleTitle: 'Lead Recruiter',
    });
    recruiterProfileRepository.upsert.mockResolvedValue(
      partiallyUpdatedProfile,
    );

    const updateDto: UpdateRecruiterProfileInputDto = {
      roleTitle: 'Lead Recruiter',
    };

    const result = await useCase.execute('recruiter-user-1', updateDto);

    expect(recruiterProfileRepository.upsert).toHaveBeenCalledWith(
      'recruiter-user-1',
      {
        roleTitle: 'Lead Recruiter',
      },
    );
    expect(result.roleTitle).toBe('Lead Recruiter');
  });

  it('should allow updating only yearsExperience', async () => {
    const updatedProfile = new RecruiterProfileEntity({
      ...mockUpdatedProfile,
      yearsExperience: 10,
    });
    recruiterProfileRepository.upsert.mockResolvedValue(updatedProfile);

    const updateDto: UpdateRecruiterProfileInputDto = {
      yearsExperience: 10,
    };

    const result = await useCase.execute('recruiter-user-1', updateDto);

    expect(recruiterProfileRepository.upsert).toHaveBeenCalledWith(
      'recruiter-user-1',
      {
        yearsExperience: 10,
      },
    );
    expect(result.yearsExperience).toBe(10);
  });

  it('REGRESSION: should never write or forward companyId even if present on untyped payload', async () => {
    recruiterProfileRepository.upsert.mockResolvedValue(mockUpdatedProfile);

    const untypedDto = {
      roleTitle: 'Senior Talent Acquisition Lead',
      yearsExperience: 8,
      companyId: 'arbitrary-company-uuid',
    } as unknown as UpdateRecruiterProfileInputDto;

    const result = await useCase.execute('recruiter-user-1', untypedDto);

    expect(recruiterProfileRepository.upsert).toHaveBeenCalledWith(
      'recruiter-user-1',
      {
        roleTitle: 'Senior Talent Acquisition Lead',
        yearsExperience: 8,
      },
    );
    const upsertPayload = recruiterProfileRepository.upsert.mock.calls[0][1];
    expect(upsertPayload).not.toHaveProperty('companyId');
    expect(result).toBeInstanceOf(RecruiterProfileResponseDto);
  });
});
