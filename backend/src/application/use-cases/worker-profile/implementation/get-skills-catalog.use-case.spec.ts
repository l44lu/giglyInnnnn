import { GetSkillsCatalogUseCase } from './get-skills-catalog.use-case';
import { ISkillRepository } from '../../../../domain/repositories/skill.repository.interface';
import { SkillEntity } from '../../../../domain/entities/skill.entity';

describe('GetSkillsCatalogUseCase', () => {
  let useCase: GetSkillsCatalogUseCase;
  let skillRepository: jest.Mocked<ISkillRepository>;

  const mockSkills: SkillEntity[] = [
    new SkillEntity({
      id: 'skill-uuid-1',
      name: 'Dishwashing',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    }),
    new SkillEntity({
      id: 'skill-uuid-2',
      name: 'Food Serving',
      createdAt: new Date('2026-01-02T00:00:00.000Z'),
    }),
  ];

  beforeEach(() => {
    skillRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByName: jest.fn(),
      findByIds: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    useCase = new GetSkillsCatalogUseCase(skillRepository);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('returns catalog of skills mapped to SkillResponseDto without exposing database fields', async () => {
    skillRepository.findAll.mockResolvedValueOnce(mockSkills);

    const result = await useCase.execute();

    expect(skillRepository.findAll).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      id: 'skill-uuid-1',
      name: 'Dishwashing',
    });
    expect(result[1]).toEqual({
      id: 'skill-uuid-2',
      name: 'Food Serving',
    });
    // Ensure no createdAt or skillType exposed in DTO
    expect('createdAt' in result[0]).toBe(false);
    expect('skillType' in result[0]).toBe(false);
  });

  it('handles empty catalog and returns empty array', async () => {
    skillRepository.findAll.mockResolvedValueOnce([]);

    const result = await useCase.execute();

    expect(skillRepository.findAll).toHaveBeenCalledTimes(1);
    expect(result).toEqual([]);
  });
});
