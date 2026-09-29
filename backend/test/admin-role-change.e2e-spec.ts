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
import { configureTrustProxy } from '../src/presentation/proxy/trust-proxy.config';

describe('Admin User Role Change PATCH /admin/users/:userId/role (e2e)', () => {
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
  let initialUserRoleMap: Map<string, string>;

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
    initialUserRoleMap = new Map<string, string>();
    for (const u of allUsers) {
      initialUserRoleMap.set(u.id, u.role.code);
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
    // Definitive safety restoration: ensure every single user has their exact original role in DB
    if (initialUserRoleMap && prismaService) {
      for (const [userId, originalRoleCode] of initialUserRoleMap.entries()) {
        await prismaService.user.update({
          where: { id: userId },
          data: {
            role: {
              connect: { code: originalRoleCode },
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
    it('PATCH /admin/users/:userId/role without cookies -> 401 Unauthorized', async () => {
      const res = await request(httpServer)
        .patch(`/admin/users/${workerUser.id}/role`)
        .send({ role: Role.RECRUITER });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Authentication token is missing');

      // Verify no DB role change
      const dbUser = await prismaService.user.findUnique({
        where: { id: workerUser.id },
        include: { role: true },
      });
      expect(dbUser!.role.code).toBe(Role.WORKER);
    });

    it('PATCH /admin/users/:userId/role with invalid/tampered cookie -> 401 Unauthorized', async () => {
      const res = await request(httpServer)
        .patch(`/admin/users/${workerUser.id}/role`)
        .set('Cookie', ['access_token=tampered.invalid.jwt'])
        .send({ role: Role.RECRUITER });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid or expired token');

      // Verify no DB role change
      const dbUser = await prismaService.user.findUnique({
        where: { id: workerUser.id },
        include: { role: true },
      });
      expect(dbUser!.role.code).toBe(Role.WORKER);
    });
  });

  describe('2. ROLE AUTHORIZATION (RBAC FORBIDDEN)', () => {
    it('PATCH /admin/users/:userId/role with WORKER session -> 403 Forbidden (no DB mutation)', async () => {
      const workerCookie = createAuthCookie(workerUser);

      const res = await request(httpServer)
        .patch(`/admin/users/${recruiterUser.id}/role`)
        .set('Cookie', [workerCookie])
        .send({ role: Role.WORKER });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Forbidden resource');

      // Direct PostgreSQL check: target user role must remain unchanged
      const dbUser = await prismaService.user.findUnique({
        where: { id: recruiterUser.id },
        include: { role: true },
      });
      expect(dbUser!.role.code).toBe(Role.RECRUITER);
    });

    it('PATCH /admin/users/:userId/role with RECRUITER session -> 403 Forbidden (no DB mutation)', async () => {
      const recruiterCookie = createAuthCookie(recruiterUser);

      const res = await request(httpServer)
        .patch(`/admin/users/${workerUser.id}/role`)
        .set('Cookie', [recruiterCookie])
        .send({ role: Role.RECRUITER });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Forbidden resource');

      // Direct PostgreSQL check: target user role must remain unchanged
      const dbUser = await prismaService.user.findUnique({
        where: { id: workerUser.id },
        include: { role: true },
      });
      expect(dbUser!.role.code).toBe(Role.WORKER);
    });

    it('PATCH /admin/users/:userId/role with ADMIN session -> allowed through guards', async () => {
      const adminCookie = createAuthCookie(adminUser);

      // Sending same role as no-op to verify pass-through through guards
      const res = await request(httpServer)
        .patch(`/admin/users/${workerUser.id}/role`)
        .set('Cookie', [adminCookie])
        .send({ role: Role.WORKER });

      expect(res.status).toBe(200);
      expect(res.body.role).toBe(Role.WORKER);
    });
  });

  describe('3. SELF-ROLE PROTECTION THROUGH HTTP', () => {
    it('Admin attempting to change own role to WORKER -> 403 Forbidden (no DB mutation)', async () => {
      const adminCookie = createAuthCookie(adminUser);

      const res = await request(httpServer)
        .patch(`/admin/users/${adminUser.id}/role`)
        .set('Cookie', [adminCookie])
        .send({ role: Role.WORKER });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('Admins cannot change their own role');

      // Direct PostgreSQL check: admin's role in DB is strictly preserved
      const dbAdmin = await prismaService.user.findUnique({
        where: { id: adminUser.id },
        include: { role: true },
      });
      expect(dbAdmin!.role.code).toBe(Role.ADMIN);
    });

    it('Admin attempting to change own role to RECRUITER -> 403 Forbidden (no DB mutation)', async () => {
      const adminCookie = createAuthCookie(adminUser);

      const res = await request(httpServer)
        .patch(`/admin/users/${adminUser.id}/role`)
        .set('Cookie', [adminCookie])
        .send({ role: Role.RECRUITER });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('Admins cannot change their own role');

      // Direct PostgreSQL check: admin's role in DB is strictly preserved
      const dbAdmin = await prismaService.user.findUnique({
        where: { id: adminUser.id },
        include: { role: true },
      });
      expect(dbAdmin!.role.code).toBe(Role.ADMIN);
    });
  });

  describe('4. REAL ADMIN ROLE CHANGES & POSTGRESQL VERIFICATION', () => {
    it('Transition 1: WORKER -> RECRUITER (verified in DB and restored to WORKER)', async () => {
      const adminCookie = createAuthCookie(adminUser);
      const targetId = workerUser.id;

      try {
        const res = await request(httpServer)
          .patch(`/admin/users/${targetId}/role`)
          .set('Cookie', [adminCookie])
          .send({ role: Role.RECRUITER });

        expect(res.status).toBe(200);
        expect(res.body.id).toBe(targetId);
        expect(res.body.role).toBe(Role.RECRUITER);

        // Verify direct in PostgreSQL
        const dbUser = await prismaService.user.findUnique({
          where: { id: targetId },
          include: { role: true },
        });
        expect(dbUser!.role.code).toBe(Role.RECRUITER);
      } finally {
        // Guaranteed restoration
        await prismaService.user.update({
          where: { id: targetId },
          data: { role: { connect: { code: Role.WORKER } } },
        });
        const restoredUser = await prismaService.user.findUnique({
          where: { id: targetId },
          include: { role: true },
        });
        expect(restoredUser!.role.code).toBe(Role.WORKER);
      }
    });

    it('Transition 2: RECRUITER -> WORKER (verified in DB and restored to RECRUITER)', async () => {
      const adminCookie = createAuthCookie(adminUser);
      const targetId = recruiterUser.id;

      try {
        const res = await request(httpServer)
          .patch(`/admin/users/${targetId}/role`)
          .set('Cookie', [adminCookie])
          .send({ role: Role.WORKER });

        expect(res.status).toBe(200);
        expect(res.body.id).toBe(targetId);
        expect(res.body.role).toBe(Role.WORKER);

        // Verify direct in PostgreSQL
        const dbUser = await prismaService.user.findUnique({
          where: { id: targetId },
          include: { role: true },
        });
        expect(dbUser!.role.code).toBe(Role.WORKER);
      } finally {
        // Guaranteed restoration
        await prismaService.user.update({
          where: { id: targetId },
          data: { role: { connect: { code: Role.RECRUITER } } },
        });
        const restoredUser = await prismaService.user.findUnique({
          where: { id: targetId },
          include: { role: true },
        });
        expect(restoredUser!.role.code).toBe(Role.RECRUITER);
      }
    });

    it('Transition 3: WORKER -> ADMIN (verified in DB and restored to WORKER)', async () => {
      const adminCookie = createAuthCookie(adminUser);
      const targetId = workerUser.id;

      try {
        const res = await request(httpServer)
          .patch(`/admin/users/${targetId}/role`)
          .set('Cookie', [adminCookie])
          .send({ role: Role.ADMIN });

        expect(res.status).toBe(200);
        expect(res.body.id).toBe(targetId);
        expect(res.body.role).toBe(Role.ADMIN);

        // Verify direct in PostgreSQL
        const dbUser = await prismaService.user.findUnique({
          where: { id: targetId },
          include: { role: true },
        });
        expect(dbUser!.role.code).toBe(Role.ADMIN);
      } finally {
        // Guaranteed restoration
        await prismaService.user.update({
          where: { id: targetId },
          data: { role: { connect: { code: Role.WORKER } } },
        });
        const restoredUser = await prismaService.user.findUnique({
          where: { id: targetId },
          include: { role: true },
        });
        expect(restoredUser!.role.code).toBe(Role.WORKER);
      }
    });

    it('Transition 4: RECRUITER -> ADMIN (verified in DB and restored to RECRUITER)', async () => {
      const adminCookie = createAuthCookie(adminUser);
      const targetId = recruiterUser.id;

      try {
        const res = await request(httpServer)
          .patch(`/admin/users/${targetId}/role`)
          .set('Cookie', [adminCookie])
          .send({ role: Role.ADMIN });

        expect(res.status).toBe(200);
        expect(res.body.id).toBe(targetId);
        expect(res.body.role).toBe(Role.ADMIN);

        // Verify direct in PostgreSQL
        const dbUser = await prismaService.user.findUnique({
          where: { id: targetId },
          include: { role: true },
        });
        expect(dbUser!.role.code).toBe(Role.ADMIN);
      } finally {
        // Guaranteed restoration
        await prismaService.user.update({
          where: { id: targetId },
          data: { role: { connect: { code: Role.RECRUITER } } },
        });
        const restoredUser = await prismaService.user.findUnique({
          where: { id: targetId },
          include: { role: true },
        });
        expect(restoredUser!.role.code).toBe(Role.RECRUITER);
      }
    });
  });

  describe('5. ADMIN TARGET TESTING & DATABASE STATE INSPECTION', () => {
    it('inspects database admin count and confirms single calling admin presence without manufacturing fake data', async () => {
      const adminUsers = await prismaService.user.findMany({
        where: { role: { code: Role.ADMIN } },
      });

      // Verify that exactly 1 ADMIN exists in the current database
      expect(adminUsers.length).toBe(1);
      expect(adminUsers[0].id).toBe(adminUser.id);

      // Report condition: Since there is no second real ADMIN, ADMIN -> WORKER or ADMIN -> RECRUITER
      // cannot be independently tested on a separate target admin without manufacturing fake data.
    });
  });

  describe('6. VALIDATION: INVALID ROLE INPUT & MALFORMED PAYLOADS', () => {
    it('PATCH /admin/users/:userId/role with invalid role value (SUPERADMIN) -> 400 Bad Request', async () => {
      const adminCookie = createAuthCookie(adminUser);

      const res = await request(httpServer)
        .patch(`/admin/users/${workerUser.id}/role`)
        .set('Cookie', [adminCookie])
        .send({ role: 'SUPERADMIN' });

      expect(res.status).toBe(400);

      // Verify no DB role change
      const dbUser = await prismaService.user.findUnique({
        where: { id: workerUser.id },
        include: { role: true },
      });
      expect(dbUser!.role.code).toBe(Role.WORKER);
    });

    it('PATCH /admin/users/:userId/role with empty payload -> 400 Bad Request', async () => {
      const adminCookie = createAuthCookie(adminUser);

      const res = await request(httpServer)
        .patch(`/admin/users/${workerUser.id}/role`)
        .set('Cookie', [adminCookie])
        .send({});

      expect(res.status).toBe(400);

      const dbUser = await prismaService.user.findUnique({
        where: { id: workerUser.id },
        include: { role: true },
      });
      expect(dbUser!.role.code).toBe(Role.WORKER);
    });

    it('PATCH /admin/users/:userId/role with non-string role -> 400 Bad Request', async () => {
      const adminCookie = createAuthCookie(adminUser);

      const res = await request(httpServer)
        .patch(`/admin/users/${workerUser.id}/role`)
        .set('Cookie', [adminCookie])
        .send({ role: 999 });

      expect(res.status).toBe(400);

      const dbUser = await prismaService.user.findUnique({
        where: { id: workerUser.id },
        include: { role: true },
      });
      expect(dbUser!.role.code).toBe(Role.WORKER);
    });

    it('PATCH /admin/users/:userId/role with non-whitelisted extra fields -> 400 Bad Request', async () => {
      const adminCookie = createAuthCookie(adminUser);

      const res = await request(httpServer)
        .patch(`/admin/users/${workerUser.id}/role`)
        .set('Cookie', [adminCookie])
        .send({
          role: Role.RECRUITER,
          passwordHash: 'hacked_hash',
          isBlocked: true,
        });

      expect(res.status).toBe(400);

      const dbUser = await prismaService.user.findUnique({
        where: { id: workerUser.id },
        include: { role: true },
      });
      expect(dbUser!.role.code).toBe(Role.WORKER);
    });
  });

  describe('7. NON-EXISTENT TARGET USER', () => {
    it('PATCH /admin/users/:userId/role for nonexistent UUID -> 404 Not Found', async () => {
      const adminCookie = createAuthCookie(adminUser);

      const res = await request(httpServer)
        .patch('/admin/users/00000000-0000-0000-0000-000000000000/role')
        .set('Cookie', [adminCookie])
        .send({ role: Role.RECRUITER });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('User not found');

      // Invariant check: total count unchanged
      const currentCount = await prismaService.user.count();
      expect(currentCount).toBe(initialUserCount);
    });
  });

  describe('8. SAME-ROLE NO-OP', () => {
    it('submitting same role returns 200 and performs no DB modification', async () => {
      const adminCookie = createAuthCookie(adminUser);

      const res = await request(httpServer)
        .patch(`/admin/users/${workerUser.id}/role`)
        .set('Cookie', [adminCookie])
        .send({ role: Role.WORKER });

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(workerUser.id);
      expect(res.body.role).toBe(Role.WORKER);

      const dbUser = await prismaService.user.findUnique({
        where: { id: workerUser.id },
        include: { role: true },
      });
      expect(dbUser!.role.code).toBe(Role.WORKER);
    });
  });

  describe('9. RESPONSE SAFETY', () => {
    it('verifies that sensitive fields are never returned in role change response', async () => {
      const adminCookie = createAuthCookie(adminUser);

      const res = await request(httpServer)
        .patch(`/admin/users/${workerUser.id}/role`)
        .set('Cookie', [adminCookie])
        .send({ role: Role.WORKER });

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
      expect(res.body.isActive).toBeDefined();
      expect(res.body.isBlocked).toBeDefined();
      expect(typeof res.body.createdAt).toBe('string');
    });
  });

  describe('10. LIVE ROLE EFFECT VERIFICATION', () => {
    it('verifies that role changes take effect immediately on subsequent requests using existing JWT', async () => {
      const adminCookie = createAuthCookie(adminUser);
      const targetWorkerCookie = createAuthCookie(workerUser);

      // 1. Initial state: worker user accesses /admin/users -> 403 Forbidden
      const initialAttempt = await request(httpServer)
        .get('/admin/users')
        .set('Cookie', [targetWorkerCookie]);
      expect(initialAttempt.status).toBe(403);

      try {
        // 2. Admin promotes worker to ADMIN
        const promoteRes = await request(httpServer)
          .patch(`/admin/users/${workerUser.id}/role`)
          .set('Cookie', [adminCookie])
          .send({ role: Role.ADMIN });
        expect(promoteRes.status).toBe(200);

        // 3. The promoted user presents the EXACT SAME cookie previously issued.
        // Because JwtAuthGuard looks up user in PostgreSQL live, it now sees Role.ADMIN!
        const promotedAttempt = await request(httpServer)
          .get('/admin/users')
          .set('Cookie', [targetWorkerCookie]);
        expect(promotedAttempt.status).toBe(200);
        expect(Array.isArray(promotedAttempt.body)).toBe(true);
      } finally {
        // 4. Restore worker's role back to WORKER
        await prismaService.user.update({
          where: { id: workerUser.id },
          data: { role: { connect: { code: Role.WORKER } } },
        });

        // 5. Verify the restored worker is immediately rejected again with 403 Forbidden
        const postRestoreAttempt = await request(httpServer)
          .get('/admin/users')
          .set('Cookie', [targetWorkerCookie]);
        expect(postRestoreAttempt.status).toBe(403);

        const finalDbCheck = await prismaService.user.findUnique({
          where: { id: workerUser.id },
          include: { role: true },
        });
        expect(finalDbCheck!.role.code).toBe(Role.WORKER);
      }
    });
  });

  describe('11. DATABASE INTEGRITY & INVARIANT VERIFICATION', () => {
    it('verifies that no users were created, deleted, and all user roles match initial snapshot', async () => {
      const finalCount = await prismaService.user.count();
      expect(finalCount).toBe(initialUserCount);

      const allUsers = await prismaService.user.findMany({
        include: { role: true },
      });
      expect(allUsers.length).toBe(initialUserCount);

      for (const u of allUsers) {
        const expectedRole = initialUserRoleMap.get(u.id);
        expect(expectedRole).toBeDefined();
        expect(u.role.code).toBe(expectedRole);
      }
    });
  });
});
