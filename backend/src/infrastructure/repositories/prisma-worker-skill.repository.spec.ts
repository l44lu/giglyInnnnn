import { PrismaWorkerSkillRepository } from './prisma-worker-skill.repository';
import { PrismaService } from '../prisma/prisma.service';
import { WorkerSkillEntity } from '../../domain/entities/worker-skill.entity';
import { SkillEntity } from '../../domain/entities/skill.entity';

describe('PrismaWorkerSkillRepository', () => {
  let repository: PrismaWorkerSkillRepository;
  let prismaService: jest.Mocked<PrismaService>;

  const mockSkillRecord = {
    id: 'skill-uuid-1',
    name: 'Dishwashing',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  const mockWorkerSkillRecord = {
    id: 'worker-skill-uuid-1',
    workerId: 'worker-profile-uuid-1',
    skillId: 'skill-uuid-1',
    skillType: 'CORE',
    skill: mockSkillRecord,
  };

  let txMock: {
    workerSkill: {
      findMany: jest.Mock;
      deleteMany: jest.Mock;
      createMany: jest.Mock;
    };
  };

  beforeEach(() => {
    txMock = {
      workerSkill: {
        findMany: jest.fn(),
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
    };

    prismaService = {
      $transaction: jest.fn(
        (callback: (tx: typeof txMock) => Promise<unknown>) => callback(txMock),
      ),
      workerSkill: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaService>;

    repository = new PrismaWorkerSkillRepository(prismaService);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('findByWorkerId', () => {
    it('returns array of WorkerSkillEntity with populated related SkillEntity', async () => {
      (prismaService.workerSkill.findMany as jest.Mock).mockResolvedValue([
        mockWorkerSkillRecord,
      ]);

      const result = await repository.findByWorkerId('worker-profile-uuid-1');

      expect(prismaService.workerSkill.findMany).toHaveBeenCalledWith({
        where: { workerId: 'worker-profile-uuid-1' },
        include: { skill: true },
        orderBy: { skill: { name: 'asc' } },
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(WorkerSkillEntity);
      expect(result[0].id).toBe('worker-skill-uuid-1');
      expect(result[0].workerId).toBe('worker-profile-uuid-1');
      expect(result[0].skillId).toBe('skill-uuid-1');
      expect(result[0].skillType).toBe('CORE');
      expect(result[0].skill).toBeInstanceOf(SkillEntity);
      expect(result[0].skill?.id).toBe('skill-uuid-1');
      expect(result[0].skill?.name).toBe('Dishwashing');
    });

    it('returns empty array when worker has no assigned skills', async () => {
      (prismaService.workerSkill.findMany as jest.Mock).mockResolvedValue([]);

      const result = await repository.findByWorkerId('worker-profile-uuid-1');

      expect(result).toEqual([]);
    });

    it('handles worker skill records without included skill relation gracefully', async () => {
      const recordWithoutSkill = {
        id: 'worker-skill-uuid-2',
        workerId: 'worker-profile-uuid-1',
        skillId: 'skill-uuid-2',
        skillType: 'CORE',
      };
      (prismaService.workerSkill.findMany as jest.Mock).mockResolvedValue([
        recordWithoutSkill,
      ]);

      const result = await repository.findByWorkerId('worker-profile-uuid-1');

      expect(result).toHaveLength(1);
      expect(result[0].skill).toBeUndefined();
    });
  });

  describe('findByWorkerAndSkill', () => {
    it('returns WorkerSkillEntity when assignment exists', async () => {
      (prismaService.workerSkill.findUnique as jest.Mock).mockResolvedValue(
        mockWorkerSkillRecord,
      );

      const result = await repository.findByWorkerAndSkill(
        'worker-profile-uuid-1',
        'skill-uuid-1',
      );

      expect(prismaService.workerSkill.findUnique).toHaveBeenCalledWith({
        where: {
          workerId_skillId: {
            workerId: 'worker-profile-uuid-1',
            skillId: 'skill-uuid-1',
          },
        },
        include: { skill: true },
      });
      expect(result).toBeInstanceOf(WorkerSkillEntity);
      expect(result?.id).toBe('worker-skill-uuid-1');
      expect(result?.workerId).toBe('worker-profile-uuid-1');
      expect(result?.skillId).toBe('skill-uuid-1');
      expect(result?.skill).toBeInstanceOf(SkillEntity);
    });

    it('returns null when assignment does not exist', async () => {
      (prismaService.workerSkill.findUnique as jest.Mock).mockResolvedValue(
        null,
      );

      const result = await repository.findByWorkerAndSkill(
        'worker-profile-uuid-1',
        'non-assigned-skill',
      );

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('creates a new worker skill assignment defaulting skillType to CORE', async () => {
      (prismaService.workerSkill.create as jest.Mock).mockResolvedValue(
        mockWorkerSkillRecord,
      );

      const result = await repository.create({
        workerId: 'worker-profile-uuid-1',
        skillId: 'skill-uuid-1',
      });

      expect(prismaService.workerSkill.create).toHaveBeenCalledWith({
        data: {
          workerId: 'worker-profile-uuid-1',
          skillId: 'skill-uuid-1',
          skillType: 'CORE',
        },
        include: { skill: true },
      });
      expect(result).toBeInstanceOf(WorkerSkillEntity);
      expect(result.id).toBe('worker-skill-uuid-1');
      expect(result.skillType).toBe('CORE');
    });

    it('preserves custom skillType if explicitly provided', async () => {
      const customRecord = {
        ...mockWorkerSkillRecord,
        skillType: 'SPECIAL',
      };
      (prismaService.workerSkill.create as jest.Mock).mockResolvedValue(
        customRecord,
      );

      const result = await repository.create({
        workerId: 'worker-profile-uuid-1',
        skillId: 'skill-uuid-1',
        skillType: 'SPECIAL',
      });

      expect(prismaService.workerSkill.create).toHaveBeenCalledWith({
        data: {
          workerId: 'worker-profile-uuid-1',
          skillId: 'skill-uuid-1',
          skillType: 'SPECIAL',
        },
        include: { skill: true },
      });
      expect(result.skillType).toBe('SPECIAL');
    });
  });

  describe('deleteByWorkerAndSkill', () => {
    it('deletes worker skill record and returns true on success', async () => {
      (prismaService.workerSkill.delete as jest.Mock).mockResolvedValue(
        mockWorkerSkillRecord,
      );

      const result = await repository.deleteByWorkerAndSkill(
        'worker-profile-uuid-1',
        'skill-uuid-1',
      );

      expect(prismaService.workerSkill.delete).toHaveBeenCalledWith({
        where: {
          workerId_skillId: {
            workerId: 'worker-profile-uuid-1',
            skillId: 'skill-uuid-1',
          },
        },
      });
      expect(result).toBe(true);
    });

    it('catches delete errors and returns false when record does not exist or delete fails', async () => {
      (prismaService.workerSkill.delete as jest.Mock).mockRejectedValue(
        new Error('Record not found'),
      );

      const result = await repository.deleteByWorkerAndSkill(
        'worker-profile-uuid-1',
        'non-existent-skill',
      );

      expect(result).toBe(false);
    });
  });

  describe('replaceForWorker', () => {
    it('atomically removes deselected skills, creates new ones, and preserves existing ones', async () => {
      // Current in DB: skill-uuid-1 and skill-uuid-2
      const existingInDb = [
        { id: 'ws-1', skillId: 'skill-uuid-1' },
        { id: 'ws-2', skillId: 'skill-uuid-2' },
      ];
      txMock.workerSkill.findMany.mockResolvedValueOnce(existingInDb);
      txMock.workerSkill.deleteMany.mockResolvedValueOnce({ count: 1 });
      txMock.workerSkill.createMany.mockResolvedValueOnce({ count: 1 });

      // After update: skill-uuid-1 (preserved) and skill-uuid-3 (added)
      const updatedInDb = [
        {
          id: 'ws-1',
          workerId: 'worker-profile-uuid-1',
          skillId: 'skill-uuid-1',
          skillType: 'CORE',
          skill: mockSkillRecord,
        },
        {
          id: 'ws-3',
          workerId: 'worker-profile-uuid-1',
          skillId: 'skill-uuid-3',
          skillType: 'CORE',
          skill: {
            id: 'skill-uuid-3',
            name: 'Food Serving',
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
          },
        },
      ];
      txMock.workerSkill.findMany.mockResolvedValueOnce(updatedInDb);

      const result = await repository.replaceForWorker(
        'worker-profile-uuid-1',
        ['skill-uuid-1', 'skill-uuid-3'],
      );

      // Should delete ws-2 (skill-uuid-2 was not in the new list)
      expect(txMock.workerSkill.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['ws-2'] } },
      });

      // Should create ws-3 (skill-uuid-3 was not in the existing list)
      expect(txMock.workerSkill.createMany).toHaveBeenCalledWith({
        data: [
          {
            workerId: 'worker-profile-uuid-1',
            skillId: 'skill-uuid-3',
            skillType: 'CORE',
          },
        ],
      });

      expect(result).toHaveLength(2);
      expect(result[0].skillId).toBe('skill-uuid-1');
      expect(result[1].skillId).toBe('skill-uuid-3');
    });

    it('clears all worker skills when an empty array of skill IDs is provided', async () => {
      const existingInDb = [{ id: 'ws-1', skillId: 'skill-uuid-1' }];
      txMock.workerSkill.findMany.mockResolvedValueOnce(existingInDb);
      txMock.workerSkill.deleteMany.mockResolvedValueOnce({ count: 1 });
      txMock.workerSkill.findMany.mockResolvedValueOnce([]);

      const result = await repository.replaceForWorker(
        'worker-profile-uuid-1',
        [],
      );

      expect(txMock.workerSkill.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['ws-1'] } },
      });
      expect(txMock.workerSkill.createMany).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });
});
