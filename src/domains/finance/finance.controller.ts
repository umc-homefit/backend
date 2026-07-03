import { Controller, Get, NotFoundException, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

import { ApiSuccessResponse } from '../../common/decorators/api-success-response.decorator';
import { ApiResponse, createSuccessResponse } from '../../common/types/api-response.type';
import {
  DocumentIssueMethod,
  FinanceTermItemDto,
  GetFinanceTermsQueryDto,
  GetGuidesQueryDto,
  GetLoanProductsQueryDto,
  GuideCategoryItemDto,
  GuideContentType,
  GuideDetailResultDto,
  GuideListResultDto,
  LoanProductDetailResultDto,
  LoanProductListResultDto,
  LoanProviderType,
  MatchLoanProductsQueryDto,
  MatchLoanProductsResultDto,
  RequiredDocumentItemDto,
} from './dto/finance.dto';
import { FinanceService } from './finance.service';

/**
 * 금융상품 목록 조회(getLoanProducts)는 FinanceService를 통해 DB에서 조회한다.
 * 그 외 엔드포인트는 Service/DB 연동 전 단계로, Notion 명세의 Example 응답을 그대로 반환하는 mock 구현이다.
 */
@ApiTags('Finance/Guide')
@Controller()
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('loan-products/match')
  @ApiOperation({
    summary: '금융상품 매칭 조회',
    description: '사용자 조건과 공고 기준으로 매칭되는 금융상품을 조회한다.',
  })
  @ApiSuccessResponse(MatchLoanProductsResultDto, { description: '금융상품 매칭 조회 성공' })
  matchLoanProducts(
    @Query() _query: MatchLoanProductsQueryDto,
  ): ApiResponse<MatchLoanProductsResultDto> {
    const result: MatchLoanProductsResultDto = {
      matchedCount: 2,
      products: [
        {
          productId: 101,
          productName: '청년 버팀목 전세자금대출',
          providerType: LoanProviderType.POLICY,
          providerName: '주택도시기금',
          rateRange: '1.5% ~ 2.7%',
          maxLimitAmount: 200000000,
          isEligible: true,
        },
      ],
    };

    return createSuccessResponse(result, 'FINANCE200', '금융상품 매칭 조회에 성공했습니다.');
  }

  @Get('loan-products')
  @ApiOperation({
    summary: '금융상품 목록 조회',
    description: '조건에 맞는 금융상품 목록을 페이징하여 조회한다.',
  })
  @ApiSuccessResponse(LoanProductListResultDto, {
    description: '금융상품 목록 조회 성공 (0건 포함)',
  })
  async getLoanProducts(
    @Query() query: GetLoanProductsQueryDto,
  ): Promise<ApiResponse<LoanProductListResultDto>> {
    const result = await this.financeService.getLoanProducts(query);

    return createSuccessResponse(result, 'FINANCE200', '금융상품 목록 조회에 성공했습니다.');
  }

  @Get('loan-products/:productId')
  @ApiOperation({ summary: '금융상품 상세 조회', description: '금융상품 상세 정보를 조회한다.' })
  @ApiParam({ name: 'productId', type: Number, description: '조회할 상품 ID', example: 101 })
  @ApiSuccessResponse(LoanProductDetailResultDto, { description: '금융상품 상세 조회 성공' })
  getLoanProductDetail(
    @Param('productId', ParseIntPipe) productId: number,
  ): ApiResponse<LoanProductDetailResultDto> {
    if (productId !== 101) {
      throw new NotFoundException('존재하지 않는 상품입니다.');
    }

    const result: LoanProductDetailResultDto = {
      productId: 101,
      productName: '청년 버팀목 전세자금대출',
      providerType: LoanProviderType.POLICY,
      providerName: '주택도시기금',
      rateRange: '1.5% ~ 2.7%',
      maxLimitAmount: 200000000,
      officialUrl: 'https://nhuf.molit.go.kr',
      description: '만 19~34세 청년을 위한 전세자금 대출 상품입니다.',
    };

    return createSuccessResponse(result, 'FINANCE200', '금융상품 상세 조회에 성공했습니다.');
  }

  @Get('loan-products/:productId/documents')
  @ApiOperation({
    summary: '필요서류 조회 (상품용)',
    description: '금융상품 신청에 필요한 서류 목록을 조회한다.',
  })
  @ApiParam({ name: 'productId', type: Number, description: '조회할 상품 ID', example: 101 })
  @ApiSuccessResponse(RequiredDocumentItemDto, {
    isArray: true,
    description: '필요 서류 조회 성공',
  })
  getLoanProductDocuments(
    @Param('productId', ParseIntPipe) productId: number,
  ): ApiResponse<RequiredDocumentItemDto[]> {
    if (productId !== 101) {
      throw new NotFoundException('상품 또는 서류가 없습니다.');
    }

    const result: RequiredDocumentItemDto[] = [
      {
        documentId: 5,
        documentName: '소득금액증명원',
        issuer: '국세청',
        issueMethod: DocumentIssueMethod.ONLINE,
        isRequired: true,
      },
    ];

    return createSuccessResponse(result, 'FINANCE200', '필요 서류 조회에 성공했습니다.');
  }

  @Get('finance-terms')
  @ApiOperation({
    summary: '금융 용어 목록 조회',
    description: '금융 용어 사전을 검색어 기준으로 조회한다.',
  })
  @ApiSuccessResponse(FinanceTermItemDto, {
    isArray: true,
    description: '금융 용어 목록 조회 성공 (0건 포함)',
  })
  getFinanceTerms(@Query() _query: GetFinanceTermsQueryDto): ApiResponse<FinanceTermItemDto[]> {
    const result: FinanceTermItemDto[] = [{ term: 'DSR' }];

    return createSuccessResponse(result, 'FINANCE200', '금융 용어 목록 조회에 성공했습니다.');
  }

  @Get('notices/:noticeId/documents')
  @ApiOperation({
    summary: '필요서류 조회 (공고용)',
    description: '공고 지원에 필요한 서류 목록을 조회한다.',
  })
  @ApiParam({ name: 'noticeId', type: Number, description: '조회할 공고 ID', example: 1 })
  @ApiSuccessResponse(RequiredDocumentItemDto, {
    isArray: true,
    description: '필요 서류 조회 성공',
  })
  getNoticeDocuments(
    @Param('noticeId', ParseIntPipe) noticeId: number,
  ): ApiResponse<RequiredDocumentItemDto[]> {
    if (noticeId !== 1) {
      throw new NotFoundException('공고 또는 서류가 없습니다.');
    }

    const result: RequiredDocumentItemDto[] = [
      {
        documentId: 5,
        documentName: '소득금액증명원',
        issuer: '국세청',
        issueMethod: DocumentIssueMethod.ONLINE,
        isRequired: true,
      },
    ];

    return createSuccessResponse(result, 'FINANCE200', '필요 서류 조회에 성공했습니다.');
  }

  @Get('guide-categories')
  @ApiOperation({
    summary: '가이드 카테고리 목록 조회',
    description: '청약 가이드 카테고리 목록을 표시 순서대로 조회한다.',
  })
  @ApiSuccessResponse(GuideCategoryItemDto, {
    isArray: true,
    description: '가이드 카테고리 목록 조회 성공 (0건 포함)',
  })
  getGuideCategories(): ApiResponse<GuideCategoryItemDto[]> {
    const result: GuideCategoryItemDto[] = [
      { categoryId: 1, categoryName: '신청절차', displayOrder: 1 },
      { categoryId: 2, categoryName: '자격조건', displayOrder: 2 },
    ];

    return createSuccessResponse(result, 'FINANCE200', '가이드 카테고리 목록 조회에 성공했습니다.');
  }

  @Get('guides')
  @ApiOperation({
    summary: '청약 가이드 목록 조회',
    description: '카테고리/공고 유형 조건에 맞는 청약 가이드 목록을 조회한다.',
  })
  @ApiSuccessResponse(GuideListResultDto, { description: '청약 가이드 목록 조회 성공 (0건 포함)' })
  getGuides(@Query() _query: GetGuidesQueryDto): ApiResponse<GuideListResultDto> {
    const result: GuideListResultDto = {
      totalCount: 9,
      guides: [
        {
          guideId: 10,
          categoryId: 1,
          title: '추가모집 신청 절차 안내',
          contentType: GuideContentType.TEXT,
          displayOrder: 1,
        },
      ],
    };

    return createSuccessResponse(result, 'FINANCE200', '청약 가이드 목록 조회에 성공했습니다.');
  }

  @Get('guides/:guideId')
  @ApiOperation({
    summary: '청약 가이드 상세 조회',
    description: '청약 가이드 상세 콘텐츠를 조회한다.',
  })
  @ApiParam({ name: 'guideId', type: Number, description: '조회할 가이드 ID', example: 10 })
  @ApiSuccessResponse(GuideDetailResultDto, { description: '청약 가이드 상세 조회 성공' })
  getGuideDetail(
    @Param('guideId', ParseIntPipe) guideId: number,
  ): ApiResponse<GuideDetailResultDto> {
    if (guideId !== 10) {
      throw new NotFoundException('존재하지 않는 가이드입니다.');
    }

    const result: GuideDetailResultDto = {
      guideId: 10,
      title: '추가모집 신청 절차 안내',
      contentType: GuideContentType.TEXT,
      contentBody: '1. 공고 확인\n2. 서류 준비\n3. 온라인 신청',
      updatedAt: '2026-06-01T00:00:00Z',
    };

    return createSuccessResponse(result, 'FINANCE200', '청약 가이드 상세 조회에 성공했습니다.');
  }
}
