import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { GetWorkerAvatarUseCase } from './get-worker-avatar.use-case';
import { IUserRepository } from '../../../../domain/repositories/user.repository.interface';
import { IFileStorageService } from '../../../../domain/services/file-storage.service.interface';
import { UserEntities } from '../../../../domain/entities/user.entities';
import { Role } from '../../../../domain/enums/role.enum';

describe('GetWorkerAvatarUseCase', () => {
  let useCase: GetWorkerAvatarUseCase;
  let mockUserRepository: jest.Mocked<IUserRepository>;
  let mockFileStorageService: jest.Mocked<IFileStorageService>;

  const workerUserWithAvatar = new UserEntities({
    id: 'worker-123',
    email: 'worker@example.com',
    role: Role.WORKER,
    firstName: 'Jane',
    lastName: 'Worker',
    avatarUrl: 'avatars/worker/worker-123/image.webp',
  });

  const workerUserWithoutAvatar = new UserEntities({
    id: 'worker-no-avatar',
    email: 'noavatar@example.com',
    role: Role.WORKER,
    firstName: 'No',
    lastName: 'Avatar',
    avatarUrl: null,
  });

  const recruiterUser = new UserEntities({
    id: 'recruiter-456',
    email: 'recruiter@example.com',
    role: Role.RECRUITER,
    firstName: 'Bob',
    lastName: 'Recruiter',
    avatarUrl: 'avatars/recruiter/img.png',
  });

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

    useCase = new GetWorkerAvatarUseCase(
      mockUserRepository,
      mockFileStorageService,
    );
  });

  it('should retrieve avatar file for authenticated worker', async () => {
    mockUserRepository.findById.mockResolvedValueOnce(workerUserWithAvatar);
    const mockFileResult = {
      buffer: Buffer.from('image-binary'),
      contentType: 'image/webp',
    };
    mockFileStorageService.getFile.mockResolvedValueOnce(mockFileResult);

    const result = await useCase.execute(workerUserWithAvatar.id);

    expect(result).toEqual(mockFileResult);
    expect(mockFileStorageService.getFile).toHaveBeenCalledWith(
      workerUserWithAvatar.avatarUrl,
    );
  });

  it('should throw NotFoundException if user is not found', async () => {
    mockUserRepository.findById.mockResolvedValueOnce(null);

    await expect(useCase.execute('unknown-id')).rejects.toThrow(
      NotFoundException,
    );
    expect(mockFileStorageService.getFile).not.toHaveBeenCalled();
  });

  it('should throw ForbiddenException if user is not a WORKER', async () => {
    mockUserRepository.findById.mockResolvedValueOnce(recruiterUser);

    await expect(useCase.execute(recruiterUser.id)).rejects.toThrow(
      ForbiddenException,
    );
    expect(mockFileStorageService.getFile).not.toHaveBeenCalled();
  });

  it('should throw NotFoundException if worker has no avatar', async () => {
    mockUserRepository.findById.mockResolvedValueOnce(workerUserWithoutAvatar);

    await expect(useCase.execute(workerUserWithoutAvatar.id)).rejects.toThrow(
      NotFoundException,
    );
    expect(mockFileStorageService.getFile).not.toHaveBeenCalled();
  });
});
