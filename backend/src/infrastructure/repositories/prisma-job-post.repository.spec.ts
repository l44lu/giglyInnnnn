import { PrismaJobPostRepository } from './prisma-job-post.repository';
import { PrismaService } from '../prisma/prisma.service';
import { JobPostEntity } from '../../domain/entities/job-post.entity';
import { JobCategoryEntity } from '../../domain/entities/job-category.entity';
import { SkillEntity } from '../../domain/entities/skill.entity';
import { CompanyEntity } from '../../domain/entities/company.entity';
import { JobStatus } from '../../domain/enums/job-status.enum';
import { WorkType } from '../../domain/enums/work-type.enum';
import { PaymentStructure } from '../../domain/enums/payment-structure.enum';
import { JobSortBy } from '../../domain/repositories/job-post.repository.interface';
import { Prisma } from '@prisma/client';

describe('PrismaJobPostRepository', () => {
  let repository: PrismaJobPostRepository;
  let prismaService: jest.Mocked<PrismaService>;
  let txMock: any;

  const mockDecimal = (val: number) => ({
    toNumber: () => val,
    toString: () => val.toString(),
  });

  const mockScalarJobRecord = {
    id: 'job-post-uuid-1',
    recruiterId: 'recruiter-profile-uuid-1',
    categoryId: 'category-uuid-1',
    title: 'Event Coordinator',
    description: 'Looking for a coordinator for a 2-day music festival.',
    workType: 'local',
    workersNeeded: 2,
    startDate: new Date('2026-05-01T09:00:00.000Z'),
    estimatedDuration: '2 days',
    shiftDuration: '8 hours',
    jobLocation: 'Central Park, NY',
    jobLocationLat: mockDecimal(40.785091),
    jobLocationLng: mockDecimal(-73.968285),
    paymentStructure: 'hourly',
    budgetAmount: null,
    hourlyRateMin: mockDecimal(30.0),
    hourlyRateMax: mockDecimal(30.0),
    status: 'draft',
    isBoosted: false,
    boostExpiresAt: null,
    adminReviewStatus: 'pending',
    adminNotes: null,
    createdAt: new Date('2026-04-01T10:00:00.000Z'),
    updatedAt: new Date('2026-04-01T10:00:00.000Z'),
  };

  const mockCategoryRecord = {
    id: 'category-uuid-1',
    name: 'Events & Hospitality',
    description: 'Event hosting and hospitality staffing',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  const mockSkillsRecords = [
    {
      id: 'job-post-skill-uuid-1',
      jobPostId: 'job-post-uuid-1',
      skillId: 'skill-uuid-1',
      skill: {
        id: 'skill-uuid-1',
        name: 'Crowd Control',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    },
    {
      id: 'job-post-skill-uuid-2',
      jobPostId: 'job-post-uuid-1',
      skillId: 'skill-uuid-2',
      skill: {
        id: 'skill-uuid-2',
        name: 'Guest Registration',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    },
  ];

  const mockHydratedJobRecord = {
    ...mockScalarJobRecord,
    category: mockCategoryRecord,
    skills: mockSkillsRecords,
  };

  beforeEach(() => {
    txMock = {
      jobPost: {
        create: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
      jobPostSkill: {
        createMany: jest.fn(),
        deleteMany: jest.fn(),
      },
    };

    prismaService = {
      $transaction: jest.fn((callback: (tx: any) => Promise<unknown>) =>
        callback(txMock),
      ),
      jobPost: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      jobPostSkill: {
        createMany: jest.fn(),
        deleteMany: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaService>;

    repository = new PrismaJobPostRepository(prismaService);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('mapToDomain', () => {
    it('maps scalar record to JobPostEntity leaving relations undefined', async () => {
      (prismaService.jobPost.findUnique as jest.Mock).mockResolvedValueOnce(
        mockScalarJobRecord,
      );

      const result = await repository.findById('job-post-uuid-1');

      expect(result).toBeInstanceOf(JobPostEntity);
      expect(result?.id).toBe('job-post-uuid-1');
      expect(result?.recruiterId).toBe('recruiter-profile-uuid-1');
      expect(result?.categoryId).toBe('category-uuid-1');
      expect(result?.title).toBe('Event Coordinator');
      expect(result?.workType).toBe(WorkType.LOCAL);
      expect(result?.paymentStructure).toBe(PaymentStructure.HOURLY);
      expect(result?.status).toBe(JobStatus.DRAFT);
      expect(result?.hourlyRate).toBe(30.0);
      expect(result?.hourlyRateMin).toBe(30.0);
      expect(result?.hourlyRateMax).toBe(30.0);
      expect(result?.budgetAmount).toBeNull();
      expect(result?.jobLocationLat).toBe(40.785091);
      expect(result?.jobLocationLng).toBe(-73.968285);
      expect(result?.category).toBeUndefined();
      expect(result?.skills).toBeUndefined();
    });

    it('maps hydrated record with category and skills', async () => {
      (prismaService.jobPost.findUnique as jest.Mock).mockResolvedValueOnce(
        mockHydratedJobRecord,
      );

      const result = await repository.findByIdWithSkills('job-post-uuid-1');

      expect(result).toBeInstanceOf(JobPostEntity);
      expect(result?.category).toBeInstanceOf(JobCategoryEntity);
      expect(result?.category?.id).toBe('category-uuid-1');
      expect(result?.category?.name).toBe('Events & Hospitality');
      expect(result?.skills).toHaveLength(2);
      expect(result?.skills?.[0]).toBeInstanceOf(SkillEntity);
      expect(result?.skills?.[0].id).toBe('skill-uuid-1');
      expect(result?.skills?.[0].name).toBe('Crowd Control');
      expect(result?.skills?.[1]).toBeInstanceOf(SkillEntity);
      expect(result?.skills?.[1].id).toBe('skill-uuid-2');
      expect(result?.skills?.[1].name).toBe('Guest Registration');
    });

    it('converts native number and Decimal instances safely', async () => {
      const recordWithNativeNumbers = {
        ...mockScalarJobRecord,
        budgetAmount: 500,
        jobLocationLat: 34.052235,
        jobLocationLng: -118.243683,
        hourlyRateMin: null,
        hourlyRateMax: null,
      };

      (prismaService.jobPost.findUnique as jest.Mock).mockResolvedValueOnce(
        recordWithNativeNumbers,
      );

      const result = await repository.findById('job-post-uuid-1');

      expect(result?.budgetAmount).toBe(500);
      expect(result?.jobLocationLat).toBe(34.052235);
      expect(result?.jobLocationLng).toBe(-118.243683);
      expect(result?.hourlyRateMin).toBeNull();
      expect(result?.hourlyRateMax).toBeNull();
    });
  });

  describe('createWithSkills (transactional creation)', () => {
    it('creates job post and associated skills atomically in a transaction', async () => {
      txMock.jobPost.create.mockResolvedValueOnce(mockScalarJobRecord);
      txMock.jobPostSkill.createMany.mockResolvedValueOnce({ count: 2 });
      txMock.jobPost.findUnique.mockResolvedValueOnce(mockHydratedJobRecord);

      const inputData: Partial<JobPostEntity> = {
        recruiterId: 'recruiter-profile-uuid-1',
        categoryId: 'category-uuid-1',
        title: 'Event Coordinator',
        description: 'Looking for a coordinator for a 2-day music festival.',
        workType: WorkType.LOCAL,
        workersNeeded: 2,
        startDate: new Date('2026-05-01T09:00:00.000Z'),
        estimatedDuration: '2 days',
        shiftDuration: '8 hours',
        jobLocation: 'Central Park, NY',
        jobLocationLat: 40.785091,
        jobLocationLng: -73.968285,
        paymentStructure: PaymentStructure.HOURLY,
        budgetAmount: null,
        hourlyRate: 30.0,
        status: JobStatus.DRAFT,
      };

      const result = await repository.createWithSkills(inputData, [
        'skill-uuid-1',
        'skill-uuid-2',
      ]);

      expect(prismaService.$transaction).toHaveBeenCalledTimes(1);
      expect(txMock.jobPost.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          recruiterId: 'recruiter-profile-uuid-1',
          categoryId: 'category-uuid-1',
          title: 'Event Coordinator',
          workType: 'local',
          paymentStructure: 'hourly',
          status: 'draft',
          jobLocationLat: expect.any(Prisma.Decimal),
          jobLocationLng: expect.any(Prisma.Decimal),
          hourlyRateMin: expect.any(Prisma.Decimal),
          hourlyRateMax: expect.any(Prisma.Decimal),
          budgetAmount: null,
        }),
      });

      expect(txMock.jobPostSkill.createMany).toHaveBeenCalledWith({
        data: [
          { jobPostId: 'job-post-uuid-1', skillId: 'skill-uuid-1' },
          { jobPostId: 'job-post-uuid-1', skillId: 'skill-uuid-2' },
        ],
      });

      expect(txMock.jobPost.findUnique).toHaveBeenCalledWith({
        where: { id: 'job-post-uuid-1' },
        include: {
          category: true,
          skills: {
            include: {
              skill: true,
            },
          },
        },
      });

      expect(result).toBeInstanceOf(JobPostEntity);
      expect(result.id).toBe('job-post-uuid-1');
      expect(result.category?.name).toBe('Events & Hospitality');
      expect(result.skills).toHaveLength(2);
    });

    it('creates job post without calling jobPostSkill.createMany when skillIds is empty', async () => {
      const recordWithoutSkills = {
        ...mockHydratedJobRecord,
        skills: [],
      };
      txMock.jobPost.create.mockResolvedValueOnce(mockScalarJobRecord);
      txMock.jobPost.findUnique.mockResolvedValueOnce(recordWithoutSkills);

      const inputData: Partial<JobPostEntity> = {
        recruiterId: 'recruiter-profile-uuid-1',
        categoryId: 'category-uuid-1',
        title: 'Event Coordinator',
        description: 'Looking for a coordinator.',
        workType: WorkType.LOCAL,
        paymentStructure: PaymentStructure.FIXED,
        budgetAmount: 1000,
      };

      const result = await repository.createWithSkills(inputData, []);

      expect(txMock.jobPost.create).toHaveBeenCalledTimes(1);
      expect(txMock.jobPostSkill.createMany).not.toHaveBeenCalled();
      expect(result.skills).toEqual([]);
    });

    it('rolls back and propagates error when skill creation fails', async () => {
      txMock.jobPost.create.mockResolvedValueOnce(mockScalarJobRecord);
      txMock.jobPostSkill.createMany.mockRejectedValueOnce(
        new Error('Foreign key violation: invalid skillId'),
      );

      const inputData: Partial<JobPostEntity> = {
        recruiterId: 'recruiter-profile-uuid-1',
        categoryId: 'category-uuid-1',
        title: 'Event Coordinator',
        description: 'Looking for a coordinator.',
        workType: WorkType.LOCAL,
        paymentStructure: PaymentStructure.HOURLY,
      };

      await expect(
        repository.createWithSkills(inputData, ['invalid-skill-id']),
      ).rejects.toThrow('Foreign key violation: invalid skillId');

      expect(txMock.jobPost.findUnique).not.toHaveBeenCalled();
    });

    it('throws error when post lookup inside transaction fails', async () => {
      txMock.jobPost.create.mockResolvedValueOnce(mockScalarJobRecord);
      txMock.jobPost.findUnique.mockResolvedValueOnce(null);

      const inputData: Partial<JobPostEntity> = {
        recruiterId: 'recruiter-profile-uuid-1',
        categoryId: 'category-uuid-1',
        title: 'Event Coordinator',
        description: 'Looking for a coordinator.',
        workType: WorkType.LOCAL,
        paymentStructure: PaymentStructure.HOURLY,
      };

      await expect(repository.createWithSkills(inputData, [])).rejects.toThrow(
        'Failed to retrieve created job post with id: job-post-uuid-1',
      );
    });
  });

  describe('create (inherited delegation)', () => {
    it('delegates to createWithSkills with empty skill array', async () => {
      const mockJobPostEntity = new JobPostEntity({
        id: 'job-post-uuid-1',
        recruiterId: 'recruiter-profile-uuid-1',
        categoryId: 'category-uuid-1',
        title: 'Event Coordinator',
        description: 'Looking for a coordinator for a 2-day music festival.',
        workType: WorkType.LOCAL,
        paymentStructure: PaymentStructure.HOURLY,
        status: JobStatus.DRAFT,
      });

      const spy = jest
        .spyOn(repository, 'createWithSkills')
        .mockResolvedValueOnce(mockJobPostEntity);

      const inputData: Partial<JobPostEntity> = {
        title: 'Solo Job',
      };

      const result = await repository.create(inputData);

      expect(spy).toHaveBeenCalledWith(inputData, []);
      expect(result.title).toBe('Event Coordinator');
    });
  });

  describe('findById and findByIdWithSkills', () => {
    it('returns null when job post is not found by findById', async () => {
      (prismaService.jobPost.findUnique as jest.Mock).mockResolvedValueOnce(
        null,
      );

      const result = await repository.findById('non-existent-id');

      expect(prismaService.jobPost.findUnique).toHaveBeenCalledWith({
        where: { id: 'non-existent-id' },
      });
      expect(result).toBeNull();
    });

    it('returns null when job post is not found by findByIdWithSkills', async () => {
      (prismaService.jobPost.findUnique as jest.Mock).mockResolvedValueOnce(
        null,
      );

      const result = await repository.findByIdWithSkills('non-existent-id');

      expect(prismaService.jobPost.findUnique).toHaveBeenCalledWith({
        where: { id: 'non-existent-id' },
        include: {
          category: true,
          skills: {
            include: {
              skill: true,
            },
          },
        },
      });
      expect(result).toBeNull();
    });
  });

  describe('findByRecruiterId', () => {
    it('returns matching job posts ordered by createdAt descending with relations', async () => {
      (prismaService.jobPost.findMany as jest.Mock).mockResolvedValueOnce([
        mockHydratedJobRecord,
      ]);

      const result = await repository.findByRecruiterId(
        'recruiter-profile-uuid-1',
      );

      expect(prismaService.jobPost.findMany).toHaveBeenCalledWith({
        where: { recruiterId: 'recruiter-profile-uuid-1' },
        orderBy: { createdAt: 'desc' },
        include: {
          category: true,
          skills: {
            include: {
              skill: true,
            },
          },
        },
      });
      expect(result).toHaveLength(1);
      expect(result[0].recruiterId).toBe('recruiter-profile-uuid-1');
      expect(result[0].category?.name).toBe('Events & Hospitality');
    });
  });

  describe('findByStatus', () => {
    it('returns matching job posts filtered by status', async () => {
      (prismaService.jobPost.findMany as jest.Mock).mockResolvedValueOnce([
        mockHydratedJobRecord,
      ]);

      const result = await repository.findByStatus(JobStatus.DRAFT);

      expect(prismaService.jobPost.findMany).toHaveBeenCalledWith({
        where: { status: JobStatus.DRAFT },
        orderBy: { createdAt: 'desc' },
        include: {
          category: true,
          skills: {
            include: {
              skill: true,
            },
          },
        },
      });
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(JobStatus.DRAFT);
    });
  });

  describe('findAll', () => {
    it('returns all job posts ordered by createdAt descending with relations', async () => {
      (prismaService.jobPost.findMany as jest.Mock).mockResolvedValueOnce([
        mockHydratedJobRecord,
      ]);

      const result = await repository.findAll();

      expect(prismaService.jobPost.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
        include: {
          category: true,
          skills: {
            include: {
              skill: true,
            },
          },
        },
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('job-post-uuid-1');
    });
  });

  describe('update', () => {
    it('partially updates fields, converts Decimals, preserves nulls, and hydrates relations', async () => {
      const updatedRecord = {
        ...mockHydratedJobRecord,
        status: 'open',
        budgetAmount: mockDecimal(1500.0),
        startDate: null,
      };

      (prismaService.jobPost.update as jest.Mock).mockResolvedValueOnce(
        updatedRecord,
      );

      const updatePayload: Partial<JobPostEntity> = {
        status: JobStatus.OPEN,
        budgetAmount: 1500.0,
        startDate: null,
      };

      const result = await repository.update('job-post-uuid-1', updatePayload);

      expect(prismaService.jobPost.update).toHaveBeenCalledWith({
        where: { id: 'job-post-uuid-1' },
        data: {
          status: 'open',
          budgetAmount: expect.any(Prisma.Decimal),
          startDate: null,
        },
        include: {
          category: true,
          skills: {
            include: {
              skill: true,
            },
          },
        },
      });

      expect(result.status).toBe(JobStatus.OPEN);
      expect(result.budgetAmount).toBe(1500.0);
      expect(result.startDate).toBeNull();
      expect(result.category?.name).toBe('Events & Hospitality');
      expect(result.skills).toHaveLength(2);
    });

    it('does not pass unprovided undefined fields to prisma update', async () => {
      (prismaService.jobPost.update as jest.Mock).mockResolvedValueOnce(
        mockHydratedJobRecord,
      );

      await repository.update('job-post-uuid-1', {
        title: 'New Title Only',
      });

      const calledData = (prismaService.jobPost.update as jest.Mock).mock
        .calls[0][0].data;

      expect(calledData).toEqual({
        title: 'New Title Only',
      });
      expect(calledData.description).toBeUndefined();
      expect(calledData.status).toBeUndefined();
      expect(calledData.budgetAmount).toBeUndefined();
    });
  });

  describe('updateWithSkills', () => {
    it('updates scalar fields, replaces skills, and returns hydrated entity inside a transaction', async () => {
      txMock.jobPost.update.mockResolvedValueOnce(mockScalarJobRecord);
      txMock.jobPostSkill.deleteMany.mockResolvedValueOnce({ count: 2 });
      txMock.jobPostSkill.createMany.mockResolvedValueOnce({ count: 1 });
      txMock.jobPost.findUnique.mockResolvedValueOnce({
        ...mockScalarJobRecord,
        title: 'Updated Title',
        hourlyRateMin: mockDecimal(45.0),
        hourlyRateMax: mockDecimal(45.0),
        category: mockCategoryRecord,
        skills: [mockSkillsRecords[0]],
      });

      const result = await repository.updateWithSkills(
        'job-post-uuid-1',
        {
          title: 'Updated Title',
          hourlyRate: 45.0,
        },
        ['skill-uuid-1'],
      );

      expect(prismaService.$transaction).toHaveBeenCalledTimes(1);
      expect(txMock.jobPost.update).toHaveBeenCalledWith({
        where: { id: 'job-post-uuid-1' },
        data: expect.objectContaining({
          title: 'Updated Title',
          hourlyRateMin: expect.any(Prisma.Decimal),
          hourlyRateMax: expect.any(Prisma.Decimal),
        }),
      });
      expect(txMock.jobPostSkill.deleteMany).toHaveBeenCalledWith({
        where: { jobPostId: 'job-post-uuid-1' },
      });
      expect(txMock.jobPostSkill.createMany).toHaveBeenCalledWith({
        data: [
          {
            jobPostId: 'job-post-uuid-1',
            skillId: 'skill-uuid-1',
          },
        ],
      });
      expect(result.title).toBe('Updated Title');
      expect(result.hourlyRate).toBe(45.0);
      expect(result.category?.name).toBe('Events & Hospitality');
      expect(result.skills).toHaveLength(1);
      expect(result.skills?.[0].name).toBe('Crowd Control');
    });

    it('correctly handles empty skill array by deleting existing skills and skipping createMany', async () => {
      txMock.jobPost.update.mockResolvedValueOnce(mockScalarJobRecord);
      txMock.jobPostSkill.deleteMany.mockResolvedValueOnce({ count: 2 });
      txMock.jobPost.findUnique.mockResolvedValueOnce({
        ...mockScalarJobRecord,
        category: mockCategoryRecord,
        skills: [],
      });

      const result = await repository.updateWithSkills(
        'job-post-uuid-1',
        { title: 'Skills Removed' },
        [],
      );

      expect(txMock.jobPostSkill.deleteMany).toHaveBeenCalledWith({
        where: { jobPostId: 'job-post-uuid-1' },
      });
      expect(txMock.jobPostSkill.createMany).not.toHaveBeenCalled();
      expect(result.skills).toHaveLength(0);
    });

    it('preserves transaction rollback when skill association fails', async () => {
      txMock.jobPost.update.mockResolvedValueOnce(mockScalarJobRecord);
      txMock.jobPostSkill.deleteMany.mockResolvedValueOnce({ count: 2 });
      txMock.jobPostSkill.createMany.mockRejectedValueOnce(
        new Error('Foreign key violation on skillId'),
      );

      await expect(
        repository.updateWithSkills('job-post-uuid-1', { title: 'Will Fail' }, [
          'invalid-skill-id',
        ]),
      ).rejects.toThrow('Foreign key violation on skillId');

      expect(prismaService.$transaction).toHaveBeenCalledTimes(1);
    });

    it('throws an error if updated job post cannot be re-fetched inside transaction', async () => {
      txMock.jobPost.update.mockResolvedValueOnce(mockScalarJobRecord);
      txMock.jobPostSkill.deleteMany.mockResolvedValueOnce({ count: 2 });
      txMock.jobPost.findUnique.mockResolvedValueOnce(null);

      await expect(
        repository.updateWithSkills('job-post-uuid-1', { title: 'Test' }, []),
      ).rejects.toThrow(
        'Failed to retrieve updated job post with id: job-post-uuid-1',
      );
    });
  });

  describe('delete', () => {
    it('deletes job post skills then job post in transaction and returns true on success', async () => {
      txMock.jobPostSkill.deleteMany.mockResolvedValueOnce({ count: 2 });
      txMock.jobPost.delete.mockResolvedValueOnce(mockScalarJobRecord);

      const result = await repository.delete('job-post-uuid-1');

      expect(prismaService.$transaction).toHaveBeenCalledTimes(1);
      expect(txMock.jobPostSkill.deleteMany).toHaveBeenCalledWith({
        where: { jobPostId: 'job-post-uuid-1' },
      });
      expect(txMock.jobPost.delete).toHaveBeenCalledWith({
        where: { id: 'job-post-uuid-1' },
      });
      expect(result).toBe(true);
    });

    it('returns false when job post does not exist (Prisma P2025)', async () => {
      txMock.jobPostSkill.deleteMany.mockResolvedValueOnce({ count: 0 });
      const p2025Error = new Prisma.PrismaClientKnownRequestError(
        'Record to delete does not exist',
        { code: 'P2025', clientVersion: '5.x' },
      );
      txMock.jobPost.delete.mockRejectedValueOnce(p2025Error);

      const result = await repository.delete('non-existent-id');

      expect(result).toBe(false);
    });

    it('returns false when deletion is blocked by foreign-key restriction (Prisma P2003)', async () => {
      txMock.jobPostSkill.deleteMany.mockResolvedValueOnce({ count: 2 });
      const p2003Error = new Prisma.PrismaClientKnownRequestError(
        'Foreign key constraint failed on JobApplication',
        { code: 'P2003', clientVersion: '5.x' },
      );
      txMock.jobPost.delete.mockRejectedValueOnce(p2003Error);

      const result = await repository.delete('job-post-with-applications');

      expect(result).toBe(false);
    });

    it('preserves transaction rollback behavior when deletion fails due to foreign-key restriction', async () => {
      // In this scenario, skills were queued for deletion inside the transaction, but post deletion fails with P2003
      txMock.jobPostSkill.deleteMany.mockResolvedValueOnce({ count: 3 });
      const p2003Error = new Prisma.PrismaClientKnownRequestError(
        'Foreign key constraint failed on Review',
        { code: 'P2003', clientVersion: '5.x' },
      );
      txMock.jobPost.delete.mockRejectedValueOnce(p2003Error);

      const result = await repository.delete('job-post-with-reviews');

      // Transaction was called with callback; when inner tx throws P2003, transaction rejects
      expect(prismaService.$transaction).toHaveBeenCalledTimes(1);
      expect(txMock.jobPostSkill.deleteMany).toHaveBeenCalledWith({
        where: { jobPostId: 'job-post-with-reviews' },
      });
      expect(txMock.jobPost.delete).toHaveBeenCalledWith({
        where: { id: 'job-post-with-reviews' },
      });
      expect(result).toBe(false);
    });

    it('rethrows unexpected database errors instead of returning false', async () => {
      const unexpectedError = new Error('Database connection lost');
      txMock.jobPostSkill.deleteMany.mockRejectedValueOnce(unexpectedError);

      await expect(repository.delete('job-post-uuid-1')).rejects.toThrow(
        'Database connection lost',
      );
    });
  });

  describe('findOpenJobs', () => {
    const mockCompany = {
      id: 'company-uuid-1',
      name: 'Tech Events LLC',
      logoUrl: 'https://cdn.example.com/logo.png',
    };

    const mockOpenJobWithCompany = {
      ...mockScalarJobRecord,
      id: 'job-post-open-1',
      status: 'open',
      category: mockCategoryRecord,
      skills: mockSkillsRecords,
      recruiter: {
        company: mockCompany,
      },
    };

    it('enforces status: OPEN and applies default sorting and pagination with selective company relation', async () => {
      (prismaService.jobPost.count as jest.Mock).mockResolvedValueOnce(1);
      (prismaService.jobPost.findMany as jest.Mock).mockResolvedValueOnce([
        mockOpenJobWithCompany,
      ]);

      const result = await repository.findOpenJobs({});

      expect(prismaService.jobPost.count).toHaveBeenCalledWith({
        where: {
          status: JobStatus.OPEN,
        },
      });
      expect(prismaService.jobPost.findMany).toHaveBeenCalledWith({
        where: {
          status: JobStatus.OPEN,
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: 0,
        take: 10,
        include: {
          category: true,
          skills: {
            include: {
              skill: true,
            },
          },
          recruiter: {
            select: {
              company: {
                select: {
                  id: true,
                  name: true,
                  logoUrl: true,
                },
              },
            },
          },
        },
      });

      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].status).toBe(JobStatus.OPEN);
      expect(result.items[0].company).toBeInstanceOf(CompanyEntity);
      expect(result.items[0].company?.name).toBe('Tech Events LLC');
    });

    it('applies filters for categoryId, workType, location, and skillIds', async () => {
      (prismaService.jobPost.count as jest.Mock).mockResolvedValueOnce(0);
      (prismaService.jobPost.findMany as jest.Mock).mockResolvedValueOnce([]);

      await repository.findOpenJobs({
        categoryId: 'cat-123',
        workType: WorkType.LOCAL,
        location: 'Brooklyn',
        skillIds: ['skill-1', 'skill-2'],
      });

      expect(prismaService.jobPost.count).toHaveBeenCalledWith({
        where: {
          status: JobStatus.OPEN,
          categoryId: 'cat-123',
          workType: WorkType.LOCAL,
          jobLocation: {
            contains: 'Brooklyn',
            mode: 'insensitive',
          },
          skills: {
            some: {
              skillId: {
                in: ['skill-1', 'skill-2'],
              },
            },
          },
        },
      });
    });

    it('applies search across title and description', async () => {
      (prismaService.jobPost.count as jest.Mock).mockResolvedValueOnce(0);
      (prismaService.jobPost.findMany as jest.Mock).mockResolvedValueOnce([]);

      await repository.findOpenJobs({
        search: 'developer',
      });

      expect(prismaService.jobPost.count).toHaveBeenCalledWith({
        where: {
          status: JobStatus.OPEN,
          OR: [
            { title: { contains: 'developer', mode: 'insensitive' } },
            { description: { contains: 'developer', mode: 'insensitive' } },
          ],
        },
      });
    });

    it('ignores whitespace-only search and location inputs', async () => {
      (prismaService.jobPost.count as jest.Mock).mockResolvedValueOnce(0);
      (prismaService.jobPost.findMany as jest.Mock).mockResolvedValueOnce([]);

      await repository.findOpenJobs({
        search: '   ',
        location: '   ',
      });

      expect(prismaService.jobPost.count).toHaveBeenCalledWith({
        where: {
          status: JobStatus.OPEN,
        },
      });
    });

    it('applies FIXED pay filtering on budgetAmount with min and max bounds', async () => {
      (prismaService.jobPost.count as jest.Mock).mockResolvedValueOnce(0);
      (prismaService.jobPost.findMany as jest.Mock).mockResolvedValueOnce([]);

      await repository.findOpenJobs({
        paymentStructure: PaymentStructure.FIXED,
        minPay: 50,
        maxPay: 200,
      });

      expect(prismaService.jobPost.count).toHaveBeenCalledWith({
        where: {
          status: JobStatus.OPEN,
          paymentStructure: PaymentStructure.FIXED,
          budgetAmount: {
            gte: 50,
            lte: 200,
          },
        },
      });
    });

    it('applies minPay alone with gte condition', async () => {
      (prismaService.jobPost.count as jest.Mock).mockResolvedValueOnce(0);
      (prismaService.jobPost.findMany as jest.Mock).mockResolvedValueOnce([]);

      await repository.findOpenJobs({
        paymentStructure: PaymentStructure.FIXED,
        minPay: 75,
      });

      expect(prismaService.jobPost.count).toHaveBeenCalledWith({
        where: {
          status: JobStatus.OPEN,
          paymentStructure: PaymentStructure.FIXED,
          budgetAmount: {
            gte: 75,
          },
        },
      });
    });

    it('applies maxPay alone with lte condition', async () => {
      (prismaService.jobPost.count as jest.Mock).mockResolvedValueOnce(0);
      (prismaService.jobPost.findMany as jest.Mock).mockResolvedValueOnce([]);

      await repository.findOpenJobs({
        paymentStructure: PaymentStructure.HOURLY,
        maxPay: 40,
      });

      expect(prismaService.jobPost.count).toHaveBeenCalledWith({
        where: {
          status: JobStatus.OPEN,
          paymentStructure: PaymentStructure.HOURLY,
          hourlyRateMin: {
            lte: 40,
          },
        },
      });
    });

    it('applies HOURLY pay filtering on hourlyRateMin with min and max bounds', async () => {
      (prismaService.jobPost.count as jest.Mock).mockResolvedValueOnce(0);
      (prismaService.jobPost.findMany as jest.Mock).mockResolvedValueOnce([]);

      await repository.findOpenJobs({
        paymentStructure: PaymentStructure.HOURLY,
        minPay: 20,
        maxPay: 50,
      });

      expect(prismaService.jobPost.count).toHaveBeenCalledWith({
        where: {
          status: JobStatus.OPEN,
          paymentStructure: PaymentStructure.HOURLY,
          hourlyRateMin: {
            gte: 20,
            lte: 50,
          },
        },
      });
    });

    it('combines search and payFilter when paymentStructure is unspecified using AND', async () => {
      (prismaService.jobPost.count as jest.Mock).mockResolvedValueOnce(0);
      (prismaService.jobPost.findMany as jest.Mock).mockResolvedValueOnce([]);

      await repository.findOpenJobs({
        search: 'coordinator',
        minPay: 25,
      });

      expect(prismaService.jobPost.count).toHaveBeenCalledWith({
        where: {
          status: JobStatus.OPEN,
          AND: [
            {
              OR: [
                { title: { contains: 'coordinator', mode: 'insensitive' } },
                {
                  description: { contains: 'coordinator', mode: 'insensitive' },
                },
              ],
            },
            {
              OR: [
                {
                  paymentStructure: PaymentStructure.FIXED,
                  budgetAmount: { gte: 25 },
                },
                {
                  paymentStructure: PaymentStructure.HOURLY,
                  hourlyRateMin: { gte: 25 },
                },
              ],
            },
          ],
        },
      });
    });

    it('sorts by budgetAmount when FIXED payment structure is specified for pay_high and pay_low', async () => {
      (prismaService.jobPost.count as jest.Mock).mockResolvedValue(0);
      (prismaService.jobPost.findMany as jest.Mock).mockResolvedValue([]);

      await repository.findOpenJobs({
        paymentStructure: PaymentStructure.FIXED,
        sortBy: JobSortBy.PAY_HIGH,
      });
      expect(prismaService.jobPost.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({
          orderBy: [
            { budgetAmount: 'desc' },
            { createdAt: 'desc' },
            { id: 'desc' },
          ],
        }),
      );

      await repository.findOpenJobs({
        paymentStructure: PaymentStructure.FIXED,
        sortBy: JobSortBy.PAY_LOW,
      });
      expect(prismaService.jobPost.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({
          orderBy: [
            { budgetAmount: 'asc' },
            { createdAt: 'desc' },
            { id: 'desc' },
          ],
        }),
      );
    });

    it('sorts by hourlyRateMin when HOURLY payment structure is specified for pay_high and pay_low', async () => {
      (prismaService.jobPost.count as jest.Mock).mockResolvedValue(0);
      (prismaService.jobPost.findMany as jest.Mock).mockResolvedValue([]);

      await repository.findOpenJobs({
        paymentStructure: PaymentStructure.HOURLY,
        sortBy: JobSortBy.PAY_HIGH,
      });
      expect(prismaService.jobPost.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({
          orderBy: [
            { hourlyRateMin: 'desc' },
            { createdAt: 'desc' },
            { id: 'desc' },
          ],
        }),
      );

      await repository.findOpenJobs({
        paymentStructure: PaymentStructure.HOURLY,
        sortBy: JobSortBy.PAY_LOW,
      });
      expect(prismaService.jobPost.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({
          orderBy: [
            { hourlyRateMin: 'asc' },
            { createdAt: 'desc' },
            { id: 'desc' },
          ],
        }),
      );
    });

    it('falls back to recent sorting when payment structure is unspecified with pay_high or pay_low', async () => {
      (prismaService.jobPost.count as jest.Mock).mockResolvedValue(0);
      (prismaService.jobPost.findMany as jest.Mock).mockResolvedValue([]);

      // pay_high with unspecified payment structure
      await repository.findOpenJobs({
        sortBy: JobSortBy.PAY_HIGH,
      });
      expect(prismaService.jobPost.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        }),
      );

      // pay_low with unspecified payment structure
      await repository.findOpenJobs({
        sortBy: JobSortBy.PAY_LOW,
      });
      expect(prismaService.jobPost.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        }),
      );
    });

    it('respects page and limit pagination parameters', async () => {
      (prismaService.jobPost.count as jest.Mock).mockResolvedValueOnce(50);
      (prismaService.jobPost.findMany as jest.Mock).mockResolvedValueOnce([]);

      await repository.findOpenJobs({
        page: 3,
        limit: 15,
      });

      expect(prismaService.jobPost.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 30,
          take: 15,
        }),
      );
    });
  });

  describe('findOpenJobById', () => {
    const mockFullRecord = {
      ...mockScalarJobRecord,
      id: 'job-open-1',
      status: JobStatus.OPEN,
      category: mockCategoryRecord,
      skills: mockSkillsRecords,
      recruiter: {
        id: 'recruiter-uuid-1',
        userId: 'user-uuid-1',
        roleTitle: 'Senior Recruiter',
        yearsExperience: 5,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-02T00:00:00Z'),
        user: {
          id: 'user-uuid-1',
          firstName: 'Sarah',
          lastName: 'Jenkins',
          avatarUrl: 'https://cdn.example.com/sarah.jpg',
          location: 'Chicago, IL',
          bio: 'Experienced recruiter in hospitality',
        },
        company: {
          id: 'company-uuid-1',
          name: 'SwiftPack Storage',
          logoUrl: 'https://cdn.example.com/logo.png',
          about: 'Leading storage solutions',
          industry: 'Logistics',
          website: 'https://swiftpack.example.com',
          headquartersLocation: 'Seattle, WA',
        },
      },
    };

    it('queries database with id and status: OPEN, returning hydrated entity', async () => {
      (prismaService.jobPost.findFirst as jest.Mock).mockResolvedValueOnce(
        mockFullRecord,
      );

      const result = await repository.findOpenJobById('job-open-1');

      expect(prismaService.jobPost.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'job-open-1',
          status: JobStatus.OPEN,
        },
        include: {
          category: true,
          skills: {
            include: {
              skill: true,
            },
          },
          recruiter: {
            select: {
              id: true,
              userId: true,
              roleTitle: true,
              yearsExperience: true,
              createdAt: true,
              updatedAt: true,
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  avatarUrl: true,
                  location: true,
                  bio: true,
                },
              },
              company: {
                select: {
                  id: true,
                  name: true,
                  logoUrl: true,
                  about: true,
                  industry: true,
                  website: true,
                  headquartersLocation: true,
                },
              },
            },
          },
        },
      });

      expect(result).toBeInstanceOf(JobPostEntity);
      expect(result?.id).toBe('job-open-1');
      expect(result?.status).toBe(JobStatus.OPEN);
      expect(result?.category?.name).toBe('Events & Hospitality');
      expect(result?.skills).toHaveLength(2);
      expect(result?.company?.name).toBe('SwiftPack Storage');
      expect(result?.company?.about).toBe('Leading storage solutions');
      expect(result?.recruiter?.roleTitle).toBe('Senior Recruiter');
      expect(result?.recruiter?.user?.firstName).toBe('Sarah');
      expect(result?.recruiter?.user?.lastName).toBe('Jenkins');
      expect(result?.recruiter?.user?.avatarUrl).toBe(
        'https://cdn.example.com/sarah.jpg',
      );
    });

    it('returns null when job post is not found or not in OPEN status', async () => {
      (prismaService.jobPost.findFirst as jest.Mock).mockResolvedValueOnce(
        null,
      );

      const result = await repository.findOpenJobById(
        'non-existent-or-draft-id',
      );

      expect(prismaService.jobPost.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: 'non-existent-or-draft-id',
            status: JobStatus.OPEN,
          },
        }),
      );
      expect(result).toBeNull();
    });

    it('safely maps job post when recruiter, company, and user are null or missing', async () => {
      const mockRecordNoRelations = {
        ...mockScalarJobRecord,
        id: 'job-open-2',
        status: JobStatus.OPEN,
        category: null,
        skills: [],
        recruiter: null,
      };

      (prismaService.jobPost.findFirst as jest.Mock).mockResolvedValueOnce(
        mockRecordNoRelations,
      );

      const result = await repository.findOpenJobById('job-open-2');

      expect(result).toBeInstanceOf(JobPostEntity);
      expect(result?.id).toBe('job-open-2');
      expect(result?.category).toBeUndefined();
      expect(result?.skills).toEqual([]);
      expect(result?.company).toBeNull();
      expect(result?.recruiter).toBeNull();
    });
  });
});
