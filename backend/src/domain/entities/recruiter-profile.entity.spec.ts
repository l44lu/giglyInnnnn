import { RecruiterProfileEntity } from './recruiter-profile.entity';

describe('RecruiterProfileEntity', () => {
  it('should instantiate and assign all properties via partial constructor', () => {
    const now = new Date();
    const entity = new RecruiterProfileEntity({
      id: 'recruiter-profile-uuid-1',
      userId: 'user-uuid-1',
      companyId: 'company-uuid-1',
      roleTitle: 'Senior Technical Recruiter',
      yearsExperience: 5,
      createdAt: now,
      updatedAt: now,
    });

    expect(entity.id).toBe('recruiter-profile-uuid-1');
    expect(entity.userId).toBe('user-uuid-1');
    expect(entity.companyId).toBe('company-uuid-1');
    expect(entity.roleTitle).toBe('Senior Technical Recruiter');
    expect(entity.yearsExperience).toBe(5);
    expect(entity.createdAt).toBe(now);
    expect(entity.updatedAt).toBe(now);
  });

  it('should default nullable fields (companyId, roleTitle, yearsExperience) to null when undefined', () => {
    const entity = new RecruiterProfileEntity({
      id: 'recruiter-profile-uuid-2',
      userId: 'user-uuid-2',
    });

    expect(entity.id).toBe('recruiter-profile-uuid-2');
    expect(entity.userId).toBe('user-uuid-2');
    expect(entity.companyId).toBeNull();
    expect(entity.roleTitle).toBeNull();
    expect(entity.yearsExperience).toBeNull();
  });

  it('should allow empty instantiation and default nullable fields to null', () => {
    const entity = new RecruiterProfileEntity();

    expect(entity.id).toBeUndefined();
    expect(entity.userId).toBeUndefined();
    expect(entity.companyId).toBeNull();
    expect(entity.roleTitle).toBeNull();
    expect(entity.yearsExperience).toBeNull();
    expect(entity.createdAt).toBeUndefined();
    expect(entity.updatedAt).toBeUndefined();
  });

  it('should preserve explicit values including explicit nulls', () => {
    const entity = new RecruiterProfileEntity({
      id: 'recruiter-profile-uuid-3',
      userId: 'user-uuid-3',
      companyId: null,
      roleTitle: null,
      yearsExperience: null,
    });

    expect(entity.companyId).toBeNull();
    expect(entity.roleTitle).toBeNull();
    expect(entity.yearsExperience).toBeNull();
  });

  it('should not contain or depend on Prisma types', () => {
    const entity = new RecruiterProfileEntity({
      id: 'test-id',
      userId: 'user-id',
      roleTitle: 'Talent Acquisition Partner',
      yearsExperience: 3,
    });

    expect(entity).toBeInstanceOf(RecruiterProfileEntity);
    expect(typeof entity.roleTitle).toBe('string');
    expect(typeof entity.yearsExperience).toBe('number');
  });
});
