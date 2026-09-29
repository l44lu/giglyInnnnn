import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { GetRecruiterAvatarUseCase } from './get-recruiter-avatar.use-case';
import { IUserRepository } from '../../../../domain/repositories/user.repository.interface';
import { IFileStorageService } from '../../../../domain/services/file-storage.service.interface';
import { UserEntities } from '../../../../domain/entities/user.entities';
import { Role } from '../../../../domain/enums/role.enum';

describe('GetRecruiterAvatarUseCase', () => {
  let useCase: GetRecruiterAvatarUseCase;
  let mockUserRepository: jest.Mocked<IUserRepository>;
  let mockFileStorageService: jest.Mocked<IFileStorageService>;

  const recruiterUserWithAvatar = new UserEntities({
    id: 'recruiter-123',
    email: 'recruiter@example.com',
    role: Role.RECRUITER,
    firstName: 'Alex',
    lastName: 'Recruiter',
    avatarUrl: 'avatars/recruiter/recruiter-123/image.webp',
  });

  const recruiterUserWithoutAvatar = new UserEntities({
    id: 'recruiter-no-avatar',
    email: 'noavatar@example.com',
    role: Role.RECRUITER,
    firstName: 'No',
    lastName: 'Avatar',
    avatarUrl: null,
  });

  const workerUser = new UserEntities({
    id: 'worker-456',
    email: 'worker@example.com',
    role: Role.WORKER,
    firstName: 'Jane',
    lastName: 'Worker',
    avatarUrl: 'avatars/worker/img.png',
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

    useCase = new GetRecruiterAvatarUseCase(
      mockUserRepository,
      mockFileStorageService,
    );
  });

  it('should return avatar buffer and contentType for valid recruiter with avatar', async () => {
    mockUserRepository.findById.mockResolvedValue(recruiterUserWithAvatar);
    const mockFileResult = {
      buffer: Buffer.from('fake-image-bytes'),
      contentType: 'image/webp',
    };
    mockFileStorageService.getFile.mockResolvedValue(mockFileResult);

    const result = await useCase.execute('recruiter-123');

    expect(mockUserRepository.findById).toHaveBeenCalledWith('recruiter-123');
    expect(mockFileStorageService.getFile).toHaveBeenCalledWith(
      'avatars/recruiter/recruiter-123/image.webp',
    );
    expect(result).toEqual(mockFileResult);
  });

  it('should throw NotFoundException if user not found', async () => {
    mockUserRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('unknown-user')).rejects.toThrow(
      NotFoundException,
    );
    expect(mockFileStorageService.getFile).not.toHaveBeenCalled();
  });

  it('should throw ForbiddenException if user is not a RECRUITER', async () => {
    mockUserRepository.findById.mockResolvedValue(workerUser);

    await expect(useCase.execute('worker-456')).rejects.toThrow(
      ForbiddenException,
    );
    expect(mockFileStorageService.getFile).not.toHaveBeenCalled();
  });

  it('should throw NotFoundException if recruiter has no avatar set', async () => {
    mockUserRepository.findById.mockResolvedValue(recruiterUserWithoutAvatar);

    await expect(useCase.execute('recruiter-no-avatar')).rejects.toThrow(
      NotFoundException,
    );
    expect(mockFileStorageService.getFile).not.toHaveBeenCalled();
  });
});
