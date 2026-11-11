import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { ReportJobInputDto } from './report-job-input.dto';

describe('ReportJobInputDto Validation', () => {
  let pipe: ValidationPipe;

  beforeEach(() => {
    pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });
  });

  it('accepts and trims a valid description', async () => {
    const raw = {
      description: '  This job listing is asking for illegal payments.   ',
    };
    const result = await pipe.transform(raw, {
      type: 'body',
      metatype: ReportJobInputDto,
    });

    expect(result).toBeInstanceOf(ReportJobInputDto);
    expect(result.description).toBe(
      'This job listing is asking for illegal payments.',
    );
  });

  it('rejects missing description', async () => {
    await expect(
      pipe.transform({}, { type: 'body', metatype: ReportJobInputDto }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects empty string description', async () => {
    await expect(
      pipe.transform(
        { description: '' },
        { type: 'body', metatype: ReportJobInputDto },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects whitespace-only description', async () => {
    await expect(
      pipe.transform(
        { description: '     \n \t  ' },
        { type: 'body', metatype: ReportJobInputDto },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects description longer than 500 characters', async () => {
    const longDesc = 'a'.repeat(501);
    await expect(
      pipe.transform(
        { description: longDesc },
        { type: 'body', metatype: ReportJobInputDto },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('accepts description of exactly 500 characters', async () => {
    const desc500 = 'a'.repeat(500);
    const result = await pipe.transform(
      { description: desc500 },
      { type: 'body', metatype: ReportJobInputDto },
    );
    expect(result.description.length).toBe(500);
  });

  it('rejects non-string description', async () => {
    await expect(
      pipe.transform(
        { description: 12345 },
        { type: 'body', metatype: ReportJobInputDto },
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
