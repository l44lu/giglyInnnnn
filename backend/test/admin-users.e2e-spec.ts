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

describe('Admin User Management GET /admin/users, GET /admin/users/:userId & PATCH /admin/users/:userId (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let configService: ConfigService;
  let prismaService: PrismaService;
  let httpServer: Server;

  let targetUserId: string;
  let originalBio: string | null;
  let originalFirstName: string;
  let originalLastName: string;
  let originalPhone: string | null;
  let originalLocation: string | null;
  let originalEmail: string;
  let initialUserCount: number;

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

    // Load an existing real WORKER user to serve as the target for PATCH tests
    const workerUser = await prismaService.user.findFirst({
      where: { role: { code: Role.WORKER } },
      include: { role: true },
    });
    expect(workerUser).toBeDefined();

    targetUserId = workerUser!.id;
    originalBio = workerUser!.bio;
    originalFirstName = workerUser!.firstName;
    originalLastName = workerUser!.lastName;
    originalPhone = workerUser!.phone;
    originalLocation = workerUser!.location;
    originalEmail = workerUser!.email;
    initialUserCount = await prismaService.user.count();
  });

  afterAll(async () => {
    // Safety cleanup: ensure target user's original values are restored in database
    if (targetUserId) {
      await prismaService.user.update({
        where: { id: targetUserId },
        data: {
          bio: originalBio,
          firstName: originalFirstName,
          lastName: originalLastName,
          phone: originalPhone,
          location: originalLocation,
          email: originalEmail,
        },
      });
    }
    await app.close();
  });

  describe('1. UNAUTHENTICATED ACCESS', () => {
    it('GET /admin/users without cookies -> 401 Unauthorized', async () => {
      const res = await request(httpServer).get('/admin/users');

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Authentication token is missing');
    });

    it('GET /admin/users with invalid/tampered cookie -> 401 Unauthorized', async () => {
      const res = await request(httpServer)
        .get('/admin/users')
        .set('Cookie', ['access_token=invalid.tampered.jwttoken']);

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid or expired token');
    });

    it('GET /admin/users/:userId without cookies -> 401 Unauthorized', async () => {
      const res = await request(httpServer).get(
        '/admin/users/some-random-user-id',
      );

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Authentication token is missing');
    });
  });

  describe('2. WORKER ACCESS (RBAC Forbidden)', () => {
    it('GET /admin/users with real WORKER session -> 403 Forbidden', async () => {
      const workerUser = await prismaService.user.findFirst({
        where: { role: { code: Role.WORKER } },
        include: { role: true },
      });
      expect(workerUser).toBeDefined();

      const workerToken = jwtService.sign(
        {
          sub: workerUser!.id,
          email: workerUser!.email,
          role: workerUser!.role.code,
        },
        { secret: configService.get<string>('JWT_SECRET') },
      );

      const res = await request(httpServer)
        .get('/admin/users')
        .set('Cookie', [`access_token=${workerToken}`]);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Forbidden resource');
      expect(res.body.users).toBeUndefined();
    });

    it('GET /admin/users/:userId with real WORKER session -> 403 Forbidden', async () => {
      const workerUser = await prismaService.user.findFirst({
        where: { role: { code: Role.WORKER } },
        include: { role: true },
      });
      expect(workerUser).toBeDefined();

      const workerToken = jwtService.sign(
        {
          sub: workerUser!.id,
          email: workerUser!.email,
          role: workerUser!.role.code,
        },
        { secret: configService.get<string>('JWT_SECRET') },
      );

      const res = await request(httpServer)
        .get(`/admin/users/${workerUser!.id}`)
        .set('Cookie', [`access_token=${workerToken}`]);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Forbidden resource');
      expect(res.body.email).toBeUndefined();
    });
  });

  describe('3. RECRUITER ACCESS (RBAC Forbidden)', () => {
    it('GET /admin/users with real RECRUITER session -> 403 Forbidden', async () => {
      const recruiterUser = await prismaService.user.findFirst({
        where: { role: { code: Role.RECRUITER } },
        include: { role: true },
      });
      expect(recruiterUser).toBeDefined();

      const recruiterToken = jwtService.sign(
        {
          sub: recruiterUser!.id,
          email: recruiterUser!.email,
          role: recruiterUser!.role.code,
        },
        { secret: configService.get<string>('JWT_SECRET') },
      );

      const res = await request(httpServer)
        .get('/admin/users')
        .set('Cookie', [`access_token=${recruiterToken}`]);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Forbidden resource');
      expect(res.body.users).toBeUndefined();
    });

    it('GET /admin/users/:userId with real RECRUITER session -> 403 Forbidden', async () => {
      const recruiterUser = await prismaService.user.findFirst({
        where: { role: { code: Role.RECRUITER } },
        include: { role: true },
      });
      expect(recruiterUser).toBeDefined();

      const recruiterToken = jwtService.sign(
        {
          sub: recruiterUser!.id,
          email: recruiterUser!.email,
          role: recruiterUser!.role.code,
        },
        { secret: configService.get<string>('JWT_SECRET') },
      );

      const res = await request(httpServer)
        .get(`/admin/users/${recruiterUser!.id}`)
        .set('Cookie', [`access_token=${recruiterToken}`]);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Forbidden resource');
      expect(res.body.email).toBeUndefined();
    });
  });

  describe('4. ADMIN ACCESS: GET /admin/users', () => {
    it('GET /admin/users with real ADMIN session -> 200 OK with valid user list', async () => {
      const adminUser = await prismaService.user.findFirst({
        where: { role: { code: Role.ADMIN } },
        include: { role: true },
      });
      expect(adminUser).toBeDefined();

      const adminToken = jwtService.sign(
        {
          sub: adminUser!.id,
          email: adminUser!.email,
          role: adminUser!.role.code,
        },
        { secret: configService.get<string>('JWT_SECRET') },
      );

      const res = await request(httpServer)
        .get('/admin/users')
        .set('Cookie', [`access_token=${adminToken}`]);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);

      // Verify that every returned user follows AdminUserResponseDto
      for (const user of res.body) {
        // Required fields present
        expect(typeof user.id).toBe('string');
        expect(typeof user.email).toBe('string');
        expect(typeof user.role).toBe('string');
        expect([Role.ADMIN, Role.WORKER, Role.RECRUITER]).toContain(user.role);
        expect(typeof user.firstName).toBe('string');
        expect(typeof user.lastName).toBe('string');
        expect(typeof user.isActive).toBe('boolean');
        expect(typeof user.isBlocked).toBe('boolean');
        expect(typeof user.createdAt).toBe('string');

        // Optional fields types
        if (user.phone !== null && user.phone !== undefined) {
          expect(typeof user.phone).toBe('string');
        }
        if (user.location !== null && user.location !== undefined) {
          expect(typeof user.location).toBe('string');
        }
        if (user.bio !== null && user.bio !== undefined) {
          expect(typeof user.bio).toBe('string');
        }

        // Sensitive fields MUST NOT be exposed
        expect(user.passwordHash).toBeUndefined();
        expect(user.passWordHash).toBeUndefined();
        expect(user.password).toBeUndefined();
        expect(user.refreshTokens).toBeUndefined();
        expect(user.passwordResets).toBeUndefined();
        expect(user.otp).toBeUndefined();
      }

      // Verify that the database contains the admin user and other users
      const totalDbUsers = await prismaService.user.count();
      expect(res.body.length).toBe(totalDbUsers);

      // Verify the calling admin user is in the returned list
      const foundAdmin = res.body.find(
        (u: { id: string }) => u.id === adminUser!.id,
      );
      expect(foundAdmin).toBeDefined();
      expect(foundAdmin.email).toBe(adminUser!.email);
      expect(foundAdmin.role).toBe(Role.ADMIN);
    });
  });

  describe('5. ADMIN ACCESS: GET /admin/users/:userId', () => {
    it('GET /admin/users/:userId for nonexistent ID -> 404 Not Found', async () => {
      const adminUser = await prismaService.user.findFirst({
        where: { role: { code: Role.ADMIN } },
        include: { role: true },
      });
      expect(adminUser).toBeDefined();

      const adminToken = jwtService.sign(
        {
          sub: adminUser!.id,
          email: adminUser!.email,
          role: adminUser!.role.code,
        },
        { secret: configService.get<string>('JWT_SECRET') },
      );

      const res = await request(httpServer)
        .get('/admin/users/c0000000-0000-0000-0000-000000000000')
        .set('Cookie', [`access_token=${adminToken}`]);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('User not found');
    });

    it('GET /admin/users/:userId for existing user -> 200 OK with AdminUserResponseDto', async () => {
      const adminUser = await prismaService.user.findFirst({
        where: { role: { code: Role.ADMIN } },
        include: { role: true },
      });
      expect(adminUser).toBeDefined();

      const targetUser = await prismaService.user.findFirst({
        where: { role: { code: Role.WORKER } },
        include: { role: true },
      });
      expect(targetUser).toBeDefined();

      const adminToken = jwtService.sign(
        {
          sub: adminUser!.id,
          email: adminUser!.email,
          role: adminUser!.role.code,
        },
        { secret: configService.get<string>('JWT_SECRET') },
      );

      const res = await request(httpServer)
        .get(`/admin/users/${targetUser!.id}`)
        .set('Cookie', [`access_token=${adminToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(targetUser!.id);
      expect(res.body.email).toBe(targetUser!.email);
      expect(res.body.role).toBe(Role.WORKER);
      expect(res.body.firstName).toBe(targetUser!.firstName);
      expect(res.body.lastName).toBe(targetUser!.lastName);
      expect(res.body.isActive).toBe(targetUser!.isActive);
      expect(res.body.isBlocked).toBe(targetUser!.isBlocked);
      expect(typeof res.body.createdAt).toBe('string');

      // Sensitive fields MUST NOT be exposed
      expect(res.body.passwordHash).toBeUndefined();
      expect(res.body.passWordHash).toBeUndefined();
      expect(res.body.password).toBeUndefined();
      expect(res.body.refreshTokens).toBeUndefined();
      expect(res.body.passwordResets).toBeUndefined();
      expect(res.body.otp).toBeUndefined();
    });
  });

  describe('6. ADMIN ACCESS: PATCH /admin/users/:userId (Success & Restoration)', () => {
    it('PATCH /admin/users/:userId with real ADMIN session -> 200 OK, bio updated in DB, and restored', async () => {
      const adminUser = await prismaService.user.findFirst({
        where: { role: { code: Role.ADMIN } },
        include: { role: true },
      });
      expect(adminUser).toBeDefined();

      const adminToken = jwtService.sign(
        {
          sub: adminUser!.id,
          email: adminUser!.email,
          role: adminUser!.role.code,
        },
        { secret: configService.get<string>('JWT_SECRET') },
      );

      const tempBio = `Verified E2E Bio ${Date.now()}`;

      try {
        const res = await request(httpServer)
          .patch(`/admin/users/${targetUserId}`)
          .set('Cookie', [`access_token=${adminToken}`])
          .send({ bio: tempBio });

        expect(res.status).toBe(200);
        expect(res.body.id).toBe(targetUserId);
        expect(res.body.email).toBe(originalEmail);
        expect(res.body.role).toBe(Role.WORKER);
        expect(res.body.bio).toBe(tempBio);
        expect(res.body.firstName).toBe(originalFirstName);
        expect(res.body.lastName).toBe(originalLastName);
        expect(res.body.isActive).toBe(true);
        expect(res.body.isBlocked).toBe(false);
        expect(typeof res.body.createdAt).toBe('string');

        // Sensitive fields MUST NOT be exposed
        expect(res.body.passwordHash).toBeUndefined();
        expect(res.body.passWordHash).toBeUndefined();
        expect(res.body.password).toBeUndefined();
        expect(res.body.refreshTokens).toBeUndefined();
        expect(res.body.passwordResets).toBeUndefined();
        expect(res.body.otp).toBeUndefined();

        // Verify directly in PostgreSQL via PrismaService
        const dbUser = await prismaService.user.findUnique({
          where: { id: targetUserId },
        });
        expect(dbUser).toBeDefined();
        expect(dbUser!.bio).toBe(tempBio);
      } finally {
        // Restore original bio in database
        await prismaService.user.update({
          where: { id: targetUserId },
          data: { bio: originalBio },
        });

        // Verify restoration directly in PostgreSQL
        const restoredUser = await prismaService.user.findUnique({
          where: { id: targetUserId },
        });
        expect(restoredUser).toBeDefined();
        expect(restoredUser!.bio).toBe(originalBio);
      }
    });
  });

  describe('7. RBAC & UNAUTHENTICATED ON PATCH /admin/users/:userId', () => {
    it('PATCH /admin/users/:userId without cookies -> 401 Unauthorized (no DB mutation)', async () => {
      const res = await request(httpServer)
        .patch(`/admin/users/${targetUserId}`)
        .send({ bio: 'Unauthenticated Attack Bio' });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Authentication token is missing');

      const dbUser = await prismaService.user.findUnique({
        where: { id: targetUserId },
      });
      expect(dbUser!.bio).toBe(originalBio);
    });

    it('PATCH /admin/users/:userId with real WORKER session -> 403 Forbidden (no DB mutation)', async () => {
      const workerUser = await prismaService.user.findFirst({
        where: { role: { code: Role.WORKER } },
        include: { role: true },
      });
      expect(workerUser).toBeDefined();

      const workerToken = jwtService.sign(
        {
          sub: workerUser!.id,
          email: workerUser!.email,
          role: workerUser!.role.code,
        },
        { secret: configService.get<string>('JWT_SECRET') },
      );

      const res = await request(httpServer)
        .patch(`/admin/users/${targetUserId}`)
        .set('Cookie', [`access_token=${workerToken}`])
        .send({ bio: 'Worker Attack Bio' });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Forbidden resource');

      const dbUser = await prismaService.user.findUnique({
        where: { id: targetUserId },
      });
      expect(dbUser!.bio).toBe(originalBio);
    });

    it('PATCH /admin/users/:userId with real RECRUITER session -> 403 Forbidden (no DB mutation)', async () => {
      const recruiterUser = await prismaService.user.findFirst({
        where: { role: { code: Role.RECRUITER } },
        include: { role: true },
      });
      expect(recruiterUser).toBeDefined();

      const recruiterToken = jwtService.sign(
        {
          sub: recruiterUser!.id,
          email: recruiterUser!.email,
          role: recruiterUser!.role.code,
        },
        { secret: configService.get<string>('JWT_SECRET') },
      );

      const res = await request(httpServer)
        .patch(`/admin/users/${targetUserId}`)
        .set('Cookie', [`access_token=${recruiterToken}`])
        .send({ bio: 'Recruiter Attack Bio' });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Forbidden resource');

      const dbUser = await prismaService.user.findUnique({
        where: { id: targetUserId },
      });
      expect(dbUser!.bio).toBe(originalBio);
    });
  });

  describe('8. VALIDATION: PATCH /admin/users/:userId with invalid payload', () => {
    it('PATCH /admin/users/:userId with invalid email format -> 400 Bad Request (no DB mutation)', async () => {
      const adminUser = await prismaService.user.findFirst({
        where: { role: { code: Role.ADMIN } },
        include: { role: true },
      });
      expect(adminUser).toBeDefined();

      const adminToken = jwtService.sign(
        {
          sub: adminUser!.id,
          email: adminUser!.email,
          role: adminUser!.role.code,
        },
        { secret: configService.get<string>('JWT_SECRET') },
      );

      const res = await request(httpServer)
        .patch(`/admin/users/${targetUserId}`)
        .set('Cookie', [`access_token=${adminToken}`])
        .send({ email: 'not-a-valid-email-format' });

      expect(res.status).toBe(400);

      const dbUser = await prismaService.user.findUnique({
        where: { id: targetUserId },
      });
      expect(dbUser!.email).toBe(originalEmail);
      expect(dbUser!.bio).toBe(originalBio);
    });
  });

  describe('9. UNKNOWN USER: PATCH /admin/users/:userId', () => {
    it('PATCH /admin/users/:userId for nonexistent ID -> 404 Not Found (no DB mutation)', async () => {
      const adminUser = await prismaService.user.findFirst({
        where: { role: { code: Role.ADMIN } },
        include: { role: true },
      });
      expect(adminUser).toBeDefined();

      const adminToken = jwtService.sign(
        {
          sub: adminUser!.id,
          email: adminUser!.email,
          role: adminUser!.role.code,
        },
        { secret: configService.get<string>('JWT_SECRET') },
      );

      const res = await request(httpServer)
        .patch('/admin/users/c0000000-0000-0000-0000-000000000000')
        .set('Cookie', [`access_token=${adminToken}`])
        .send({ bio: 'Ghost User Bio' });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('User not found');
    });
  });

  describe('10. EMAIL CONFLICT: PATCH /admin/users/:userId', () => {
    it('PATCH /admin/users/:userId with existing email of another user -> 409 Conflict (no DB mutation)', async () => {
      const adminUser = await prismaService.user.findFirst({
        where: { role: { code: Role.ADMIN } },
        include: { role: true },
      });
      expect(adminUser).toBeDefined();

      const otherUser = await prismaService.user.findFirst({
        where: {
          id: { not: targetUserId },
        },
      });
      expect(otherUser).toBeDefined();

      const adminToken = jwtService.sign(
        {
          sub: adminUser!.id,
          email: adminUser!.email,
          role: adminUser!.role.code,
        },
        { secret: configService.get<string>('JWT_SECRET') },
      );

      try {
        const res = await request(httpServer)
          .patch(`/admin/users/${targetUserId}`)
          .set('Cookie', [`access_token=${adminToken}`])
          .send({ email: otherUser!.email });

        expect(res.status).toBe(409);
        expect(res.body.message).toBe('User with this email already exists');

        // Verify target user's email was NOT modified in PostgreSQL
        const dbTargetUser = await prismaService.user.findUnique({
          where: { id: targetUserId },
        });
        expect(dbTargetUser!.email).toBe(originalEmail);

        // Verify other user's email was NOT modified in PostgreSQL
        const dbOtherUser = await prismaService.user.findUnique({
          where: { id: otherUser!.id },
        });
        expect(dbOtherUser!.email).toBe(otherUser!.email);
      } finally {
        // Defensive restoration
        await prismaService.user.update({
          where: { id: targetUserId },
          data: { email: originalEmail },
        });
      }
    });
  });

  describe('11. DATABASE INTEGRITY & INVARIANT VERIFICATION', () => {
    it('verifies that no users were created, deleted, and target user original fields match exactly', async () => {
      const finalCount = await prismaService.user.count();
      expect(finalCount).toBe(initialUserCount);

      const finalDbUser = await prismaService.user.findUnique({
        where: { id: targetUserId },
        include: { role: true },
      });

      expect(finalDbUser).toBeDefined();
      expect(finalDbUser!.bio).toBe(originalBio);
      expect(finalDbUser!.firstName).toBe(originalFirstName);
      expect(finalDbUser!.lastName).toBe(originalLastName);
      expect(finalDbUser!.phone).toBe(originalPhone);
      expect(finalDbUser!.location).toBe(originalLocation);
      expect(finalDbUser!.email).toBe(originalEmail);
      expect(finalDbUser!.role.code).toBe(Role.WORKER);
      expect(finalDbUser!.isActive).toBe(true);
      expect(finalDbUser!.isBlocked).toBe(false);
    });
  });
});
