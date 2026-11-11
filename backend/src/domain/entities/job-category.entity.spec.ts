import { JobCategoryEntity } from './job-category.entity';

describe('JobCategoryEntity', () => {
  it('should instantiate and assign all properties via partial constructor', () => {
    const now = new Date();
    const entity = new JobCategoryEntity({
      id: 'category-uuid-1',
      name: 'Hospitality & Restaurant',
      description: 'Jobs in food service, catering, and event assistance.',
      createdAt: now,
    });

    expect(entity.id).toBe('category-uuid-1');
    expect(entity.name).toBe('Hospitality & Restaurant');
    expect(entity.description).toBe(
      'Jobs in food service, catering, and event assistance.',
    );
    expect(entity.createdAt).toBe(now);
  });

  it('should default nullable description to null when undefined', () => {
    const entity = new JobCategoryEntity({
      id: 'category-uuid-2',
      name: 'Logistics',
    });

    expect(entity.id).toBe('category-uuid-2');
    expect(entity.name).toBe('Logistics');
    expect(entity.description).toBeNull();
  });

  it('should allow empty instantiation and default nullable fields to null', () => {
    const entity = new JobCategoryEntity();

    expect(entity.id).toBeUndefined();
    expect(entity.name).toBeUndefined();
    expect(entity.description).toBeNull();
    expect(entity.createdAt).toBeUndefined();
  });

  it('should preserve explicit values including explicit nulls', () => {
    const entity = new JobCategoryEntity({
      id: 'category-uuid-3',
      name: 'Retail & Sales',
      description: null,
    });

    expect(entity.description).toBeNull();
  });

  it('should throw an error when name is an empty string or whitespace only', () => {
    expect(() => new JobCategoryEntity({ name: '' })).toThrow(
      'Category name cannot be empty',
    );
    expect(() => new JobCategoryEntity({ name: '   ' })).toThrow(
      'Category name cannot be empty',
    );
  });

  it('should not contain or depend on Prisma types', () => {
    const entity = new JobCategoryEntity({
      id: 'cat-pure-ts',
      name: 'Cleaning',
      description: 'Commercial and residential cleaning tasks.',
    });

    expect(entity).toBeInstanceOf(JobCategoryEntity);
    expect(typeof entity.name).toBe('string');
  });
});
