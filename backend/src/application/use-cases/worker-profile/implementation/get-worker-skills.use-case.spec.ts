import { NotFoundException } from '@nestjs/common';
import { GetWorkerSkillsUseCase } from './get-worker-skills.use-case';
import { IWorkerProfileRepository } from '../../../../domain/repositories/worker-profile.repository.interface';
import { IWorkerSkillRepository } from '../../../../domain/repositories/worker-skill.repository.interface';
import { WorkerProfileEntity } from '../../../../domain/entities/worker-profile.entity';
import { WorkerSkillEntity } from '../../../../domain/entities/worker-skill.entity';
import { SkillEntity } from '../../../../domain/entities/skill.entity';

describe('GetWorkerSkillsUseCase', () => {
  let useCase: GetWorkerSkillsUseCase;
  let workerProfileRepository: jest.Mocked<IWorkerProfileRepository>;
  let workerSkillRepository: jest.Mocked<IWorkerSkillRepository>;

  const mockWorkerProfile = new WorkerProfileEntity({
    id: 'worker-profile-uuid-1',
    userId: 'user-uuid-1',
  });

  const mockSkill = new SkillEntity({
    id: 'skill-uuid-1',
    name: 'Dishwashing',
  });

  const mockWorkerSkill = new WorkerSkillEntity({
    id: 'ws-uuid-1',
    workerId: 'worker-profile-uuid-1',
    skillId: 'skill-uuid-1',
    skillType: 'CORE',
    skill: mockSkill,
  });

  beforeEach(() => {
    workerProfileRepository = {
      findByUserId: jest.fn(),
      upsert: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    workerSkillRepository = {
      findByWorkerId: jest.fn(),
      findByWorkerAndSkill: jest.fn(),
      deleteByWorkerAndSkill: jest.fn(),
      replaceForWorker: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    useCase = new GetWorkerSkillsUseCase(
      workerProfileRepository,
      workerSkillRepository,
    );
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('returns worker skills mapped to WorkerSkillResponseDto with skillName', async () => {
    workerProfileRepository.findByUserId.mockResolvedValueOnce(
      mockWorkerProfile,
    );
    workerSkillRepository.findByWorkerId.mockResolvedValueOnce([
      mockWorkerSkill,
    ]);

    const result = await useCase.execute('user-uuid-1');

    expect(workerProfileRepository.findByUserId).toHaveBeenCalledWith(
      'user-uuid-1',
    );
    expect(workerSkillRepository.findByWorkerId).toHaveBeenCalledWith(
      'worker-profile-uuid-1',
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: 'ws-uuid-1',
      skillId: 'skill-uuid-1',
      skillName: 'Dishwashing',
    });
    // Ensure skillType is never exposed in response DTO
    expect('skillType' in result[0]).toBe(false);
  });

  it('returns empty array when worker has no assigned skills without throwing 404', async () => {
    workerProfileRepository.findByUserId.mockResolvedValueOnce(
      mockWorkerProfile,
    );
    workerSkillRepository.findByWorkerId.mockResolvedValueOnce([]);

    const result = await useCase.execute('user-uuid-1');

    expect(result).toEqual([]);
  });

  it('throws NotFoundException when worker profile does not exist', async () => {
    workerProfileRepository.findByUserId.mockResolvedValueOnce(null);

    await expect(useCase.execute('unknown-user-id')).rejects.toThrow(
      NotFoundException,
    );
    expect(workerSkillRepository.findByWorkerId).not.toHaveBeenCalled();
  });
});
