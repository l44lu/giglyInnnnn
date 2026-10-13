import {
  Controller,
  Get,
  Post,
  Delete,
  HttpCode,
  Res,
  INestApplication,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { Response } from 'express';
import { ResponseInterceptor } from './response.interceptor';
import { ResponseMessage } from '../decorators/response-message.decorator';
import { BypassResponseWrapper } from '../decorators/bypass-response-wrapper.decorator';

@Controller('test-interceptor')
class DummyTestController {
  @Get('single')
  getSingle() {
    return { id: 'usr_1', email: 'worker@example.com' };
  }

  @Get('array')
  getArray() {
    return [
      { id: 'usr_1', name: 'Alex' },
      { id: 'usr_2', name: 'Sam' },
    ];
  }

  @Post('create')
  createResource() {
    return { id: 'usr_created', status: 'active' };
  }

  @Delete('no-content')
  @HttpCode(204)
  noContent(): void {
    return;
  }

  @Get('binary')
  @BypassResponseWrapper()
  getBinary(@Res() res: Response) {
    res.setHeader('Content-Type', 'image/png');
    res.send(Buffer.from('dummy-image-bytes'));
  }

  @Post('logout')
  @HttpCode(200)
  @ResponseMessage('Logged out successfully')
  logout(): void {
    return;
  }

  @Get('resource-with-message')
  getResourceWithMessage() {
    return {
      id: '123',
      message: 'This is real resource data',
    };
  }

  @Post('custom-message')
  @ResponseMessage('Operation succeeded')
  customMessageWithData() {
    return { status: 'completed' };
  }
}

describe('ResponseInterceptor HTTP Integration', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [DummyTestController],
    }).compile();

    app = moduleRef.createNestApplication();
    const reflector = app.get(Reflector);
    app.useGlobalInterceptors(new ResponseInterceptor(reflector));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /single: should wrap single object with statusCode 200 and default message', async () => {
    const res = await request(app.getHttpServer())
      .get('/test-interceptor/single')
      .expect(200);

    expect(res.body).toEqual({
      success: true,
      statusCode: 200,
      message: 'Request successful',
      data: { id: 'usr_1', email: 'worker@example.com' },
    });
  });

  it('GET /array: should wrap array with statusCode 200 and default message', async () => {
    const res = await request(app.getHttpServer())
      .get('/test-interceptor/array')
      .expect(200);

    expect(res.body).toEqual({
      success: true,
      statusCode: 200,
      message: 'Request successful',
      data: [
        { id: 'usr_1', name: 'Alex' },
        { id: 'usr_2', name: 'Sam' },
      ],
    });
  });

  it('POST /create: should preserve HTTP 201 status code in envelope', async () => {
    const res = await request(app.getHttpServer())
      .post('/test-interceptor/create')
      .expect(201);

    expect(res.body).toEqual({
      success: true,
      statusCode: 201,
      message: 'Request successful',
      data: { id: 'usr_created', status: 'active' },
    });
  });

  it('DELETE /no-content: should return empty body for HTTP 204', async () => {
    const res = await request(app.getHttpServer())
      .delete('/test-interceptor/no-content')
      .expect(204);

    expect(res.text).toBe('');
    expect(res.body).toEqual({});
  });

  it('GET /binary: should stream raw binary without JSON envelope when @BypassResponseWrapper is used', async () => {
    const res = await request(app.getHttpServer())
      .get('/test-interceptor/binary')
      .expect(200);

    expect(res.headers['content-type']).toContain('image/png');
    expect(Buffer.isBuffer(res.body) || typeof res.text === 'string').toBe(
      true,
    );
    expect(res.body.success).toBeUndefined();
    expect(res.body.statusCode).toBeUndefined();
  });

  it('POST /logout: should produce message-only envelope (data: null) when @ResponseMessage is used and handler returns void', async () => {
    const res = await request(app.getHttpServer())
      .post('/test-interceptor/logout')
      .expect(200);

    expect(res.body).toEqual({
      success: true,
      statusCode: 200,
      message: 'Logged out successfully',
      data: null,
    });
  });

  it('GET /resource-with-message: should preserve message property within data object without treating it as message-only', async () => {
    const res = await request(app.getHttpServer())
      .get('/test-interceptor/resource-with-message')
      .expect(200);

    expect(res.body).toEqual({
      success: true,
      statusCode: 200,
      message: 'Request successful',
      data: {
        id: '123',
        message: 'This is real resource data',
      },
    });
  });

  it('POST /custom-message: should use custom message while preserving data object', async () => {
    const res = await request(app.getHttpServer())
      .post('/test-interceptor/custom-message')
      .expect(201);

    expect(res.body).toEqual({
      success: true,
      statusCode: 201,
      message: 'Operation succeeded',
      data: { status: 'completed' },
    });
  });
});
