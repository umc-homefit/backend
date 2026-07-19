import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  DocumentIssueMethod,
  GuideAnnouncementType,
  GuideContentType,
  LoanProviderType,
  ProductCategory,
  RequiredDocumentType,
} from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

import { PageInfoDto } from '../../../common/dto/page-info.dto';

export {
  DocumentIssueMethod,
  GuideAnnouncementType,
  GuideContentType,
  LoanProviderType,
  ProductCategory,
  RequiredDocumentType,
};

export enum LoanProductSort {
  RECOMMENDED = 'RECOMMENDED',
  LATEST = 'LATEST',
  RATE_ASC = 'RATE_ASC',
  LIMIT_DESC = 'LIMIT_DESC',
}

export class MatchLoanProductsQueryDto {
  @ApiPropertyOptional({ description: '매칭 기준 공고 ID', example: 22 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'noticeId는 정수여야 합니다.' })
  noticeId?: number;

  @ApiPropertyOptional({
    description: '상품 제공 유형',
    enum: LoanProviderType,
    example: LoanProviderType.POLICY,
  })
  @IsOptional()
  @IsEnum(LoanProviderType, {
    message: 'providerType은 반드시 다음 중 하나여야합니다 : POLICY, BANK',
  })
  providerType?: LoanProviderType;
}

export class MatchedLoanProductDto {
  @ApiProperty({ description: '상품 ID', example: 101 })
  productId: number;

  @ApiProperty({ description: '상품명', example: '청년 버팀목 전세자금대출' })
  productName: string;

  @ApiProperty({
    description: '제공 유형',
    enum: LoanProviderType,
    example: LoanProviderType.POLICY,
  })
  providerType: LoanProviderType;

  @ApiPropertyOptional({
    description: '상품 카테고리',
    enum: ProductCategory,
    example: ProductCategory.JEONSE_LOAN,
    nullable: true,
  })
  productCategory: ProductCategory | null;

  @ApiProperty({ description: '제공 기관명', example: '주택도시기금' })
  providerName: string;

  @ApiPropertyOptional({ description: '금리 범위', example: '1.5% ~ 2.7%', nullable: true })
  rateRange: string | null;

  @ApiPropertyOptional({
    description: '연소득 조건 상한 (원 단위)',
    example: 60000000,
    nullable: true,
  })
  maxIncome: number | null;

  @ApiPropertyOptional({ description: '생애최초 전용 여부', example: false, nullable: true })
  firstTimeBuyerOnly: boolean | null;

  @ApiPropertyOptional({ description: '최대 한도 (원 단위)', example: 200000000, nullable: true })
  maxLimitAmount: number | null;

  @ApiProperty({ description: '사용자 조건 대비 자격 충족 여부', example: true })
  isEligible: boolean;
}

export class MatchLoanProductsResultDto {
  @ApiProperty({ description: '매칭된 상품 수', example: 2 })
  matchedCount: number;

  @ApiPropertyOptional({
    description: '매칭 상품 중 최저 금리',
    example: '1.2%',
    nullable: true,
  })
  minRate: string | null;

  @ApiPropertyOptional({
    description: '매칭 상품 중 최대 한도 (원 단위)',
    example: 200000000,
    nullable: true,
  })
  maxLimitAmount: number | null;

  @ApiProperty({ description: '매칭 상품 목록', type: [MatchedLoanProductDto] })
  products: MatchedLoanProductDto[];
}

export class GetLoanProductsQueryDto {
  @ApiPropertyOptional({ description: '상품 제공 유형', enum: LoanProviderType })
  @IsOptional()
  @IsEnum(LoanProviderType, {
    message: 'providerType은 반드시 다음 중 하나여야합니다 : POLICY, BANK',
  })
  providerType?: LoanProviderType;

  @ApiPropertyOptional({ description: '상품 카테고리', enum: ProductCategory })
  @IsOptional()
  @IsEnum(ProductCategory, {
    message:
      'productCategory는 반드시 다음 중 하나여야합니다 : MORTGAGE_LOAN, JEONSE_LOAN, SUBSCRIPTION_SAVINGS',
  })
  productCategory?: ProductCategory;

  @ApiPropertyOptional({ description: '상품명/취급기관명 검색어 (부분 검색)', example: '버팀목' })
  @IsOptional()
  @IsString({ message: 'keyword는 문자열이어야 합니다.' })
  keyword?: string;

  @ApiPropertyOptional({
    description: '정렬 기준',
    enum: LoanProductSort,
    default: LoanProductSort.RECOMMENDED,
    example: LoanProductSort.RECOMMENDED,
  })
  @IsOptional()
  @IsEnum(LoanProductSort, {
    message: 'sort는 반드시 다음 중 하나여야합니다 : RECOMMENDED, LATEST, RATE_ASC, LIMIT_DESC',
  })
  sort?: LoanProductSort = LoanProductSort.RECOMMENDED;

  @ApiPropertyOptional({ description: '페이지 번호 (0부터 시작)', default: 0, example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page는 정수여야 합니다.' })
  @Min(0, { message: 'page는 0 이상이어야 합니다.' })
  page?: number = 0;

  @ApiPropertyOptional({ description: '페이지 크기', default: 20, example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'size는 정수여야 합니다.' })
  @Min(1, { message: 'size는 1 이상이어야 합니다.' })
  size?: number = 20;
}

export class LoanProductListItemDto {
  @ApiProperty({ description: '상품 ID', example: 103 })
  productId: number;

  @ApiProperty({ description: '상품명', example: '하나은행 청년 전세자금대출' })
  productName: string;

  @ApiProperty({ description: '제공 유형', enum: LoanProviderType, example: LoanProviderType.BANK })
  providerType: LoanProviderType;

  @ApiPropertyOptional({
    description: '상품 카테고리',
    enum: ProductCategory,
    example: ProductCategory.JEONSE_LOAN,
    nullable: true,
  })
  productCategory: ProductCategory | null;

  @ApiProperty({ description: '제공 기관명', example: '하나은행' })
  providerName: string;

  @ApiPropertyOptional({ description: '금리 범위', example: '3.2% ~ 4.5%', nullable: true })
  rateRange: string | null;

  @ApiPropertyOptional({
    description: '연소득 조건 상한 (원 단위)',
    example: 60000000,
    nullable: true,
  })
  maxIncome: number | null;

  @ApiPropertyOptional({ description: '생애최초 전용 여부', example: false, nullable: true })
  firstTimeBuyerOnly: boolean | null;

  @ApiPropertyOptional({ description: '최대 한도 (원 단위)', example: 200000000, nullable: true })
  maxLimitAmount: number | null;
}

export class LoanProductListResultDto {
  @ApiProperty({ description: '페이지 정보', type: PageInfoDto })
  pageInfo: PageInfoDto;

  @ApiProperty({ description: '금융상품 목록', type: [LoanProductListItemDto] })
  products: LoanProductListItemDto[];
}

export class SyncLoanProductsResultDto {
  @ApiProperty({ description: '외부 API가 응답한 은행 수', example: 18 })
  fetchedBankCount: number;

  @ApiProperty({ description: 'DB에 저장된 상품 수', example: 12 })
  syncedCount: number;

  @ApiProperty({
    description: '금리 정보가 없어(0) 저장에서 제외된 은행명 목록',
    example: ['산업은행', '제주은행'],
  })
  skippedBanks: string[];
}

export class LoanProductDetailResultDto {
  @ApiProperty({ description: '상품 ID', example: 101 })
  productId: number;

  @ApiProperty({ description: '상품명', example: '청년 버팀목 전세자금대출' })
  productName: string;

  @ApiProperty({
    description: '제공 유형',
    enum: LoanProviderType,
    example: LoanProviderType.POLICY,
  })
  providerType: LoanProviderType;

  @ApiPropertyOptional({
    description: '상품 카테고리',
    enum: ProductCategory,
    example: ProductCategory.JEONSE_LOAN,
    nullable: true,
  })
  productCategory: ProductCategory | null;

  @ApiProperty({ description: '제공 기관명', example: '주택도시기금' })
  providerName: string;

  @ApiPropertyOptional({ description: '금리 범위', example: '1.5% ~ 2.7%', nullable: true })
  rateRange: string | null;

  @ApiPropertyOptional({
    description: '연소득 조건 상한 (원 단위)',
    example: 60000000,
    nullable: true,
  })
  maxIncome: number | null;

  @ApiPropertyOptional({ description: '생애최초 전용 여부', example: false, nullable: true })
  firstTimeBuyerOnly: boolean | null;

  @ApiPropertyOptional({ description: '최대 한도 (원 단위)', example: 200000000, nullable: true })
  maxLimitAmount: number | null;

  @ApiPropertyOptional({
    description: 'LTV 한도(담보가치 대비 대출 비율, %). 대출 상품 전용',
    example: 70,
    nullable: true,
  })
  ltvRatio: number | null;

  @ApiPropertyOptional({
    description: 'DTI 한도(소득 대비 원리금 상환 비율, %). 대출 상품 전용',
    example: 60,
    nullable: true,
  })
  dtiRatio: number | null;

  @ApiPropertyOptional({ description: '대출 기간 최소(년)', example: 10, nullable: true })
  loanTermMinYears: number | null;

  @ApiPropertyOptional({ description: '대출 기간 최대(년)', example: 30, nullable: true })
  loanTermMaxYears: number | null;

  @ApiPropertyOptional({
    description: '우대금리 최대 할인폭(%p)',
    example: 0.5,
    nullable: true,
  })
  preferentialRateDiscount: number | null;

  @ApiPropertyOptional({
    description: '월 최소 납입액 (원 단위). 청약저축 전용',
    example: 20000,
    nullable: true,
  })
  minMonthlyDeposit: number | null;

  @ApiPropertyOptional({
    description: '월 최대 납입액 (원 단위). 청약저축 전용',
    example: 500000,
    nullable: true,
  })
  maxMonthlyDeposit: number | null;

  @ApiPropertyOptional({
    description: '공식 안내 URL (상세에만 포함)',
    example: 'https://nhuf.molit.go.kr',
    nullable: true,
  })
  officialUrl: string | null;

  @ApiPropertyOptional({
    description: '상품 설명',
    example: '만 19~34세 청년을 위한 전세자금 대출 상품입니다.',
    nullable: true,
  })
  description: string | null;
}

export class GetFinanceTermsQueryDto {
  @ApiProperty({ description: '정확히 일치하는 용어명 (필수, 부분검색 아님)', example: 'DSR' })
  @IsNotEmpty({ message: 'term은 비어있을 수 없습니다.' })
  @IsString({ message: 'term은 문자열이어야 합니다.' })
  term: string;
}

export class FinanceTermItemDto {
  @ApiProperty({ description: '용어명', example: 'DSR' })
  term: string;

  @ApiPropertyOptional({
    description: '상세 설명',
    example:
      'DSR(Debt Service Ratio)은 연간 소득 대비 모든 대출의 원리금 상환액 비율을 의미하며, 신규 대출 한도를 산정할 때 핵심 기준으로 사용됩니다.',
    nullable: true,
  })
  detailDescription: string | null;
}

export class RequiredDocumentItemDto {
  @ApiProperty({ description: '서류 ID', example: 5 })
  documentId: number;

  @ApiProperty({ description: '서류명', example: '소득금액증명원' })
  documentName: string;

  @ApiPropertyOptional({ description: '발급 기관', example: '국세청', nullable: true })
  issuer: string | null;

  @ApiProperty({
    description: '발급 방법',
    enum: DocumentIssueMethod,
    example: DocumentIssueMethod.ONLINE,
  })
  issueMethod: DocumentIssueMethod;

  @ApiProperty({
    description: '서류 구분',
    enum: RequiredDocumentType,
    example: RequiredDocumentType.COMMON,
  })
  documentType: RequiredDocumentType;

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
  @IsInt({ message: 'categoryId는 정수여야 합니다.' })
  categoryId?: number;

  @ApiPropertyOptional({
    description: '공고 유형',
    enum: GuideAnnouncementType,
    example: GuideAnnouncementType.COMMON,
  })
  @IsOptional()
  @IsEnum(GuideAnnouncementType, {
    message:
      'announcementType은 반드시 다음 중 하나여야합니다 : COMMON, YOUTH_SAFE_HOUSE, ADDITIONAL_RECRUIT',
  })
  announcementType?: GuideAnnouncementType;

  @ApiPropertyOptional({ description: '페이지 번호 (0부터 시작)', default: 0, example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page는 정수여야 합니다.' })
  @Min(0, { message: 'page는 0 이상이어야 합니다.' })
  page?: number = 0;

  @ApiPropertyOptional({ description: '페이지 크기', default: 20, example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'size는 정수여야 합니다.' })
  @Min(1, { message: 'size는 1 이상이어야 합니다.' })
  size?: number = 20;
}

export class GuideListItemDto {
  @ApiProperty({ description: '가이드 ID', example: 10 })
  guideId: number;

  @ApiProperty({ description: '가이드 제목', example: '추가모집 신청 절차 안내' })
  title: string;

  @ApiProperty({
    description: '콘텐츠 타입',
    enum: GuideContentType,
    example: GuideContentType.TEXT,
  })
  contentType: GuideContentType;

  @ApiProperty({
    description: '콘텐츠 본문 (TEXT=문단, IMAGE=img src URL, CHECKLIST=체크리스트 텍스트)',
    example: '1. 공고 확인\n2. 서류 준비\n3. 온라인 신청',
  })
  contentBody: string;

  @ApiProperty({ description: '최종 수정 일시', example: '2026-06-01T00:00:00Z' })
  updatedAt: string;
}

export class GuideListResultDto {
  @ApiProperty({ description: '페이지 정보', type: PageInfoDto })
  pageInfo: PageInfoDto;

  @ApiProperty({ description: '가이드 목록', type: [GuideListItemDto] })
  guides: GuideListItemDto[];
}

export class GuideDetailResultDto {
  @ApiProperty({ description: '가이드 ID', example: 10 })
  guideId: number;

  @ApiProperty({ description: '가이드 제목', example: '추가모집 신청 절차 안내' })
  title: string;

  @ApiProperty({
    description: '콘텐츠 타입',
    enum: GuideContentType,
    example: GuideContentType.TEXT,
  })
  contentType: GuideContentType;

  @ApiProperty({
    description: '콘텐츠 본문 (TEXT=문단, IMAGE=img src URL, CHECKLIST=체크리스트 텍스트)',
    example: '1. 공고 확인\n2. 서류 준비\n3. 온라인 신청',
  })
  contentBody: string;

  @ApiProperty({ description: '최종 수정 일시', example: '2026-06-01T00:00:00Z' })
  updatedAt: string;
}
