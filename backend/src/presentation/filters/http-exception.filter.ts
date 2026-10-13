import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApiErrorResponse } from '../interfaces/api-error-response.interface';

export type { ApiErrorResponse };

/**
 * Centralized global exception filter for HTTP errors.
 * Standardizes all error responses into the approved ApiErrorResponse envelope.
 * Safely handles HttpExceptions, validation error arrays, and masks unexpected 500 errors.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Safety net: if response headers have already been sent, do not attempt to write
    if (response.headersSent) {
      return;
    }

    let statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: string[] | undefined;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, unknown>;

        // Handle validation errors with multiple messages (e.g. from ValidationPipe)
        if (Array.isArray(resObj.message)) {
          message = 'Validation failed';
          errors =
            resObj.message.length > 0
              ? resObj.message.map((msg) => String(msg))
              : undefined;
        } else if (typeof resObj.message === 'string') {
          message = resObj.message;
        } else if (typeof resObj.error === 'string') {
          message = resObj.error;
        } else {
          message = exception.message || 'Request failed';
        }
      } else {
        message = exception.message || 'Request failed';
      }
    } else {
      // Non-HttpException / Unexpected error: mask implementation details
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';

      const err =
        exception instanceof Error ? exception : new Error(String(exception));
      this.logger.error(
        `Unhandled exception on ${request?.method ?? 'UNKNOWN'} ${request?.url ?? ''}: ${err.message}`,
        err.stack,
        'HttpExceptionFilter',
      );
    }

    const errorBody: ApiErrorResponse = {
      success: false,
      statusCode,
      message,
      ...(errors && errors.length > 0 ? { errors } : {}),
      data: null,
    };

    response.status(statusCode).json(errorBody);
  }
}
