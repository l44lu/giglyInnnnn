import {
  ArgumentsHost,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  NotFoundException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let mockStatus: jest.Mock;
  let mockJson: jest.Mock;
  let mockResponse: Partial<Response>;
  let mockRequest: Partial<Request>;
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    mockResponse = {
      status: mockStatus,
      json: mockJson,
      headersSent: false,
    };
    mockRequest = {
      method: 'GET',
      url: '/test',
    };
    mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse as Response,
        getRequest: () => mockRequest as Request,
      }),
    } as unknown as ArgumentsHost;
  });

  it('1. NotFoundException: should format 404 with preserved message and data: null', () => {
    const exception = new NotFoundException('User not found');
    filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(404);
    expect(mockJson).toHaveBeenCalledWith({
      success: false,
      statusCode: 404,
      message: 'User not found',
      data: null,
    });
  });

  it('2. UnauthorizedException: should format 401 with message and data: null', () => {
    const exception = new UnauthorizedException(
      'Authentication token is missing',
    );
    filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(401);
    expect(mockJson).toHaveBeenCalledWith({
      success: false,
      statusCode: 401,
      message: 'Authentication token is missing',
      data: null,
    });
  });

  it('3. ForbiddenException: should format 403 with message and data: null', () => {
    const exception = new ForbiddenException(
      'Access denied: Admin role required',
    );
    filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(403);
    expect(mockJson).toHaveBeenCalledWith({
      success: false,
      statusCode: 403,
      message: 'Access denied: Admin role required',
      data: null,
    });
  });

  it('4. ConflictException: should format 409 with preserved message and data: null', () => {
    const exception = new ConflictException('Email already in use');
    filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(409);
    expect(mockJson).toHaveBeenCalledWith({
      success: false,
      statusCode: 409,
      message: 'Email already in use',
      data: null,
    });
  });

  it('5. Validation error: should format BadRequestException containing message: string[] into validation envelope', () => {
    const validationMessages = [
      'email must be an email',
      'password should not be empty',
    ];
    const exception = new BadRequestException(validationMessages);
    filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(400);
    expect(mockJson).toHaveBeenCalledWith({
      success: false,
      statusCode: 400,
      message: 'Validation failed',
      errors: validationMessages,
      data: null,
    });
  });

  it('6. String HttpException response: should safely extract string as message', () => {
    const exception = new HttpException(
      'Custom string error',
      HttpStatus.BAD_REQUEST,
    );
    filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(400);
    expect(mockJson).toHaveBeenCalledWith({
      success: false,
      statusCode: 400,
      message: 'Custom string error',
      data: null,
    });
  });

  it('7. Object HttpException response: should safely extract message from object response', () => {
    const exception = new HttpException(
      { message: 'Custom object message', code: 'CUSTOM_ERR' },
      HttpStatus.BAD_GATEWAY,
    );
    filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(502);
    expect(mockJson).toHaveBeenCalledWith({
      success: false,
      statusCode: 502,
      message: 'Custom object message',
      data: null,
    });
  });

  it('7b. Object HttpException response without message: should fallback to error or exception message', () => {
    const exception = new HttpException(
      { error: 'Bad Gateway Error' },
      HttpStatus.BAD_GATEWAY,
    );
    filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(502);
    expect(mockJson).toHaveBeenCalledWith({
      success: false,
      statusCode: 502,
      message: 'Bad Gateway Error',
      data: null,
    });
  });

  it('8. Unknown Error: should mask internal error details and return 500 with "Internal server error"', () => {
    const errorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => {});
    const unknownError = new Error(
      'Prisma database connection failed with secret credentials postgresql://...',
    );
    filter.catch(unknownError, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(500);
    expect(mockJson).toHaveBeenCalledWith({
      success: false,
      statusCode: 500,
      message: 'Internal server error',
      data: null,
    });
    const payload = mockJson.mock.calls[0][0];
    expect(JSON.stringify(payload)).not.toContain('Prisma');
    expect(JSON.stringify(payload)).not.toContain('postgresql');
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('9. Safety net: should not write to response when headersSent is true', () => {
    (mockResponse as any).headersSent = true;
    const exception = new NotFoundException('Not found after headers sent');
    filter.catch(exception, mockHost);

    expect(mockStatus).not.toHaveBeenCalled();
    expect(mockJson).not.toHaveBeenCalled();
  });
});
