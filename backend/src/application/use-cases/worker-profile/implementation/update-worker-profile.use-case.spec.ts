import { IWorkerProfileRepository } from '../../../../domain/repositories/worker-profile.repository.interface';
import { WorkerProfileEntity } from '../../../../domain/entities/worker-profile.entity';
import { UpdateWorkerProfileUseCase } from './update-worker-profile.use-case';
import { WorkerProfileResponseDto } from '../../../dto/worker-profile/worker-profile-response.dto';
import { UpdateWorkerProfileInputDto } from '../../../dto/worker-profile/update-worker-profile-input.dto';

describe('UpdateWorkerProfileUseCase', () => {
  let useCase: UpdateWorkerProfileUseCase;
  let workerProfileRepository: jest.Mocked<IWorkerProfileRepository>;

  const mockUpdatedProfile = new WorkerProfileEntity({
    id: 'profile-uuid-1',
    userId: 'worker-user-1',
    headline: 'Principal Engineer & Architect',
    yearsExperience: 10,
    responseTimeHours: 1,
    availabilityStatus: 'busy',
    isOpenToWork: false,
    totalCompletedGigs: 25,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-02-01T00:00:00.000Z'),
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

    useCase = new UpdateWorkerProfileUseCase(workerProfileRepository);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should pass authenticated userId to repository.upsert and return WorkerProfileResponseDto', async () => {
    workerProfileRepository.upsert.mockResolvedValue(mockUpdatedProfile);

    const updateDto: UpdateWorkerProfileInputDto = {
      headline: 'Principal Engineer & Architect',
      yearsExperience: 10,
      responseTimeHours: 1,
      availabilityStatus: 'busy',
      isOpenToWork: false,
    };

    const result = await useCase.execute('worker-user-1', updateDto);

    expect(workerProfileRepository.upsert).toHaveBeenCalledWith(
      'worker-user-1',
      {
        headline: 'Principal Engineer & Architect',
        yearsExperience: 10,
        responseTimeHours: 1,
        availabilityStatus: 'busy',
        isOpenToWork: false,
      },
    );
    expect(result).toBeInstanceOf(WorkerProfileResponseDto);
    expect(result.id).toBe('profile-uuid-1');
    expect(result.userId).toBe('worker-user-1');
    expect(result.headline).toBe('Principal Engineer & Architect');
    expect(result.yearsExperience).toBe(10);
    expect(result.responseTimeHours).toBe(1);
    expect(result.availabilityStatus).toBe('busy');
    expect(result.isOpenToWork).toBe(false);
    expect(result.totalCompletedGigs).toBe(25);
  });

  it('should only forward defined update fields to repository.upsert (partial update)', async () => {
    const partiallyUpdatedProfile = new WorkerProfileEntity({
      ...mockUpdatedProfile,
      headline: 'New Headline Only',
    });
    workerProfileRepository.upsert.mockResolvedValue(partiallyUpdatedProfile);

    const updateDto: UpdateWorkerProfileInputDto = {
      headline: 'New Headline Only',
    };

    const result = await useCase.execute('worker-user-1', updateDto);

    expect(workerProfileRepository.upsert).toHaveBeenCalledWith(
      'worker-user-1',
      {
        headline: 'New Headline Only',
      },
    );
    expect(result.headline).toBe('New Headline Only');
  });

  it('should enforce authenticated userId and ignore client-supplied userId or system fields in body', async () => {
    workerProfileRepository.upsert.mockResolvedValue(mockUpdatedProfile);

    // Malicious payload attempting to set someone else's userId or overwrite system-managed metrics
    const untrustedDto = {
      userId: 'attacker-stolen-id',
      id: 'hacked-profile-id',
      totalCompletedGigs: 99999,
      headline: 'Legitimate Update',
    } as unknown as UpdateWorkerProfileInputDto;

    const result = await useCase.execute('trusted-auth-user-id', untrustedDto);

    // The first argument to upsert MUST be the trusted-auth-user-id
    expect(workerProfileRepository.upsert).toHaveBeenCalledWith(
      'trusted-auth-user-id',
      {
        headline: 'Legitimate Update',
      },
    );
    expect(result.userId).toBe('worker-user-1');
  });
});
