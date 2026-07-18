import { applyDecorators } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';

import { ApiErrorResponseDto } from '../dto/api-response.dto';

interface ApiErrorResponseOption {
  /** HTTP 상태 코드 (예: 400, 401, 404, 409) */
  status: number;
  /** 응답 code 필드에 들어갈 값 (예: 'AUTH409', 'NOTICE404') */
  code: string;
  /** 응답 message 필드에 들어갈 값 */
  message: string;
}

/**
 * 엔드포인트에서 실제로 발생하는 "대표" 실패 응답만 문서화하기 위한 데코레이터.
 * ApiSuccessResponse와 짝을 이루며, ApiErrorResponseDto를 $ref로 재사용해서
 * 공통 필드(isSuccess, result 등)는 DTO 한 곳에서만 정의되도록 한다.
 *
 * 단일 사용:
 *   @ApiErrorResponse({ status: 409, code: 'AUTH409', message: '이미 존재하는 이메일 주소입니다.' })
 *
 * 같은 상태 코드로 여러 케이스가 있어도 배열로 한 번에 넘기면 된다.
 * (내부에서 status별로 그룹핑해서 examples로 합치므로, 같은 status를 여러 번 선언해서
 *  생기는 "나중 것이 앞의 것을 덮어쓰는" 문제가 없다.)
 *   @ApiErrorResponse([
 *     { status: 400, code: 'COMMON400', message: '요청 값이 올바르지 않습니다.' },
 *     { status: 400, code: 'AUTH400', message: '이메일 형식이 올바르지 않습니다.' },
 *     { status: 404, code: 'NOTICE404', message: '존재하지 않는 공고입니다.' },
 *   ])
 *
 * 원칙: 모든 가능한 상태 코드를 다 나열하지 말고, 실제로 그 엔드포인트에서
 * 발생하는 대표 케이스만 적는다.
 */
export const ApiErrorResponse = (options: ApiErrorResponseOption | ApiErrorResponseOption[]) => {
  const list = Array.isArray(options) ? options : [options];

  // 같은 status를 여러 번 ApiResponse()로 선언하면 Swagger 문서 생성 시
  // 나중 선언이 앞선 선언을 덮어써서 하나만 남는다. status별로 묶어서
  // 하나의 ApiResponse 안에 examples로 모든 케이스를 표현한다.
  const grouped = new Map<number, ApiErrorResponseOption[]>();
  for (const option of list) {
    const group = grouped.get(option.status) ?? [];
    group.push(option);
    grouped.set(option.status, group);
  }

  const responseDecorators = Array.from(grouped.entries()).map(([status, group]) => {
    const examples: Record<string, { summary: string; value: unknown }> = {};
    group.forEach((option, index) => {
      // code가 우연히 겹치는 경우까지 대비해 index를 붙여 키 충돌을 막는다.
      const key = `${option.code}_${index}`;
      examples[key] = {
        summary: option.message,
        value: {
          isSuccess: false,
          code: option.code,
          message: option.message,
          result: null,
        },
      };
    });

    return ApiResponse({
      status,
      description: group.map((option) => `${option.code}: ${option.message}`).join(' / '),
      content: {
        'application/json': {
          schema: { $ref: getSchemaPath(ApiErrorResponseDto) },
          examples,
        },
      },
    });
  });

  return applyDecorators(ApiExtraModels(ApiErrorResponseDto), ...responseDecorators);
};