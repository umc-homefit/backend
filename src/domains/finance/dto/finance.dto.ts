import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export enum LoanProviderType {
  POLICY = 'POLICY',
  BANK = 'BANK',
}

export enum DocumentIssueMethod {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  BOTH = 'BOTH',
}

export enum GuideContentType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  CHECKLIST = 'CHECKLIST',
}

export enum GuideAnnouncementType {
  COMMON = 'COMMON',
  YOUTH_SAFE_HOUSE = 'YOUTH_SAFE_HOUSE',
  ADDITIONAL_RECRUIT = 'ADDITIONAL_RECRUIT',
}

export class MatchLoanProductsQueryDto {
  @ApiPropertyOptional({ description: '매칭 기준 공고 ID', example: 22 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  noticeId?: number;

  @ApiPropertyOptional({ description: '상품 제공 유형', enum: LoanProviderType, example: LoanProviderType.POLICY })
  @IsOptional()
  @IsEnum(LoanProviderType)
  providerType?: LoanProviderType;
}

export class MatchedLoanProductDto {
  @ApiProperty({ description: '상품 ID', example: 101 })
  productId: number;

  @ApiProperty({ description: '상품명', example: '청년 버팀목 전세자금대출' })
  productName: string;

  @ApiProperty({ description: '제공 유형', enum: LoanProviderType, example: LoanProviderType.POLICY })
  providerType: LoanProviderType;

  @ApiProperty({ description: '제공 기관명', example: '주택도시기금' })
  providerName: string;

  @ApiProperty({ description: '금리 범위', example: '1.5% ~ 2.7%' })
  rateRange: string;

  @ApiProperty({ description: '최대 한도 (원 단위)', example: 200000000 })
  maxLimitAmount: number;

  @ApiProperty({ description: '사용자 조건 대비 자격 충족 여부', example: true })
  isEligible: boolean;
}

export class MatchLoanProductsResultDto {
  @ApiProperty({ description: '매칭된 상품 수', example: 2 })
  matchedCount: number;

  @ApiProperty({ description: '매칭 상품 목록', type: [MatchedLoanProductDto] })
  products: MatchedLoanProductDto[];
}

export class GetLoanProductsQueryDto {
  @ApiPropertyOptional({ description: '상품 제공 유형', enum: LoanProviderType })
  @IsOptional()
  @IsEnum(LoanProviderType)
  providerType?: LoanProviderType;

  @ApiPropertyOptional({ description: '페이지 번호 (0부터 시작)', default: 0, example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  page?: number = 0;

  @ApiPropertyOptional({ description: '페이지 크기', default: 20, example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  size?: number = 20;
}

export class LoanProductListItemDto {
  @ApiProperty({ description: '상품 ID', example: 103 })
  productId: number;

  @ApiProperty({ description: '상품명', example: '하나은행 청년 전세자금대출' })
  productName: string;

  @ApiProperty({ description: '제공 유형', enum: LoanProviderType, example: LoanProviderType.BANK })
  providerType: LoanProviderType;

  @ApiProperty({ description: '제공 기관명', example: '하나은행' })
  providerName: string;

  @ApiProperty({ description: '금리 범위', example: '3.2% ~ 4.5%' })
  rateRange: string;

  @ApiProperty({ description: '최대 한도 (원 단위)', example: 150000000 })
  maxLimitAmount: number;
}

export class LoanProductListResultDto {
  @ApiProperty({ description: '전체 상품 수', example: 5 })
  totalCount: number;

  @ApiProperty({ description: '금융상품 목록', type: [LoanProductListItemDto] })
  products: LoanProductListItemDto[];
}

export class LoanProductDetailResultDto {
  @ApiProperty({ description: '상품 ID', example: 101 })
  productId: number;

  @ApiProperty({ description: '상품명', example: '청년 버팀목 전세자금대출' })
  productName: string;

  @ApiProperty({ description: '제공 유형', enum: LoanProviderType, example: LoanProviderType.POLICY })
  providerType: LoanProviderType;

  @ApiProperty({ description: '제공 기관명', example: '주택도시기금' })
  providerName: string;

  @ApiProperty({ description: '금리 범위', example: '1.5% ~ 2.7%' })
  rateRange: string;

  @ApiProperty({ description: '최대 한도 (원 단위)', example: 200000000 })
  maxLimitAmount: number;

  @ApiProperty({ description: '공식 안내 URL (상세에만 포함)', example: 'https://nhuf.molit.go.kr' })
  officialUrl: string;

  @ApiPropertyOptional({
    description: '상품 설명',
    example: '만 19~34세 청년을 위한 전세자금 대출 상품입니다.',
    nullable: true,
  })
  description: string | null;
}

export class GetFinanceTermsQueryDto {
  @ApiPropertyOptional({ description: '부분 검색 키워드', example: 'DSR' })
  @IsOptional()
  @IsString()
  term?: string;
}

export class FinanceTermItemDto {
  @ApiProperty({ description: '용어명', example: 'DSR' })
  term: string;

  @ApiProperty({ description: '한 줄 설명', example: '월 소득 대비 대출 원리금 상환 비율입니다.' })
  shortDescription: string;
}

export class RequiredDocumentItemDto {
  @ApiProperty({ description: '서류 ID', example: 5 })
  documentId: number;

  @ApiProperty({ description: '서류명', example: '소득금액증명원' })
  documentName: string;

  @ApiPropertyOptional({ description: '발급 기관', example: '국세청', nullable: true })
  issuer: string | null;

  @ApiProperty({ description: '발급 방법', enum: DocumentIssueMethod, example: DocumentIssueMethod.ONLINE })
  issueMethod: DocumentIssueMethod;

  @ApiProperty({ description: '필수 서류 여부', example: true })
  isRequired: boolean;
}

export class GuideCategoryItemDto {
  @ApiProperty({ description: '카테고리 ID', example: 1 })
  categoryId: number;

  @ApiProperty({ description: '카테고리명', example: '신청절차' })
  categoryName: string;

  @ApiProperty({ description: '표시 순서', example: 1 })
  displayOrder: number;
}

export class GetGuidesQueryDto {
  @ApiPropertyOptional({ description: '가이드 카테고리 ID', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoryId?: number;

  @ApiPropertyOptional({
    description: '공고 유형',
    enum: GuideAnnouncementType,
    example: GuideAnnouncementType.COMMON,
  })
  @IsOptional()
  @IsEnum(GuideAnnouncementType)
  announcementType?: GuideAnnouncementType;

  @ApiPropertyOptional({ description: '페이지 번호 (0부터 시작)', default: 0, example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  page?: number = 0;

  @ApiPropertyOptional({ description: '페이지 크기', default: 20, example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  size?: number = 20;
}

export class GuideListItemDto {
  @ApiProperty({ description: '가이드 ID', example: 10 })
  guideId: number;

  @ApiProperty({ description: '카테고리 ID', example: 1 })
  categoryId: number;

  @ApiProperty({ description: '가이드 제목', example: '추가모집 신청 절차 안내' })
  title: string;

  @ApiProperty({ description: '콘텐츠 타입', enum: GuideContentType, example: GuideContentType.TEXT })
  contentType: GuideContentType;

  @ApiProperty({ description: '표시 순서', example: 1 })
  displayOrder: number;
}

export class GuideListResultDto {
  @ApiProperty({ description: '전체 가이드 수', example: 9 })
  totalCount: number;

  @ApiProperty({ description: '가이드 목록', type: [GuideListItemDto] })
  guides: GuideListItemDto[];
}

export class GuideDetailResultDto {
  @ApiProperty({ description: '가이드 ID', example: 10 })
  guideId: number;

  @ApiProperty({ description: '가이드 제목', example: '추가모집 신청 절차 안내' })
  title: string;

  @ApiProperty({ description: '콘텐츠 타입', enum: GuideContentType, example: GuideContentType.TEXT })
  contentType: GuideContentType;

  @ApiProperty({
    description: '콘텐츠 본문 (TEXT=문단, IMAGE=img src URL, CHECKLIST=체크리스트 텍스트)',
    example: '1. 공고 확인\n2. 서류 준비\n3. 온라인 신청',
  })
  contentBody: string;

  @ApiProperty({ description: '최종 수정 일시', example: '2026-06-01T00:00:00Z' })
  updatedAt: string;
}
