import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { UpdateWorkerPersonalProfileUseCase } from './update-worker-personal-profile.use-case';
import { IUserRepository } from '../../../../domain/repositories/user.repository.interface';
import { UserEntities, Role } from '../../../../domain/entities/user.entities';
import { UpdateWorkerPersonalProfileInputDto } from '../../../dto/worker-profile/update-worker-personal-profile-input.dto';

describe('UpdateWorkerPersonalProfileUseCase', () => {
  let useCase: UpdateWorkerPersonalProfileUseCase;
  let mockUserRepository: jest.Mocked<IUserRepository>;

  const baseWorker = new UserEntities({
    id: 'worker-123',
    email: 'worker@example.com',
    passWordHash: 'hashed-secret',
    role: Role.WORKER,
    firstName: 'Hari',
    lastName: 'Haa',
    phone: null,
    location: null,
    bio: null,
    avatarUrl: 'avatars/worker/worker-123/avatar.png',
    isActive: true,
    isBlocked: false,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  });

  beforeEach(() => {
    mockUserRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      updatePassword: jest.fn(),
    };

    useCase = new UpdateWorkerPersonalProfileUseCase(mockUserRepository);
  });

  it('should successfully update all personal fields for a valid worker', async () => {
    mockUserRepository.findById.mockResolvedValueOnce(baseWorker);

    const updatedEntity = new UserEntities({
      ...baseWorker,
      firstName: 'Harikrishnan',
      lastName: 'Nair',
      phone: '+919876543210',
      location: 'Kochi, Kerala',
      bio: 'Experienced full stack developer specializing in NestJS and React.',
    });
    mockUserRepository.update.mockResolvedValueOnce(updatedEntity);

    const dto: UpdateWorkerPersonalProfileInputDto = {
      firstName: ' Harikrishnan ',
      lastName: ' Nair ',
      phone: ' +919876543210 ',
      location: ' Kochi, Kerala ',
      bio: ' Experienced full stack developer specializing in NestJS and React. ',
    };

    const result = await useCase.execute('worker-123', dto);

    expect(mockUserRepository.findById).toHaveBeenCalledWith('worker-123');
    expect(mockUserRepository.update).toHaveBeenCalledWith('worker-123', {
      firstName: 'Harikrishnan',
      lastName: 'Nair',
      phone: '+919876543210',
      location: 'Kochi, Kerala',
      bio: 'Experienced full stack developer specializing in NestJS and React.',
    });

    expect(result.id).toBe('worker-123');
    expect(result.email).toBe('worker@example.com');
    expect(result.firstName).toBe('Harikrishnan');
    expect(result.lastName).toBe('Nair');
    expect(result.phone).toBe('+919876543210');
    expect(result.location).toBe('Kochi, Kerala');
    expect(result.bio).toBe(
      'Experienced full stack developer specializing in NestJS and React.',
    );
    expect(result.avatarUrl).toBe('/worker/profile/avatar');
  });

  it('should perform partial updates with only supplied fields', async () => {
    mockUserRepository.findById.mockResolvedValueOnce(baseWorker);

    const updatedEntity = new UserEntities({
      ...baseWorker,
      firstName: 'Harikrishnan',
    });
    mockUserRepository.update.mockResolvedValueOnce(updatedEntity);

    const dto: UpdateWorkerPersonalProfileInputDto = {
      firstName: 'Harikrishnan',
    };

    const result = await useCase.execute('worker-123', dto);

    expect(mockUserRepository.update).toHaveBeenCalledWith('worker-123', {
      firstName: 'Harikrishnan',
    });
    expect(result.firstName).toBe('Harikrishnan');
  });

  it('should allow clearing phone by setting it to null', async () => {
    const userWithPhone = new UserEntities({
      ...baseWorker,
      phone: '+1234567890',
    });
    mockUserRepository.findById.mockResolvedValueOnce(userWithPhone);

    const updatedEntity = new UserEntities({
      ...userWithPhone,
      phone: null,
    });
    mockUserRepository.update.mockResolvedValueOnce(updatedEntity);

    const dto: UpdateWorkerPersonalProfileInputDto = {
      phone: null,
    };

    await useCase.execute('worker-123', dto);

    expect(mockUserRepository.update).toHaveBeenCalledWith('worker-123', {
      phone: null,
    });
  });

  it('should allow clearing location by setting it to null', async () => {
    const userWithLoc = new UserEntities({
      ...baseWorker,
      location: 'New York',
    });
    mockUserRepository.findById.mockResolvedValueOnce(userWithLoc);

    const updatedEntity = new UserEntities({
      ...userWithLoc,
      location: null,
    });
    mockUserRepository.update.mockResolvedValueOnce(updatedEntity);

    const dto: UpdateWorkerPersonalProfileInputDto = {
      location: null,
    };

    await useCase.execute('worker-123', dto);

    expect(mockUserRepository.update).toHaveBeenCalledWith('worker-123', {
      location: null,
    });
  });

  it('should allow clearing bio by setting it to null', async () => {
    const userWithBio = new UserEntities({
      ...baseWorker,
      bio: 'A brief bio',
    });
    mockUserRepository.findById.mockResolvedValueOnce(userWithBio);

    const updatedEntity = new UserEntities({
      ...userWithBio,
      bio: null,
    });
    mockUserRepository.update.mockResolvedValueOnce(updatedEntity);

    const dto: UpdateWorkerPersonalProfileInputDto = {
      bio: null,
    };

    await useCase.execute('worker-123', dto);

    expect(mockUserRepository.update).toHaveBeenCalledWith('worker-123', {
      bio: null,
    });
  });

  it('should throw NotFoundException when user does not exist', async () => {
    mockUserRepository.findById.mockResolvedValueOnce(null);

    await expect(
      useCase.execute('non-existent-user', { firstName: 'Jane' }),
    ).rejects.toThrow(NotFoundException);

    expect(mockUserRepository.update).not.toHaveBeenCalled();
  });

  it('should throw ForbiddenException when caller is not a WORKER (e.g. RECRUITER)', async () => {
    const recruiterUser = new UserEntities({
      ...baseWorker,
      id: 'recruiter-456',
      role: Role.RECRUITER,
    });
    mockUserRepository.findById.mockResolvedValueOnce(recruiterUser);

    await expect(
      useCase.execute('recruiter-456', { firstName: 'Jane' }),
    ).rejects.toThrow(ForbiddenException);

    expect(mockUserRepository.update).not.toHaveBeenCalled();
  });

  it('should throw ForbiddenException when caller is an ADMIN', async () => {
    const adminUser = new UserEntities({
      ...baseWorker,
      id: 'admin-789',
      role: Role.ADMIN,
    });
    mockUserRepository.findById.mockResolvedValueOnce(adminUser);

    await expect(
      useCase.execute('admin-789', { firstName: 'Jane' }),
    ).rejects.toThrow(ForbiddenException);

    expect(mockUserRepository.update).not.toHaveBeenCalled();
  });
});
