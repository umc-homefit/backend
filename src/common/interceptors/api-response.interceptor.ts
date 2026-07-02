import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, map } from 'rxjs';

import { ApiResponse } from '../types/api-response.type';

@Injectable()
export class ApiResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T | null>> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<T | null>> {
    return next.handle().pipe(
      map((result) => {
        if (this.isApiResponse(result)) {
          return result;
        }

        return {
          isSuccess: true,
          code: 'COMMON200',
          message: '요청에 성공했습니다.',
          result: result ?? null,
        };
      }),
    );
  }

  private isApiResponse(value: unknown): value is ApiResponse<T> {
    return (
      typeof value === 'object' &&
      value !== null &&
      'isSuccess' in value &&
      'code' in value &&
      'message' in value &&
      'result' in value
    );
  }
}
