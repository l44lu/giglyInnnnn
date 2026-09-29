import { NotFoundException } from '@nestjs/common';
import { IWorkerProfileRepository } from '../../../../domain/repositories/worker-profile.repository.interface';
import { WorkerProfileEntity } from '../../../../domain/entities/worker-profile.entity';
import { GetWorkerProfileUseCase } from './get-worker-profile.use-case';
import { WorkerProfileResponseDto } from '../../../dto/worker-profile/worker-profile-response.dto';

describe('GetWorkerProfileUseCase', () => {
  let useCase: GetWorkerProfileUseCase;
  let workerProfileRepository: jest.Mocked<IWorkerProfileRepository>;

  const mockProfile = new WorkerProfileEntity({
    id: 'profile-uuid-1',
    userId: 'worker-user-1',
    headline: 'Senior Full Stack Developer',
    yearsExperience: 6,
    responseTimeHours: 2,
    availabilityStatus: 'available',
    isOpenToWork: true,
    totalCompletedGigs: 15,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  });

  beforeEach(() => {
    workerProfileRepository = {
      findById: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findByUserId: jest.fn(),
      upsert: jest.fn(),
    };

    useCase = new GetWorkerProfileUseCase(workerProfileRepository);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should pass authenticated userId to repository.findByUserId and return WorkerProfileResponseDto', async () => {
    workerProfileRepository.findByUserId.mockResolvedValue(mockProfile);

    const result = await useCase.execute('worker-user-1');

    expect(workerProfileRepository.findByUserId).toHaveBeenCalledWith(
      'worker-user-1',
    );
    expect(result).toBeInstanceOf(WorkerProfileResponseDto);
    expect(result).toEqual({
      id: 'profile-uuid-1',
      userId: 'worker-user-1',
      headline: 'Senior Full Stack Developer',
      yearsExperience: 6,
      responseTimeHours: 2,
      availabilityStatus: 'available',
      isOpenToWork: true,
      totalCompletedGigs: 15,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    });
  });

  it('should throw NotFoundException when worker profile does not exist', async () => {
    workerProfileRepository.findByUserId.mockResolvedValue(null);

    await expect(useCase.execute('nonexistent-user')).rejects.toThrow(
      NotFoundException,
    );
    await expect(useCase.execute('nonexistent-user')).rejects.toThrow(
      'Worker profile not found',
    );
    expect(workerProfileRepository.findByUserId).toHaveBeenCalledWith(
      'nonexistent-user',
    );
  });
});
