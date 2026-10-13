import {
  Controller,
  Get,
  Post,
  Body,
  ValidationPipe,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
  HttpException,
  INestApplication,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { IsEmail, IsNotEmpty } from 'class-validator';
import request from 'supertest';
import { HttpExceptionFilter } from './http-exception.filter';
import { ResponseInterceptor } from '../interceptors/response.interceptor';

class TestValidationDto {
  @IsEmail()
  email!: string;

  @IsNotEmpty()
  name!: string;
}

@Controller('test-pipeline')
class TestPipelineController {
  @Get('success')
  getSuccess() {
    return { id: 'usr_1', status: 'active' };
  }

  @Get('not-found')
  getNotFound() {
    throw new NotFoundException('Resource with ID 999 not found');
  }

  @Get('unauthorized')
  getUnauthorized() {
    throw new UnauthorizedException('Authentication token required');
  }

  @Get('forbidden')
  getForbidden() {
    throw new ForbiddenException('Access denied: Admin role required');
  }

  @Get('conflict')
  getConflict() {
    throw new ConflictException('Email address already registered');
  }

  @Post('validation')
  postValidation(@Body() dto: TestValidationDto) {
    return { status: 'created', email: dto.email };
  }

  @Get('custom-status')
  getCustomStatus() {
    throw new HttpException('Custom teapot exception', 418);
  }

  @Get('unknown-error')
  getUnknownError() {
    throw new Error('Database server connection timeout at host db.internal');
  }
}

describe('HttpExceptionFilter Pipeline Integration', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // Suppress server log noise during intentional 500 error test
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});

    const moduleRef = await Test.createTestingModule({
      controllers: [TestPipelineController],
    }).compile();

    app = moduleRef.createNestApplication();
    const reflector = app.get(Reflector);

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalInterceptors(new ResponseInterceptor(reflector));
    app.useGlobalFilters(new HttpExceptionFilter());

    await app.init();
  });

  afterAll(async () => {
    jest.restoreAllMocks();
    await app.close();
  });

  it('GET /success: should return 200 wrapped by ResponseInterceptor without triggering filter', async () => {
    const res = await request(app.getHttpServer())
      .get('/test-pipeline/success')
      .expect(200);

    expect(res.body).toEqual({
      success: true,
      statusCode: 200,
      message: 'Request successful',
      data: { id: 'usr_1', status: 'active' },
    });
  });

  it('GET /not-found: should return 404 formatted by HttpExceptionFilter', async () => {
    const res = await request(app.getHttpServer())
      .get('/test-pipeline/not-found')
      .expect(404);

    expect(res.body).toEqual({
      success: false,
      statusCode: 404,
      message: 'Resource with ID 999 not found',
      data: null,
    });
  });

  it('GET /unauthorized: should return 401 formatted by HttpExceptionFilter', async () => {
    const res = await request(app.getHttpServer())
      .get('/test-pipeline/unauthorized')
      .expect(401);

    expect(res.body).toEqual({
      success: false,
      statusCode: 401,
      message: 'Authentication token required',
      data: null,
    });
  });

  it('GET /forbidden: should return 403 formatted by HttpExceptionFilter', async () => {
    const res = await request(app.getHttpServer())
      .get('/test-pipeline/forbidden')
      .expect(403);

    expect(res.body).toEqual({
      success: false,
      statusCode: 403,
      message: 'Access denied: Admin role required',
      data: null,
    });
  });

  it('GET /conflict: should return 409 formatted by HttpExceptionFilter', async () => {
    const res = await request(app.getHttpServer())
      .get('/test-pipeline/conflict')
      .expect(409);

    expect(res.body).toEqual({
      success: false,
      statusCode: 409,
      message: 'Email address already registered',
      data: null,
    });
  });

  it('POST /validation: should return 400 with errors array on invalid DTO payload', async () => {
    const res = await request(app.getHttpServer())
      .post('/test-pipeline/validation')
      .send({ email: 'not-an-email', extraProperty: 'not-allowed' })
      .expect(400);

    expect(res.body).toEqual({
      success: false,
      statusCode: 400,
      message: 'Validation failed',
      errors: expect.arrayContaining([
        expect.stringContaining('email'),
        expect.stringContaining('name'),
      ]),
      data: null,
    });
  });

  it('GET /custom-status: should return 418 preserving status code and custom message', async () => {
    const res = await request(app.getHttpServer())
      .get('/test-pipeline/custom-status')
      .expect(418);

    expect(res.body).toEqual({
      success: false,
      statusCode: 418,
      message: 'Custom teapot exception',
      data: null,
    });
  });

  it('GET /unknown-error: should return sanitized 500 masking internal database details', async () => {
    const res = await request(app.getHttpServer())
      .get('/test-pipeline/unknown-error')
      .expect(500);

    expect(res.body).toEqual({
      success: false,
      statusCode: 500,
      message: 'Internal server error',
      data: null,
    });
    expect(JSON.stringify(res.body)).not.toContain('db.internal');
    expect(JSON.stringify(res.body)).not.toContain('timeout');
  });
});
