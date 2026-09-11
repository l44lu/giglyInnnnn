import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { IUserRepository } from '../../../../domain/repositories/user.repository.interface';
import { UserEntities } from '../../../../domain/entities/user.entities';
import { GetMeUseCase } from './get-me.use-case';
import { Role } from '@prisma/client';

describe('GetMeUseCase', () => {
  let useCase: GetMeUseCase;
  let userRepository: jest.Mocked<IUserRepository>;

  beforeEach(() => {
    userRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      create: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      updatePassword: jest.fn(),
    };

    useCase = new GetMeUseCase(userRepository);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });
  // ithil illa korch dummy data testingin vechathan dayav cheyth marakarth ≡(▔﹏▔)≡
  it('should return UserResponseDto with ADMIN role when user is found', async () => {
    const mockUser = new UserEntities({
      id: 'admin-uuid-1',
      email: 'admin@gigly.com',
      passWordHash: '$2b$10$verysecretpasswordhash',
      role: Role.ADMIN,
      firstName: 'Sarah',
      lastName: 'Jenkins',
      createdAt: new Date('2026-01-01'),
    });

    userRepository.findById.mockResolvedValue(mockUser);

    const result = await useCase.execute('admin-uuid-1');

    expect(result).toEqual({
      id: 'admin-uuid-1',
      email: 'admin@gigly.com',
      role: Role.ADMIN,
      firstName: 'Sarah',
      lastName: 'Jenkins',
      createdAt: new Date('2026-01-01'),
    });
    expect(
      (result as unknown as Record<string, unknown>).passWordHash,
    ).toBeUndefined();
    expect(
      (result as unknown as Record<string, unknown>).passwordHash,
    ).toBeUndefined();
  });

  it('should return UserResponseDto with WORKER role', async () => {
    const mockUser = new UserEntities({
      id: 'worker-uuid-2',
      email: 'alex@gigly.com',
      passWordHash: '$2b$10$hashedsecret',
      role: Role.WORKER,
      firstName: 'Alex',
      lastName: 'Johnson',
      createdAt: new Date('2026-02-01'),
    });

    userRepository.findById.mockResolvedValue(mockUser);

    const result = await useCase.execute('worker-uuid-2');

    expect(result.role).toBe(Role.WORKER);
    expect(result.id).toBe('worker-uuid-2');
  });

  it('should return UserResponseDto with RECRUITER role', async () => {
    const mockUser = new UserEntities({
      id: 'recruiter-uuid-3',
      email: 'recruiter@gigly.com',
      passWordHash: '$2b$10$hashedsecret',
      role: Role.RECRUITER,
      firstName: 'Emma',
      lastName: 'Watson',
      createdAt: new Date('2026-03-01'),
    });

    userRepository.findById.mockResolvedValue(mockUser);

    const result = await useCase.execute('recruiter-uuid-3');

    expect(result.role).toBe(Role.RECRUITER);
    expect(result.id).toBe('recruiter-uuid-3');
  });

  it('should throw NotFoundException if user is not found in database', async () => {
    userRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('non-existent-id')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should throw UnauthorizedException if user is blocked', async () => {
    const mockUser = new UserEntities({
      id: 'blocked-uuid',
      email: 'blocked@gigly.com',
      passWordHash: '$2b$10$hashedsecret',
      role: Role.WORKER,
      firstName: 'Blocked',
      lastName: 'User',
      isActive: true,
      isBlocked: true,
      createdAt: new Date(),
    });

    userRepository.findById.mockResolvedValue(mockUser);

    await expect(useCase.execute('blocked-uuid')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should throw UnauthorizedException if user is inactive', async () => {
    const mockUser = new UserEntities({
      id: 'inactive-uuid',
      email: 'inactive@gigly.com',
      passWordHash: '$2b$10$hashedsecret',
      role: Role.WORKER,
      firstName: 'Inactive',
      lastName: 'User',
      isActive: false,
      isBlocked: false,
      createdAt: new Date(),
    });

    userRepository.findById.mockResolvedValue(mockUser);

    await expect(useCase.execute('inactive-uuid')).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
