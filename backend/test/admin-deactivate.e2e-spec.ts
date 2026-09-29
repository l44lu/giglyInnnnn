import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';
import { Role } from '../src/domain/enums/role.enum';
import { Server } from 'http';
import cookieParser from 'cookie-parser';
import * as crypto from 'crypto';
import { configureTrustProxy } from '../src/presentation/proxy/trust-proxy.config';

describe('Admin User Deactivation PATCH /admin/users/:userId/deactivate (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let configService: ConfigService;
  let prismaService: PrismaService;
  let httpServer: Server;

  // Real users loaded from current database
  let adminUser: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: { code: string };
  };
  let workerUser: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: { code: string };
  };
  let recruiterUser: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: { code: string };
  };

  // Snapshots for invariant verification and defensive cleanup
  let initialUserCount: number;
  let initialUserStateMap: Map<
    string,
    {
      role: string;
      isBlocked: boolean;
      isActive: boolean;
      email: string;
      firstName: string;
      lastName: string;
    }
  >;

  const createAuthCookie = (user: {
    id: string;
    email: string;
    role: { code: string };
  }): string => {
    const token = jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role.code,
      },
      { secret: configService.get<string>('JWT_SECRET') },
    );
    return `access_token=${token}`;
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    configService = app.get<ConfigService>(ConfigService);
    configureTrustProxy(app, configService);
    await app.init();

    jwtService = app.get<JwtService>(JwtService);
    prismaService = app.get<PrismaService>(PrismaService);
    httpServer = app.getHttpServer() as Server;

    // Snapshot existing database state
    const allUsers = await prismaService.user.findMany({
      include: { role: true },
    });
    initialUserCount = allUsers.length;
    initialUserStateMap = new Map();
    for (const u of allUsers) {
      initialUserStateMap.set(u.id, {
        role: u.role.code,
        isBlocked: u.isBlocked,
        isActive: u.isActive,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
      });
    }

    const foundAdmin = allUsers.find((u) => u.role.code === Role.ADMIN);
    const foundWorker = allUsers.find((u) => u.role.code === Role.WORKER);
    const foundRecruiter = allUsers.find((u) => u.role.code === Role.RECRUITER);

    expect(foundAdmin).toBeDefined();
    expect(foundWorker).toBeDefined();
    expect(foundRecruiter).toBeDefined();

    adminUser = foundAdmin!;
    workerUser = foundWorker!;
    recruiterUser = foundRecruiter!;
  });

  afterAll(async () => {
    // Definitive safety restoration: ensure every single user has their exact original state restored
    if (initialUserStateMap && prismaService) {
      for (const [userId, originalState] of initialUserStateMap.entries()) {
        await prismaService.user.update({
          where: { id: userId },
          data: {
            isBlocked: originalState.isBlocked,
            isActive: originalState.isActive,
            role: {
              connect: { code: originalState.role },
            },
          },
        });
      }
    }
    if (app) {
      await app.close();
    }
  });

  describe('1. AUTHENTICATION BOUNDARY', () => {
    it('PATCH /admin/users/:userId/deactivate without cookies -> 401 Unauthorized', async () => {
      const res = await request(httpServer).patch(
        `/admin/users/${workerUser.id}/deactivate`,
      );

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Authentication token is missing');

      // Verify no DB change
      const dbUser = await prismaService.user.findUnique({
        where: { id: workerUser.id },
      });
      expect(dbUser!.isActive).toBe(true);
    });

    it('PATCH /admin/users/:userId/deactivate with invalid/tampered cookie -> 401 Unauthorized', async () => {
      const res = await request(httpServer)
        .patch(`/admin/users/${workerUser.id}/deactivate`)
        .set('Cookie', ['access_token=tampered.invalid.jwt']);

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid or expired token');

      // Verify no DB change
      const dbUser = await prismaService.user.findUnique({
        where: { id: workerUser.id },
      });
      expect(dbUser!.isActive).toBe(true);
    });
  });

  describe('2. ROLE AUTHORIZATION (RBAC FORBIDDEN)', () => {
    it('PATCH /admin/users/:userId/deactivate with WORKER session -> 403 Forbidden (no DB mutation)', async () => {
      const workerCookie = createAuthCookie(workerUser);

      const res = await request(httpServer)
        .patch(`/admin/users/${recruiterUser.id}/deactivate`)
        .set('Cookie', [workerCookie]);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Forbidden resource');

      // Direct PostgreSQL check: target user isActive must remain unchanged
      const dbUser = await prismaService.user.findUnique({
        where: { id: recruiterUser.id },
      });
      expect(dbUser!.isActive).toBe(true);
      expect(dbUser!.isBlocked).toBe(false);
    });

    it('PATCH /admin/users/:userId/deactivate with RECRUITER session -> 403 Forbidden (no DB mutation)', async () => {
      const recruiterCookie = createAuthCookie(recruiterUser);

      const res = await request(httpServer)
        .patch(`/admin/users/${workerUser.id}/deactivate`)
        .set('Cookie', [recruiterCookie]);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Forbidden resource');

      // Direct PostgreSQL check: target user isActive must remain unchanged
      const dbUser = await prismaService.user.findUnique({
        where: { id: workerUser.id },
      });
      expect(dbUser!.isActive).toBe(true);
      expect(dbUser!.isBlocked).toBe(false);
    });

    it('PATCH /admin/users/:userId/deactivate with ADMIN session -> allowed through guards', async () => {
      const adminCookie = createAuthCookie(adminUser);
      const targetId = workerUser.id;

      try {
        const res = await request(httpServer)
          .patch(`/admin/users/${targetId}/deactivate`)
          .set('Cookie', [adminCookie]);

        expect(res.status).toBe(200);
        expect(res.body.isActive).toBe(false);
      } finally {
        await prismaService.user.update({
          where: { id: targetId },
          data: { isActive: true },
        });
      }
    });
  });

  describe('3. REAL DEACTIVATION OPERATION & POSTGRESQL VERIFICATION', () => {
    it('deactivates a WORKER user successfully and verifies database state and profile preservation', async () => {
      const adminCookie = createAuthCookie(adminUser);
      const targetId = workerUser.id;

      // Profile snapshot before deactivation
      const preUser = await prismaService.user.findUnique({
        where: { id: targetId },
        include: { role: true },
      });
      expect(preUser!.isActive).toBe(true);
      expect(preUser!.isBlocked).toBe(false);

      try {
        // Request without body
        const res = await request(httpServer)
          .patch(`/admin/users/${targetId}/deactivate`)
          .set('Cookie', [adminCookie]);

        expect(res.status).toBe(200);
        expect(res.body.id).toBe(targetId);
        expect(res.body.isActive).toBe(false);
        expect(res.body.isBlocked).toBe(preUser!.isBlocked);
        expect(res.body.role).toBe(Role.WORKER);
        expect(res.body.email).toBe(preUser!.email);
        expect(res.body.firstName).toBe(preUser!.firstName);
        expect(res.body.lastName).toBe(preUser!.lastName);

        // Verify direct in PostgreSQL
        const dbUser = await prismaService.user.findUnique({
          where: { id: targetId },
          include: { role: true },
        });
        expect(dbUser).toBeDefined();
        expect(dbUser!.isActive).toBe(false);
        expect(dbUser!.isBlocked).toBe(false);
        expect(dbUser!.role.code).toBe(Role.WORKER);
        expect(dbUser!.email).toBe(preUser!.email);
        expect(dbUser!.firstName).toBe(preUser!.firstName);
        expect(dbUser!.lastName).toBe(preUser!.lastName);
        expect(dbUser!.phone).toBe(preUser!.phone);
        expect(dbUser!.location).toBe(preUser!.location);
        expect(dbUser!.bio).toBe(preUser!.bio);
      } finally {
        // Guaranteed restoration
        await prismaService.user.update({
          where: { id: targetId },
          data: { isActive: true },
        });
        const restoredUser = await prismaService.user.findUnique({
          where: { id: targetId },
        });
        expect(restoredUser!.isActive).toBe(true);
      }
    });

    it('deactivates a RECRUITER user successfully and verifies database state and profile preservation', async () => {
      const adminCookie = createAuthCookie(adminUser);
      const targetId = recruiterUser.id;

      const preUser = await prismaService.user.findUnique({
        where: { id: targetId },
        include: { role: true },
      });
      expect(preUser!.isActive).toBe(true);
      expect(preUser!.isBlocked).toBe(false);

      try {
        const res = await request(httpServer)
          .patch(`/admin/users/${targetId}/deactivate`)
          .set('Cookie', [adminCookie]);

        expect(res.status).toBe(200);
        expect(res.body.id).toBe(targetId);
        expect(res.body.isActive).toBe(false);
        expect(res.body.isBlocked).toBe(preUser!.isBlocked);
        expect(res.body.role).toBe(Role.RECRUITER);
        expect(res.body.email).toBe(preUser!.email);
        expect(res.body.firstName).toBe(preUser!.firstName);
        expect(res.body.lastName).toBe(preUser!.lastName);

        // Verify direct in PostgreSQL
        const dbUser = await prismaService.user.findUnique({
          where: { id: targetId },
          include: { role: true },
        });
        expect(dbUser).toBeDefined();
        expect(dbUser!.isActive).toBe(false);
        expect(dbUser!.isBlocked).toBe(false);
        expect(dbUser!.role.code).toBe(Role.RECRUITER);
        expect(dbUser!.email).toBe(preUser!.email);
        expect(dbUser!.firstName).toBe(preUser!.firstName);
        expect(dbUser!.lastName).toBe(preUser!.lastName);
        expect(dbUser!.phone).toBe(preUser!.phone);
        expect(dbUser!.location).toBe(preUser!.location);
        expect(dbUser!.bio).toBe(preUser!.bio);
      } finally {
        await prismaService.user.update({
          where: { id: targetId },
          data: { isActive: true },
        });
        const restoredUser = await prismaService.user.findUnique({
          where: { id: targetId },
        });
        expect(restoredUser!.isActive).toBe(true);
      }
    });
  });

  describe('4. REFRESH TOKEN REVOCATION & SESSION INVALIDATION', () => {
    it('revokes all active refresh tokens when user is deactivated, rejecting subsequent refresh attempts with 401', async () => {
      const adminCookie = createAuthCookie(adminUser);
      const targetId = workerUser.id;

      // 1. Establish an active refresh token session for the target worker in PostgreSQL
      const rawRefreshToken = jwtService.sign(
        { sub: targetId },
        {
          secret: configService.get<string>('JWT_REFRESH_SECRET'),
          expiresIn: '7d',
        },
      );
      const tokenHash = crypto
        .createHash('sha256')
        .update(rawRefreshToken)
        .digest('hex');
      const familyId = crypto.randomUUID();

      await prismaService.refreshToken.create({
        data: {
          token: tokenHash,
          userId: targetId,
          familyId,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          revokedAt: null,
        },
      });

      try {
        // 2. Before deactivation: verify refresh token is accepted and rotated successfully
        const preDeactivateRefreshRes = await request(httpServer)
          .post('/auth/refresh')
          .set('Cookie', [`refresh_token=${rawRefreshToken}`]);

        expect(preDeactivateRefreshRes.status).toBe(201);
        const setCookieHeader = preDeactivateRefreshRes.headers[
          'set-cookie'
        ] as unknown;
        const cookieArray = Array.isArray(setCookieHeader)
          ? setCookieHeader
          : [String(setCookieHeader)];
        const newRefreshCookie = cookieArray.find((c) =>
          c.startsWith('refresh_token='),
        );
        expect(newRefreshCookie).toBeDefined();

        const activeRawRefreshToken = newRefreshCookie!
          .split(';')[0]
          .replace('refresh_token=', '');

        // 3. Admin deactivates the target user
        const deactivateRes = await request(httpServer)
          .patch(`/admin/users/${targetId}/deactivate`)
          .set('Cookie', [adminCookie]);
        expect(deactivateRes.status).toBe(200);

        // 4. Directly verify PostgreSQL: all refresh tokens for target user now have revokedAt !== null
        const activeTokensCount = await prismaService.refreshToken.count({
          where: {
            userId: targetId,
            revokedAt: null,
          },
        });
        expect(activeTokensCount).toBe(0);

        // 5. After deactivation: attempting to refresh with the token must fail with 401 Unauthorized
        const postDeactivateRefreshRes = await request(httpServer)
          .post('/auth/refresh')
          .set('Cookie', [`refresh_token=${activeRawRefreshToken}`]);

        expect(postDeactivateRefreshRes.status).toBe(401);
      } finally {
        // Cleanup created refresh tokens for this test
        await prismaService.refreshToken.deleteMany({
          where: { userId: targetId },
        });

        // Restore worker to active
        await prismaService.user.update({
          where: { id: targetId },
          data: { isActive: true },
        });
      }
    });
  });

  describe('5. EXISTING ACCESS TOKEN INVALIDATION ON PROTECTED ENDPOINTS', () => {
    it('immediately rejects access token for protected requests after account is deactivated', async () => {
      const adminCookie = createAuthCookie(adminUser);
      const targetId = workerUser.id;
      const targetWorkerCookie = createAuthCookie(workerUser);

      try {
        // 1. Before deactivation: worker accesses protected endpoint /auth/me -> 200 OK
        const preDeactivateAccess = await request(httpServer)
          .get('/auth/me')
          .set('Cookie', [targetWorkerCookie]);
        expect(preDeactivateAccess.status).toBe(200);
        expect(preDeactivateAccess.body.id).toBe(targetId);

        // 2. Admin deactivates the worker
        const deactivateRes = await request(httpServer)
          .patch(`/admin/users/${targetId}/deactivate`)
          .set('Cookie', [adminCookie]);
        expect(deactivateRes.status).toBe(200);

        // 3. Worker uses the EXACT SAME existing access token -> 401 Unauthorized
        const postDeactivateAccess = await request(httpServer)
          .get('/auth/me')
          .set('Cookie', [targetWorkerCookie]);
        expect(postDeactivateAccess.status).toBe(401);
        expect(postDeactivateAccess.body.message).toBe(
          'User account is inactive or blocked',
        );

        // 4. Target account restored to active
        await prismaService.user.update({
          where: { id: targetId },
          data: { isActive: true },
        });

        // 5. Worker uses the same access token again -> 200 OK restored
        const postRestoreAccess = await request(httpServer)
          .get('/auth/me')
          .set('Cookie', [targetWorkerCookie]);
        expect(postRestoreAccess.status).toBe(200);
        expect(postRestoreAccess.body.id).toBe(targetId);
      } finally {
        await prismaService.user.update({
          where: { id: targetId },
          data: { isActive: true },
        });
      }
    });
  });

  describe('6. SELF-DEACTIVATION PROTECTION THROUGH HTTP', () => {
    it('Admin attempting to deactivate own account -> 403 Forbidden (no DB mutation)', async () => {
      const adminCookie = createAuthCookie(adminUser);

      const res = await request(httpServer)
        .patch(`/admin/users/${adminUser.id}/deactivate`)
        .set('Cookie', [adminCookie]);

      expect(res.status).toBe(403);
      expect(res.body.message).toBe(
        'Admins cannot deactivate their own account',
      );

      // Direct PostgreSQL check: Admin's isActive remains true and isBlocked remains false
      const dbAdmin = await prismaService.user.findUnique({
        where: { id: adminUser.id },
      });
      expect(dbAdmin!.isActive).toBe(true);
      expect(dbAdmin!.isBlocked).toBe(false);
    });
  });

  describe('7. NON-EXISTENT TARGET USER', () => {
    it('PATCH /admin/users/:userId/deactivate for nonexistent UUID -> 404 Not Found', async () => {
      const adminCookie = createAuthCookie(adminUser);

      const res = await request(httpServer)
        .patch('/admin/users/00000000-0000-0000-0000-000000000000/deactivate')
        .set('Cookie', [adminCookie]);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('User not found');

      // Total user count unchanged
      const currentCount = await prismaService.user.count();
      expect(currentCount).toBe(initialUserCount);
    });
  });

  describe('8. ALREADY-INACTIVE ACCOUNT BEHAVIOR & REAL DATABASE LIMITATION INSPECTION', () => {
    it('inspects database for inactive accounts and verifies limitation without deactivating accounts', async () => {
      const inactiveUsers = await prismaService.user.findMany({
        where: { isActive: false },
      });

      // Report condition: If no inactive user exists in the current database,
      // record that repeated deactivation/no-op on an existing inactive account cannot be tested without manufacturing state.
      expect(inactiveUsers.length).toBe(0);
    });
  });

  describe('9. BLOCKED + INACTIVE COMBINATION INSPECTION & REAL DATABASE LIMITATION', () => {
    it('inspects database for blocked accounts and verifies limitation without mutating accounts', async () => {
      const blockedUsers = await prismaService.user.findMany({
        where: { isBlocked: true },
      });

      // Report condition: If no blocked user exists in the current database,
      // record that deactivating an existing blocked user cannot be tested without manufacturing state.
      expect(blockedUsers.length).toBe(0);
    });
  });

  describe('10. RESPONSE SAFETY', () => {
    it('verifies that sensitive fields are never returned in deactivation responses', async () => {
      const adminCookie = createAuthCookie(adminUser);
      const targetId = workerUser.id;

      try {
        const res = await request(httpServer)
          .patch(`/admin/users/${targetId}/deactivate`)
          .set('Cookie', [adminCookie]);

        expect(res.status).toBe(200);

        // Sensitive fields must NOT exist in the response
        expect(res.body.password).toBeUndefined();
        expect(res.body.passwordHash).toBeUndefined();
        expect(res.body.passWordHash).toBeUndefined();
        expect(res.body.refreshTokens).toBeUndefined();
        expect(res.body.passwordResets).toBeUndefined();
        expect(res.body.resetPasswordToken).toBeUndefined();
        expect(res.body.otp).toBeUndefined();
        expect(res.body.verificationToken).toBeUndefined();

        // Safe fields must be present
        expect(res.body.id).toBe(workerUser.id);
        expect(res.body.email).toBe(workerUser.email);
        expect(res.body.firstName).toBe(workerUser.firstName);
        expect(res.body.lastName).toBe(workerUser.lastName);
        expect(res.body.role).toBe(Role.WORKER);
        expect(res.body.isActive).toBe(false);
        expect(res.body.isBlocked).toBe(false);
        expect(typeof res.body.createdAt).toBe('string');
      } finally {
        await prismaService.user.update({
          where: { id: targetId },
          data: { isActive: true },
        });
      }
    });
  });

  describe('11. DATABASE INTEGRITY & INVARIANT VERIFICATION', () => {
    it('verifies that no users were created, deleted, and all initial fields match exactly', async () => {
      const finalCount = await prismaService.user.count();
      expect(finalCount).toBe(initialUserCount);

      const allUsers = await prismaService.user.findMany({
        include: { role: true },
      });
      expect(allUsers.length).toBe(initialUserCount);

      for (const u of allUsers) {
        const expected = initialUserStateMap.get(u.id);
        expect(expected).toBeDefined();
        expect(u.role.code).toBe(expected!.role);
        expect(u.isBlocked).toBe(expected!.isBlocked);
        expect(u.isActive).toBe(expected!.isActive);
        expect(u.email).toBe(expected!.email);
        expect(u.firstName).toBe(expected!.firstName);
        expect(u.lastName).toBe(expected!.lastName);
      }
    });
  });
});
