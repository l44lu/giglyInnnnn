import { NotFoundException, BadRequestException } from '@nestjs/common';
import { UpdateWorkerSkillsUseCase } from './update-worker-skills.use-case';
import { IWorkerProfileRepository } from '../../../../domain/repositories/worker-profile.repository.interface';
import { ISkillRepository } from '../../../../domain/repositories/skill.repository.interface';
import { IWorkerSkillRepository } from '../../../../domain/repositories/worker-skill.repository.interface';
import { WorkerProfileEntity } from '../../../../domain/entities/worker-profile.entity';
import { WorkerSkillEntity } from '../../../../domain/entities/worker-skill.entity';
import { SkillEntity } from '../../../../domain/entities/skill.entity';

describe('UpdateWorkerSkillsUseCase', () => {
  let useCase: UpdateWorkerSkillsUseCase;
  let workerProfileRepository: jest.Mocked<IWorkerProfileRepository>;
  let skillRepository: jest.Mocked<ISkillRepository>;
  let workerSkillRepository: jest.Mocked<IWorkerSkillRepository>;

  const mockWorkerProfile = new WorkerProfileEntity({
    id: 'worker-profile-uuid-1',
    userId: 'user-uuid-1',
  });

  const mockSkill1 = new SkillEntity({
    id: 'skill-uuid-1',
    name: 'Dishwashing',
  });

  const mockSkill2 = new SkillEntity({
    id: 'skill-uuid-2',
    name: 'Food Serving',
  });

  const mockUpdatedWorkerSkills = [
    new WorkerSkillEntity({
      id: 'ws-uuid-1',
      workerId: 'worker-profile-uuid-1',
      skillId: 'skill-uuid-1',
      skillType: 'CORE',
      skill: mockSkill1,
    }),
    new WorkerSkillEntity({
      id: 'ws-uuid-2',
      workerId: 'worker-profile-uuid-1',
      skillId: 'skill-uuid-2',
      skillType: 'CORE',
      skill: mockSkill2,
    }),
  ];

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

    skillRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByName: jest.fn(),
      findByIds: jest.fn(),
      create: jest.fn(),
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

    useCase = new UpdateWorkerSkillsUseCase(
      workerProfileRepository,
      skillRepository,
      workerSkillRepository,
    );
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('successfully validates skills, atomically replaces assignments, and returns updated DTOs', async () => {
    workerProfileRepository.findByUserId.mockResolvedValueOnce(
      mockWorkerProfile,
    );
    skillRepository.findByIds.mockResolvedValueOnce([mockSkill1, mockSkill2]);
    workerSkillRepository.replaceForWorker.mockResolvedValueOnce(
      mockUpdatedWorkerSkills,
    );

    const result = await useCase.execute('user-uuid-1', {
      skillIds: ['skill-uuid-1', 'skill-uuid-2'],
    });

    expect(workerProfileRepository.findByUserId).toHaveBeenCalledWith(
      'user-uuid-1',
    );
    expect(skillRepository.findByIds).toHaveBeenCalledWith([
      'skill-uuid-1',
      'skill-uuid-2',
    ]);
    expect(workerSkillRepository.replaceForWorker).toHaveBeenCalledWith(
      'worker-profile-uuid-1',
      ['skill-uuid-1', 'skill-uuid-2'],
    );
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      id: 'ws-uuid-1',
      skillId: 'skill-uuid-1',
      skillName: 'Dishwashing',
    });
    expect(result[1]).toEqual({
      id: 'ws-uuid-2',
      skillId: 'skill-uuid-2',
      skillName: 'Food Serving',
    });
    // Ensure skillType is never exposed in response DTO
    expect('skillType' in result[0]).toBe(false);
    expect('skillType' in result[1]).toBe(false);
  });

  it('successfully clears all worker skills when an empty skillIds array is provided', async () => {
    workerProfileRepository.findByUserId.mockResolvedValueOnce(
      mockWorkerProfile,
    );
    workerSkillRepository.replaceForWorker.mockResolvedValueOnce([]);

    const result = await useCase.execute('user-uuid-1', {
      skillIds: [],
    });

    expect(skillRepository.findByIds).not.toHaveBeenCalled();
    expect(workerSkillRepository.replaceForWorker).toHaveBeenCalledWith(
      'worker-profile-uuid-1',
      [],
    );
    expect(result).toEqual([]);
  });

  it('rejects duplicate skill IDs with BadRequestException without modifying database', async () => {
    await expect(
      useCase.execute('user-uuid-1', {
        skillIds: ['skill-uuid-1', 'skill-uuid-1'],
      }),
    ).rejects.toThrow(BadRequestException);

    expect(workerProfileRepository.findByUserId).not.toHaveBeenCalled();
    expect(workerSkillRepository.replaceForWorker).not.toHaveBeenCalled();
  });

  it('rejects entire update when one or more skill IDs do not exist in catalog', async () => {
    workerProfileRepository.findByUserId.mockResolvedValueOnce(
      mockWorkerProfile,
    );
    // Returns only mockSkill1, meaning 'non-existent-skill' does not exist
    skillRepository.findByIds.mockResolvedValueOnce([mockSkill1]);

    await expect(
      useCase.execute('user-uuid-1', {
        skillIds: ['skill-uuid-1', 'non-existent-skill'],
      }),
    ).rejects.toThrow(BadRequestException);

    expect(workerSkillRepository.replaceForWorker).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when worker profile does not exist', async () => {
    workerProfileRepository.findByUserId.mockResolvedValueOnce(null);

    await expect(
      useCase.execute('unknown-user-id', {
        skillIds: ['skill-uuid-1'],
      }),
    ).rejects.toThrow(NotFoundException);

    expect(skillRepository.findByIds).not.toHaveBeenCalled();
    expect(workerSkillRepository.replaceForWorker).not.toHaveBeenCalled();
  });
});
