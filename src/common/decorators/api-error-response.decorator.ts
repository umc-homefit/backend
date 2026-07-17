import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';

interface ApiErrorResponseOption {
  /** HTTP 상태 코드 (예: 400, 401, 404, 409) */
  status: number;
  /** 응답 code 필드에 들어갈 값 (예: 'AUTH409', 'NOTICE404') */
  code: string;
  /** 응답 message 필드에 들어갈 값. Swagger 설명(description)으로도 사용된다. */
  message: string;
}

/**
 * 엔드포인트에서 실제로 발생하는 "대표" 실패 응답만 문서화하기 위한 데코레이터.
 * ApiSuccessResponse와 짝을 이루며, 응답 envelope({ isSuccess, code, message, result })
 * 형태를 Swagger 스키마로 표현한다.
 *
 * 단일 사용:
 *   @ApiErrorResponse({ status: 409, code: 'AUTH409', message: '이미 존재하는 이메일 주소입니다.' })
 *
 * 여러 케이스가 있으면 배열로 한 번에:
 *   @ApiErrorResponse([
 *     { status: 400, code: 'COMMON400', message: '요청 값이 올바르지 않습니다.' },
 *     { status: 404, code: 'NOTICE404', message: '존재하지 않는 공고입니다.' },
 *   ])
 *
 * 원칙: 모든 가능한 상태 코드를 다 나열하지 말고, 실제로 그 엔드포인트에서
 * 발생하는 대표 케이스만 적는다 (예: 401은 JwtAuthGuard 적용 엔드포인트라면
 * 굳이 매번 안 적어도 됨 - 공통으로 알려진 사실이라 노이즈만 늘어남).
 */
export const ApiErrorResponse = (options: ApiErrorResponseOption | ApiErrorResponseOption[]) => {
  const list = Array.isArray(options) ? options : [options];

  return applyDecorators(
    ...list.map((option) =>
      ApiResponse({
        status: option.status,
        description: option.message,
        schema: {
          type: 'object',
          properties: {
            isSuccess: { type: 'boolean', example: false },
            code: { type: 'string', example: option.code },
            message: { type: 'string', example: option.message },
            result: { type: 'object', nullable: true, example: null },
          },
        },
      }),
    ),
  );
};