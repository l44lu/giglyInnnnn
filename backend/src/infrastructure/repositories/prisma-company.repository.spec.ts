import { PrismaCompanyRepository } from './prisma-company.repository';
import { PrismaService } from '../prisma/prisma.service';
import { CompanyEntity } from '../../domain/entities/company.entity';

describe('PrismaCompanyRepository', () => {
  let repository: PrismaCompanyRepository;
  let prismaService: jest.Mocked<PrismaService>;

  const mockDbRecord = {
    id: 'company-uuid-1',
    name: 'Acme Corporation',
    industry: 'Logistics',
    companySize: '51-200',
    website: 'https://acme.example.com',
    headquartersLocation: 'Chicago, IL',
    about: 'Global logistics and staffing services.',
    logoUrl: 'logos/company/acme/logo.png',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  };

  beforeEach(() => {
    prismaService = {
      company: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaService>;

    repository = new PrismaCompanyRepository(prismaService);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('findById', () => {
    it('queries database by id and maps to CompanyEntity', async () => {
      (prismaService.company.findUnique as jest.Mock).mockResolvedValue(
        mockDbRecord,
      );

      const result = await repository.findById('company-uuid-1');

      expect(prismaService.company.findUnique).toHaveBeenCalledWith({
        where: { id: 'company-uuid-1' },
      });
      expect(result).toBeInstanceOf(CompanyEntity);
      expect(result?.id).toBe('company-uuid-1');
      expect(result?.name).toBe('Acme Corporation');
      expect(result?.industry).toBe('Logistics');
      expect(result?.companySize).toBe('51-200');
      expect(result?.website).toBe('https://acme.example.com');
      expect(result?.headquartersLocation).toBe('Chicago, IL');
      expect(result?.about).toBe('Global logistics and staffing services.');
      expect(result?.logoUrl).toBe('logos/company/acme/logo.png');
      expect(result?.createdAt).toEqual(mockDbRecord.createdAt);
      expect(result?.updatedAt).toEqual(mockDbRecord.updatedAt);
    });

    it('returns null when company not found', async () => {
      (prismaService.company.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await repository.findById('missing-id');

      expect(result).toBeNull();
    });
  });

  describe('findByName', () => {
    it('queries database by name and maps to CompanyEntity', async () => {
      (prismaService.company.findFirst as jest.Mock).mockResolvedValue(
        mockDbRecord,
      );

      const result = await repository.findByName('Acme Corporation');

      expect(prismaService.company.findFirst).toHaveBeenCalledWith({
        where: { name: 'Acme Corporation' },
      });
      expect(result).toBeInstanceOf(CompanyEntity);
      expect(result?.name).toBe('Acme Corporation');
    });

    it('returns null when no company matches name', async () => {
      (prismaService.company.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await repository.findByName('NonExistent');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('creates a new company and maps to CompanyEntity', async () => {
      (prismaService.company.create as jest.Mock).mockResolvedValue(
        mockDbRecord,
      );

      const result = await repository.create({
        name: 'Acme Corporation',
        industry: 'Logistics',
        companySize: '51-200',
        website: 'https://acme.example.com',
        headquartersLocation: 'Chicago, IL',
        about: 'Global logistics and staffing services.',
        logoUrl: 'logos/company/acme/logo.png',
      });

      expect(prismaService.company.create).toHaveBeenCalledWith({
        data: {
          name: 'Acme Corporation',
          industry: 'Logistics',
          companySize: '51-200',
          website: 'https://acme.example.com',
          headquartersLocation: 'Chicago, IL',
          about: 'Global logistics and staffing services.',
          logoUrl: 'logos/company/acme/logo.png',
        },
      });
      expect(result).toBeInstanceOf(CompanyEntity);
      expect(result.id).toBe('company-uuid-1');
      expect(result.name).toBe('Acme Corporation');
    });

    it('creates company with defaults/nulls for omitted optional fields', async () => {
      const minimalRecord = {
        ...mockDbRecord,
        industry: null,
        companySize: null,
        website: null,
        headquartersLocation: null,
        about: null,
        logoUrl: null,
      };
      (prismaService.company.create as jest.Mock).mockResolvedValue(
        minimalRecord,
      );

      const result = await repository.create({
        name: 'Acme Corporation',
      });

      expect(prismaService.company.create).toHaveBeenCalledWith({
        data: {
          name: 'Acme Corporation',
          industry: null,
          companySize: null,
          website: null,
          headquartersLocation: null,
          about: null,
          logoUrl: null,
        },
      });
      expect(result).toBeInstanceOf(CompanyEntity);
      expect(result.industry).toBeNull();
      expect(result.companySize).toBeNull();
      expect(result.website).toBeNull();
      expect(result.headquartersLocation).toBeNull();
      expect(result.about).toBeNull();
      expect(result.logoUrl).toBeNull();
    });
  });

  describe('update', () => {
    it('updates company by id and maps to CompanyEntity', async () => {
      const updatedRecord = {
        ...mockDbRecord,
        name: 'Acme Global',
        companySize: '201-500',
      };
      (prismaService.company.update as jest.Mock).mockResolvedValue(
        updatedRecord,
      );

      const result = await repository.update('company-uuid-1', {
        name: 'Acme Global',
        companySize: '201-500',
      });

      expect(prismaService.company.update).toHaveBeenCalledWith({
        where: { id: 'company-uuid-1' },
        data: {
          name: 'Acme Global',
          companySize: '201-500',
        },
      });
      expect(result).toBeInstanceOf(CompanyEntity);
      expect(result.name).toBe('Acme Global');
      expect(result.companySize).toBe('201-500');
    });
  });

  describe('findAll', () => {
    it('queries all companies and maps to CompanyEntity array', async () => {
      (prismaService.company.findMany as jest.Mock).mockResolvedValue([
        mockDbRecord,
      ]);

      const results = await repository.findAll();

      expect(prismaService.company.findMany).toHaveBeenCalled();
      expect(results).toHaveLength(1);
      expect(results[0]).toBeInstanceOf(CompanyEntity);
    });
  });

  describe('delete', () => {
    it('deletes company by id and returns true on success', async () => {
      (prismaService.company.delete as jest.Mock).mockResolvedValue(
        mockDbRecord,
      );

      const result = await repository.delete('company-uuid-1');

      expect(prismaService.company.delete).toHaveBeenCalledWith({
        where: { id: 'company-uuid-1' },
      });
      expect(result).toBe(true);
    });

    it('returns false when delete fails', async () => {
      (prismaService.company.delete as jest.Mock).mockRejectedValue(
        new Error('DB error'),
      );

      const result = await repository.delete('missing-id');

      expect(result).toBe(false);
    });
  });
});
