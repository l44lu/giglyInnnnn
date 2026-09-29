import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { UploadWorkerAvatarUseCase } from './upload-worker-avatar.use-case';
import { IUserRepository } from '../../../../domain/repositories/user.repository.interface';
import { IFileStorageService } from '../../../../domain/services/file-storage.service.interface';
import { UserEntities } from '../../../../domain/entities/user.entities';
import { Role } from '../../../../domain/enums/role.enum';

describe('UploadWorkerAvatarUseCase', () => {
  let useCase: UploadWorkerAvatarUseCase;
  let mockUserRepository: jest.Mocked<IUserRepository>;
  let mockFileStorageService: jest.Mocked<IFileStorageService>;

  const workerUser = new UserEntities({
    id: 'worker-user-123',
    email: 'worker@example.com',
    role: Role.WORKER,
    firstName: 'Jane',
    lastName: 'Worker',
    avatarUrl: null,
  });

  const recruiterUser = new UserEntities({
    id: 'recruiter-user-456',
    email: 'recruiter@example.com',
    role: Role.RECRUITER,
    firstName: 'Bob',
    lastName: 'Recruiter',
    avatarUrl: null,
  });

  // Valid image buffers
  const validJpegBuffer = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
  ]);
  const validPngBuffer = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  ]);
  const validWebpBuffer = Buffer.from([
    0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
  ]);

  beforeEach(() => {
    mockUserRepository = {
      findById: jest.fn(),
      update: jest.fn(),
      findByEmail: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      updatePassword: jest.fn(),
    } as unknown as jest.Mocked<IUserRepository>;

    mockFileStorageService = {
      uploadFile: jest.fn(),
      deleteFile: jest.fn(),
      getFile: jest.fn(),
    } as unknown as jest.Mocked<IFileStorageService>;

    useCase = new UploadWorkerAvatarUseCase(
      mockUserRepository,
      mockFileStorageService,
    );
  });

  it('1. Valid JPEG succeeds and updates database reference', async () => {
    mockUserRepository.findById.mockResolvedValueOnce(workerUser);
    mockFileStorageService.uploadFile.mockResolvedValueOnce({
      key: 'avatars/worker/worker-user-123/uuid.jpg',
      url: 'https://bucket.s3.amazonaws.com/key',
    });
    mockUserRepository.update.mockResolvedValueOnce(workerUser);

    const result = await useCase.execute({
      userId: workerUser.id,
      buffer: validJpegBuffer,
      mimetype: 'image/jpeg',
      size: validJpegBuffer.length,
    });

    expect(result).toEqual({ avatarUrl: '/worker/profile/avatar' });
    expect(mockFileStorageService.uploadFile).toHaveBeenCalledWith({
      key: expect.stringMatching(
        /^avatars\/worker\/worker-user-123\/[a-f0-9-]+\.jpg$/,
      ),
      buffer: validJpegBuffer,
      contentType: 'image/jpeg',
    });
    expect(mockUserRepository.update).toHaveBeenCalledWith(
      workerUser.id,
      expect.objectContaining({
        avatarUrl: expect.stringMatching(
          /^avatars\/worker\/worker-user-123\/[a-f0-9-]+\.jpg$/,
        ),
      }),
    );
  });

  it('2. Valid PNG succeeds and updates database reference', async () => {
    mockUserRepository.findById.mockResolvedValueOnce(workerUser);
    mockFileStorageService.uploadFile.mockResolvedValueOnce({
      key: 'avatars/worker/worker-user-123/uuid.png',
      url: 'https://bucket.s3.amazonaws.com/key',
    });
    mockUserRepository.update.mockResolvedValueOnce(workerUser);

    const result = await useCase.execute({
      userId: workerUser.id,
      buffer: validPngBuffer,
      mimetype: 'image/png',
      size: validPngBuffer.length,
    });

    expect(result).toEqual({ avatarUrl: '/worker/profile/avatar' });
    expect(mockFileStorageService.uploadFile).toHaveBeenCalledWith(
      expect.objectContaining({
        key: expect.stringMatching(/\.png$/),
        contentType: 'image/png',
      }),
    );
  });

  it('3. Valid WebP succeeds and updates database reference', async () => {
    mockUserRepository.findById.mockResolvedValueOnce(workerUser);
    mockFileStorageService.uploadFile.mockResolvedValueOnce({
      key: 'avatars/worker/worker-user-123/uuid.webp',
      url: 'https://bucket.s3.amazonaws.com/key',
    });
    mockUserRepository.update.mockResolvedValueOnce(workerUser);

    const result = await useCase.execute({
      userId: workerUser.id,
      buffer: validWebpBuffer,
      mimetype: 'image/webp',
      size: validWebpBuffer.length,
    });

    expect(result).toEqual({ avatarUrl: '/worker/profile/avatar' });
    expect(mockFileStorageService.uploadFile).toHaveBeenCalledWith(
      expect.objectContaining({
        key: expect.stringMatching(/\.webp$/),
        contentType: 'image/webp',
      }),
    );
  });

  it('4. Invalid magic bytes are rejected with BadRequestException', async () => {
    mockUserRepository.findById.mockResolvedValueOnce(workerUser);
    const corruptedBuffer = Buffer.from('not an image binary file content');

    await expect(
      useCase.execute({
        userId: workerUser.id,
        buffer: corruptedBuffer,
        mimetype: 'image/png',
        size: corruptedBuffer.length,
      }),
    ).rejects.toThrow(BadRequestException);

    expect(mockFileStorageService.uploadFile).not.toHaveBeenCalled();
    expect(mockUserRepository.update).not.toHaveBeenCalled();
  });

  it('5. S3 upload failure prevents DB update and throws error', async () => {
    mockUserRepository.findById.mockResolvedValueOnce(workerUser);
    mockFileStorageService.uploadFile.mockRejectedValueOnce(
      new Error('S3 Network timeout'),
    );

    await expect(
      useCase.execute({
        userId: workerUser.id,
        buffer: validJpegBuffer,
        mimetype: 'image/jpeg',
        size: validJpegBuffer.length,
      }),
    ).rejects.toThrow('S3 Network timeout');

    expect(mockUserRepository.update).not.toHaveBeenCalled();
    expect(mockFileStorageService.deleteFile).not.toHaveBeenCalled();
  });

  it('6. DB update failure compensates by deleting newly uploaded S3 object', async () => {
    mockUserRepository.findById.mockResolvedValueOnce(workerUser);
    mockFileStorageService.uploadFile.mockResolvedValueOnce({
      key: 'avatars/worker/worker-user-123/new-key.jpg',
      url: 'https://bucket.s3.amazonaws.com/key',
    });
    mockUserRepository.update.mockRejectedValueOnce(
      new Error('Database unique constraint or connection failure'),
    );
    mockFileStorageService.deleteFile.mockResolvedValueOnce();

    await expect(
      useCase.execute({
        userId: workerUser.id,
        buffer: validJpegBuffer,
        mimetype: 'image/jpeg',
        size: validJpegBuffer.length,
      }),
    ).rejects.toThrow('Database unique constraint or connection failure');

    // Verify S3 compensation deletion
    expect(mockFileStorageService.deleteFile).toHaveBeenCalledWith(
      expect.stringMatching(
        /^avatars\/worker\/worker-user-123\/[a-f0-9-]+\.jpg$/,
      ),
    );
  });

  it('7. Existing avatar is deleted after successful replacement', async () => {
    const userWithExistingAvatar = new UserEntities({
      ...workerUser,
      avatarUrl: 'avatars/worker/worker-user-123/old-avatar.png',
    });
    mockUserRepository.findById.mockResolvedValueOnce(userWithExistingAvatar);
    mockFileStorageService.uploadFile.mockResolvedValueOnce({
      key: 'avatars/worker/worker-user-123/new-avatar.jpg',
      url: 'https://bucket.s3.amazonaws.com/new',
    });
    mockUserRepository.update.mockResolvedValueOnce(userWithExistingAvatar);
    mockFileStorageService.deleteFile.mockResolvedValueOnce();

    await useCase.execute({
      userId: workerUser.id,
      buffer: validJpegBuffer,
      mimetype: 'image/jpeg',
      size: validJpegBuffer.length,
    });

    expect(mockFileStorageService.deleteFile).toHaveBeenCalledWith(
      'avatars/worker/worker-user-123/old-avatar.png',
    );
  });

  it('8. Old avatar deletion failure does not invalidate successful update', async () => {
    const userWithExistingAvatar = new UserEntities({
      ...workerUser,
      avatarUrl: 'avatars/worker/worker-user-123/old-avatar.png',
    });
    mockUserRepository.findById.mockResolvedValueOnce(userWithExistingAvatar);
    mockFileStorageService.uploadFile.mockResolvedValueOnce({
      key: 'avatars/worker/worker-user-123/new-avatar.jpg',
      url: 'https://bucket.s3.amazonaws.com/new',
    });
    mockUserRepository.update.mockResolvedValueOnce(userWithExistingAvatar);
    mockFileStorageService.deleteFile.mockRejectedValueOnce(
      new Error('S3 AccessDenied on delete'),
    );

    const result = await useCase.execute({
      userId: workerUser.id,
      buffer: validJpegBuffer,
      mimetype: 'image/jpeg',
      size: validJpegBuffer.length,
    });

    expect(result).toEqual({ avatarUrl: '/worker/profile/avatar' });
  });

  it('9. User not found throws NotFoundException', async () => {
    mockUserRepository.findById.mockResolvedValueOnce(null);

    await expect(
      useCase.execute({
        userId: 'nonexistent-user',
        buffer: validJpegBuffer,
        mimetype: 'image/jpeg',
        size: validJpegBuffer.length,
      }),
    ).rejects.toThrow(NotFoundException);

    expect(mockFileStorageService.uploadFile).not.toHaveBeenCalled();
  });

  it('10. Non-worker role throws ForbiddenException', async () => {
    mockUserRepository.findById.mockResolvedValueOnce(recruiterUser);

    await expect(
      useCase.execute({
        userId: recruiterUser.id,
        buffer: validJpegBuffer,
        mimetype: 'image/jpeg',
        size: validJpegBuffer.length,
      }),
    ).rejects.toThrow(ForbiddenException);

    expect(mockFileStorageService.uploadFile).not.toHaveBeenCalled();
  });

  it('11. Oversized file (> 2MB) is rejected with BadRequestException', async () => {
    mockUserRepository.findById.mockResolvedValueOnce(workerUser);
    const oversizedBuffer = Buffer.alloc(2 * 1024 * 1024 + 1);

    await expect(
      useCase.execute({
        userId: workerUser.id,
        buffer: oversizedBuffer,
        mimetype: 'image/jpeg',
        size: oversizedBuffer.length,
      }),
    ).rejects.toThrow(BadRequestException);

    expect(mockFileStorageService.uploadFile).not.toHaveBeenCalled();
  });
});
