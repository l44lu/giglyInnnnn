import { PrismaSkillRepository } from './prisma-skill.repository';
import { PrismaService } from '../prisma/prisma.service';
import { SkillEntity } from '../../domain/entities/skill.entity';

describe('PrismaSkillRepository', () => {
  let repository: PrismaSkillRepository;
  let prismaService: jest.Mocked<PrismaService>;

  const mockSkillRecord = {
    id: 'skill-uuid-1',
    name: 'Dishwashing',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  const mockSkillRecord2 = {
    id: 'skill-uuid-2',
    name: 'Food Serving',
    createdAt: new Date('2026-01-02T00:00:00.000Z'),
  };

  beforeEach(() => {
    prismaService = {
      skill: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaService>;

    repository = new PrismaSkillRepository(prismaService);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('findAll', () => {
    it('returns all skills ordered alphabetically and maps to SkillEntity', async () => {
      (prismaService.skill.findMany as jest.Mock).mockResolvedValue([
        mockSkillRecord,
        mockSkillRecord2,
      ]);

      const result = await repository.findAll();

      expect(prismaService.skill.findMany).toHaveBeenCalledWith({
        orderBy: { name: 'asc' },
      });
      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(SkillEntity);
      expect(result[0].id).toBe('skill-uuid-1');
      expect(result[0].name).toBe('Dishwashing');
      expect(result[0].createdAt).toEqual(mockSkillRecord.createdAt);
      expect(result[1]).toBeInstanceOf(SkillEntity);
      expect(result[1].id).toBe('skill-uuid-2');
      expect(result[1].name).toBe('Food Serving');
    });

    it('returns empty array when no skills exist', async () => {
      (prismaService.skill.findMany as jest.Mock).mockResolvedValue([]);

      const result = await repository.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('returns SkillEntity when skill is found by id', async () => {
      (prismaService.skill.findUnique as jest.Mock).mockResolvedValue(
        mockSkillRecord,
      );

      const result = await repository.findById('skill-uuid-1');

      expect(prismaService.skill.findUnique).toHaveBeenCalledWith({
        where: { id: 'skill-uuid-1' },
      });
      expect(result).toBeInstanceOf(SkillEntity);
      expect(result?.id).toBe('skill-uuid-1');
      expect(result?.name).toBe('Dishwashing');
    });

    it('returns null when skill is not found by id', async () => {
      (prismaService.skill.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await repository.findById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('findByName', () => {
    it('returns SkillEntity when skill is found by unique name', async () => {
      (prismaService.skill.findUnique as jest.Mock).mockResolvedValue(
        mockSkillRecord,
      );

      const result = await repository.findByName('Dishwashing');

      expect(prismaService.skill.findUnique).toHaveBeenCalledWith({
        where: { name: 'Dishwashing' },
      });
      expect(result).toBeInstanceOf(SkillEntity);
      expect(result?.id).toBe('skill-uuid-1');
      expect(result?.name).toBe('Dishwashing');
    });

    it('returns null when skill is not found by name', async () => {
      (prismaService.skill.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await repository.findByName('Unknown Skill');

      expect(result).toBeNull();
    });
  });

  describe('findByIds', () => {
    it('returns array of matching SkillEntities when ids are provided', async () => {
      (prismaService.skill.findMany as jest.Mock).mockResolvedValue([
        mockSkillRecord,
        mockSkillRecord2,
      ]);

      const result = await repository.findByIds([
        'skill-uuid-1',
        'skill-uuid-2',
      ]);

      expect(prismaService.skill.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['skill-uuid-1', 'skill-uuid-2'] } },
        orderBy: { name: 'asc' },
      });
      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(SkillEntity);
      expect(result[1]).toBeInstanceOf(SkillEntity);
    });

    it('returns empty array immediately without database call when ids array is empty', async () => {
      const result = await repository.findByIds([]);

      expect(prismaService.skill.findMany).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });
});
