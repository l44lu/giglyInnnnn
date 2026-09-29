import { ListAdminUserUseCase } from './list-admin-users.use-case';
import { IUserRepository } from '../../../../domain/repositories/user.repository.interface';
import { UserEntities, Role } from '../../../../domain/entities/user.entities';
import { AdminUserResponseDto } from '../../../../application/dto/admin-user-management/admin-user.response.dto';

describe('ListAdminUserUseCase', () => {
  let useCase: ListAdminUserUseCase;
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

    useCase = new ListAdminUserUseCase(userRepository);
  });

  // Test 1 — repository interaction
  it('should call IUserRepository.findAll() exactly once', async () => {
    userRepository.findAll.mockResolvedValue([]);

    await useCase.execute();

    expect(userRepository.findAll).toHaveBeenCalledTimes(1);
  });

  // Test 2 — returns all users
  it('should return all users mapped to AdminUserResponseDto', async () => {
    const mockUsers = [
      new UserEntities({
        id: '1',
        email: 'user1@test.com',
        firstName: 'A',
        lastName: 'B',
        role: Role.WORKER,
      }),
      new UserEntities({
        id: '2',
        email: 'user2@test.com',
        firstName: 'C',
        lastName: 'D',
        role: Role.RECRUITER,
      }),
      new UserEntities({
        id: '3',
        email: 'user3@test.com',
        firstName: 'E',
        lastName: 'F',
        role: Role.WORKER,
      }),
    ];

    userRepository.findAll.mockResolvedValue(mockUsers);

    const result = await useCase.execute();

    expect(result).toHaveLength(3);
    result.forEach((dto) => {
      expect(dto).toBeInstanceOf(AdminUserResponseDto);
    });
  });

  // Test 3 — data mapping
  it('should preserve all relevant data fields in mapping', async () => {
    const mockDate = new Date('2026-01-01T00:00:00.000Z');
    const mockUser = new UserEntities({
      id: 'uuid-123',
      email: 'map@test.com',
      firstName: 'John',
      lastName: 'Doe',
      phone: '+1234567890',
      location: 'New York',
      bio: 'Developer',
      role: Role.WORKER,
      createdAt: mockDate,
    });

    userRepository.findAll.mockResolvedValue([mockUser]);

    const result = await useCase.execute();
    const dto = result[0];

    expect(dto.id).toEqual('uuid-123');
    expect(dto.email).toEqual('map@test.com');
    expect(dto.firstName).toEqual('John');
    expect(dto.lastName).toEqual('Doe');
    expect(dto.phone).toEqual('+1234567890');
    expect(dto.location).toEqual('New York');
    expect(dto.bio).toEqual('Developer');
    expect(dto.role).toEqual(Role.WORKER);
    expect(dto.createdAt).toEqual(mockDate);
  });

  // Test 4 — account state
  it('should accurately map isActive and isBlocked states', async () => {
    const userA = new UserEntities({
      id: 'A',
      email: 'a@test.com',
      isActive: true,
      isBlocked: false,
    });

    const userB = new UserEntities({
      id: 'B',
      email: 'b@test.com',
      isActive: true,
      isBlocked: true,
    });

    const userC = new UserEntities({
      id: 'C',
      email: 'c@test.com',
      isActive: false,
      isBlocked: false,
    });

    userRepository.findAll.mockResolvedValue([userA, userB, userC]);

    const result = await useCase.execute();

    expect(result[0].isActive).toBe(true);
    expect(result[0].isBlocked).toBe(false);

    expect(result[1].isActive).toBe(true);
    expect(result[1].isBlocked).toBe(true);

    expect(result[2].isActive).toBe(false);
    expect(result[2].isBlocked).toBe(false);
  });

  // Test 5 — sensitive data is not exposed
  it('should not expose passWordHash in the mapped DTO', async () => {
    const mockUser = new UserEntities({
      id: 'secret-user',
      email: 'secret@test.com',
      passWordHash: 'SUPER_SECRET_HASH',
    });

    userRepository.findAll.mockResolvedValue([mockUser]);

    const result = await useCase.execute();
    const dto = result[0] as any; // Cast to any to check for absence of property

    expect(dto.passWordHash).toBeUndefined();
  });

  // Test 6 — empty result
  it('should return an empty array when repository returns empty array', async () => {
    userRepository.findAll.mockResolvedValue([]);

    const result = await useCase.execute();

    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
  });
});
