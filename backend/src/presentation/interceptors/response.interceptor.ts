import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { Response } from 'express';
import { ApiResponse } from '../interfaces/api-response.interface';
import { RESPONSE_MESSAGE_KEY } from '../decorators/response-message.decorator';
import { BYPASS_RESPONSE_WRAPPER_KEY } from '../decorators/bypass-response-wrapper.decorator';

export type { ApiResponse };

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T> | T
> {
  constructor(private readonly reflector: Reflector = new Reflector()) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T> | T> {
    // 1. Explicit bypass metadata: Skip envelope completely for routes decorated with @BypassResponseWrapper()
    const isBypassed = this.reflector.getAllAndOverride<boolean>(
      BYPASS_RESPONSE_WRAPPER_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isBypassed) {
      return next.handle();
    }

    const httpContext = context.switchToHttp();
    const response = httpContext.getResponse<Response>();

    return next.handle().pipe(
      map((data: T) => {
        // 2. Binary / @Res() safety: If response headers have already been sent, do not attempt to wrap
        if (response.headersSent) {
          return data;
        }

        // 3. HTTP 204 No Content safety: RFC 9110 mandates a bodyless response
        if (response.statusCode === 204) {
          return data;
        }

        // 4. Double-wrapping protection: If data is already an ApiResponse, return as-is
        if (this.isApiResponse(data)) {
          return data;
        }

        // 5. Explicit response message: Read custom message metadata if provided, otherwise default
        const customMessage = this.reflector.getAllAndOverride<string>(
          RESPONSE_MESSAGE_KEY,
          [context.getHandler(), context.getClass()],
        );

        const message = customMessage ?? 'Request successful';

        // 6. Wrap normal JSON results in the approved ApiResponse envelope
        return {
          success: true,
          statusCode: response.statusCode,
          message,
          data: data === undefined ? (null as T) : data,
        };
      }),
    );
  }

  private isApiResponse(data: unknown): data is ApiResponse<unknown> {
    return (
      typeof data === 'object' &&
      data !== null &&
      'success' in data &&
      'statusCode' in data &&
      'message' in data &&
      'data' in data
    );
  }
}
