import { JobPostEntity } from '../../domain/entities/job-post.entity';
import { JobCategoryEntity } from '../../domain/entities/job-category.entity';
import { SkillEntity } from '../../domain/entities/skill.entity';
import { JobStatus } from '../../domain/enums/job-status.enum';
import { WorkType } from '../../domain/enums/work-type.enum';
import { PaymentStructure } from '../../domain/enums/payment-structure.enum';
import { JobPostResponseDto } from '../dto/job-posting/job-post-response.dto';
import { JobPostMapper } from './job-post.mapper';

describe('JobPostMapper', () => {
  it('should map JobPostEntity to JobPostResponseDto accurately', () => {
    const entity = new JobPostEntity({
      id: 'job-uuid-1',
      recruiterId: 'recruiter-profile-1',
      categoryId: 'cat-uuid-1',
      title: 'Barista for Weekend Festival',
      description: 'Prepare espresso drinks and manage register.',
      workType: WorkType.LOCAL,
      workersNeeded: 3,
      startDate: new Date('2026-06-01T08:00:00.000Z'),
      estimatedDuration: '2 days',
      shiftDuration: '8 hours/day',
      jobLocation: 'Dallas, TX',
      jobLocationLat: 32.7767,
      jobLocationLng: -96.797,
      paymentStructure: PaymentStructure.HOURLY,
      budgetAmount: null,
      hourlyRate: 20,
      hourlyRateMin: 20,
      hourlyRateMax: 20,
      status: JobStatus.DRAFT,
      isBoosted: false,
      boostExpiresAt: null,
      adminReviewStatus: 'pending',
      adminNotes: null,
      createdAt: new Date('2026-05-01T00:00:00.000Z'),
      updatedAt: new Date('2026-05-01T00:00:00.000Z'),
      category: new JobCategoryEntity({
        id: 'cat-uuid-1',
        name: 'Hospitality',
        description: 'Hospitality and event services',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      }),
      skills: [
        new SkillEntity({
          id: 'skill-uuid-1',
          name: 'Coffee Preparation',
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
        }),
      ],
    });

    const dto = JobPostMapper.toResponseDto(entity);

    expect(dto).toBeInstanceOf(JobPostResponseDto);
    expect(dto.id).toBe('job-uuid-1');
    expect(dto.recruiterId).toBe('recruiter-profile-1');
    expect(dto.categoryId).toBe('cat-uuid-1');
    expect(dto.title).toBe('Barista for Weekend Festival');
    expect(dto.description).toBe(
      'Prepare espresso drinks and manage register.',
    );
    expect(dto.workType).toBe(WorkType.LOCAL);
    expect(dto.workersNeeded).toBe(3);
    expect(dto.startDate).toEqual(new Date('2026-06-01T08:00:00.000Z'));
    expect(dto.paymentStructure).toBe(PaymentStructure.HOURLY);
    expect(dto.hourlyRate).toBe(20);
    expect(dto.hourlyRateMin).toBe(20);
    expect(dto.hourlyRateMax).toBe(20);
    expect(dto.status).toBe(JobStatus.DRAFT);
    expect(dto.category).toBeDefined();
    expect(dto.category?.id).toBe('cat-uuid-1');
    expect(dto.category?.name).toBe('Hospitality');
    expect(dto.skills).toBeDefined();
    expect(dto.skills).toHaveLength(1);
    expect(dto.skills?.[0].name).toBe('Coffee Preparation');
  });

  it('should map JobPostEntity without relations', () => {
    const entity = new JobPostEntity({
      id: 'job-uuid-2',
      recruiterId: 'recruiter-profile-2',
      categoryId: 'cat-uuid-2',
      title: 'Remote Copywriter',
      description: 'Write marketing copies.',
      workType: WorkType.REMOTE,
      paymentStructure: PaymentStructure.FIXED,
      budgetAmount: 500,
      createdAt: new Date('2026-05-01T00:00:00.000Z'),
      updatedAt: new Date('2026-05-01T00:00:00.000Z'),
    });

    const dto = JobPostMapper.toResponseDto(entity);

    expect(dto).toBeInstanceOf(JobPostResponseDto);
    expect(dto.id).toBe('job-uuid-2');
    expect(dto.workersNeeded).toBe(1);
    expect(dto.status).toBe(JobStatus.DRAFT);
    expect(dto.budgetAmount).toBe(500);
    expect(dto.category).toBeUndefined();
    expect(dto.skills).toBeUndefined();
  });
});
