import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

import { PageInfoDto } from '../../../common/dto/page-info.dto';

export enum NoticeStatus {
  RECRUITING = 'RECRUITING',
  SCHEDULED = 'SCHEDULED',
  CLOSING_SOON = 'CLOSING_SOON',
  CLOSED = 'CLOSED',
}

export enum NoticeSort {
  LATEST = 'LATEST',
  DEADLINE = 'DEADLINE',
  POPULAR = 'POPULAR',
}

export enum NoticeConditionTargetType {
  YOUTH = 'YOUTH',
  NEWLYWED = 'NEWLYWED',
  COMMON = 'COMMON',
  OTHER = 'OTHER',
}

export enum NoticeFileType {
  PDF = 'PDF',
  IMAGE = 'IMAGE',
  LINK = 'LINK',
  DOC = 'DOC',
  OTHER = 'OTHER',
}

export class GetNoticesQueryDto {
  @ApiPropertyOptional({ description: '공고명, 단지명, 지역 검색어', example: '강동' })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ description: '시/도 필터', example: '서울' })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional({ description: '시/군/구 필터', example: '강동구' })
  @IsOptional()
  @IsString()
  district?: string;

  @ApiPropertyOptional({ description: '공고 모집 상태', enum: NoticeStatus, example: NoticeStatus.RECRUITING })
  @IsOptional()
  @IsEnum(NoticeStatus)
  status?: NoticeStatus;

  @ApiPropertyOptional({ description: '추가모집 여부', example: true })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isAdditionalRecruitment?: boolean;

  @ApiPropertyOptional({ description: '최소 보증금 (원 단위)', example: 30000000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minDeposit?: number;

  @ApiPropertyOptional({ description: '최대 보증금 (원 단위)', example: 50000000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxDeposit?: number;

  @ApiPropertyOptional({ description: '최소 전용면적 (㎡)', example: 20 })
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  minArea?: number;

  @ApiPropertyOptional({ description: '최대 전용면적 (㎡)', example: 40 })
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  maxArea?: number;

  @ApiPropertyOptional({ description: '정렬 기준', enum: NoticeSort, default: NoticeSort.LATEST })
  @IsOptional()
  @IsEnum(NoticeSort)
  sort?: NoticeSort = NoticeSort.LATEST;

  @ApiPropertyOptional({ description: '페이지 번호 (0부터 시작)', default: 0, example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  page?: number = 0;

  @ApiPropertyOptional({ description: '페이지 크기 (기본 10, 최대 50 권장)', default: 10, example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  size?: number = 10;
}

export class NoticeListItemDto {
  @ApiProperty({ description: '공고 ID', example: 1 })
  noticeId: number;

  @ApiProperty({ description: '공고 제목', example: '강동구 청년안심주택 추가모집' })
  title: string;

  @ApiProperty({ description: '시/도', example: '서울' })
  region: string;

  @ApiPropertyOptional({ description: '시/군/구', example: '강동구', nullable: true })
  district: string | null;

  @ApiPropertyOptional({ description: '대표 주택형 요약', example: '전용 24㎡', nullable: true })
  unitSummary: string | null;

  @ApiPropertyOptional({ description: '최소 보증금 (원 단위)', example: 32000000, nullable: true })
  depositMin: number | null;

  @ApiPropertyOptional({ description: '최대 보증금 (원 단위)', example: 48000000, nullable: true })
  depositMax: number | null;

  @ApiPropertyOptional({ description: '최소 월세 (원 단위)', example: 280000, nullable: true })
  monthlyRentMin: number | null;

  @ApiPropertyOptional({ description: '최대 월세 (원 단위)', example: 410000, nullable: true })
  monthlyRentMax: number | null;

  @ApiProperty({ description: '모집 상태', enum: NoticeStatus, example: NoticeStatus.RECRUITING })
  status: NoticeStatus;

  @ApiProperty({ description: '모집 상태 표시 문구', example: '모집중' })
  statusDisplayText: string;

  @ApiProperty({ description: '추가모집 여부', example: true })
  isAdditionalRecruitment: boolean;

  @ApiPropertyOptional({
    description: '접수 시작 일시 (ISO 8601)',
    example: '2026-07-01T10:00:00+09:00',
    nullable: true,
  })
  applicationStartAt: string | null;

  @ApiPropertyOptional({
    description: '접수 종료 일시 (ISO 8601)',
    example: '2026-07-10T18:00:00+09:00',
    nullable: true,
  })
  applicationEndAt: string | null;

  @ApiPropertyOptional({ description: '마감 D-day 표시', example: 'D-3', nullable: true })
  dDayText: string | null;

  @ApiProperty({ description: '조회 수', example: 120 })
  views: number;

  @ApiProperty({ description: '저장 수', example: 32 })
  interestedCount: number;

  @ApiProperty({ description: '현재 사용자 저장 여부 (비로그인 시 false)', example: false })
  isSaved: boolean;
}

export class NoticeListResultDto {
  @ApiProperty({ description: '공고 목록', type: [NoticeListItemDto] })
  notices: NoticeListItemDto[];

  @ApiProperty({ description: '페이지 정보', type: PageInfoDto })
  pageInfo: PageInfoDto;
}

export class NoticeUnitDto {
  @ApiProperty({ description: '주택형 ID', example: 10 })
  unitId: number;

  @ApiProperty({ description: '주택형명', example: '24A' })
  unitName: string;

  @ApiPropertyOptional({ description: '전용면적 (㎡)', example: 24.0, nullable: true })
  exclusiveAreaM2: number | null;

  @ApiPropertyOptional({ description: '공급면적 (㎡)', example: 36.0, nullable: true })
  supplyAreaM2: number | null;

  @ApiPropertyOptional({ description: '최소 보증금 (원 단위)', example: 32000000, nullable: true })
  depositMin: number | null;

  @ApiPropertyOptional({ description: '최대 보증금 (원 단위)', example: 48000000, nullable: true })
  depositMax: number | null;

  @ApiPropertyOptional({ description: '최소 월세 (원 단위)', example: 280000, nullable: true })
  monthlyRentMin: number | null;

  @ApiPropertyOptional({ description: '최대 월세 (원 단위)', example: 410000, nullable: true })
  monthlyRentMax: number | null;

  @ApiPropertyOptional({ description: '공급 세대 수', example: 18, nullable: true })
  supplyCount: number | null;
}

export class NoticeConditionDto {
  @ApiProperty({ description: '조건 ID', example: 7 })
  conditionId: number;

  @ApiProperty({
    description: '대상 유형',
    enum: NoticeConditionTargetType,
    example: NoticeConditionTargetType.YOUTH,
  })
  targetType: NoticeConditionTargetType;

  @ApiPropertyOptional({ description: '최소 나이', example: 19, nullable: true })
  minAge: number | null;

  @ApiPropertyOptional({ description: '최대 나이', example: 39, nullable: true })
  maxAge: number | null;

  @ApiPropertyOptional({ description: '소득 제한 금액', example: 5000000, nullable: true })
  incomeLimitAmount: number | null;

  @ApiPropertyOptional({
    description: '소득 제한 설명',
    example: '도시근로자 월평균 소득 100% 이하',
    nullable: true,
  })
  incomeLimitText: string | null;

  @ApiPropertyOptional({ description: '자산 제한 금액', example: 361000000, nullable: true })
  assetLimitAmount: number | null;

  @ApiPropertyOptional({
    description: '자산 제한 설명',
    example: '총자산 3억 6,100만 원 이하',
    nullable: true,
  })
  assetLimitText: string | null;

  @ApiPropertyOptional({ description: '무주택 필요 여부', example: true, nullable: true })
  requiresHomeless: boolean | null;

  @ApiPropertyOptional({
    description: '거주지 조건',
    example: '서울시 거주 또는 직장 소재',
    nullable: true,
  })
  residenceRequirement: string | null;

  @ApiPropertyOptional({
    description: '공고문 원문 조건',
    example: '공고문 기준 자격 조건 원문',
    nullable: true,
  })
  rawConditionText: string | null;
}

export class NoticeFileDto {
  @ApiProperty({ description: '첨부파일 ID', example: 1 })
  fileId: number;

  @ApiProperty({ description: '파일명', example: '2026-03호 공고문.pdf' })
  fileName: string;

  @ApiProperty({ description: '파일 타입', enum: NoticeFileType, example: NoticeFileType.PDF })
  fileType: NoticeFileType;

  @ApiProperty({ description: '파일 URL', example: 'https://example.com/notice.pdf' })
  fileUrl: string;

  @ApiPropertyOptional({
    description: '파일 등록 일시 (ISO 8601)',
    example: '2026-06-29T10:00:00+09:00',
    nullable: true,
  })
  registeredAt: string | null;
}

export class NoticeDetailResultDto {
  @ApiProperty({ description: '공고 ID', example: 1 })
  noticeId: number;

  @ApiProperty({ description: '공고 제목', example: '강동구 청년안심주택 추가모집' })
  title: string;

  @ApiPropertyOptional({ description: '공고 번호', example: '2026-03', nullable: true })
  announcementNo: string | null;

  @ApiProperty({ description: '시/도', example: '서울' })
  region: string;

  @ApiPropertyOptional({ description: '시/군/구', example: '강동구', nullable: true })
  district: string | null;

  @ApiPropertyOptional({ description: '주소', example: '서울 강동구 천호동 123-4', nullable: true })
  address: string | null;

  @ApiProperty({ description: '원문 공고 URL', example: 'https://example.com/notice' })
  sourceUrl: string;

  @ApiProperty({ description: '모집 상태', enum: NoticeStatus, example: NoticeStatus.RECRUITING })
  status: NoticeStatus;

  @ApiProperty({ description: '모집 상태 표시 문구', example: '모집중' })
  statusDisplayText: string;

  @ApiProperty({ description: '추가모집 여부', example: true })
  isAdditionalRecruitment: boolean;

  @ApiPropertyOptional({
    description: '접수 시작 일시 (ISO 8601)',
    example: '2026-07-01T10:00:00+09:00',
    nullable: true,
  })
  applicationStartAt: string | null;

  @ApiPropertyOptional({
    description: '접수 종료 일시 (ISO 8601)',
    example: '2026-07-10T18:00:00+09:00',
    nullable: true,
  })
  applicationEndAt: string | null;

  @ApiProperty({ description: '조회 수', example: 120 })
  views: number;

  @ApiProperty({ description: '저장 수', example: 32 })
  interestedCount: number;

  @ApiProperty({ description: '현재 사용자 저장 여부 (비로그인 시 false)', example: true })
  isSaved: boolean;

  @ApiProperty({ description: '공고 주택형 목록', type: [NoticeUnitDto] })
  units: NoticeUnitDto[];

  @ApiProperty({ description: '자격 조건 목록', type: [NoticeConditionDto] })
  conditions: NoticeConditionDto[];

  @ApiProperty({ description: '첨부파일 목록', type: [NoticeFileDto] })
  files: NoticeFileDto[];
}

export class NoticeUnitsResultDto {
  @ApiProperty({ description: '주택형 목록', type: [NoticeUnitDto] })
  units: NoticeUnitDto[];
}

export class NoticeFilesResultDto {
  @ApiProperty({ description: '첨부파일 목록', type: [NoticeFileDto] })
  files: NoticeFileDto[];
}

export class SaveNoticeResultDto {
  @ApiProperty({ description: '저장 공고 ID', example: 100 })
  savedNoticeId: number;

  @ApiProperty({ description: '공고 ID', example: 1 })
  noticeId: number;

  @ApiProperty({ description: '저장 여부', example: true })
  isSaved: boolean;

  @ApiProperty({ description: '저장 수', example: 33 })
  interestedCount: number;

  @ApiProperty({ description: '저장 일시 (ISO 8601)', example: '2026-06-30T10:00:00+09:00' })
  savedAt: string;
}

export class UnsaveNoticeResultDto {
  @ApiProperty({ description: '공고 ID', example: 1 })
  noticeId: number;

  @ApiProperty({ description: '저장 여부', example: false })
  isSaved: boolean;

  @ApiProperty({ description: '저장 수', example: 32 })
  interestedCount: number;
}

export class GetSavedNoticesQueryDto {
  @ApiPropertyOptional({ description: '정렬 기준', enum: NoticeSort, example: NoticeSort.LATEST })
  @IsOptional()
  @IsEnum(NoticeSort)
  sort?: NoticeSort;

  @ApiPropertyOptional({ description: '페이지 번호 (0부터 시작)', default: 0, example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  page?: number = 0;

  @ApiPropertyOptional({ description: '페이지 크기', default: 10, example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  size?: number = 10;
}

export class SavedNoticeItemDto {
  @ApiProperty({ description: '저장 공고 ID', example: 100 })
  savedNoticeId: number;

  @ApiProperty({ description: '공고 ID', example: 1 })
  noticeId: number;

  @ApiProperty({ description: '공고 제목', example: '강동구 청년안심주택 2025-03호' })
  title: string;

  @ApiProperty({ description: '시/도', example: '서울' })
  region: string;

  @ApiPropertyOptional({ description: '시/군/구', example: '강동구', nullable: true })
  district: string | null;

  @ApiProperty({ description: '모집 상태', enum: NoticeStatus, example: NoticeStatus.RECRUITING })
  status: NoticeStatus;

  @ApiProperty({ description: '모집 상태 표시 문구', example: '모집중' })
  statusDisplayText: string;

  @ApiPropertyOptional({
    description: '접수 종료 일시 (ISO 8601)',
    example: '2026-07-10T18:00:00+09:00',
    nullable: true,
  })
  applicationEndAt: string | null;

  @ApiPropertyOptional({ description: '마감 D-day 표시', example: 'D-3', nullable: true })
  dDayText: string | null;

  @ApiProperty({ description: '저장 수', example: 32 })
  interestedCount: number;

  @ApiProperty({ description: '저장 일시 (ISO 8601)', example: '2026-06-30T10:00:00+09:00' })
  savedAt: string;
}

export class SavedNoticeListResultDto {
  @ApiProperty({ description: '저장 공고 목록', type: [SavedNoticeItemDto] })
  savedNotices: SavedNoticeItemDto[];

  @ApiProperty({ description: '페이지 정보', type: PageInfoDto })
  pageInfo: PageInfoDto;
}
