import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  EligibilityConditionCode,
  EligibilityConditionResultStatus,
  EligibilityResultLevel,
} from '@prisma/client';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

import { PageInfoDto } from '../../../common/dto/page-info.dto';
import { NoticeStatus } from '../../notices/dto/notices.dto';

export { EligibilityConditionCode, EligibilityConditionResultStatus, EligibilityResultLevel };

export const MVP_SUPPLY_TYPE = '청년안심주택' as const;

export class EligibilityConditionResultDto {
  @ApiProperty({
    description: '조건 코드',
    enum: EligibilityConditionCode,
    example: EligibilityConditionCode.INCOME,
  })
  conditionCode: EligibilityConditionCode;

  @ApiProperty({ description: '조건명', example: '소득 조건' })
  conditionName: string;

  @ApiPropertyOptional({
    description: '공고 기준값',
    example: '월소득 350만원 이하',
    nullable: true,
  })
  requiredValue: string | null;

  @ApiPropertyOptional({ description: '사용자 입력값', example: '월소득 280만원', nullable: true })
  userValue: string | null;

  @ApiProperty({
    description: '조건 비교 결과',
    enum: EligibilityConditionResultStatus,
    example: EligibilityConditionResultStatus.PASS,
  })
  resultStatus: EligibilityConditionResultStatus;

  @ApiPropertyOptional({
    description: '불충족 사유',
    example: '예상 보증금 대비 보유 현금이 200만원 부족합니다.',
    nullable: true,
  })
  failReason: string | null;
}

export class RequestEligibilityAnalysisResultDto {
  @ApiProperty({ description: '입주 가능성 분석 ID', example: 1 })
  analysisId: number;

  @ApiProperty({
    description: '입주 가능성 등급',
    enum: EligibilityResultLevel,
    example: EligibilityResultLevel.HIGH,
  })
  resultLevel: EligibilityResultLevel;

  @ApiProperty({ description: '입주 가능성 점수 (0~100)', example: 82 })
  eligibilityScore: number;

  @ApiProperty({ description: '부족 자금 (원 단위)', example: 2000000 })
  shortageAmount: number;

  @ApiProperty({ description: '월세 부담률 (% 단위)', example: 28.57 })
  rentBurdenRate: number;

  @ApiPropertyOptional({
    description: '최종 입주 가능성 등급과 재정 상태를 함께 안내하는 종합 분석 문구',
    example:
      '입주 가능성이 높은 편입니다. 예상 보증금 대비 보유 현금이 200만원 부족합니다. 월세 부담률은 28.57%로 안정적인 편입니다.',
    nullable: true,
  })
  summaryMessage: string | null;

  @ApiProperty({ description: '조건별 비교 결과 목록', type: [EligibilityConditionResultDto] })
  conditionResults: EligibilityConditionResultDto[];

  @ApiProperty({ description: '분석 일시 (ISO 8601 UTC)', example: '2026-07-01T00:10:00.000Z' })
  analyzedAt: string;
}

export class EligibilityAnalysisResultDto extends RequestEligibilityAnalysisResultDto {
  @ApiProperty({ description: '공고 ID', example: 12 })
  noticeId: number;

  @ApiProperty({ description: '주택 ID', example: 3 })
  unitId: number;

  @ApiProperty({
    description: '분석 대상 공급 유형 (MVP는 청년안심주택으로 고정)',
    example: MVP_SUPPLY_TYPE,
  })
  supplyType: typeof MVP_SUPPLY_TYPE;

  @ApiProperty({ description: '예상 보증금 (원 단위)', example: 10000000 })
  expectedDepositAmount: number;

  @ApiProperty({ description: '예상 월세 (원 단위)', example: 350000 })
  expectedMonthlyRentAmount: number;

  @ApiPropertyOptional({
    description: '예상 관리비 (원 단위, 현재 미수집으로 null)',
    example: null,
    nullable: true,
  })
  maintenanceFeeAmount: number | null;
}

export class EligibilityConditionsResultDto {
  @ApiProperty({ description: '조건별 비교 결과 목록', type: [EligibilityConditionResultDto] })
  conditionResults: EligibilityConditionResultDto[];
}

export class GetMyEligibilityAnalysesQueryDto {
  @ApiPropertyOptional({ description: '페이지 번호', default: 0, example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  page?: number = 0;

  @ApiPropertyOptional({
    description: '페이지 크기 (기본 10, 최대 50)',
    default: 10,
    maximum: 50,
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  size?: number = 10;
}

export class EligibilityAnalysisHistoryItemDto {
  @ApiProperty({ description: '입주 가능성 분석 ID', example: 1 })
  analysisId: number;

  @ApiProperty({ description: '공고 ID', example: 12 })
  noticeId: number;

  @ApiProperty({ description: '주택 ID', example: 3 })
  unitId: number;

  @ApiProperty({ description: '공고명', example: '어반허브 서울스테이션 추가모집' })
  noticeTitle: string;

  @ApiPropertyOptional({ description: '공고 번호', example: '2024-강동-031', nullable: true })
  announcementNo: string | null;

  @ApiPropertyOptional({ description: '주택형명', example: '59㎡', nullable: true })
  unitName: string | null;

  @ApiPropertyOptional({ description: '전용 면적(㎡)', example: 59, nullable: true })
  exclusiveAreaM2: number | null;

  // 이력 카드는 분석 당시 선택한 주택형의 보증금을 보여줘야 하므로 공고의 현재 최소·최대값 대신 분석 스냅샷을 반환한다.
  @ApiProperty({ description: '분석 당시 예상 보증금(원 단위)', example: 32000000 })
  expectedDepositAmount: number;

  @ApiPropertyOptional({ description: '접수 시작 일시(ISO 8601)', nullable: true })
  applicationStartAt: string | null;

  @ApiPropertyOptional({ description: '접수 종료 일시(ISO 8601)', nullable: true })
  applicationEndAt: string | null;

  @ApiProperty({ description: '현재 공고 모집 상태', enum: NoticeStatus, example: NoticeStatus.RECRUITING })
  noticeStatus: NoticeStatus;

  @ApiProperty({ description: '모집 상태 표시 문구', example: '모집중' })
  noticeStatusDisplayText: string;

  @ApiProperty({ description: '추가모집 여부', example: false })
  isAdditionalRecruitment: boolean;

  @ApiProperty({
    description: '입주 가능성 등급',
    enum: EligibilityResultLevel,
    example: EligibilityResultLevel.HIGH,
  })
  resultLevel: EligibilityResultLevel;

  @ApiProperty({ description: '입주 가능성 점수 (0~100)', example: 82 })
  eligibilityScore: number;

  @ApiProperty({ description: '부족 자금 (원 단위)', example: 2000000 })
  shortageAmount: number;

  @ApiProperty({ description: '월세 부담률 (% 단위)', example: 28.57 })
  rentBurdenRate: number;

  @ApiProperty({ description: '분석 일시 (ISO 8601 UTC)', example: '2026-07-01T00:10:00.000Z' })
  analyzedAt: string;
}

export class FinancialSummaryResultDto {
  @ApiProperty({ description: '예상 보증금 (원 단위)', example: 10000000 })
  expectedDepositAmount: number;

  @ApiProperty({ description: '예상 월세 (원 단위)', example: 350000 })
  expectedMonthlyRentAmount: number;

  @ApiPropertyOptional({
    description: '예상 관리비 (원 단위, 현재 미수집으로 null)',
    example: null,
    nullable: true,
  })
  maintenanceFeeAmount: number | null;

  @ApiProperty({ description: '사용자 보유 현금 (원 단위)', example: 8000000 })
  userCashAmount: number;

  @ApiProperty({ description: '부족 자금 (원 단위)', example: 2000000 })
  shortageAmount: number;

  @ApiProperty({ description: '사용자 월소득 (원 단위)', example: 1400000 })
  monthlyIncomeAmount: number;

  @ApiProperty({ description: '월 주거비 (원 단위, 관리비 정보가 없으면 월세 기준)', example: 400000 })
  monthlyHousingCost: number;

  @ApiProperty({ description: '월세 부담률 (% 단위, 관리비 정보가 없으면 월세 기준)', example: 28.57 })
  rentBurdenRate: number;

  @ApiPropertyOptional({
    description: '재정 분석 문구',
    example:
      '예상 보증금 대비 보유 현금이 200만원 부족하지만, 월세 부담률은 28.57%로 안정적인 편입니다.',
    nullable: true,
  })
  financialMessage: string | null;
}

export class MyEligibilityAnalysesResultDto {
  @ApiProperty({ description: '분석 이력 목록', type: [EligibilityAnalysisHistoryItemDto] })
  analyses: EligibilityAnalysisHistoryItemDto[];

  @ApiProperty({ description: '페이지 정보', type: PageInfoDto })
  pageInfo: PageInfoDto;
}
