import { CompanyEntity } from '../../domain/entities/company.entity';
import { CompanyResponseDto } from '../dto/recruiter-profile/company-response.dto';
import { CompanyMapper } from './company.mapper';

describe('CompanyMapper', () => {
  it('should accurately map CompanyEntity to CompanyResponseDto', () => {
    const entity = new CompanyEntity({
      id: 'company-uuid-1',
      name: 'Tech Innovations Inc',
      industry: 'Software',
      companySize: '50-200',
      website: 'https://tech.example.com',
      headquartersLocation: 'Austin, TX',
      about: 'Building cutting-edge tech.',
      logoUrl: 'https://s3.example.com/logo.png',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-02-01T00:00:00.000Z'),
    });

    const dto = CompanyMapper.toResponseDto(entity);

    expect(dto).toBeInstanceOf(CompanyResponseDto);
    expect(dto.id).toBe('company-uuid-1');
    expect(dto.name).toBe('Tech Innovations Inc');
    expect(dto.industry).toBe('Software');
    expect(dto.companySize).toBe('50-200');
    expect(dto.website).toBe('https://tech.example.com');
    expect(dto.headquartersLocation).toBe('Austin, TX');
    expect(dto.about).toBe('Building cutting-edge tech.');
    expect(dto.logoUrl).toBe('https://s3.example.com/logo.png');
    expect(dto.createdAt).toEqual(new Date('2026-01-01T00:00:00.000Z'));
    expect(dto.updatedAt).toEqual(new Date('2026-02-01T00:00:00.000Z'));
  });

  it('should preserve null fields correctly', () => {
    const entity = new CompanyEntity({
      id: 'company-uuid-2',
      name: 'Barebones LLC',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    const dto = CompanyMapper.toResponseDto(entity);

    expect(dto.id).toBe('company-uuid-2');
    expect(dto.name).toBe('Barebones LLC');
    expect(dto.industry).toBeNull();
    expect(dto.companySize).toBeNull();
    expect(dto.website).toBeNull();
    expect(dto.headquartersLocation).toBeNull();
    expect(dto.about).toBeNull();
    expect(dto.logoUrl).toBeNull();
  });
});
