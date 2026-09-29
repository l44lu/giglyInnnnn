import { BadRequestException, NotFoundException } from '@nestjs/common';
import { IRecruiterProfileRepository } from '../../../../domain/repositories/recruiter-profile.repository.interface';
import { ICompanyRepository } from '../../../../domain/repositories/company.repository.interface';
import { IFileStorageService } from '../../../../domain/services/file-storage.service.interface';
import { RecruiterProfileEntity } from '../../../../domain/entities/recruiter-profile.entity';
import { CompanyEntity } from '../../../../domain/entities/company.entity';
import { UploadRecruiterCompanyLogoUseCase } from './upload-recruiter-company-logo.use-case';

describe('UploadRecruiterCompanyLogoUseCase', () => {
  let useCase: UploadRecruiterCompanyLogoUseCase;
  let recruiterProfileRepository: jest.Mocked<IRecruiterProfileRepository>;
  let companyRepository: jest.Mocked<ICompanyRepository>;
  let fileStorageService: jest.Mocked<IFileStorageService>;

  const validPngBuffer = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  ]);
  const validJpgBuffer = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
  ]);
  const validWebpBuffer = Buffer.concat([
    Buffer.from('RIFF'),
    Buffer.from([0x00, 0x00, 0x00, 0x00]),
    Buffer.from('WEBP'),
  ]);

  const mockProfile = new RecruiterProfileEntity({
    id: 'profile-uuid-1',
    userId: 'recruiter-user-1',
    companyId: 'company-uuid-1',
  });

  const mockProfileNoCompany = new RecruiterProfileEntity({
    id: 'profile-uuid-2',
    userId: 'recruiter-user-2',
    companyId: null,
  });

  const mockCompany = new CompanyEntity({
    id: 'company-uuid-1',
    name: 'Acme Corp',
    logoUrl: 'logos/company/company-uuid-1/old-logo.png',
  });

  beforeEach(() => {
    recruiterProfileRepository = {
      findById: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findByUserId: jest.fn(),
      upsert: jest.fn(),
    };

    companyRepository = {
      findById: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findByName: jest.fn(),
    };

    fileStorageService = {
      uploadFile: jest.fn().mockResolvedValue('uploaded-key'),
      getFile: jest.fn(),
      deleteFile: jest.fn().mockResolvedValue(undefined),
    };

    useCase = new UploadRecruiterCompanyLogoUseCase(
      recruiterProfileRepository,
      companyRepository,
      fileStorageService,
    );
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should throw NotFoundException if recruiter profile does not exist', async () => {
    recruiterProfileRepository.findByUserId.mockResolvedValue(null);

    await expect(
      useCase.execute({
        userId: 'unknown-user',
        buffer: validPngBuffer,
        mimetype: 'image/png',
        size: validPngBuffer.length,
      }),
    ).rejects.toThrow(NotFoundException);
    await expect(
      useCase.execute({
        userId: 'unknown-user',
        buffer: validPngBuffer,
        mimetype: 'image/png',
        size: validPngBuffer.length,
      }),
    ).rejects.toThrow('Recruiter profile not found');
  });

  it('should throw NotFoundException if recruiter has no associated companyId', async () => {
    recruiterProfileRepository.findByUserId.mockResolvedValue(
      mockProfileNoCompany,
    );

    await expect(
      useCase.execute({
        userId: 'recruiter-user-2',
        buffer: validPngBuffer,
        mimetype: 'image/png',
        size: validPngBuffer.length,
      }),
    ).rejects.toThrow(NotFoundException);
    await expect(
      useCase.execute({
        userId: 'recruiter-user-2',
        buffer: validPngBuffer,
        mimetype: 'image/png',
        size: validPngBuffer.length,
      }),
    ).rejects.toThrow('Company profile not configured for this recruiter');
  });

  it('should throw NotFoundException if company record does not exist in database', async () => {
    recruiterProfileRepository.findByUserId.mockResolvedValue(mockProfile);
    companyRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        userId: 'recruiter-user-1',
        buffer: validPngBuffer,
        mimetype: 'image/png',
        size: validPngBuffer.length,
      }),
    ).rejects.toThrow(NotFoundException);
    await expect(
      useCase.execute({
        userId: 'recruiter-user-1',
        buffer: validPngBuffer,
        mimetype: 'image/png',
        size: validPngBuffer.length,
      }),
    ).rejects.toThrow('Company not found');
  });

  it('should throw BadRequestException if file exceeds 2MB limit', async () => {
    recruiterProfileRepository.findByUserId.mockResolvedValue(mockProfile);
    companyRepository.findById.mockResolvedValue(mockCompany);

    const oversizedBuffer = Buffer.alloc(2 * 1024 * 1024 + 1);

    await expect(
      useCase.execute({
        userId: 'recruiter-user-1',
        buffer: oversizedBuffer,
        mimetype: 'image/png',
        size: oversizedBuffer.length,
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      useCase.execute({
        userId: 'recruiter-user-1',
        buffer: oversizedBuffer,
        mimetype: 'image/png',
        size: oversizedBuffer.length,
      }),
    ).rejects.toThrow('File size exceeds the 2MB limit');
  });

  it('should throw BadRequestException if buffer is too small or invalid magic bytes', async () => {
    recruiterProfileRepository.findByUserId.mockResolvedValue(mockProfile);
    companyRepository.findById.mockResolvedValue(mockCompany);

    const corruptBuffer = Buffer.from('not an image');

    await expect(
      useCase.execute({
        userId: 'recruiter-user-1',
        buffer: corruptBuffer,
        mimetype: 'image/png',
        size: corruptBuffer.length,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException if MIME type does not match binary signature', async () => {
    recruiterProfileRepository.findByUserId.mockResolvedValue(mockProfile);
    companyRepository.findById.mockResolvedValue(mockCompany);

    await expect(
      useCase.execute({
        userId: 'recruiter-user-1',
        buffer: validPngBuffer,
        mimetype: 'image/jpeg', // Mismatched MIME
        size: validPngBuffer.length,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should successfully upload PNG logo and update company logoUrl', async () => {
    recruiterProfileRepository.findByUserId.mockResolvedValue(mockProfile);
    companyRepository.findById.mockResolvedValue(mockCompany);
    companyRepository.update.mockResolvedValue(mockCompany);

    const result = await useCase.execute({
      userId: 'recruiter-user-1',
      buffer: validPngBuffer,
      mimetype: 'image/png',
      size: validPngBuffer.length,
    });

    expect(fileStorageService.uploadFile).toHaveBeenCalledWith(
      expect.objectContaining({
        key: expect.stringMatching(
          /^logos\/company\/company-uuid-1\/[a-f0-9-]+\.png$/,
        ),
        contentType: 'image/png',
      }),
    );

    expect(companyRepository.update).toHaveBeenCalledWith(
      'company-uuid-1',
      expect.objectContaining({
        logoUrl: expect.stringMatching(
          /^logos\/company\/company-uuid-1\/[a-f0-9-]+\.png$/,
        ),
      }),
    );

    // Old logo deleted after successful DB write
    expect(fileStorageService.deleteFile).toHaveBeenCalledWith(
      'logos/company/company-uuid-1/old-logo.png',
    );

    expect(result).toEqual({ logoUrl: '/recruiter/company/logo' });
  });

  it('should successfully upload JPEG logo and update company logoUrl', async () => {
    recruiterProfileRepository.findByUserId.mockResolvedValue(mockProfile);
    companyRepository.findById.mockResolvedValue(mockCompany);
    companyRepository.update.mockResolvedValue(mockCompany);

    const result = await useCase.execute({
      userId: 'recruiter-user-1',
      buffer: validJpgBuffer,
      mimetype: 'image/jpeg',
      size: validJpgBuffer.length,
    });

    expect(fileStorageService.uploadFile).toHaveBeenCalledWith(
      expect.objectContaining({
        key: expect.stringMatching(
          /^logos\/company\/company-uuid-1\/[a-f0-9-]+\.jpg$/,
        ),
        contentType: 'image/jpeg',
      }),
    );
    expect(result).toEqual({ logoUrl: '/recruiter/company/logo' });
  });

  it('should successfully upload WebP logo and update company logoUrl', async () => {
    recruiterProfileRepository.findByUserId.mockResolvedValue(mockProfile);
    companyRepository.findById.mockResolvedValue(mockCompany);
    companyRepository.update.mockResolvedValue(mockCompany);

    const result = await useCase.execute({
      userId: 'recruiter-user-1',
      buffer: validWebpBuffer,
      mimetype: 'image/webp',
      size: validWebpBuffer.length,
    });

    expect(fileStorageService.uploadFile).toHaveBeenCalledWith(
      expect.objectContaining({
        key: expect.stringMatching(
          /^logos\/company\/company-uuid-1\/[a-f0-9-]+\.webp$/,
        ),
        contentType: 'image/webp',
      }),
    );
    expect(result).toEqual({ logoUrl: '/recruiter/company/logo' });
  });

  it('COMPENSATION: should delete newly uploaded S3 object if database update fails', async () => {
    recruiterProfileRepository.findByUserId.mockResolvedValue(mockProfile);
    companyRepository.findById.mockResolvedValue(mockCompany);
    companyRepository.update.mockRejectedValue(
      new Error('Database connection failure'),
    );

    await expect(
      useCase.execute({
        userId: 'recruiter-user-1',
        buffer: validPngBuffer,
        mimetype: 'image/png',
        size: validPngBuffer.length,
      }),
    ).rejects.toThrow('Database connection failure');

    // S3 compensation triggered: newly uploaded key deleted
    expect(fileStorageService.deleteFile).toHaveBeenCalledWith(
      expect.stringMatching(
        /^logos\/company\/company-uuid-1\/[a-f0-9-]+\.png$/,
      ),
    );

    // Old logo was NOT deleted because update failed
    expect(fileStorageService.deleteFile).not.toHaveBeenCalledWith(
      'logos/company/company-uuid-1/old-logo.png',
    );
  });

  it('should handle S3 old logo cleanup failure gracefully without failing request', async () => {
    recruiterProfileRepository.findByUserId.mockResolvedValue(mockProfile);
    companyRepository.findById.mockResolvedValue(mockCompany);
    companyRepository.update.mockResolvedValue(mockCompany);
    fileStorageService.deleteFile.mockRejectedValueOnce(
      new Error('S3 AccessDenied on delete'),
    );

    const result = await useCase.execute({
      userId: 'recruiter-user-1',
      buffer: validPngBuffer,
      mimetype: 'image/png',
      size: validPngBuffer.length,
    });

    expect(result).toEqual({ logoUrl: '/recruiter/company/logo' });
  });
});
