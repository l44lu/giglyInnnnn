import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';
import { IRefreshTokenRepository } from '../src/domain/repositories/refresh-token.repository.interface';
import { Server } from 'http';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import cookieParser from 'cookie-parser';
import { LoginRateLimitGuard } from '../src/presentation/guards/login-rate-limit.guard';
import { configureTrustProxy } from '../src/presentation/proxy/trust-proxy.config';

function getRefreshTokenFromCookie(res: request.Response): string {
  const setCookie = res.headers['set-cookie'] as unknown;
  const cookies: string[] = Array.isArray(setCookie)
    ? (setCookie as string[])
    : typeof setCookie === 'string'
      ? [setCookie]
      : [];
  const refreshCookie = cookies.find((c) => c.startsWith('refresh_token='));
  if (!refreshCookie)
    throw new Error('No refresh_token cookie found in set-cookie headers');
  return refreshCookie.split(';')[0].split('=')[1];
}

describe('RBAC & Auth End-to-End Verification (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let configService: ConfigService;
  let prismaService: PrismaService;
  let refreshTokenRepository: IRefreshTokenRepository;
  let httpServer: Server;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    configService = app.get<ConfigService>(ConfigService);
    configureTrustProxy(app, configService);
    await app.init();

    jwtService = app.get<JwtService>(JwtService);
    configService = app.get<ConfigService>(ConfigService);
    prismaService = app.get<PrismaService>(PrismaService);
    refreshTokenRepository = app.get<IRefreshTokenRepository>(
      IRefreshTokenRepository,
    );
    httpServer = app.getHttpServer() as Server;
  });

  beforeEach(() => {
    LoginRateLimitGuard.reset();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('PHASE 3: Backend Authentication (/auth/login)', () => {
    it('should reject login for non-existent email with 401', async () => {
      const res = await request(httpServer).post('/auth/login').send({
        email: 'nonexistent_user_xyz@gigly.com',
        password: 'WrongPassword123!',
      });

      expect(res.status).toBe(401);
    });

    it('should reject login for existing email with wrong password with 401', async () => {
      // Use existing admin user email from DB
      const existingUser = await prismaService.user.findFirst();
      if (existingUser) {
        const res = await request(httpServer).post('/auth/login').send({
          email: existingUser.email,
          password: 'CompletelyWrongPassword!',
        });

        expect(res.status).toBe(401);
      }
    });
  });

  describe('PHASE 4: JWT Authentication & Hydration (/auth/me)', () => {
    it('should return 401 when Authorization header is missing', async () => {
      const res = await request(httpServer).get('/auth/me');
      expect(res.status).toBe(401);
    });

    it('should return 401 when token is malformed', async () => {
      const res = await request(httpServer)
        .get('/auth/me')
        .set('Authorization', 'Bearer not.a.valid.jwt.token');

      expect(res.status).toBe(401);
    });

    it('should return 401 when token signature is invalid / tampered', async () => {
      const fakeSecretToken = jwtService.sign(
        { sub: 'fake-id', email: 'tampered@gigly.com', role: Role.ADMIN },
        { secret: 'wrong-server-secret-key-12345' },
      );

      const res = await request(httpServer)
        .get('/auth/me')
        .set('Authorization', `Bearer ${fakeSecretToken}`);

      expect(res.status).toBe(401);
    });

    it('should successfully authenticate real ADMIN user from database via JWT', async () => {
      const adminUser = await prismaService.user.findFirst({
        where: { role: Role.ADMIN },
      });

      if (adminUser) {
        const validAdminToken = jwtService.sign(
          { sub: adminUser.id, email: adminUser.email, role: adminUser.role },
          { secret: configService.get<string>('JWT_SECRET') },
        );

        const res = await request(httpServer)
          .get('/auth/me')
          .set('Authorization', `Bearer ${validAdminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.id).toBe(adminUser.id);
        expect(res.body.email).toBe(adminUser.email);
        expect(res.body.role).toBe(Role.ADMIN);
        expect(res.body.passwordHash).toBeUndefined();
        expect(res.body.passWordHash).toBeUndefined();
      }
    });

    it('should successfully authenticate real WORKER user from database via JWT', async () => {
      const workerUser = await prismaService.user.findFirst({
        where: { role: Role.WORKER },
      });

      if (workerUser) {
        const validWorkerToken = jwtService.sign(
          {
            sub: workerUser.id,
            email: workerUser.email,
            role: workerUser.role,
          },
          { secret: configService.get<string>('JWT_SECRET') },
        );

        const res = await request(httpServer)
          .get('/auth/me')
          .set('Authorization', `Bearer ${validWorkerToken}`);

        expect(res.status).toBe(200);
        expect(res.body.id).toBe(workerUser.id);
        expect(res.body.role).toBe(Role.WORKER);
        expect(res.body.passwordHash).toBeUndefined();
      }
    });

    it('should successfully authenticate real RECRUITER user from database via JWT', async () => {
      const recruiterUser = await prismaService.user.findFirst({
        where: { role: Role.RECRUITER },
      });

      if (recruiterUser) {
        const validRecruiterToken = jwtService.sign(
          {
            sub: recruiterUser.id,
            email: recruiterUser.email,
            role: recruiterUser.role,
          },
          { secret: configService.get<string>('JWT_SECRET') },
        );

        const res = await request(httpServer)
          .get('/auth/me')
          .set('Authorization', `Bearer ${validRecruiterToken}`);

        expect(res.status).toBe(200);
        expect(res.body.id).toBe(recruiterUser.id);
        expect(res.body.role).toBe(Role.RECRUITER);
        expect(res.body.passwordHash).toBeUndefined();
      }
    });
  });

  describe('PHASE 10: Cryptographic Tampering Verification', () => {
    it('should reject when a WORKER modifies JWT payload to ADMIN without signature', async () => {
      const workerUser = await prismaService.user.findFirst({
        where: { role: Role.WORKER },
      });

      if (workerUser) {
        // Legitimate token
        const validToken = jwtService.sign(
          { sub: workerUser.id, email: workerUser.email, role: Role.WORKER },
          { secret: configService.get<string>('JWT_SECRET') },
        );

        // Attacker decodes header.payload.signature and edits payload role to ADMIN
        const [header, payload, signature] = validToken.split('.');
        const decodedPayload = JSON.parse(
          Buffer.from(payload, 'base64').toString('utf-8'),
        ) as Record<string, unknown>;
        decodedPayload.role = 'ADMIN';

        const tamperedPayload = Buffer.from(
          JSON.stringify(decodedPayload),
        ).toString('base64url');
        const tamperedToken = `${header}.${tamperedPayload}.${signature}`;

        const res = await request(httpServer)
          .get('/auth/me')
          .set('Authorization', `Bearer ${tamperedToken}`);

        expect(res.status).toBe(401);
      }
    });
  });

  describe('PHASE 11 & 12: Refresh Token Security Hardening, Token Families & Reuse Detection (9C-2, 9C-3, 9C-4)', () => {
    const loginEmail = 'e2e_refresh_login@gigly.com';
    const refreshEmail = 'e2e_refresh_token@gigly.com';
    const isolationEmail = 'e2e_refresh_isolation@gigly.com';
    const e2ePassword = 'SecurePassword123!';
    let loginUserId: string;
    let refreshUserId: string;
    let isolationUserId: string;

    beforeAll(async () => {
      const passwordHash = await bcrypt.hash(e2ePassword, 10);
      const user1 = await prismaService.user.upsert({
        where: { email: loginEmail },
        update: { passwordHash },
        create: {
          email: loginEmail,
          passwordHash,
          role: Role.WORKER,
          firstName: 'E2E',
          lastName: 'LoginTester',
        },
      });
      loginUserId = user1.id;

      const user2 = await prismaService.user.upsert({
        where: { email: refreshEmail },
        update: { passwordHash },
        create: {
          email: refreshEmail,
          passwordHash,
          role: Role.WORKER,
          firstName: 'E2E',
          lastName: 'RefreshTester',
        },
      });
      refreshUserId = user2.id;

      const user3 = await prismaService.user.upsert({
        where: { email: isolationEmail },
        update: { passwordHash },
        create: {
          email: isolationEmail,
          passwordHash,
          role: Role.WORKER,
          firstName: 'E2E',
          lastName: 'IsolationTester',
        },
      });
      isolationUserId = user3.id;
    });

    afterAll(async () => {
      await prismaService.refreshToken.deleteMany({
        where: {
          userId: { in: [loginUserId, refreshUserId, isolationUserId] },
        },
      });
      await prismaService.user.deleteMany({
        where: { id: { in: [loginUserId, refreshUserId, isolationUserId] } },
      });
    });

    it('LOGIN (TEST 1): sets HttpOnly refresh token cookie, omits refresh_token from body, creates new familyId, sets revokedAt to null, and persists ONLY 64-char SHA-256 hash in PostgreSQL', async () => {
      const loginRes = await request(httpServer).post('/auth/login').send({
        email: loginEmail,
        password: e2ePassword,
      });

      expect(loginRes.status).toBe(201);
      expect(loginRes.body.access_token).toBeDefined();
      expect(loginRes.body.refresh_token).toBeUndefined();

      const setCookie = loginRes.headers['set-cookie'] as unknown;
      const cookies: string[] = Array.isArray(setCookie)
        ? (setCookie as string[])
        : typeof setCookie === 'string'
          ? [setCookie]
          : [];
      const refreshCookie = cookies.find((c) => c.startsWith('refresh_token='));
      expect(refreshCookie).toBeDefined();
      expect(refreshCookie).toContain('HttpOnly');
      expect(refreshCookie).toContain('Path=/auth');
      expect(refreshCookie).toContain('SameSite=Strict');
      expect(refreshCookie).toContain('Max-Age=604800');

      const rawRefreshToken = getRefreshTokenFromCookie(loginRes);
      expect(rawRefreshToken.startsWith('eyJ')).toBe(true);

      // Verify PostgreSQL state
      const dbTokens = await prismaService.refreshToken.findMany({
        where: { userId: loginUserId },
      });

      expect(dbTokens.length).toBeGreaterThanOrEqual(1);

      const savedRecord = dbTokens[dbTokens.length - 1];
      const expectedHash = crypto
        .createHash('sha256')
        .update(rawRefreshToken)
        .digest('hex');

      // Database stores ONLY the 64-character hexadecimal SHA-256 hash
      expect(savedRecord.token).not.toBe(rawRefreshToken);
      expect(savedRecord.token).not.toContain('eyJ');
      expect(savedRecord.token).toHaveLength(64);
      expect(savedRecord.token).toMatch(/^[0-9a-f]{64}$/);
      expect(savedRecord.token).toBe(expectedHash);

      // 9C-4: Token family model verification
      expect(savedRecord.familyId).toBeDefined();
      expect(savedRecord.familyId.length).toBeGreaterThanOrEqual(32);
      expect(savedRecord.revokedAt).toBeNull(); // ACTIVE

      // Verify table contains NO plaintext JWTs
      const allDbTokens = await prismaService.refreshToken.findMany();
      for (const t of allDbTokens) {
        expect(t.token).toHaveLength(64);
        expect(t.token.startsWith('eyJ')).toBe(false);
      }
    });

    it('SEQUENTIAL ROTATION (TEST 2, 3, 4): normal rotation A -> B -> C -> D succeeds, preserves familyId across all tokens, marks old tokens as revoked (never deleted), and leaves latest token active', async () => {
      // Step 1: Log in and get Token A
      const loginRes = await request(httpServer).post('/auth/login').send({
        email: refreshEmail,
        password: e2ePassword,
      });

      expect(loginRes.status).toBe(201);
      expect(loginRes.body.refresh_token).toBeUndefined();
      const rawRefreshTokenA = getRefreshTokenFromCookie(loginRes);
      const hashA = crypto
        .createHash('sha256')
        .update(rawRefreshTokenA)
        .digest('hex');

      const tokenRecordA = await prismaService.refreshToken.findUnique({
        where: { token: hashA },
      });
      expect(tokenRecordA).not.toBeNull();
      const familyId = tokenRecordA!.familyId;
      expect(tokenRecordA!.revokedAt).toBeNull();

      // Step 2: First rotation A -> B
      const refreshRes1 = await request(httpServer)
        .post('/auth/refresh')
        .set('Cookie', [`refresh_token=${rawRefreshTokenA}`]);

      expect(refreshRes1.status).toBe(201);
      expect(refreshRes1.body.access_token).toBeDefined();
      expect(refreshRes1.body.refresh_token).toBeUndefined();

      const rawRefreshTokenB = getRefreshTokenFromCookie(refreshRes1);
      expect(rawRefreshTokenB).not.toBe(rawRefreshTokenA);
      const hashB = crypto
        .createHash('sha256')
        .update(rawRefreshTokenB)
        .digest('hex');

      // Verify DB: Token A remains persisted but revoked; Token B is active with same familyId
      const dbTokenAAfter1 = await prismaService.refreshToken.findUnique({
        where: { token: hashA },
      });
      expect(dbTokenAAfter1).not.toBeNull();
      expect(dbTokenAAfter1!.revokedAt).not.toBeNull(); // REVOKED
      expect(dbTokenAAfter1!.familyId).toBe(familyId);

      const dbTokenB = await prismaService.refreshToken.findUnique({
        where: { token: hashB },
      });
      expect(dbTokenB).not.toBeNull();
      expect(dbTokenB!.revokedAt).toBeNull(); // ACTIVE
      expect(dbTokenB!.familyId).toBe(familyId); // Same family!

      // Verify newly issued access token works on /auth/me
      const meRes = await request(httpServer)
        .get('/auth/me')
        .set('Authorization', `Bearer ${refreshRes1.body.access_token}`);
      expect(meRes.status).toBe(200);
      expect(meRes.body.id).toBe(refreshUserId);

      // Step 3: Second rotation B -> C
      const refreshRes2 = await request(httpServer)
        .post('/auth/refresh')
        .set('Cookie', [`refresh_token=${rawRefreshTokenB}`]);

      expect(refreshRes2.status).toBe(201);
      expect(refreshRes2.body.access_token).toBeDefined();
      expect(refreshRes2.body.refresh_token).toBeUndefined();
      const rawRefreshTokenC = getRefreshTokenFromCookie(refreshRes2);
      expect(rawRefreshTokenC).not.toBe(rawRefreshTokenB);
      const hashC = crypto
        .createHash('sha256')
        .update(rawRefreshTokenC)
        .digest('hex');

      const dbTokenBAfter2 = await prismaService.refreshToken.findUnique({
        where: { token: hashB },
      });
      expect(dbTokenBAfter2!.revokedAt).not.toBeNull(); // REVOKED
      expect(dbTokenBAfter2!.familyId).toBe(familyId);

      const dbTokenC = await prismaService.refreshToken.findUnique({
        where: { token: hashC },
      });
      expect(dbTokenC!.revokedAt).toBeNull(); // ACTIVE
      expect(dbTokenC!.familyId).toBe(familyId); // Same family!

      // Step 4: Third rotation C -> D
      const refreshRes3 = await request(httpServer)
        .post('/auth/refresh')
        .set('Cookie', [`refresh_token=${rawRefreshTokenC}`]);

      expect(refreshRes3.status).toBe(201);
      expect(refreshRes3.body.access_token).toBeDefined();
      expect(refreshRes3.body.refresh_token).toBeUndefined();
      const rawRefreshTokenD = getRefreshTokenFromCookie(refreshRes3);
      expect(rawRefreshTokenD).not.toBe(rawRefreshTokenC);
      const hashD = crypto
        .createHash('sha256')
        .update(rawRefreshTokenD)
        .digest('hex');

      const dbTokenCAfter3 = await prismaService.refreshToken.findUnique({
        where: { token: hashC },
      });
      expect(dbTokenCAfter3!.revokedAt).not.toBeNull(); // REVOKED
      expect(dbTokenCAfter3!.familyId).toBe(familyId);

      const dbTokenD = await prismaService.refreshToken.findUnique({
        where: { token: hashD },
      });
      expect(dbTokenD!.revokedAt).toBeNull(); // ACTIVE
      expect(dbTokenD!.familyId).toBe(familyId); // Same family!

      // Verify all 4 tokens (A, B, C, D) exist in DB and share the same familyId
      const familyTokens = await prismaService.refreshToken.findMany({
        where: { familyId },
      });
      expect(familyTokens).toHaveLength(4);
      expect(
        familyTokens.filter((t) => t.revokedAt === null).map((t) => t.token),
      ).toEqual([hashD]);
    });

    it('REUSE DETECTION & FAMILY REVOCATION (TEST 5, 6, 7, 12): replaying consumed token A triggers reuse detection (401), revokes entire family, and invalidates active token D and all descendants', async () => {
      // 1. Create a fresh token chain A -> B -> C -> D for reuse detection testing
      const loginRes = await request(httpServer).post('/auth/login').send({
        email: refreshEmail,
        password: e2ePassword,
      });
      const rawA = getRefreshTokenFromCookie(loginRes);

      const ref1 = await request(httpServer)
        .post('/auth/refresh')
        .set('Cookie', [`refresh_token=${rawA}`]);
      const rawB = getRefreshTokenFromCookie(ref1);

      const ref2 = await request(httpServer)
        .post('/auth/refresh')
        .set('Cookie', [`refresh_token=${rawB}`]);
      const rawC = getRefreshTokenFromCookie(ref2);

      const ref3 = await request(httpServer)
        .post('/auth/refresh')
        .set('Cookie', [`refresh_token=${rawC}`]);
      const rawD = getRefreshTokenFromCookie(ref3);

      const hashA = crypto.createHash('sha256').update(rawA).digest('hex');
      const tokenRecA = await prismaService.refreshToken.findUnique({
        where: { token: hashA },
      });
      const reuseFamilyId = tokenRecA!.familyId;

      // 2. TEST 5: Present already-consumed Token A again (REUSE ATTACK!)
      const replayRes = await request(httpServer)
        .post('/auth/refresh')
        .set('Cookie', [`refresh_token=${rawA}`]);
      expect(replayRes.status).toBe(401);

      // Verify the entire family is now revoked in PostgreSQL!
      const familyTokens = await prismaService.refreshToken.findMany({
        where: { familyId: reuseFamilyId },
      });
      expect(familyTokens.length).toBeGreaterThanOrEqual(4);
      for (const t of familyTokens) {
        expect(t.revokedAt).not.toBeNull();
      }

      // 3. TEST 6: Current active token D must now be REJECTED with 401
      const refreshDRes = await request(httpServer)
        .post('/auth/refresh')
        .set('Cookie', [`refresh_token=${rawD}`]);
      expect(refreshDRes.status).toBe(401);

      // 4. TEST 7: Previous descendants B and C must also be REJECTED with 401
      const refreshBRes = await request(httpServer)
        .post('/auth/refresh')
        .set('Cookie', [`refresh_token=${rawB}`]);
      expect(refreshBRes.status).toBe(401);

      const refreshCRes = await request(httpServer)
        .post('/auth/refresh')
        .set('Cookie', [`refresh_token=${rawC}`]);
      expect(refreshCRes.status).toBe(401);

      // 5. TEST 12: No resurrection - repeated attempts with any token in this family fail
      const repeatA = await request(httpServer)
        .post('/auth/refresh')
        .set('Cookie', [`refresh_token=${rawA}`]);
      expect(repeatA.status).toBe(401);

      const repeatD = await request(httpServer)
        .post('/auth/refresh')
        .set('Cookie', [`refresh_token=${rawD}`]);
      expect(repeatD.status).toBe(401);
    });

    it('NEW LOGIN CREATES NEW FAMILY & FAMILY ISOLATION (TEST 13 & 14): new login gets a new familyId, and revoking one family does NOT affect another active family', async () => {
      // TEST 13: User 1 performs new login -> gets Family F_user1
      const user1Login = await request(httpServer).post('/auth/login').send({
        email: refreshEmail,
        password: e2ePassword,
      });
      const rawUser1_A = getRefreshTokenFromCookie(user1Login);
      const hashUser1_A = crypto
        .createHash('sha256')
        .update(rawUser1_A)
        .digest('hex');

      const recUser1_A = await prismaService.refreshToken.findUnique({
        where: { token: hashUser1_A },
      });
      const familyUser1 = recUser1_A!.familyId;

      // User 1 rotates A -> B
      const user1Rotate = await request(httpServer)
        .post('/auth/refresh')
        .set('Cookie', [`refresh_token=${rawUser1_A}`]);
      expect(user1Rotate.status).toBe(201);
      const rawUser1_B = getRefreshTokenFromCookie(user1Rotate);

      // User 2 (Isolation user) logs in -> gets Family F_user2
      const user2Login = await request(httpServer).post('/auth/login').send({
        email: isolationEmail,
        password: e2ePassword,
      });
      const rawUser2_X = getRefreshTokenFromCookie(user2Login);
      const hashUser2_X = crypto
        .createHash('sha256')
        .update(rawUser2_X)
        .digest('hex');

      const recUser2_X = await prismaService.refreshToken.findUnique({
        where: { token: hashUser2_X },
      });
      const familyUser2 = recUser2_X!.familyId;

      // Ensure distinct families
      expect(familyUser1).not.toBe(familyUser2);

      // User 2 rotates X -> Y
      const user2Rotate = await request(httpServer)
        .post('/auth/refresh')
        .set('Cookie', [`refresh_token=${rawUser2_X}`]);
      expect(user2Rotate.status).toBe(201);
      const rawUser2_Y = getRefreshTokenFromCookie(user2Rotate);

      // Trigger reuse detection on User 2's family by replaying User 2's Token X
      const replayUser2 = await request(httpServer)
        .post('/auth/refresh')
        .set('Cookie', [`refresh_token=${rawUser2_X}`]);
      expect(replayUser2.status).toBe(401);

      // User 2's family is revoked
      const tokensUser2 = await prismaService.refreshToken.findMany({
        where: { familyId: familyUser2 },
      });
      for (const t of tokensUser2) {
        expect(t.revokedAt).not.toBeNull();
      }
      // User 2's Token Y is rejected
      const user2YRes = await request(httpServer)
        .post('/auth/refresh')
        .set('Cookie', [`refresh_token=${rawUser2_Y}`]);
      expect(user2YRes.status).toBe(401);

      // TEST 14 (Family Isolation): User 1's family F_user1 is completely UNAFFECTED!
      const hashUser1_B = crypto
        .createHash('sha256')
        .update(rawUser1_B)
        .digest('hex');
      const recUser1_B = await prismaService.refreshToken.findUnique({
        where: { token: hashUser1_B },
      });
      expect(recUser1_B!.revokedAt).toBeNull(); // Still ACTIVE!

      // User 1 can successfully refresh Token B -> Token C
      const user1RefreshSuccess = await request(httpServer)
        .post('/auth/refresh')
        .set('Cookie', [`refresh_token=${rawUser1_B}`]);

      expect(user1RefreshSuccess.status).toBe(201);
      expect(user1RefreshSuccess.body.access_token).toBeDefined();
      expect(user1RefreshSuccess.body.refresh_token).toBeUndefined();
    });

    it('UNKNOWN & TAMPERED & EXPIRED TOKENS (TEST 8, 9, 10): rejects unknown, tampered, or expired tokens with 401 without revoking valid families', async () => {
      // TEST 9: Tampered signature
      const tamperedRes = await request(httpServer)
        .post('/auth/refresh')
        .set('Cookie', ['refresh_token=invalid.tampered.refresh.token']);
      expect(tamperedRes.status).toBe(401);

      // TEST 8: Unknown token (validly signed JWT with non-existent token in DB)
      const unknownRawJwt = await jwtService.signAsync(
        { sub: refreshUserId },
        {
          secret: configService.get<string>('JWT_REFRESH_SECRET'),
          expiresIn: '7d',
          jwtid: crypto.randomUUID(),
        },
      );
      const unknownRes = await request(httpServer)
        .post('/auth/refresh')
        .set('Cookie', [`refresh_token=${unknownRawJwt}`]);
      expect(unknownRes.status).toBe(401);

      // TEST 10: Expired token
      const expiredRawJwt = await jwtService.signAsync(
        { sub: refreshUserId },
        {
          secret: configService.get<string>('JWT_REFRESH_SECRET'),
          expiresIn: '-1m', // Already expired
          jwtid: crypto.randomUUID(),
        },
      );
      const expiredRes = await request(httpServer)
        .post('/auth/refresh')
        .set('Cookie', [`refresh_token=${expiredRawJwt}`]);
      expect(expiredRes.status).toBe(401);
    });

    it('ATOMIC ROTATION ROLLBACK (TEST 11): if creation of replacement token fails inside transaction, old token remains active (revokedAt is null) and remains valid for subsequent refresh', async () => {
      // 1. Generate valid refresh token A for refreshUserId
      const rawRefreshTokenA = await jwtService.signAsync(
        { sub: refreshUserId },
        {
          secret: configService.get<string>('JWT_REFRESH_SECRET'),
          expiresIn: '7d',
          jwtid: crypto.randomUUID(),
        },
      );
      const hashA = crypto
        .createHash('sha256')
        .update(rawRefreshTokenA)
        .digest('hex');
      const rollbackFamilyId = crypto.randomUUID();

      // Persist Token A hash in DB as active
      await prismaService.refreshToken.create({
        data: {
          token: hashA,
          userId: refreshUserId,
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
          familyId: rollbackFamilyId,
          revokedAt: null,
        },
      });

      // Verify Token A exists in PostgreSQL and is active
      const tokenABefore = await prismaService.refreshToken.findUnique({
        where: { token: hashA },
      });
      expect(tokenABefore).not.toBeNull();
      expect(tokenABefore!.revokedAt).toBeNull();

      // 2. Attempt atomic rotate with invalid replacement token data (invalid FK userId)
      const invalidReplacementHash = crypto
        .createHash('sha256')
        .update('invalid-replacement-token')
        .digest('hex');

      await expect(
        refreshTokenRepository.rotate(hashA, {
          token: invalidReplacementHash,
          userId: '00000000-0000-0000-0000-000000000000', // Non-existent user -> FK constraint failure P2003
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
          familyId: rollbackFamilyId,
        }),
      ).rejects.toThrow();

      // 3. Verify PostgreSQL rollback:
      // The update marking Token A revoked was rolled back, so revokedAt remains NULL!
      const tokenAAfterFailedRotate =
        await prismaService.refreshToken.findUnique({
          where: { token: hashA },
        });
      expect(tokenAAfterFailedRotate).not.toBeNull();
      expect(tokenAAfterFailedRotate?.token).toBe(hashA);
      expect(tokenAAfterFailedRotate?.revokedAt).toBeNull(); // ROLLED BACK TO ACTIVE!

      // Replacement token was NOT persisted
      const failedReplacementToken =
        await prismaService.refreshToken.findUnique({
          where: { token: invalidReplacementHash },
        });
      expect(failedReplacementToken).toBeNull();

      // 4. Verify Token A remains completely valid and usable for refresh
      const refreshRes = await request(httpServer)
        .post('/auth/refresh')
        .set('Cookie', [`refresh_token=${rawRefreshTokenA}`]);

      expect(refreshRes.status).toBe(201);
      expect(refreshRes.body.access_token).toBeDefined();
      expect(refreshRes.body.refresh_token).toBeUndefined();

      const rawRefreshTokenB = getRefreshTokenFromCookie(refreshRes);
      const hashB = crypto
        .createHash('sha256')
        .update(rawRefreshTokenB)
        .digest('hex');

      // Now Token A is revoked and Token B exists as active
      const tokenAAfterSuccess = await prismaService.refreshToken.findUnique({
        where: { token: hashA },
      });
      expect(tokenAAfterSuccess).not.toBeNull();
      expect(tokenAAfterSuccess!.revokedAt).not.toBeNull(); // REVOKED

      const tokenBAfterSuccess = await prismaService.refreshToken.findUnique({
        where: { token: hashB },
      });
      expect(tokenBAfterSuccess).not.toBeNull();
      expect(tokenBAfterSuccess!.revokedAt).toBeNull(); // ACTIVE
      expect(tokenBAfterSuccess!.familyId).toBe(rollbackFamilyId);
    });

    it('CONCURRENT REFRESH PROTECTION (STEP 19): two concurrent refresh requests for the same token cannot both succeed, exactly one rotates or both fail, and no duplicate active tokens exist in DB', async () => {
      // 1. Create a fresh token A via login
      const loginRes = await request(httpServer).post('/auth/login').send({
        email: refreshEmail,
        password: e2ePassword,
      });
      expect(loginRes.status).toBe(201);
      const rawTokenA = getRefreshTokenFromCookie(loginRes);
      const hashA = crypto.createHash('sha256').update(rawTokenA).digest('hex');

      const tokenRecA = await prismaService.refreshToken.findUnique({
        where: { token: hashA },
      });
      const raceFamilyId = tokenRecA!.familyId;

      // 2. Dispatch two concurrent refresh requests presenting the exact same Token A
      const [res1, res2] = await Promise.all([
        request(httpServer)
          .post('/auth/refresh')
          .set('Cookie', [`refresh_token=${rawTokenA}`]),
        request(httpServer)
          .post('/auth/refresh')
          .set('Cookie', [`refresh_token=${rawTokenA}`]),
      ]);

      const statuses = [res1.status, res2.status];

      // INVARIANT: At most ONE request can succeed with HTTP 201
      const successCount = statuses.filter((s) => s === 201).length;
      expect(successCount).toBeLessThanOrEqual(1);

      // The non-successful request (if any) MUST be 401 Unauthorized
      const failedStatuses = statuses.filter((s) => s !== 201);
      for (const st of failedStatuses) {
        expect(st).toBe(401);
      }

      // 3. Database verification:
      // The old token A must be marked revoked
      const tokenAAfterRace = await prismaService.refreshToken.findUnique({
        where: { token: hashA },
      });
      expect(tokenAAfterRace!.revokedAt).not.toBeNull();

      // There must NOT be two active tokens created in this family
      const activeReplacementTokens = await prismaService.refreshToken.findMany(
        {
          where: {
            familyId: raceFamilyId,
            revokedAt: null,
          },
        },
      );
      expect(activeReplacementTokens.length).toBeLessThanOrEqual(1);
    });
  });

  describe('PHASE 13: Backend Logout & Server-Side Session Revocation (9C-5)', () => {
    const logoutEmail = 'e2e_logout_test@gigly.com';
    const otherUserEmail = 'e2e_logout_other@gigly.com';
    const e2ePassword = 'SecurePassword123!';
    let logoutUserId: string;
    let otherUserId: string;

    beforeAll(async () => {
      const passwordHash = await bcrypt.hash(e2ePassword, 10);
      const user1 = await prismaService.user.upsert({
        where: { email: logoutEmail },
        update: { passwordHash },
        create: {
          email: logoutEmail,
          passwordHash,
          role: Role.WORKER,
          firstName: 'E2E',
          lastName: 'LogoutTester',
        },
      });
      logoutUserId = user1.id;

      const user2 = await prismaService.user.upsert({
        where: { email: otherUserEmail },
        update: { passwordHash },
        create: {
          email: otherUserEmail,
          passwordHash,
          role: Role.WORKER,
          firstName: 'E2E',
          lastName: 'OtherLogoutTester',
        },
      });
      otherUserId = user2.id;
    });

    afterAll(async () => {
      await prismaService.refreshToken.deleteMany({
        where: { userId: { in: [logoutUserId, otherUserId] } },
      });
      await prismaService.user.deleteMany({
        where: { id: { in: [logoutUserId, otherUserId] } },
      });
    });

    it('LOGOUT (TEST 1 & 2): authenticated logout with valid refresh token returns 200, revokes the specific family, stores hash at rest, clears cookie, and does NOT issue or return tokens', async () => {
      // 1. User logs in
      const loginRes = await request(httpServer).post('/auth/login').send({
        email: logoutEmail,
        password: e2ePassword,
      });

      expect(loginRes.status).toBe(201);
      const accessToken = loginRes.body.access_token as string;
      const rawRefreshToken = getRefreshTokenFromCookie(loginRes);
      const tokenHash = crypto
        .createHash('sha256')
        .update(rawRefreshToken)
        .digest('hex');

      const initialToken = await prismaService.refreshToken.findUnique({
        where: { token: tokenHash },
      });
      expect(initialToken).not.toBeNull();
      const familyId = initialToken!.familyId;
      expect(initialToken!.revokedAt).toBeNull();

      // 2. Authenticated logout request with cookie
      const logoutRes = await request(httpServer)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Cookie', [`refresh_token=${rawRefreshToken}`]);

      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body).toEqual({ message: 'Logged out successfully' });
      expect(logoutRes.body.access_token).toBeUndefined();
      expect(logoutRes.body.refresh_token).toBeUndefined();

      // Verify Set-Cookie header clears the refresh_token cookie
      const setCookie = logoutRes.headers['set-cookie'] as unknown;
      const cookies: string[] = Array.isArray(setCookie)
        ? (setCookie as string[])
        : typeof setCookie === 'string'
          ? [setCookie]
          : [];
      const refreshCookie = cookies.find((c) => c.startsWith('refresh_token='));
      expect(refreshCookie).toBeDefined();
      expect(refreshCookie).toMatch(/refresh_token=;|refresh_token=(;|$)/);
      expect(refreshCookie).toContain('Path=/auth');
      expect(refreshCookie).toContain('HttpOnly');
      expect(refreshCookie).toContain('SameSite=Strict');

      // 3. PostgreSQL direct verification:
      // Token was NOT physically deleted; it is marked revoked!
      const tokenAfterLogout = await prismaService.refreshToken.findUnique({
        where: { token: tokenHash },
      });
      expect(tokenAfterLogout).not.toBeNull();
      expect(tokenAfterLogout!.revokedAt).not.toBeNull();
      expect(tokenAfterLogout!.familyId).toBe(familyId);

      // Verify token remains hashed (64-char hex, no raw JWT in DB)
      expect(tokenAfterLogout!.token).toHaveLength(64);
      expect(tokenAfterLogout!.token).not.toContain('eyJ');
    });

    it('LOGOUT (TEST 3 & 4): previously active refresh token cannot refresh after logout, and the entire family is permanently revoked', async () => {
      // 1. User logs in and rotates once (A -> B)
      const loginRes = await request(httpServer).post('/auth/login').send({
        email: logoutEmail,
        password: e2ePassword,
      });
      const accessToken = loginRes.body.access_token as string;
      const rawA = getRefreshTokenFromCookie(loginRes);

      const rotateRes = await request(httpServer)
        .post('/auth/refresh')
        .set('Cookie', [`refresh_token=${rawA}`]);
      expect(rotateRes.status).toBe(201);
      const rawB = getRefreshTokenFromCookie(rotateRes);

      const hashA = crypto.createHash('sha256').update(rawA).digest('hex');
      const hashB = crypto.createHash('sha256').update(rawB).digest('hex');
      const tokenRecA = await prismaService.refreshToken.findUnique({
        where: { token: hashA },
      });
      const familyId = tokenRecA!.familyId;

      // 2. Log out using active Token B via cookie
      const logoutRes = await request(httpServer)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Cookie', [`refresh_token=${rawB}`]);
      expect(logoutRes.status).toBe(200);

      // 3. Verify ALL family members (Token A and Token B) are now revoked in DB
      const familyTokens = await prismaService.refreshToken.findMany({
        where: { familyId },
      });
      expect(familyTokens).toHaveLength(2);
      expect(familyTokens.map((t) => t.token)).toEqual(
        expect.arrayContaining([hashA, hashB]),
      );
      for (const t of familyTokens) {
        expect(t.revokedAt).not.toBeNull();
      }

      // 4. Attempting to refresh with Token B via cookie must FAIL with 401
      const refreshB = await request(httpServer)
        .post('/auth/refresh')
        .set('Cookie', [`refresh_token=${rawB}`]);
      expect(refreshB.status).toBe(401);

      // 5. Attempting to refresh with Token A via cookie must ALSO FAIL with 401
      const refreshA = await request(httpServer)
        .post('/auth/refresh')
        .set('Cookie', [`refresh_token=${rawA}`]);
      expect(refreshA.status).toBe(401);
    });

    it('LOGOUT (TEST 5): user with multiple sessions (families) logs out one device while another family remains active and rotatable', async () => {
      // 1. Session 1: Laptop login
      const laptopLogin = await request(httpServer).post('/auth/login').send({
        email: logoutEmail,
        password: e2ePassword,
      });
      const laptopAccessToken = laptopLogin.body.access_token as string;
      const laptopRefreshToken = getRefreshTokenFromCookie(laptopLogin);
      const laptopHash = crypto
        .createHash('sha256')
        .update(laptopRefreshToken)
        .digest('hex');
      const laptopRecord = await prismaService.refreshToken.findUnique({
        where: { token: laptopHash },
      });
      const laptopFamilyId = laptopRecord!.familyId;

      // 2. Session 2: Phone login
      const phoneLogin = await request(httpServer).post('/auth/login').send({
        email: logoutEmail,
        password: e2ePassword,
      });
      const phoneRefreshToken = getRefreshTokenFromCookie(phoneLogin);
      const phoneHash = crypto
        .createHash('sha256')
        .update(phoneRefreshToken)
        .digest('hex');
      const phoneRecord = await prismaService.refreshToken.findUnique({
        where: { token: phoneHash },
      });
      const phoneFamilyId = phoneRecord!.familyId;

      // Verify distinct families for the same user
      expect(laptopFamilyId).not.toBe(phoneFamilyId);

      // 3. Log out Laptop session via cookie
      const logoutLaptopRes = await request(httpServer)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${laptopAccessToken}`)
        .set('Cookie', [`refresh_token=${laptopRefreshToken}`]);
      expect(logoutLaptopRes.status).toBe(200);

      // 4. In PostgreSQL: Laptop family is revoked, Phone family is ACTIVE
      const laptopAfter = await prismaService.refreshToken.findUnique({
        where: { token: laptopHash },
      });
      expect(laptopAfter!.revokedAt).not.toBeNull();

      const phoneAfter = await prismaService.refreshToken.findUnique({
        where: { token: phoneHash },
      });
      expect(phoneAfter!.revokedAt).toBeNull(); // STILL ACTIVE!

      // 5. Phone session can successfully refresh and rotate via cookie
      const phoneRefresh = await request(httpServer)
        .post('/auth/refresh')
        .set('Cookie', [`refresh_token=${phoneRefreshToken}`]);
      expect(phoneRefresh.status).toBe(201);
      expect(phoneRefresh.body.access_token).toBeDefined();
      expect(phoneRefresh.body.refresh_token).toBeUndefined();
    });

    it('LOGOUT (TEST 6): revoking user A family via logout does NOT affect user B active family (cross-user family isolation)', async () => {
      // User 1 (logoutUser) login
      const user1Login = await request(httpServer).post('/auth/login').send({
        email: logoutEmail,
        password: e2ePassword,
      });
      const user1AccessToken = user1Login.body.access_token as string;
      const user1RefreshToken = getRefreshTokenFromCookie(user1Login);

      // User 2 (otherUser) login
      const user2Login = await request(httpServer).post('/auth/login').send({
        email: otherUserEmail,
        password: e2ePassword,
      });
      const user2RefreshToken = getRefreshTokenFromCookie(user2Login);
      const user2Hash = crypto
        .createHash('sha256')
        .update(user2RefreshToken)
        .digest('hex');

      // User 1 logs out via cookie
      const logoutUser1 = await request(httpServer)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${user1AccessToken}`)
        .set('Cookie', [`refresh_token=${user1RefreshToken}`]);
      expect(logoutUser1.status).toBe(200);

      // User 2's token remains completely active in DB
      const user2TokenInDb = await prismaService.refreshToken.findUnique({
        where: { token: user2Hash },
      });
      expect(user2TokenInDb!.revokedAt).toBeNull();

      // User 2 can refresh successfully via cookie
      const user2Refresh = await request(httpServer)
        .post('/auth/refresh')
        .set('Cookie', [`refresh_token=${user2RefreshToken}`]);
      expect(user2Refresh.status).toBe(201);
    });

    it('LOGOUT (TEST 7 & 8): cross-user token presentation or unknown token fails with 401 and does NOT revoke any family', async () => {
      // User 1 logs in
      const user1Login = await request(httpServer).post('/auth/login').send({
        email: logoutEmail,
        password: e2ePassword,
      });
      const user1AccessToken = user1Login.body.access_token as string;

      // User 2 logs in
      const user2Login = await request(httpServer).post('/auth/login').send({
        email: otherUserEmail,
        password: e2ePassword,
      });
      const user2RefreshToken = getRefreshTokenFromCookie(user2Login);
      const user2Hash = crypto
        .createHash('sha256')
        .update(user2RefreshToken)
        .digest('hex');

      // TEST 8: User 1 attempts to log out with User 2's refresh token in cookie
      const crossUserLogout = await request(httpServer)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${user1AccessToken}`)
        .set('Cookie', [`refresh_token=${user2RefreshToken}`]);
      expect(crossUserLogout.status).toBe(401);

      // Verify User 2's token was NOT revoked!
      const user2Token = await prismaService.refreshToken.findUnique({
        where: { token: user2Hash },
      });
      expect(user2Token!.revokedAt).toBeNull();

      // TEST 7: Unknown refresh token (validly signed JWT, but non-existent in DB)
      const unknownJwt = await jwtService.signAsync(
        { sub: logoutUserId },
        {
          secret: configService.get<string>('JWT_REFRESH_SECRET'),
          expiresIn: '7d',
          jwtid: crypto.randomUUID(),
        },
      );
      const unknownLogout = await request(httpServer)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${user1AccessToken}`)
        .set('Cookie', [`refresh_token=${unknownJwt}`]);
      expect(unknownLogout.status).toBe(401);
    });

    it('LOGOUT (TEST 9 & 10): missing token, tampered signature, or already-revoked token handled safely without resurrecting tokens', async () => {
      const loginRes = await request(httpServer).post('/auth/login').send({
        email: logoutEmail,
        password: e2ePassword,
      });
      const accessToken = loginRes.body.access_token as string;
      const refreshToken = getRefreshTokenFromCookie(loginRes);

      // 1. Missing Authorization header -> 401
      const noAuthHeader = await request(httpServer)
        .post('/auth/logout')
        .set('Cookie', [`refresh_token=${refreshToken}`]);
      expect(noAuthHeader.status).toBe(401);

      // 2. Missing refresh_token cookie -> 401
      const noRefreshToken = await request(httpServer)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(noRefreshToken.status).toBe(401);

      // 3. Tampered refresh token cookie -> 401
      const tamperedRes = await request(httpServer)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Cookie', ['refresh_token=tampered.refresh.token.123']);
      expect(tamperedRes.status).toBe(401);

      // 4. Initial valid logout -> 200
      const validLogout = await request(httpServer)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Cookie', [`refresh_token=${refreshToken}`]);
      expect(validLogout.status).toBe(200);

      // 5. Subsequent logout with already-revoked token -> succeeds without resurrecting tokens
      const repeatedLogout = await request(httpServer)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Cookie', [`refresh_token=${refreshToken}`]);
      expect(repeatedLogout.status).toBe(200);

      // Refresh token is still revoked, not resurrected
      const hash = crypto
        .createHash('sha256')
        .update(refreshToken)
        .digest('hex');
      const tokenRec = await prismaService.refreshToken.findUnique({
        where: { token: hash },
      });
      expect(tokenRec!.revokedAt).not.toBeNull();
    });
  });

  describe('PHASE 14: 9C-8.2 Clean Break & HttpOnly Cookie Contract Verification', () => {
    const cleanBreakEmail = 'e2e_clean_break@gigly.com';
    const e2ePassword = 'SecurePassword123!';
    let cleanBreakUserId: string;

    beforeAll(async () => {
      const passwordHash = await bcrypt.hash(e2ePassword, 10);
      const user = await prismaService.user.upsert({
        where: { email: cleanBreakEmail },
        update: { passwordHash },
        create: {
          email: cleanBreakEmail,
          passwordHash,
          role: Role.WORKER,
          firstName: 'E2E',
          lastName: 'CleanBreakTester',
        },
      });
      cleanBreakUserId = user.id;
    });

    afterAll(async () => {
      await prismaService.refreshToken.deleteMany({
        where: { userId: cleanBreakUserId },
      });
      await prismaService.user.deleteMany({
        where: { id: cleanBreakUserId },
      });
    });

    it('REFRESH WITHOUT COOKIE: rejects POST /auth/refresh with 401 when no cookie is sent', async () => {
      const res = await request(httpServer).post('/auth/refresh');
      expect(res.status).toBe(401);
    });

    it('REFRESH WITH BODY TOKEN ONLY: rejects legacy body-based refresh with 401 when no cookie is sent (verifies clean break)', async () => {
      const loginRes = await request(httpServer).post('/auth/login').send({
        email: cleanBreakEmail,
        password: e2ePassword,
      });
      const rawToken = getRefreshTokenFromCookie(loginRes);

      const res = await request(httpServer)
        .post('/auth/refresh')
        .send({ refresh_token: rawToken });

      expect(res.status).toBe(401);
    });

    it('LOGOUT WITHOUT COOKIE: rejects POST /auth/logout with 401 when access token is provided but refresh cookie is missing', async () => {
      const loginRes = await request(httpServer).post('/auth/login').send({
        email: cleanBreakEmail,
        password: e2ePassword,
      });
      const accessToken = loginRes.body.access_token as string;

      const res = await request(httpServer)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(401);
    });

    it('LOGOUT WITH BODY TOKEN ONLY: rejects legacy body-based logout with 401 when no cookie is sent (verifies clean break)', async () => {
      const loginRes = await request(httpServer).post('/auth/login').send({
        email: cleanBreakEmail,
        password: e2ePassword,
      });
      const accessToken = loginRes.body.access_token as string;
      const rawToken = getRefreshTokenFromCookie(loginRes);

      const res = await request(httpServer)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refresh_token: rawToken });

      expect(res.status).toBe(401);
    });

    it('SECURITY TEST: refresh_token never appears in HTTP JSON response body for login, refresh, or logout', async () => {
      // 1. Login
      const loginRes = await request(httpServer).post('/auth/login').send({
        email: cleanBreakEmail,
        password: e2ePassword,
      });
      expect(loginRes.status).toBe(201);
      expect(loginRes.body.refresh_token).toBeUndefined();
      expect(JSON.stringify(loginRes.body)).not.toContain('refresh_token');
      const accessToken = loginRes.body.access_token as string;
      const rawToken = getRefreshTokenFromCookie(loginRes);

      // 2. Refresh
      const refreshRes = await request(httpServer)
        .post('/auth/refresh')
        .set('Cookie', [`refresh_token=${rawToken}`]);
      expect(refreshRes.status).toBe(201);
      expect(refreshRes.body.refresh_token).toBeUndefined();
      expect(JSON.stringify(refreshRes.body)).not.toContain('refresh_token');
      const newRawToken = getRefreshTokenFromCookie(refreshRes);

      // 3. Logout
      const logoutRes = await request(httpServer)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Cookie', [`refresh_token=${newRawToken}`]);
      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.refresh_token).toBeUndefined();
      expect(JSON.stringify(logoutRes.body)).not.toContain('refresh_token');
    });
  });

  describe('PHASE 15: Step 9C-9.2 Browser Security Headers Verification', () => {
    it('should set X-Content-Type-Options: nosniff on both authenticated and unauthenticated responses', async () => {
      // Unauthenticated response
      const unauthRes = await request(httpServer).post('/auth/login').send({
        email: 'nonexistent@gigly.com',
        password: 'wrongpassword',
      });
      expect(unauthRes.headers['x-content-type-options']).toBe('nosniff');

      // Authenticated response
      const meRes = await request(httpServer).get('/auth/me');
      expect(meRes.headers['x-content-type-options']).toBe('nosniff');
    });

    it('should set X-Frame-Options: DENY on responses to prevent clickjacking/framing', async () => {
      const res = await request(httpServer).get('/auth/me');
      expect(res.headers['x-frame-options']).toBe('DENY');
    });

    it('should set Referrer-Policy: strict-origin-when-cross-origin on responses', async () => {
      const res = await request(httpServer).get('/auth/me');
      expect(res.headers['referrer-policy']).toBe(
        'strict-origin-when-cross-origin',
      );
    });

    it('should NOT emit Strict-Transport-Security in test/development environments', async () => {
      const res = await request(httpServer).get('/auth/me');
      expect(res.headers['strict-transport-security']).toBeUndefined();
    });
  });

  describe('PHASE 16: Login Rate-Limit Verification', () => {
    const phase16Email = 'e2e_login_ratelimit@gigly.com';
    const e2ePassword = 'SecurePassword123!';
    let phase16UserId: string;

    beforeAll(async () => {
      const passwordHash = await bcrypt.hash(e2ePassword, 10);
      const user = await prismaService.user.upsert({
        where: { email: phase16Email },
        update: { passwordHash },
        create: {
          email: phase16Email,
          passwordHash,
          role: Role.WORKER,
          firstName: 'E2E',
          lastName: 'RateLimitTester',
        },
      });
      phase16UserId = user.id;
    });

    afterAll(async () => {
      await prismaService.refreshToken.deleteMany({
        where: { userId: phase16UserId },
      });
      await prismaService.user.deleteMany({
        where: { id: phase16UserId },
      });
      LoginRateLimitGuard.reset();
    });

    beforeEach(() => {
      LoginRateLimitGuard.reset();
    });

    afterEach(() => {
      LoginRateLimitGuard.reset();
    });

    it('E2E TEST 1: sends 5 invalid login attempts from same IP and all return 401 (normal auth failure preserved below limit)', async () => {
      const clientIp = '198.51.100.101';
      const existingUser = await prismaService.user.findFirst();
      const testEmail = existingUser?.email || phase16Email;

      for (let i = 1; i <= 5; i++) {
        const res = await request(httpServer)
          .post('/auth/login')
          .set('X-Forwarded-For', clientIp)
          .send({
            email: testEmail,
            password: 'InvalidPassword123!',
          });

        expect(res.status).toBe(401);
      }
    });

    it('E2E TEST 2: rejects 6th login request from same IP with 429 Too Many Requests (rate-limit response from guard, not use-case)', async () => {
      const clientIp = '198.51.100.102';
      const existingUser = await prismaService.user.findFirst();
      const testEmail = existingUser?.email || phase16Email;

      // Exhaust 5 requests
      for (let i = 1; i <= 5; i++) {
        const res = await request(httpServer)
          .post('/auth/login')
          .set('X-Forwarded-For', clientIp)
          .send({
            email: testEmail,
            password: 'InvalidPassword123!',
          });
        expect(res.status).toBe(401);
      }

      // 6th request must be rejected with 429
      const sixthRes = await request(httpServer)
        .post('/auth/login')
        .set('X-Forwarded-For', clientIp)
        .send({
          email: testEmail,
          password: 'InvalidPassword123!',
        });

      expect(sixthRes.status).toBe(429);
      expect(sixthRes.body.message).toBe(
        'Too many login attempts. Please try again later.',
      );
    });

    it('E2E TEST 3: verifies safe default — rotating X-Forwarded-For does NOT bypass rate limit when trust proxy is false', async () => {
      const ipA = '198.51.100.103';
      const ipB = '198.51.100.104';

      // Exhaust limit on the socket connection
      for (let i = 1; i <= 5; i++) {
        await request(httpServer)
          .post('/auth/login')
          .set('X-Forwarded-For', ipA)
          .send({
            email: phase16Email,
            password: 'WrongPassword!',
          });
      }

      // IP A 6th attempt is 429
      const resA = await request(httpServer)
        .post('/auth/login')
        .set('X-Forwarded-For', ipA)
        .send({
          email: phase16Email,
          password: 'WrongPassword!',
        });
      expect(resA.status).toBe(429);

      // Under safe default (trust proxy = false), rotating to spoofed ipB does NOT bypass limit; Express resolves socket IP
      const resB = await request(httpServer)
        .post('/auth/login')
        .set('X-Forwarded-For', ipB)
        .send({
          email: phase16Email,
          password: 'WrongPassword!',
        });
      expect(resB.status).toBe(429);
      expect(resB.body.message).toBe(
        'Too many login attempts. Please try again later.',
      );
    });

    it('E2E TEST 4: verifies valid login succeeds under rate limit (returns access_token, sets HttpOnly refresh cookie)', async () => {
      const clientIp = '198.51.100.105';

      const res = await request(httpServer)
        .post('/auth/login')
        .set('X-Forwarded-For', clientIp)
        .send({
          email: phase16Email,
          password: e2ePassword,
        });

      expect(res.status).toBe(201);
      expect(res.body.access_token).toBeDefined();
      expect(typeof res.body.access_token).toBe('string');
      expect(res.body.refresh_token).toBeUndefined();

      const rawRefreshToken = getRefreshTokenFromCookie(res);
      expect(rawRefreshToken).toBeDefined();
      expect(rawRefreshToken.length).toBeGreaterThan(0);
    });

    it('E2E TEST 5: verifies below threshold invalid email/password returns 401 and NOT 429', async () => {
      const clientIp = '198.51.100.106';

      const res = await request(httpServer)
        .post('/auth/login')
        .set('X-Forwarded-For', clientIp)
        .send({
          email: 'nonexistent_ratelimit_user@gigly.com',
          password: 'RandomPassword999!',
        });

      expect(res.status).toBe(401);
      expect(res.status).not.toBe(429);
    });

    it('E2E TEST 6: verifies OTP isolation — exhausting login rate limit does not affect OTP endpoints', async () => {
      const clientIp = '198.51.100.107';

      // 1. Exhaust login rate limit on clientIp
      for (let i = 1; i <= 5; i++) {
        await request(httpServer)
          .post('/auth/login')
          .set('X-Forwarded-For', clientIp)
          .send({
            email: phase16Email,
            password: 'WrongPassword!',
          });
      }

      // Verify login is now blocked with 429
      const blockedLoginRes = await request(httpServer)
        .post('/auth/login')
        .set('X-Forwarded-For', clientIp)
        .send({
          email: phase16Email,
          password: 'WrongPassword!',
        });
      expect(blockedLoginRes.status).toBe(429);

      // 2. Request OTP endpoint from the SAME IP — must NOT be blocked with 429
      const otpRes = await request(httpServer)
        .post('/auth/register/send-otp')
        .set('X-Forwarded-For', clientIp)
        .send({
          email: phase16Email,
          password: 'SomePassword123!',
          firstName: 'Test',
          lastName: 'User',
        });

      // OtpRateLimitGuard is separate: does not return 429 (returns 409 Conflict because user exists)
      expect(otpRes.status).not.toBe(429);
      expect(otpRes.status).toBe(409);
    });

    it('E2E TEST 7: verifies explicit trusted proxy configuration — when trust proxy is enabled, Express resolves distinct forwarded IPs', async () => {
      const expressApp = app.getHttpAdapter().getInstance();
      expressApp.set('trust proxy', true);

      try {
        const ipA = '198.51.100.201';
        const ipB = '198.51.100.202';

        // Exhaust limit on IP A
        for (let i = 1; i <= 5; i++) {
          await request(httpServer)
            .post('/auth/login')
            .set('X-Forwarded-For', ipA)
            .send({
              email: phase16Email,
              password: 'WrongPassword!',
            });
        }

        // IP A 6th attempt is 429
        const resA = await request(httpServer)
          .post('/auth/login')
          .set('X-Forwarded-For', ipA)
          .send({
            email: phase16Email,
            password: 'WrongPassword!',
          });
        expect(resA.status).toBe(429);

        // IP B has distinct resolved request.ip under trusted proxy, so it receives normal 401 auth failure, NOT 429
        const resB = await request(httpServer)
          .post('/auth/login')
          .set('X-Forwarded-For', ipB)
          .send({
            email: phase16Email,
            password: 'WrongPassword!',
          });
        expect(resB.status).toBe(401);
        expect(resB.status).not.toBe(429);
      } finally {
        // Restore default safe trust proxy setting
        expressApp.set('trust proxy', false);
      }
    });
  });

  describe('PHASE 17: Step 9.6 RBAC & JWT Hardening Verification', () => {
    it('JWT HARDENING (TEST 1): valid token signed with configured secret, HS256, issuer, and audience authenticates successfully', async () => {
      const user = await prismaService.user.findFirst();
      expect(user).toBeDefined();

      const validToken = jwtService.sign(
        { sub: user!.id, email: user!.email, role: user!.role },
        {
          secret: configService.get<string>('JWT_SECRET'),
          algorithm: 'HS256',
          issuer: configService.get<string>('JWT_ISSUER') ?? 'gigly-auth',
          audience: configService.get<string>('JWT_AUDIENCE') ?? 'gigly-app',
        },
      );

      const res = await request(httpServer)
        .get('/auth/me')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(user!.id);
      expect(res.body.email).toBe(user!.email);
    });

    it('JWT HARDENING (TEST 2): token signed with mismatched issuer is rejected with 401', async () => {
      const user = await prismaService.user.findFirst();
      expect(user).toBeDefined();

      const invalidIssuerToken = jwtService.sign(
        { sub: user!.id, email: user!.email, role: user!.role },
        {
          secret: configService.get<string>('JWT_SECRET'),
          issuer: 'rogue-issuer',
          audience: configService.get<string>('JWT_AUDIENCE') ?? 'gigly-app',
        },
      );

      const res = await request(httpServer)
        .get('/auth/me')
        .set('Authorization', `Bearer ${invalidIssuerToken}`);

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid or expired token');
    });

    it('JWT HARDENING (TEST 3): token signed with mismatched audience is rejected with 401', async () => {
      const user = await prismaService.user.findFirst();
      expect(user).toBeDefined();

      const invalidAudienceToken = jwtService.sign(
        { sub: user!.id, email: user!.email, role: user!.role },
        {
          secret: configService.get<string>('JWT_SECRET'),
          issuer: configService.get<string>('JWT_ISSUER') ?? 'gigly-auth',
          audience: 'rogue-audience',
        },
      );

      const res = await request(httpServer)
        .get('/auth/me')
        .set('Authorization', `Bearer ${invalidAudienceToken}`);

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid or expired token');
    });

    it('JWT HARDENING (TEST 4): token with unsupported algorithm "none" is rejected with 401', async () => {
      const user = await prismaService.user.findFirst();
      expect(user).toBeDefined();

      const header = Buffer.from(
        JSON.stringify({ alg: 'none', typ: 'JWT' }),
      ).toString('base64url');
      const payload = Buffer.from(
        JSON.stringify({
          sub: user!.id,
          email: user!.email,
          role: user!.role,
          iss: configService.get<string>('JWT_ISSUER') ?? 'gigly-auth',
          aud: configService.get<string>('JWT_AUDIENCE') ?? 'gigly-app',
        }),
      ).toString('base64url');
      const noneAlgToken = `${header}.${payload}.`;

      const res = await request(httpServer)
        .get('/auth/me')
        .set('Authorization', `Bearer ${noneAlgToken}`);

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid or expired token');
    });

    it('RBAC AUTHORIZATION (TEST 5): RolesGuard permits all allowed roles (ADMIN, WORKER, RECRUITER) on shared /auth/me', async () => {
      const roles = [Role.ADMIN, Role.WORKER, Role.RECRUITER];

      for (const role of roles) {
        const user = await prismaService.user.findFirst({ where: { role } });
        if (user) {
          const token = jwtService.sign(
            { sub: user.id, email: user.email, role: user.role },
            { secret: configService.get<string>('JWT_SECRET') },
          );

          const res = await request(httpServer)
            .get('/auth/me')
            .set('Authorization', `Bearer ${token}`);

          expect(res.status).toBe(200);
          expect(res.body.role).toBe(role);
        }
      }
    });
  });
});
