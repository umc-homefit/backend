import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

import { getCommonErrorCode } from '../constants/error-code';
import { createErrorResponse } from '../types/api-response.type';

type HttpExceptionBody = {
  code?: string;
  message?: string;
};

type RawHttpExceptionBody = {
  code?: string;
  message?: string | string[];
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    if (host.getType() !== 'http') {
      this.logger.error(
        'Non-HTTP exception caught by HttpExceptionFilter',
        exception instanceof Error ? exception.stack : String(exception),
      );
      return;
    }

    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const statusCode =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    this.logException(exception, request, statusCode);

   
    if (response.headersSent) {
      return;
    }

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : undefined;
    const body = this.parseExceptionBody(exceptionResponse);

    const message =
    statusCode >= 500 ? this.getDefaultMessage(statusCode) : body.message ?? this.getDefaultMessage(statusCode);

    const apiResponse = createErrorResponse(
    null,
    body.code ?? getCommonErrorCode(statusCode),
    message,
    );

    response.status(statusCode).json(apiResponse);
  }

  private logException(exception: unknown, request: Request, statusCode: number) {
    
    const path = request.originalUrl?.split('?')[0] ?? request.url;
    const logMessage = `${request.method} ${path} - ${statusCode}`;

    if (statusCode >= 500) {
      
      const stack = exception instanceof Error ? exception.stack : String(exception);
      this.logger.error(logMessage, stack);
    } else {
      this.logger.warn(logMessage);
    }
  }

  private parseExceptionBody(exceptionResponse: unknown): HttpExceptionBody {
    if (typeof exceptionResponse === 'string') {
      return { message: exceptionResponse };
    }

    if (!exceptionResponse || typeof exceptionResponse !== 'object') {
      return {};
    }

    const responseBody = exceptionResponse as RawHttpExceptionBody;
    return {
      code: responseBody.code,
      message: Array.isArray(responseBody.message)
        ? responseBody.message.join(', ')
        : responseBody.message,
    };
  }

  private getDefaultMessage(statusCode: number): string {
    if (statusCode >= 500) {
      return '서버 오류가 발생했습니다.';
    }

    return '요청을 처리할 수 없습니다.';
  }
}