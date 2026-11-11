import {
  JobPostEntity,
  JobStatus,
  WorkType,
  PaymentStructure,
} from './job-post.entity';
import { JobCategoryEntity } from './job-category.entity';
import { SkillEntity } from './skill.entity';
import { CompanyEntity } from './company.entity';
import { RecruiterProfileEntity } from './recruiter-profile.entity';

describe('JobPostEntity', () => {
  const now = new Date();

  it('should instantiate and assign all properties via partial constructor', () => {
    const startDate = new Date('2026-12-01T09:00:00Z');
    const boostExpiresAt = new Date('2026-12-10T09:00:00Z');

    const entity = new JobPostEntity({
      id: 'job-uuid-1',
      recruiterId: 'recruiter-profile-uuid-1',
      categoryId: 'category-uuid-1',
      title: 'Warehouse Helper Needed',
      description: 'Assist with loading, packing and unloading shipments.',
      workType: WorkType.LOCAL,
      workersNeeded: 3,
      startDate,
      estimatedDuration: '4 hours',
      shiftDuration: '4 hours/day',
      jobLocation: 'Seattle, WA Warehouse 4',
      jobLocationLat: 47.6062,
      jobLocationLng: -122.3321,
      paymentStructure: PaymentStructure.HOURLY,
      budgetAmount: null,
      hourlyRate: 25.0,
      status: JobStatus.OPEN,
      isBoosted: true,
      boostExpiresAt,
      adminReviewStatus: 'approved',
      adminNotes: 'Verified recruiter',
      createdAt: now,
      updatedAt: now,
    });

    expect(entity.id).toBe('job-uuid-1');
    expect(entity.recruiterId).toBe('recruiter-profile-uuid-1');
    expect(entity.categoryId).toBe('category-uuid-1');
    expect(entity.title).toBe('Warehouse Helper Needed');
    expect(entity.description).toBe(
      'Assist with loading, packing and unloading shipments.',
    );
    expect(entity.workType).toBe(WorkType.LOCAL);
    expect(entity.workersNeeded).toBe(3);
    expect(entity.startDate).toBe(startDate);
    expect(entity.estimatedDuration).toBe('4 hours');
    expect(entity.shiftDuration).toBe('4 hours/day');
    expect(entity.jobLocation).toBe('Seattle, WA Warehouse 4');
    expect(entity.jobLocationLat).toBe(47.6062);
    expect(entity.jobLocationLng).toBe(-122.3321);
    expect(entity.paymentStructure).toBe(PaymentStructure.HOURLY);
    expect(entity.budgetAmount).toBeNull();
    expect(entity.hourlyRate).toBe(25.0);
    expect(entity.hourlyRateMin).toBe(25.0);
    expect(entity.hourlyRateMax).toBe(25.0);
    expect(entity.status).toBe(JobStatus.OPEN);
    expect(entity.isBoosted).toBe(true);
    expect(entity.boostExpiresAt).toBe(boostExpiresAt);
    expect(entity.adminReviewStatus).toBe('approved');
    expect(entity.adminNotes).toBe('Verified recruiter');
    expect(entity.createdAt).toBe(now);
    expect(entity.updatedAt).toBe(now);
  });

  it('should default nullable fields to null when undefined', () => {
    const entity = new JobPostEntity({
      id: 'job-uuid-2',
      recruiterId: 'recruiter-profile-uuid-2',
      categoryId: 'category-uuid-2',
      title: 'Food Server',
      description: 'Serve tables during banquet.',
      workType: WorkType.LOCAL,
      paymentStructure: PaymentStructure.FIXED,
    });

    expect(entity.startDate).toBeNull();
    expect(entity.estimatedDuration).toBeNull();
    expect(entity.shiftDuration).toBeNull();
    expect(entity.jobLocation).toBeNull();
    expect(entity.jobLocationLat).toBeNull();
    expect(entity.jobLocationLng).toBeNull();
    expect(entity.budgetAmount).toBeNull();
    expect(entity.hourlyRateMin).toBeNull();
    expect(entity.hourlyRateMax).toBeNull();
    expect(entity.boostExpiresAt).toBeNull();
    expect(entity.adminNotes).toBeNull();
  });

  it('should apply appropriate domain defaults for workersNeeded, status, isBoosted, and adminReviewStatus', () => {
    const entity = new JobPostEntity({
      id: 'job-uuid-3',
      recruiterId: 'recruiter-profile-uuid-3',
      categoryId: 'category-uuid-3',
      title: 'Catering Support',
      description: 'Help with catering.',
      workType: WorkType.LOCAL,
      paymentStructure: PaymentStructure.HOURLY,
    });

    expect(entity.workersNeeded).toBe(1);
    expect(entity.status).toBe(JobStatus.DRAFT);
    expect(entity.isBoosted).toBe(false);
    expect(entity.adminReviewStatus).toBe('pending');
  });

  it('should allow empty instantiation and set defaults for hydration', () => {
    const entity = new JobPostEntity();

    expect(entity.id).toBeUndefined();
    expect(entity.recruiterId).toBeUndefined();
    expect(entity.categoryId).toBeUndefined();
    expect(entity.title).toBeUndefined();
    expect(entity.description).toBeUndefined();
    expect(entity.workType).toBeUndefined();
    expect(entity.paymentStructure).toBeUndefined();
    expect(entity.workersNeeded).toBe(1);
    expect(entity.status).toBe(JobStatus.DRAFT);
    expect(entity.isBoosted).toBe(false);
    expect(entity.adminReviewStatus).toBe('pending');
    expect(entity.startDate).toBeNull();
    expect(entity.jobLocation).toBeNull();
    expect(entity.budgetAmount).toBeNull();
  });

  it('should preserve explicit values including explicit nulls', () => {
    const entity = new JobPostEntity({
      id: 'job-uuid-4',
      recruiterId: 'rec-4',
      categoryId: 'cat-4',
      title: 'Event Staff',
      description: 'Event breakdown assistance.',
      workType: WorkType.LOCAL,
      paymentStructure: PaymentStructure.FIXED,
      startDate: null,
      budgetAmount: null,
      adminNotes: null,
      isBoosted: false,
    });

    expect(entity.startDate).toBeNull();
    expect(entity.budgetAmount).toBeNull();
    expect(entity.adminNotes).toBeNull();
    expect(entity.isBoosted).toBe(false);
  });

  it('should not reject incomplete draft data using publish-only rules', () => {
    // A draft gig might only have basic title/description and no dates or budget yet
    const draftEntity = new JobPostEntity({
      recruiterId: 'recruiter-uuid-5',
      categoryId: 'category-uuid-5',
      title: 'Draft - General Cleaning',
      description: 'Cleaning job details TBD.',
      workType: WorkType.LOCAL,
      paymentStructure: PaymentStructure.HOURLY,
      status: JobStatus.DRAFT,
      startDate: null,
      jobLocation: null,
      hourlyRateMin: null,
      hourlyRateMax: null,
      budgetAmount: null,
    });

    expect(draftEntity).toBeInstanceOf(JobPostEntity);
    expect(draftEntity.isDraft()).toBe(true);
    expect(draftEntity.startDate).toBeNull();
    expect(draftEntity.budgetAmount).toBeNull();
  });

  describe('Domain Invariants', () => {
    it('should throw an error when workersNeeded is 0 or negative', () => {
      expect(() => new JobPostEntity({ workersNeeded: 0 })).toThrow(
        'workersNeeded must be a positive integer',
      );
      expect(() => new JobPostEntity({ workersNeeded: -2 })).toThrow(
        'workersNeeded must be a positive integer',
      );
    });

    it('should throw an error when workersNeeded is a non-integer float', () => {
      expect(() => new JobPostEntity({ workersNeeded: 2.5 })).toThrow(
        'workersNeeded must be a positive integer',
      );
      expect(() => new JobPostEntity({ workersNeeded: NaN })).toThrow(
        'workersNeeded must be a positive integer',
      );
    });

    it('should throw an error when status is not a valid JobStatus enum value', () => {
      expect(
        () => new JobPostEntity({ status: 'invalid_status' as any }),
      ).toThrow('Invalid job status: invalid_status');
      expect(() => new JobPostEntity({ status: 'CLOSED' as any })).toThrow(
        'Invalid job status: CLOSED',
      );
    });

    it('should throw an error when workType is not a valid WorkType enum value', () => {
      expect(
        () => new JobPostEntity({ workType: 'invalid_type' as any }),
      ).toThrow('Invalid work type: invalid_type');
      expect(() => new JobPostEntity({ workType: 'HYBRID' as any })).toThrow(
        'Invalid work type: HYBRID',
      );
    });

    it('should throw an error when paymentStructure is not a valid PaymentStructure enum value', () => {
      expect(
        () => new JobPostEntity({ paymentStructure: 'cash_on_site' as any }),
      ).toThrow('Invalid payment structure: cash_on_site');
      expect(
        () => new JobPostEntity({ paymentStructure: 'salary' as any }),
      ).toThrow('Invalid payment structure: salary');
    });

    it('should throw an error when title is an empty string or whitespace only', () => {
      expect(() => new JobPostEntity({ title: '' })).toThrow(
        'Job title cannot be empty',
      );
      expect(() => new JobPostEntity({ title: '   ' })).toThrow(
        'Job title cannot be empty',
      );
    });

    it('should throw an error when recruiterId is empty', () => {
      expect(() => new JobPostEntity({ recruiterId: '' })).toThrow(
        'recruiterId cannot be empty',
      );
      expect(() => new JobPostEntity({ recruiterId: '  ' })).toThrow(
        'recruiterId cannot be empty',
      );
    });

    it('should throw an error when categoryId is empty', () => {
      expect(() => new JobPostEntity({ categoryId: '' })).toThrow(
        'categoryId cannot be empty',
      );
      expect(() => new JobPostEntity({ categoryId: '  ' })).toThrow(
        'categoryId cannot be empty',
      );
    });

    it('should throw an error when description is empty', () => {
      expect(() => new JobPostEntity({ description: '' })).toThrow(
        'Job description cannot be empty',
      );
      expect(() => new JobPostEntity({ description: '  ' })).toThrow(
        'Job description cannot be empty',
      );
    });
  });

  describe('Relations and Status Helper Methods', () => {
    it('should support optional category and skills associations', () => {
      const category = new JobCategoryEntity({
        id: 'cat-1',
        name: 'Hospitality',
      });
      const skill = new SkillEntity({
        id: 'skill-1',
        name: 'Food Serving',
        createdAt: now,
      });

      const entity = new JobPostEntity({
        id: 'job-with-rel',
        title: 'Banquet Waitstaff',
        category,
        skills: [skill],
      });

      expect(entity.category).toBe(category);
      expect(entity.skills).toHaveLength(1);
      expect(entity.skills?.[0].name).toBe('Food Serving');
    });

    it('should support optional company association and explicit null', () => {
      const company = new CompanyEntity({
        id: 'comp-1',
        name: 'Apex Events Inc.',
        logoUrl: 'https://cdn.example.com/logo.png',
      });

      const entityWithCompany = new JobPostEntity({
        id: 'job-with-company',
        title: 'Event Setup Crew',
        company,
      });

      expect(entityWithCompany.company).toBe(company);
      expect(entityWithCompany.company?.id).toBe('comp-1');
      expect(entityWithCompany.company?.name).toBe('Apex Events Inc.');

      const entityWithNullCompany = new JobPostEntity({
        id: 'job-with-null-company',
        title: 'Event Setup Crew',
        company: null,
      });

      expect(entityWithNullCompany.company).toBeNull();
    });

    it('should support optional recruiter association and explicit null', () => {
      const recruiter = new RecruiterProfileEntity({
        id: 'recruiter-1',
        userId: 'user-1',
        roleTitle: 'Senior Recruiter',
      });

      const entityWithRecruiter = new JobPostEntity({
        id: 'job-with-recruiter',
        title: 'Event Setup Crew',
        recruiter,
      });

      expect(entityWithRecruiter.recruiter).toBe(recruiter);
      expect(entityWithRecruiter.recruiter?.id).toBe('recruiter-1');
      expect(entityWithRecruiter.recruiter?.roleTitle).toBe('Senior Recruiter');

      const entityWithNullRecruiter = new JobPostEntity({
        id: 'job-with-null-recruiter',
        title: 'Event Setup Crew',
        recruiter: null,
      });

      expect(entityWithNullRecruiter.recruiter).toBeNull();

      const entityWithDefaultRecruiter = new JobPostEntity({
        id: 'job-with-default-recruiter',
        title: 'Event Setup Crew',
      });

      expect(entityWithDefaultRecruiter.recruiter).toBeNull();
    });

    it('should correctly report status via helper methods', () => {
      const draftJob = new JobPostEntity({ status: JobStatus.DRAFT });
      expect(draftJob.isDraft()).toBe(true);
      expect(draftJob.isOpen()).toBe(false);
      expect(draftJob.isFilled()).toBe(false);

      const openJob = new JobPostEntity({ status: JobStatus.OPEN });
      expect(openJob.isDraft()).toBe(false);
      expect(openJob.isOpen()).toBe(true);
      expect(openJob.isFilled()).toBe(false);

      const filledJob = new JobPostEntity({ status: JobStatus.FILLED });
      expect(filledJob.isDraft()).toBe(false);
      expect(filledJob.isOpen()).toBe(false);
      expect(filledJob.isFilled()).toBe(true);
    });
  });

  it('should not contain or depend on Prisma types', () => {
    const entity = new JobPostEntity({
      id: 'job-pure-ts',
      recruiterId: 'rec-1',
      categoryId: 'cat-1',
      title: 'Pure TS Entity',
      description: 'Testing absence of Prisma coupling',
      workType: WorkType.REMOTE,
      paymentStructure: PaymentStructure.FIXED,
      budgetAmount: 150.0,
      hourlyRate: 25.0,
    });

    expect(entity).toBeInstanceOf(JobPostEntity);
    expect(typeof entity.budgetAmount).toBe('number');
    expect(typeof entity.hourlyRate).toBe('number');
  });
});
