import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';

import { ApiResponseDto } from '../dto/api-response.dto';

interface ApiSuccessResponseOptions {
  status?: number;
  description?: string;
  isArray?: boolean;
  /** Swagger 문서에 노출할 전체 응답 예시 ({ isSuccess, code, message, result }) */
  example?: Record<string, unknown>;
}

/**
 * ApiResponseInterceptor가 런타임에 씌우는 { isSuccess, code, message, result } envelope을
 * Swagger 스키마에도 동일하게 반영하기 위한 데코레이터.
 * result 자리에는 전달한 model(또는 그 배열)이 들어간다.
 */
export const ApiSuccessResponse = <TModel extends Type<unknown>>(
  model: TModel,
  { status = 200, description, isArray = false, example }: ApiSuccessResponseOptions = {},
) =>
  applyDecorators(
    ApiExtraModels(ApiResponseDto, model),
    ApiResponse({
      status,
      description,
      schema: {
        allOf: [
          { $ref: getSchemaPath(ApiResponseDto) },
          {
            properties: {
              result: isArray
                ? { type: 'array', items: { $ref: getSchemaPath(model) } }
                : { $ref: getSchemaPath(model) },
            },
          },
        ],
        ...(example && { example }),
      },
    }),
  );
