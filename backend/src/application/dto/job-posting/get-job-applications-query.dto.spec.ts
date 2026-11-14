import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { GetJobApplicationsQueryDto } from './get-job-applications-query.dto';
import { JobApplicationStatus } from '../../../domain/enums/job-application-status.enum';
import { JobApplicationSortBy } from '../../../domain/repositories/job-application.repository.interface';

describe('GetJobApplicationsQueryDto Validation', () => {
  let pipe: ValidationPipe;

  beforeEach(() => {
    pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });
  });

  it('sets default page=1, limit=10, sortBy=recent when query is empty', async () => {
    const result = await pipe.transform(
      {},
      { type: 'query', metatype: GetJobApplicationsQueryDto },
    );

    expect(result).toBeInstanceOf(GetJobApplicationsQueryDto);
    expect(result.status).toBeUndefined();
    expect(result.search).toBeUndefined();
    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
    expect(result.sortBy).toBe(JobApplicationSortBy.RECENT);
  });

  it('transforms valid status, search, page, limit, and sortBy parameters', async () => {
    const result = await pipe.transform(
      {
        status: JobApplicationStatus.SHORTLISTED,
        search: '  Jane Doe  ',
        page: '2',
        limit: '25',
        sortBy: JobApplicationSortBy.EXPECTED_PAY_ASC,
      },
      { type: 'query', metatype: GetJobApplicationsQueryDto },
    );

    expect(result).toBeInstanceOf(GetJobApplicationsQueryDto);
    expect(result.status).toBe(JobApplicationStatus.SHORTLISTED);
    expect(result.search).toBe('Jane Doe');
    expect(result.page).toBe(2);
    expect(result.limit).toBe(25);
    expect(result.sortBy).toBe(JobApplicationSortBy.EXPECTED_PAY_ASC);
  });

  it.each(Object.values(JobApplicationStatus))(
    'accepts status "%s"',
    async (status) => {
      const result = await pipe.transform(
        { status },
        { type: 'query', metatype: GetJobApplicationsQueryDto },
      );
      expect(result.status).toBe(status);
    },
  );

  it.each(Object.values(JobApplicationSortBy))(
    'accepts sortBy "%s"',
    async (sortBy) => {
      const result = await pipe.transform(
        { sortBy },
        { type: 'query', metatype: GetJobApplicationsQueryDto },
      );
      expect(result.sortBy).toBe(sortBy);
    },
  );

  it('normalizes blank search and status strings to undefined', async () => {
    const result = await pipe.transform(
      { status: '   ', search: '   ', sortBy: '   ' },
      { type: 'query', metatype: GetJobApplicationsQueryDto },
    );

    expect(result.status).toBeUndefined();
    expect(result.search).toBeUndefined();
    expect(result.sortBy).toBe(JobApplicationSortBy.RECENT);
  });

  it('rejects unsupported status values', async () => {
    await expect(
      pipe.transform(
        { status: 'invalid_status' },
        { type: 'query', metatype: GetJobApplicationsQueryDto },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects unsupported sortBy values', async () => {
    await expect(
      pipe.transform(
        { sortBy: 'rating_desc' },
        { type: 'query', metatype: GetJobApplicationsQueryDto },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects page less than 1 or non-integer page', async () => {
    await expect(
      pipe.transform(
        { page: '0' },
        { type: 'query', metatype: GetJobApplicationsQueryDto },
      ),
    ).rejects.toThrow(BadRequestException);

    await expect(
      pipe.transform(
        { page: '1.5' },
        { type: 'query', metatype: GetJobApplicationsQueryDto },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects limit outside 1..50 or non-integer limit', async () => {
    await expect(
      pipe.transform(
        { limit: '0' },
        { type: 'query', metatype: GetJobApplicationsQueryDto },
      ),
    ).rejects.toThrow(BadRequestException);

    await expect(
      pipe.transform(
        { limit: '51' },
        { type: 'query', metatype: GetJobApplicationsQueryDto },
      ),
    ).rejects.toThrow(BadRequestException);

    await expect(
      pipe.transform(
        { limit: '2.5' },
        { type: 'query', metatype: GetJobApplicationsQueryDto },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects unexpected client-supplied properties such as recruiterId', async () => {
    await expect(
      pipe.transform(
        { recruiterId: '123e4567-e89b-42d3-a456-426614174000' },
        { type: 'query', metatype: GetJobApplicationsQueryDto },
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
