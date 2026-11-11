import { validate } from 'class-validator';
import {
  GetRecruiterJobsQueryDto,
  RecruiterJobStatusFilter,
} from './get-recruiter-jobs-query.dto';

describe('GetRecruiterJobsQueryDto Validation', () => {
  it('should default status to "all" when instantiated with empty object or undefined', () => {
    const dto = new GetRecruiterJobsQueryDto();
    expect(dto.status).toBe(RecruiterJobStatusFilter.ALL);
  });

  it('should pass validation when status is omitted', async () => {
    const dto = new GetRecruiterJobsQueryDto({});
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
    expect(dto.status).toBe('all');
  });

  it.each([
    RecruiterJobStatusFilter.ALL,
    RecruiterJobStatusFilter.ACTIVE,
    RecruiterJobStatusFilter.DRAFT,
    RecruiterJobStatusFilter.PAUSED,
    RecruiterJobStatusFilter.CLOSED,
  ])(
    'should pass validation for supported filter value: "%s"',
    async (filter) => {
      const dto = new GetRecruiterJobsQueryDto({ status: filter });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
      expect(dto.status).toBe(filter);
    },
  );

  it('should reject unsupported filter value', async () => {
    const dto = new GetRecruiterJobsQueryDto({
      status: 'unsupported_status' as any,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints?.isEnum).toBe(
      'Status filter must be one of: all, active, draft, paused, closed',
    );
  });
});
