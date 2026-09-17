import { PrismaOtpRepository } from './prisma-otp.repository';
import { PrismaService } from '../prisma/prisma.service';
import { OtpEntity } from '../../domain/entities/otp.entity';
import { Role } from '../../domain/enums/role.enum';

describe('PrismaOtpRepository', () => {
  let repository: PrismaOtpRepository;
  let prismaService: jest.Mocked<PrismaService>;

  const createMockOtpRecord = (roleCode: string) => ({
    id: 'otp-uuid-1',
    email: 'test@example.com',
    otp: 'hashed-otp-secret',
    firstName: 'Jane',
    lastName: 'Doe',
    passwordHash: 'hashed-password-123',
    roleId: `role-uuid-${roleCode.toLowerCase()}`,
    attempts: 0,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    createdAt: new Date(),
    role: {
      id: `role-uuid-${roleCode.toLowerCase()}`,
      code: roleCode,
      name: roleCode,
      description: `${roleCode} role`,
      isSystem: true,
      isActive: true,
      isAssignableOnRegistration: roleCode !== 'ADMIN',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  beforeEach(() => {
    prismaService = {
      otp: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        deleteMany: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaService>;

    repository = new PrismaOtpRepository(prismaService);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('findByEmail', () => {
    it('queries database by email with role relation and maps role.code to OtpEntity', async () => {
      const mockOtp = createMockOtpRecord('WORKER');
      (prismaService.otp.findUnique as jest.Mock).mockResolvedValue(mockOtp);

      const result = await repository.findByEmail('test@example.com');

      expect(prismaService.otp.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        include: { role: true },
      });
      expect(result).toBeInstanceOf(OtpEntity);
      expect(result?.id).toBe('otp-uuid-1');
      expect(result?.email).toBe('test@example.com');
      expect(result?.role).toBe(Role.WORKER);
    });

    it('returns null when OTP not found', async () => {
      (prismaService.otp.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await repository.findByEmail('notfound@example.com');

      expect(result).toBeNull();
    });

    it('throws error when OTP record has no role relation', async () => {
      const mockOtpNoRole = {
        ...createMockOtpRecord('WORKER'),
        role: null,
      };
      (prismaService.otp.findUnique as jest.Mock).mockResolvedValue(
        mockOtpNoRole,
      );

      await expect(repository.findByEmail('test@example.com')).rejects.toThrow(
        'OTP record otp-uuid-1 has no associated role or role code',
      );
    });
  });

  describe('create', () => {
    it('creates OTP with WORKER role by connecting role code', async () => {
      const mockOtp = createMockOtpRecord('WORKER');
      (prismaService.otp.create as jest.Mock).mockResolvedValue(mockOtp);

      const expiresAt = new Date();
      const result = await repository.create({
        email: 'worker@example.com',
        otp: 'hashed-otp',
        firstName: 'Jane',
        lastName: 'Worker',
        passwordHash: 'hashed-pass',
        role: Role.WORKER,
        attempts: 0,
        expiresAt,
      });

      expect(prismaService.otp.create).toHaveBeenCalledWith({
        data: {
          email: 'worker@example.com',
          otp: 'hashed-otp',
          firstName: 'Jane',
          lastName: 'Worker',
          passwordHash: 'hashed-pass',
          role: {
            connect: { code: Role.WORKER },
          },
          attempts: 0,
          expiresAt,
        },
        include: { role: true },
      });
      expect(result.role).toBe(Role.WORKER);
    });

    it('creates OTP with RECRUITER role by connecting role code', async () => {
      const mockOtp = createMockOtpRecord('RECRUITER');
      (prismaService.otp.create as jest.Mock).mockResolvedValue(mockOtp);

      const expiresAt = new Date();
      const result = await repository.create({
        email: 'recruiter@example.com',
        otp: 'hashed-otp',
        firstName: 'Jane',
        lastName: 'Recruiter',
        passwordHash: 'hashed-pass',
        role: Role.RECRUITER,
        attempts: 0,
        expiresAt,
      });

      expect(prismaService.otp.create).toHaveBeenCalledWith({
        data: {
          email: 'recruiter@example.com',
          otp: 'hashed-otp',
          firstName: 'Jane',
          lastName: 'Recruiter',
          passwordHash: 'hashed-pass',
          role: {
            connect: { code: Role.RECRUITER },
          },
          attempts: 0,
          expiresAt,
        },
        include: { role: true },
      });
      expect(result.role).toBe(Role.RECRUITER);
    });

    it('creates OTP with ADMIN role when requested', async () => {
      const mockOtp = createMockOtpRecord('ADMIN');
      (prismaService.otp.create as jest.Mock).mockResolvedValue(mockOtp);

      const expiresAt = new Date();
      const result = await repository.create({
        email: 'admin@example.com',
        otp: 'hashed-otp',
        firstName: 'System',
        lastName: 'Admin',
        passwordHash: 'hashed-pass',
        role: Role.ADMIN,
        attempts: 0,
        expiresAt,
      });

      expect(prismaService.otp.create).toHaveBeenCalledWith({
        data: {
          email: 'admin@example.com',
          otp: 'hashed-otp',
          firstName: 'System',
          lastName: 'Admin',
          passwordHash: 'hashed-pass',
          role: {
            connect: { code: Role.ADMIN },
          },
          attempts: 0,
          expiresAt,
        },
        include: { role: true },
      });
      expect(result.role).toBe(Role.ADMIN);
    });

    it('defaults to WORKER role if role is not provided on OTP creation', async () => {
      const mockOtp = createMockOtpRecord('WORKER');
      (prismaService.otp.create as jest.Mock).mockResolvedValue(mockOtp);

      const expiresAt = new Date();
      const result = await repository.create({
        email: 'default@example.com',
        otp: 'hashed-otp',
        firstName: 'Default',
        lastName: 'Worker',
        passwordHash: 'hashed-pass',
        attempts: 0,
        expiresAt,
      });

      expect(prismaService.otp.create).toHaveBeenCalledWith({
        data: {
          email: 'default@example.com',
          otp: 'hashed-otp',
          firstName: 'Default',
          lastName: 'Worker',
          passwordHash: 'hashed-pass',
          role: {
            connect: { code: Role.WORKER },
          },
          attempts: 0,
          expiresAt,
        },
        include: { role: true },
      });
      expect(result.role).toBe(Role.WORKER);
    });
  });

  describe('updateAttempts', () => {
    it('updates attempts and returns mapped OtpEntity with role', async () => {
      const mockOtp = {
        ...createMockOtpRecord('WORKER'),
        attempts: 2,
      };
      (prismaService.otp.update as jest.Mock).mockResolvedValue(mockOtp);

      const result = await repository.updateAttempts('test@example.com', 2);

      expect(prismaService.otp.update).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        data: { attempts: 2 },
        include: { role: true },
      });
      expect(result?.attempts).toBe(2);
      expect(result?.role).toBe(Role.WORKER);
    });

    it('returns null when update fails', async () => {
      (prismaService.otp.update as jest.Mock).mockRejectedValue(
        new Error('DB Error'),
      );

      const result = await repository.updateAttempts('test@example.com', 2);

      expect(result).toBeNull();
    });
  });

  describe('deleteByEmail', () => {
    it('deletes OTP records by email', async () => {
      (prismaService.otp.deleteMany as jest.Mock).mockResolvedValue({
        count: 1,
      });

      await repository.deleteByEmail('test@example.com');

      expect(prismaService.otp.deleteMany).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });
  });
});
