import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

import { getCommonErrorCode } from '../constants/error-code';
import { ApiResponse } from '../types/api-response.type';

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
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const statusCode =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : undefined;
    const body = this.parseExceptionBody(exceptionResponse);

    const apiResponse: ApiResponse<null> = {
      isSuccess: false,
      code: body.code ?? getCommonErrorCode(statusCode),
      message: body.message ?? this.getDefaultMessage(statusCode),
      result: null,
    };

    response.status(statusCode).json(apiResponse);
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
