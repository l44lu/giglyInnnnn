import { NotFoundException } from '@nestjs/common';
import { GetAdminUserUseCase } from './get-admin-user.use-case';
import { IUserRepository } from '../../../../domain/repositories/user.repository.interface';
import { UserEntities, Role } from '../../../../domain/entities/user.entities';
import { AdminUserResponseDto } from '../../../../application/dto/admin-user-management/admin-user.response.dto';

describe('GetAdminUserUseCase', () => {
  let useCase: GetAdminUserUseCase;
  let userRepository: jest.Mocked<IUserRepository>;

  beforeEach(() => {
    userRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      updatePassword: jest.fn(),
    };

    useCase = new GetAdminUserUseCase(userRepository);
  });

  it('1. should call userRepository.findById with the correct userId', async () => {
    const mockUser = new UserEntities({
      id: 'target-user-123',
      email: 'target@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: Role.WORKER,
      isActive: true,
      isBlocked: false,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    userRepository.findById.mockResolvedValue(mockUser);

    await useCase.execute('target-user-123');

    expect(userRepository.findById).toHaveBeenCalledTimes(1);
    expect(userRepository.findById).toHaveBeenCalledWith('target-user-123');
  });

  it('2. should return mapped AdminUserResponseDto for an existing user', async () => {
    const mockDate = new Date('2026-01-15T10:00:00.000Z');
    const mockUser = new UserEntities({
      id: 'uuid-456',
      email: 'worker@gigly.com',
      firstName: 'Sarah',
      lastName: 'Connor',
      phone: '+15551234567',
      location: 'Los Angeles, CA',
      bio: 'Cyber security analyst',
      role: Role.WORKER,
      isActive: true,
      isBlocked: false,
      createdAt: mockDate,
    });
    userRepository.findById.mockResolvedValue(mockUser);

    const result = await useCase.execute('uuid-456');

    expect(result).toBeInstanceOf(AdminUserResponseDto);
    expect(result.id).toBe('uuid-456');
    expect(result.email).toBe('worker@gigly.com');
    expect(result.firstName).toBe('Sarah');
    expect(result.lastName).toBe('Connor');
    expect(result.phone).toBe('+15551234567');
    expect(result.location).toBe('Los Angeles, CA');
    expect(result.bio).toBe('Cyber security analyst');
    expect(result.role).toBe(Role.WORKER);
    expect(result.createdAt).toEqual(mockDate);
  });

  it('3. should throw NotFoundException when user does not exist', async () => {
    userRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('nonexistent-uuid')).rejects.toThrow(
      NotFoundException,
    );
    expect(userRepository.findById).toHaveBeenCalledWith('nonexistent-uuid');
  });

  it('4. should accurately map and preserve isActive state', async () => {
    const inactiveUser = new UserEntities({
      id: 'inactive-user',
      email: 'inactive@example.com',
      firstName: 'Bob',
      lastName: 'Inactive',
      role: Role.RECRUITER,
      isActive: false,
      isBlocked: false,
      createdAt: new Date(),
    });
    userRepository.findById.mockResolvedValue(inactiveUser);

    const result = await useCase.execute('inactive-user');

    expect(result.isActive).toBe(false);
    expect(result.isBlocked).toBe(false);
  });

  it('5. should accurately map and preserve isBlocked state', async () => {
    const blockedUser = new UserEntities({
      id: 'blocked-user',
      email: 'blocked@example.com',
      firstName: 'Dave',
      lastName: 'Blocked',
      role: Role.WORKER,
      isActive: true,
      isBlocked: true,
      createdAt: new Date(),
    });
    userRepository.findById.mockResolvedValue(blockedUser);

    const result = await useCase.execute('blocked-user');

    expect(result.isActive).toBe(true);
    expect(result.isBlocked).toBe(true);
  });

  it('6. should not expose passwordHash or passWordHash in the mapped DTO', async () => {
    const sensitiveUser = new UserEntities({
      id: 'sensitive-user',
      email: 'sensitive@example.com',
      firstName: 'Secret',
      lastName: 'Agent',
      role: Role.ADMIN,
      passWordHash: '$2b$10$supersecretargonorbcrypthash',
      isActive: true,
      isBlocked: false,
      createdAt: new Date(),
    });
    userRepository.findById.mockResolvedValue(sensitiveUser);

    const result = (await useCase.execute(
      'sensitive-user',
    )) as unknown as Record<string, unknown>;

    expect(result.passwordHash).toBeUndefined();
    expect(result.passWordHash).toBeUndefined();
    expect(result.password).toBeUndefined();
  });
});
