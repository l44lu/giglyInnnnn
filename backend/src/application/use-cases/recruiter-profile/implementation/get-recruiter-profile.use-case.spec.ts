import { NotFoundException } from '@nestjs/common';
import { IRecruiterProfileRepository } from '../../../../domain/repositories/recruiter-profile.repository.interface';
import { RecruiterProfileEntity } from '../../../../domain/entities/recruiter-profile.entity';
import { GetRecruiterProfileUseCase } from './get-recruiter-profile.use-case';
import { RecruiterProfileResponseDto } from '../../../dto/recruiter-profile/recruiter-profile-response.dto';

describe('GetRecruiterProfileUseCase', () => {
  let useCase: GetRecruiterProfileUseCase;
  let recruiterProfileRepository: jest.Mocked<IRecruiterProfileRepository>;

  const mockProfile = new RecruiterProfileEntity({
    id: 'profile-uuid-1',
    userId: 'recruiter-user-1',
    companyId: 'company-uuid-1',
    roleTitle: 'Technical Recruiter',
    yearsExperience: 5,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
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

    useCase = new GetRecruiterProfileUseCase(recruiterProfileRepository);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should pass authenticated userId to repository.findByUserId and return RecruiterProfileResponseDto', async () => {
    recruiterProfileRepository.findByUserId.mockResolvedValue(mockProfile);

    const result = await useCase.execute('recruiter-user-1');

    expect(recruiterProfileRepository.findByUserId).toHaveBeenCalledWith(
      'recruiter-user-1',
    );
    expect(result).toBeInstanceOf(RecruiterProfileResponseDto);
    expect(result).toEqual({
      id: 'profile-uuid-1',
      userId: 'recruiter-user-1',
      companyId: 'company-uuid-1',
      roleTitle: 'Technical Recruiter',
      yearsExperience: 5,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    });
  });

  it('should throw NotFoundException when recruiter profile does not exist', async () => {
    recruiterProfileRepository.findByUserId.mockResolvedValue(null);

    await expect(useCase.execute('nonexistent-user')).rejects.toThrow(
      NotFoundException,
    );
    await expect(useCase.execute('nonexistent-user')).rejects.toThrow(
      'Recruiter profile not found',
    );
    expect(recruiterProfileRepository.findByUserId).toHaveBeenCalledWith(
      'nonexistent-user',
    );
  });
});
