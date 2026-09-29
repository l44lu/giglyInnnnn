import { CompanyEntity } from './company.entity';

describe('CompanyEntity', () => {
  it('should instantiate and assign all properties via partial constructor', () => {
    const now = new Date();
    const entity = new CompanyEntity({
      id: 'company-uuid-1',
      name: 'Acme Corp',
      industry: 'Technology',
      companySize: '51-200',
      website: 'https://acme.example.com',
      headquartersLocation: 'San Francisco, CA',
      about: 'Leading technology and logistics solutions provider.',
      logoUrl: 'logos/company/acme/logo.png',
      createdAt: now,
      updatedAt: now,
    });

    expect(entity.id).toBe('company-uuid-1');
    expect(entity.name).toBe('Acme Corp');
    expect(entity.industry).toBe('Technology');
    expect(entity.companySize).toBe('51-200');
    expect(entity.website).toBe('https://acme.example.com');
    expect(entity.headquartersLocation).toBe('San Francisco, CA');
    expect(entity.about).toBe(
      'Leading technology and logistics solutions provider.',
    );
    expect(entity.logoUrl).toBe('logos/company/acme/logo.png');
    expect(entity.createdAt).toBe(now);
    expect(entity.updatedAt).toBe(now);
  });

  it('should default all nullable fields to null when undefined', () => {
    const entity = new CompanyEntity({
      id: 'company-uuid-2',
      name: 'Startup Inc',
    });

    expect(entity.id).toBe('company-uuid-2');
    expect(entity.name).toBe('Startup Inc');
    expect(entity.industry).toBeNull();
    expect(entity.companySize).toBeNull();
    expect(entity.website).toBeNull();
    expect(entity.headquartersLocation).toBeNull();
    expect(entity.about).toBeNull();
    expect(entity.logoUrl).toBeNull();
  });

  it('should allow empty instantiation and default nullable fields to null', () => {
    const entity = new CompanyEntity();

    expect(entity.id).toBeUndefined();
    expect(entity.name).toBeUndefined();
    expect(entity.industry).toBeNull();
    expect(entity.companySize).toBeNull();
    expect(entity.website).toBeNull();
    expect(entity.headquartersLocation).toBeNull();
    expect(entity.about).toBeNull();
    expect(entity.logoUrl).toBeNull();
    expect(entity.createdAt).toBeUndefined();
    expect(entity.updatedAt).toBeUndefined();
  });

  it('should preserve explicit values including explicit nulls', () => {
    const entity = new CompanyEntity({
      id: 'company-uuid-3',
      name: 'Explicit Nulls LLC',
      industry: null,
      companySize: null,
      website: null,
      headquartersLocation: null,
      about: null,
      logoUrl: null,
    });

    expect(entity.industry).toBeNull();
    expect(entity.companySize).toBeNull();
    expect(entity.website).toBeNull();
    expect(entity.headquartersLocation).toBeNull();
    expect(entity.about).toBeNull();
    expect(entity.logoUrl).toBeNull();
  });

  it('should not contain or depend on Prisma types', () => {
    const entity = new CompanyEntity({
      id: 'company-uuid-4',
      name: 'Global Tech',
      industry: 'Software',
    });

    expect(entity).toBeInstanceOf(CompanyEntity);
    expect(typeof entity.name).toBe('string');
    expect(typeof entity.industry).toBe('string');
  });
});
