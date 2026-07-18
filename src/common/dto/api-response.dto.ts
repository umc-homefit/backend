import { ApiProperty } from '@nestjs/swagger';

import { COMMON_ERROR_CODES } from '../constants/error-code';
import { DEFAULT_SUCCESS_CODE, DEFAULT_SUCCESS_MESSAGE } from '../types/api-response.type';

export class ApiResponseDto {
  @ApiProperty({ description: '요청 성공 여부', example: true })
  isSuccess: boolean;

  @ApiProperty({ description: '응답 코드', example: DEFAULT_SUCCESS_CODE })
  code: string;

  @ApiProperty({ description: '응답 메시지', example: DEFAULT_SUCCESS_MESSAGE })
  message: string;
}

/** result가 없는 응답(예: 로그아웃)을 문서화할 때 사용하는 placeholder 모델 */
export class EmptyResultDto {}

/**
 * 실패 응답 envelope 문서화용 모델. ApiResponseDto(성공)와 짝을 이룬다.
 * ApiErrorResponse 데코레이터가 getSchemaPath()로 이 DTO를 $ref 참조해서 재사용하므로,
 * 필드를 추가/변경하면 모든 엔드포인트의 에러 응답 문서에 자동 반영된다.
 */
export class ApiErrorResponseDto {
  @ApiProperty({ description: '요청 성공 여부 (실패 시 항상 false)', example: false })
  isSuccess: boolean;

  @ApiProperty({
    description: '도메인 에러 코드 또는 공통 에러 코드',
    example: COMMON_ERROR_CODES.BAD_REQUEST,
  })
  code: string;

  @ApiProperty({ description: '에러 메시지', example: '요청을 처리할 수 없습니다.' })
  message: string;

  @ApiProperty({
    description: '실패 시 항상 null',
    example: null,
    nullable: true,
    type: 'object',
    additionalProperties: false,
  })
  result: null;
}