import { ApiProperty } from '@nestjs/swagger';

export class PageInfoDto {
  @ApiProperty({ description: '현재 페이지 (0부터 시작)', example: 0 })
  page: number;

  @ApiProperty({ description: '페이지 크기', example: 10 })
  size: number;

  @ApiProperty({ description: '전체 항목 수', example: 36 })
  totalElements: number;

  @ApiProperty({ description: '전체 페이지 수', example: 4 })
  totalPages: number;

  @ApiProperty({ description: '다음 페이지 존재 여부', example: true })
  hasNext: boolean;
}
