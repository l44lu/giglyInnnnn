import { JobCategoryEntity } from '../../domain/entities/job-category.entity';
import { JobCategoryResponseDto } from '../dto/job-posting/job-category-response.dto';
import { JobCategoryMapper } from './job-category.mapper';

describe('JobCategoryMapper', () => {
  it('should map JobCategoryEntity to JobCategoryResponseDto', () => {
    const entity = new JobCategoryEntity({
      id: 'cat-uuid-1',
      name: 'Hospitality & Events',
      description: 'Event management, catering, and service roles',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    const dto = JobCategoryMapper.toJobCategoryResponseDto(entity);

    expect(dto).toBeInstanceOf(JobCategoryResponseDto);
    expect(dto.id).toBe('cat-uuid-1');
    expect(dto.name).toBe('Hospitality & Events');
    expect(dto.description).toBe(
      'Event management, catering, and service roles',
    );
    expect('createdAt' in dto).toBe(false);
  });

  it('should map JobCategoryEntity with null description', () => {
    const entity = new JobCategoryEntity({
      id: 'cat-uuid-2',
      name: 'Logistics',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    const dto = JobCategoryMapper.toJobCategoryResponseDto(entity);

    expect(dto).toBeInstanceOf(JobCategoryResponseDto);
    expect(dto.id).toBe('cat-uuid-2');
    expect(dto.name).toBe('Logistics');
    expect(dto.description).toBeNull();
  });

  it('should map using toResponseDto alias', () => {
    const entity = new JobCategoryEntity({
      id: 'cat-uuid-3',
      name: 'Retail',
      description: 'Store operations',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    const dto = JobCategoryMapper.toResponseDto(entity);

    expect(dto).toBeInstanceOf(JobCategoryResponseDto);
    expect(dto.id).toBe('cat-uuid-3');
    expect(dto.name).toBe('Retail');
    expect(dto.description).toBe('Store operations');
  });
});
