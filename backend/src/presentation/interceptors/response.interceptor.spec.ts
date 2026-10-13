import { ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of } from 'rxjs';
import type { Response } from 'express';
import { ResponseInterceptor } from './response.interceptor';
import { ApiResponse } from '../interfaces/api-response.interface';
import { RESPONSE_MESSAGE_KEY } from '../decorators/response-message.decorator';
import { BYPASS_RESPONSE_WRAPPER_KEY } from '../decorators/bypass-response-wrapper.decorator';

describe('ResponseInterceptor', () => {
  let interceptor: ResponseInterceptor<unknown>;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    interceptor = new ResponseInterceptor(reflector);
  });

  function createMockExecutionContext(statusCode = 200, headersSent = false) {
    const mockResponse = {
      statusCode,
      headersSent,
    } as Response;

    const mockHandler = () => {};
    const mockClass = class MockController {};

    const mockContext = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => ({}),
      }),
      getHandler: () => mockHandler,
      getClass: () => mockClass,
    } as unknown as ExecutionContext;

    return { mockContext, mockResponse, mockHandler, mockClass };
  }

  function createMockCallHandler<T>(data: T): CallHandler<T> {
    return {
      handle: () => of(data),
    };
  }

  it('should wrap a single resource object with statusCode 200 and default message', (done) => {
    const { mockContext } = createMockExecutionContext(200);
    const controllerResult = { id: 'usr_1', email: 'user@example.com' };
    const next = createMockCallHandler(controllerResult);

    interceptor.intercept(mockContext, next).subscribe({
      next: (result) => {
        expect(result).toEqual({
          success: true,
          statusCode: 200,
          message: 'Request successful',
          data: controllerResult,
        });
        done();
      },
    });
  });

  it('should wrap an array of resources with statusCode 200', (done) => {
    const { mockContext } = createMockExecutionContext(200);
    const controllerResult = [
      { id: 'usr_1', email: 'user1@example.com' },
      { id: 'usr_2', email: 'user2@example.com' },
    ];
    const next = createMockCallHandler(controllerResult);

    interceptor.intercept(mockContext, next).subscribe({
      next: (result) => {
        expect(result).toEqual({
          success: true,
          statusCode: 200,
          message: 'Request successful',
          data: controllerResult,
        });
        done();
      },
    });
  });

  it('should preserve actual HTTP status code 201 for POST responses', (done) => {
    const { mockContext } = createMockExecutionContext(201);
    const controllerResult = { id: 'usr_created', name: 'New User' };
    const next = createMockCallHandler(controllerResult);

    interceptor.intercept(mockContext, next).subscribe({
      next: (result) => {
        expect(result).toEqual({
          success: true,
          statusCode: 201,
          message: 'Request successful',
          data: controllerResult,
        });
        done();
      },
    });
  });

  it('should map undefined to data: null with default message when no custom message set', (done) => {
    const { mockContext } = createMockExecutionContext(200);
    const next = createMockCallHandler(undefined);

    interceptor.intercept(mockContext, next).subscribe({
      next: (result) => {
        expect(result).toEqual({
          success: true,
          statusCode: 200,
          message: 'Request successful',
          data: null,
        });
        done();
      },
    });
  });

  it('should preserve null data in envelope', (done) => {
    const { mockContext } = createMockExecutionContext(200);
    const next = createMockCallHandler(null);

    interceptor.intercept(mockContext, next).subscribe({
      next: (result) => {
        expect(result).toEqual({
          success: true,
          statusCode: 200,
          message: 'Request successful',
          data: null,
        });
        done();
      },
    });
  });

  it('should produce message-only response (data: null) when @ResponseMessage metadata is present and controller returns undefined', (done) => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockImplementation((key: string) => {
        if (key === RESPONSE_MESSAGE_KEY) return 'Logged out successfully';
        return undefined;
      });

    const { mockContext } = createMockExecutionContext(200);
    const next = createMockCallHandler(undefined);

    interceptor.intercept(mockContext, next).subscribe({
      next: (result) => {
        expect(result).toEqual({
          success: true,
          statusCode: 200,
          message: 'Logged out successfully',
          data: null,
        });
        done();
      },
    });
  });

  it('should use custom message alongside resource data when @ResponseMessage metadata is present', (done) => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockImplementation((key: string) => {
        if (key === RESPONSE_MESSAGE_KEY) return 'Password reset successfully';
        return undefined;
      });

    const { mockContext } = createMockExecutionContext(200);
    const controllerResult = { userId: 'usr_1' };
    const next = createMockCallHandler(controllerResult);

    interceptor.intercept(mockContext, next).subscribe({
      next: (result) => {
        expect(result).toEqual({
          success: true,
          statusCode: 200,
          message: 'Password reset successfully',
          data: controllerResult,
        });
        done();
      },
    });
  });

  it('should NOT treat an object containing message as message-only when it is real resource data', (done) => {
    const { mockContext } = createMockExecutionContext(200);
    const controllerResult = {
      id: '123',
      message: 'This is real resource data',
    };
    const next = createMockCallHandler(controllerResult);

    interceptor.intercept(mockContext, next).subscribe({
      next: (result) => {
        expect(result).toEqual({
          success: true,
          statusCode: 200,
          message: 'Request successful',
          data: {
            id: '123',
            message: 'This is real resource data',
          },
        });
        done();
      },
    });
  });

  it('should completely bypass envelope when @BypassResponseWrapper metadata is present', (done) => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockImplementation((key: string) => {
        if (key === BYPASS_RESPONSE_WRAPPER_KEY) return true;
        return undefined;
      });

    const { mockContext } = createMockExecutionContext(200);
    const rawBuffer = Buffer.from('binary-image-data');
    const next = createMockCallHandler(rawBuffer);

    interceptor.intercept(mockContext, next).subscribe({
      next: (result) => {
        expect(result).toBe(rawBuffer);
        expect(Buffer.isBuffer(result)).toBe(true);
        done();
      },
    });
  });

  it('should bypass wrapping when response.headersSent is true (runtime safety net)', (done) => {
    const { mockContext } = createMockExecutionContext(200, true);
    const rawBuffer = Buffer.from('image binary data');
    const next = createMockCallHandler(rawBuffer);

    interceptor.intercept(mockContext, next).subscribe({
      next: (result) => {
        expect(result).toBe(rawBuffer);
        done();
      },
    });
  });

  it('should leave HTTP 204 No Content response bodyless / untouched', (done) => {
    const { mockContext } = createMockExecutionContext(204);
    const next = createMockCallHandler(undefined);

    interceptor.intercept(mockContext, next).subscribe({
      next: (result) => {
        expect(result).toBeUndefined();
        done();
      },
    });
  });

  it('should prevent double-wrapping when data is already an ApiResponse', (done) => {
    const { mockContext } = createMockExecutionContext(200);
    const alreadyWrapped: ApiResponse<{ id: string }> = {
      success: true,
      statusCode: 200,
      message: 'Custom message',
      data: { id: 'usr_1' },
    };
    const next = createMockCallHandler(alreadyWrapped);

    interceptor.intercept(mockContext, next).subscribe({
      next: (result) => {
        expect(result).toBe(alreadyWrapped);
        expect(result).toEqual(alreadyWrapped);
        done();
      },
    });
  });
});
