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

describe('Admin User Block/Unblock PATCH /admin/users/:userId/block (e2e)', () => {
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
    it('PATCH /admin/users/:userId/block without cookies -> 401 Unauthorized', async () => {
      const res = await request(httpServer)
        .patch(`/admin/users/${workerUser.id}/block`)
        .send({ isBlocked: true });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Authentication token is missing');

      // Verify no DB change
      const dbUser = await prismaService.user.findUnique({
        where: { id: workerUser.id },
      });
      expect(dbUser!.isBlocked).toBe(false);
    });

    it('PATCH /admin/users/:userId/block with invalid/tampered cookie -> 401 Unauthorized', async () => {
      const res = await request(httpServer)
        .patch(`/admin/users/${workerUser.id}/block`)
        .set('Cookie', ['access_token=tampered.invalid.jwt'])
        .send({ isBlocked: true });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid or expired token');

      // Verify no DB change
      const dbUser = await prismaService.user.findUnique({
        where: { id: workerUser.id },
      });
      expect(dbUser!.isBlocked).toBe(false);
    });
  });

  describe('2. ROLE AUTHORIZATION (RBAC FORBIDDEN)', () => {
    it('PATCH /admin/users/:userId/block with WORKER session -> 403 Forbidden (no DB mutation)', async () => {
      const workerCookie = createAuthCookie(workerUser);

      const res = await request(httpServer)
        .patch(`/admin/users/${recruiterUser.id}/block`)
        .set('Cookie', [workerCookie])
        .send({ isBlocked: true });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Forbidden resource');

      // Direct PostgreSQL check: target user isBlocked must remain unchanged
      const dbUser = await prismaService.user.findUnique({
        where: { id: recruiterUser.id },
      });
      expect(dbUser!.isBlocked).toBe(false);
    });

    it('PATCH /admin/users/:userId/block with RECRUITER session -> 403 Forbidden (no DB mutation)', async () => {
      const recruiterCookie = createAuthCookie(recruiterUser);

      const res = await request(httpServer)
        .patch(`/admin/users/${workerUser.id}/block`)
        .set('Cookie', [recruiterCookie])
        .send({ isBlocked: true });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Forbidden resource');

      // Direct PostgreSQL check: target user isBlocked must remain unchanged
      const dbUser = await prismaService.user.findUnique({
        where: { id: workerUser.id },
      });
      expect(dbUser!.isBlocked).toBe(false);
    });

    it('PATCH /admin/users/:userId/block with ADMIN session -> allowed through guards', async () => {
      const adminCookie = createAuthCookie(adminUser);

      // Sending same-state no-op to verify pass-through through guards
      const res = await request(httpServer)
        .patch(`/admin/users/${workerUser.id}/block`)
        .set('Cookie', [adminCookie])
        .send({ isBlocked: false });

      expect(res.status).toBe(200);
      expect(res.body.isBlocked).toBe(false);
    });
  });

  describe('3. REAL BLOCK OPERATION & POSTGRESQL VERIFICATION', () => {
    it('blocks a WORKER user successfully and verifies database state', async () => {
      const adminCookie = createAuthCookie(adminUser);
      const targetId = workerUser.id;

      try {
        const res = await request(httpServer)
          .patch(`/admin/users/${targetId}/block`)
          .set('Cookie', [adminCookie])
          .send({ isBlocked: true });

        expect(res.status).toBe(200);
        expect(res.body.id).toBe(targetId);
        expect(res.body.isBlocked).toBe(true);
        expect(res.body.isActive).toBe(true);
        expect(res.body.role).toBe(Role.WORKER);
        expect(res.body.firstName).toBe(workerUser.firstName);
        expect(res.body.lastName).toBe(workerUser.lastName);

        // Verify direct in PostgreSQL
        const dbUser = await prismaService.user.findUnique({
          where: { id: targetId },
          include: { role: true },
        });
        expect(dbUser!.isBlocked).toBe(true);
        expect(dbUser!.isActive).toBe(true);
        expect(dbUser!.role.code).toBe(Role.WORKER);
      } finally {
        // Guaranteed restoration
        await prismaService.user.update({
          where: { id: targetId },
          data: { isBlocked: false },
        });
        const restoredUser = await prismaService.user.findUnique({
          where: { id: targetId },
        });
        expect(restoredUser!.isBlocked).toBe(false);
      }
    });

    it('blocks a RECRUITER user successfully and verifies database state', async () => {
      const adminCookie = createAuthCookie(adminUser);
      const targetId = recruiterUser.id;

      try {
        const res = await request(httpServer)
          .patch(`/admin/users/${targetId}/block`)
          .set('Cookie', [adminCookie])
          .send({ isBlocked: true });

        expect(res.status).toBe(200);
        expect(res.body.id).toBe(targetId);
        expect(res.body.isBlocked).toBe(true);
        expect(res.body.isActive).toBe(true);
        expect(res.body.role).toBe(Role.RECRUITER);

        // Verify direct in PostgreSQL
        const dbUser = await prismaService.user.findUnique({
          where: { id: targetId },
          include: { role: true },
        });
        expect(dbUser!.isBlocked).toBe(true);
        expect(dbUser!.isActive).toBe(true);
        expect(dbUser!.role.code).toBe(Role.RECRUITER);
      } finally {
        // Guaranteed restoration
        await prismaService.user.update({
          where: { id: targetId },
          data: { isBlocked: false },
        });
        const restoredUser = await prismaService.user.findUnique({
          where: { id: targetId },
        });
        expect(restoredUser!.isBlocked).toBe(false);
      }
    });
  });

  describe('4. REFRESH TOKEN REVOCATION & SESSION INVALIDATION', () => {
    it('revokes all active refresh tokens when user is blocked, rejecting subsequent refresh attempts', async () => {
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
        // 2. Before block: verify refresh token is accepted and rotated successfully
        const preBlockRefreshRes = await request(httpServer)
          .post('/auth/refresh')
          .set('Cookie', [`refresh_token=${rawRefreshToken}`]);

        expect(preBlockRefreshRes.status).toBe(201);
        const setCookieHeader = preBlockRefreshRes.headers[
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

        // 3. Admin blocks the target user
        const blockRes = await request(httpServer)
          .patch(`/admin/users/${targetId}/block`)
          .set('Cookie', [adminCookie])
          .send({ isBlocked: true });
        expect(blockRes.status).toBe(200);

        // 4. Directly verify PostgreSQL: all refresh tokens for target user now have revokedAt !== null
        const activeTokensCount = await prismaService.refreshToken.count({
          where: {
            userId: targetId,
            revokedAt: null,
          },
        });
        expect(activeTokensCount).toBe(0);

        // 5. After block: attempting to refresh with the token must fail with 401 Unauthorized
        const postBlockRefreshRes = await request(httpServer)
          .post('/auth/refresh')
          .set('Cookie', [`refresh_token=${activeRawRefreshToken}`]);

        expect(postBlockRefreshRes.status).toBe(401);
      } finally {
        // Cleanup created refresh tokens for this test
        await prismaService.refreshToken.deleteMany({
          where: { userId: targetId },
        });

        // Restore worker to unblocked
        await prismaService.user.update({
          where: { id: targetId },
          data: { isBlocked: false },
        });
      }
    });
  });

  describe('5. EXISTING ACCESS TOKEN INVALIDATION ON PROTECTED ENDPOINTS', () => {
    it('immediately rejects access token for protected requests after account is blocked', async () => {
      const adminCookie = createAuthCookie(adminUser);
      const targetId = workerUser.id;
      const targetWorkerCookie = createAuthCookie(workerUser);

      try {
        // 1. Before block: worker accesses protected endpoint /auth/me -> 200 OK
        const preBlockAccess = await request(httpServer)
          .get('/auth/me')
          .set('Cookie', [targetWorkerCookie]);
        expect(preBlockAccess.status).toBe(200);
        expect(preBlockAccess.body.id).toBe(targetId);

        // 2. Admin blocks the worker
        const blockRes = await request(httpServer)
          .patch(`/admin/users/${targetId}/block`)
          .set('Cookie', [adminCookie])
          .send({ isBlocked: true });
        expect(blockRes.status).toBe(200);

        // 3. Worker uses the EXACT SAME existing access token -> 401 Unauthorized
        const postBlockAccess = await request(httpServer)
          .get('/auth/me')
          .set('Cookie', [targetWorkerCookie]);
        expect(postBlockAccess.status).toBe(401);
        expect(postBlockAccess.body.message).toBe(
          'User account is inactive or blocked',
        );

        // 4. Admin unblocks the worker
        const unblockRes = await request(httpServer)
          .patch(`/admin/users/${targetId}/block`)
          .set('Cookie', [adminCookie])
          .send({ isBlocked: false });
        expect(unblockRes.status).toBe(200);

        // 5. Worker uses the same access token again -> 200 OK restored
        const postUnblockAccess = await request(httpServer)
          .get('/auth/me')
          .set('Cookie', [targetWorkerCookie]);
        expect(postUnblockAccess.status).toBe(200);
        expect(postUnblockAccess.body.id).toBe(targetId);
      } finally {
        await prismaService.user.update({
          where: { id: targetId },
          data: { isBlocked: false },
        });
      }
    });
  });

  describe('6. REAL UNBLOCK OPERATION & POSTGRESQL VERIFICATION', () => {
    it('unblocks a blocked user and preserves isActive and profile attributes', async () => {
      const adminCookie = createAuthCookie(adminUser);
      const targetId = workerUser.id;

      // Temporarily block the user first
      await prismaService.user.update({
        where: { id: targetId },
        data: { isBlocked: true },
      });

      try {
        const res = await request(httpServer)
          .patch(`/admin/users/${targetId}/block`)
          .set('Cookie', [adminCookie])
          .send({ isBlocked: false });

        expect(res.status).toBe(200);
        expect(res.body.id).toBe(targetId);
        expect(res.body.isBlocked).toBe(false);
        expect(res.body.isActive).toBe(true);
        expect(res.body.role).toBe(Role.WORKER);
        expect(res.body.firstName).toBe(workerUser.firstName);
        expect(res.body.lastName).toBe(workerUser.lastName);

        // Direct PostgreSQL check: isBlocked is false, isActive untouched
        const dbUser = await prismaService.user.findUnique({
          where: { id: targetId },
          include: { role: true },
        });
        expect(dbUser!.isBlocked).toBe(false);
        expect(dbUser!.isActive).toBe(true);
        expect(dbUser!.role.code).toBe(Role.WORKER);
      } finally {
        await prismaService.user.update({
          where: { id: targetId },
          data: { isBlocked: false },
        });
      }
    });
  });

  describe('7. SELF-BLOCK PROTECTION THROUGH HTTP', () => {
    it('Admin attempting to block own account -> 403 Forbidden (no DB mutation)', async () => {
      const adminCookie = createAuthCookie(adminUser);

      const res = await request(httpServer)
        .patch(`/admin/users/${adminUser.id}/block`)
        .set('Cookie', [adminCookie])
        .send({ isBlocked: true });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('Admins cannot block their own account');

      // Direct PostgreSQL check: Admin's isBlocked remains false
      const dbAdmin = await prismaService.user.findUnique({
        where: { id: adminUser.id },
      });
      expect(dbAdmin!.isBlocked).toBe(false);
    });
  });

  describe('8. DTO VALIDATION THROUGH HTTP', () => {
    it('rejects missing payload with 400 Bad Request', async () => {
      const adminCookie = createAuthCookie(adminUser);

      const res = await request(httpServer)
        .patch(`/admin/users/${workerUser.id}/block`)
        .set('Cookie', [adminCookie]);

      expect(res.status).toBe(400);

      const dbUser = await prismaService.user.findUnique({
        where: { id: workerUser.id },
      });
      expect(dbUser!.isBlocked).toBe(false);
    });

    it('rejects empty object {} with 400 Bad Request', async () => {
      const adminCookie = createAuthCookie(adminUser);

      const res = await request(httpServer)
        .patch(`/admin/users/${workerUser.id}/block`)
        .set('Cookie', [adminCookie])
        .send({});

      expect(res.status).toBe(400);

      const dbUser = await prismaService.user.findUnique({
        where: { id: workerUser.id },
      });
      expect(dbUser!.isBlocked).toBe(false);
    });

    it('rejects string boolean "true" with 400 Bad Request', async () => {
      const adminCookie = createAuthCookie(adminUser);

      const res = await request(httpServer)
        .patch(`/admin/users/${workerUser.id}/block`)
        .set('Cookie', [adminCookie])
        .send({ isBlocked: 'true' });

      expect(res.status).toBe(400);

      const dbUser = await prismaService.user.findUnique({
        where: { id: workerUser.id },
      });
      expect(dbUser!.isBlocked).toBe(false);
    });

    it('rejects numeric boolean 1 with 400 Bad Request', async () => {
      const adminCookie = createAuthCookie(adminUser);

      const res = await request(httpServer)
        .patch(`/admin/users/${workerUser.id}/block`)
        .set('Cookie', [adminCookie])
        .send({ isBlocked: 1 });

      expect(res.status).toBe(400);

      const dbUser = await prismaService.user.findUnique({
        where: { id: workerUser.id },
      });
      expect(dbUser!.isBlocked).toBe(false);
    });

    it('rejects null isBlocked with 400 Bad Request', async () => {
      const adminCookie = createAuthCookie(adminUser);

      const res = await request(httpServer)
        .patch(`/admin/users/${workerUser.id}/block`)
        .set('Cookie', [adminCookie])
        .send({ isBlocked: null });

      expect(res.status).toBe(400);

      const dbUser = await prismaService.user.findUnique({
        where: { id: workerUser.id },
      });
      expect(dbUser!.isBlocked).toBe(false);
    });

    it('rejects extra non-whitelisted properties (e.g. role injection) with 400 Bad Request', async () => {
      const adminCookie = createAuthCookie(adminUser);

      const res = await request(httpServer)
        .patch(`/admin/users/${workerUser.id}/block`)
        .set('Cookie', [adminCookie])
        .send({ isBlocked: true, role: Role.ADMIN });

      expect(res.status).toBe(400);

      const dbUser = await prismaService.user.findUnique({
        where: { id: workerUser.id },
      });
      expect(dbUser!.isBlocked).toBe(false);
    });
  });

  describe('9. NON-EXISTENT TARGET USER', () => {
    it('PATCH /admin/users/:userId/block for nonexistent UUID -> 404 Not Found', async () => {
      const adminCookie = createAuthCookie(adminUser);

      const res = await request(httpServer)
        .patch('/admin/users/00000000-0000-0000-0000-000000000000/block')
        .set('Cookie', [adminCookie])
        .send({ isBlocked: true });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('User not found');

      // Total user count unchanged
      const currentCount = await prismaService.user.count();
      expect(currentCount).toBe(initialUserCount);
    });
  });

  describe('10. SAME-STATE NO-OP BEHAVIOR', () => {
    it('submitting already-unblocked state returns 200 and performs no DB modification', async () => {
      const adminCookie = createAuthCookie(adminUser);

      const res = await request(httpServer)
        .patch(`/admin/users/${workerUser.id}/block`)
        .set('Cookie', [adminCookie])
        .send({ isBlocked: false });

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(workerUser.id);
      expect(res.body.isBlocked).toBe(false);

      const dbUser = await prismaService.user.findUnique({
        where: { id: workerUser.id },
      });
      expect(dbUser!.isBlocked).toBe(false);
    });

    it('submitting already-blocked state returns 200 without unnecessary mutation or duplicate revocation', async () => {
      const adminCookie = createAuthCookie(adminUser);
      const targetId = workerUser.id;

      // Temporarily block the user
      await prismaService.user.update({
        where: { id: targetId },
        data: { isBlocked: true },
      });

      try {
        const res = await request(httpServer)
          .patch(`/admin/users/${targetId}/block`)
          .set('Cookie', [adminCookie])
          .send({ isBlocked: true });

        expect(res.status).toBe(200);
        expect(res.body.id).toBe(targetId);
        expect(res.body.isBlocked).toBe(true);

        const dbUser = await prismaService.user.findUnique({
          where: { id: targetId },
        });
        expect(dbUser!.isBlocked).toBe(true);
      } finally {
        await prismaService.user.update({
          where: { id: targetId },
          data: { isBlocked: false },
        });
      }
    });
  });

  describe('11. INACTIVE ACCOUNT BEHAVIOR & REAL DATABASE LIMITATION INSPECTION', () => {
    it('inspects database for inactive accounts and verifies limitation without deactivating accounts', async () => {
      const inactiveUsers = await prismaService.user.findMany({
        where: { isActive: false },
      });

      // Report condition: If no inactive user exists in the current database,
      // record that unblocking an inactive account cannot be tested without manufacturing state.
      expect(inactiveUsers.length).toBe(0);
    });
  });

  describe('12. RESPONSE SAFETY', () => {
    it('verifies that sensitive fields are never returned in block/unblock responses', async () => {
      const adminCookie = createAuthCookie(adminUser);

      const res = await request(httpServer)
        .patch(`/admin/users/${workerUser.id}/block`)
        .set('Cookie', [adminCookie])
        .send({ isBlocked: false });

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
      expect(res.body.isActive).toBe(true);
      expect(res.body.isBlocked).toBe(false);
      expect(typeof res.body.createdAt).toBe('string');
    });
  });

  describe('13. DATABASE INTEGRITY & INVARIANT VERIFICATION', () => {
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
