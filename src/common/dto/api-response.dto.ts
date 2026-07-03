import { ApiProperty } from '@nestjs/swagger';

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
