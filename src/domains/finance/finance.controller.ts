import {
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

import { ApiSuccessResponse } from '../../common/decorators/api-success-response.decorator';
import { ApiResponse, createSuccessResponse } from '../../common/types/api-response.type';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  DocumentIssueMethod,
  FinanceTermItemDto,
  GetFinanceTermsQueryDto,
  GetGuidesQueryDto,
  GetLoanProductsQueryDto,
  GuideCategoryItemDto,
  GuideDetailResultDto,
  GuideListResultDto,
  LoanProductDetailResultDto,
  LoanProductListResultDto,
  LoanProviderType,
  MatchLoanProductsQueryDto,
  MatchLoanProductsResultDto,
  ProductCategory,
  RequiredDocumentItemDto,
  RequiredDocumentType,
  SyncLoanProductsResultDto,
} from './dto/finance.dto';
import { FinanceService } from './finance.service';

/**
 * 금융상품 목록/상세 조회, 가이드 카테고리/목록/상세 조회는 FinanceService를 통해 DB에서 조회한다.
 * 그 외 엔드포인트(매칭, 필요서류, 금융용어)는 Service/DB 연동 전 단계로, Notion 명세의 Example 응답을 그대로 반환하는 mock 구현이다.
 */
@ApiTags('Finance/Guide')
@Controller()
export class FinanceController {
  constructor(
    private readonly financeService: FinanceService,
    private readonly configService: ConfigService,
  ) {}

  @Get('loan-products/match')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
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
      minRate: '1.2%',
      maxLimitAmount: 200000000,
      products: [
        {
          productId: 101,
          productName: '청년 버팀목 전세자금대출',
          providerType: LoanProviderType.POLICY,
          productCategory: ProductCategory.JEONSE_LOAN,
          providerName: '주택도시기금',
          rateRange: '1.5% ~ 2.7%',
          maxIncome: 60000000,
          firstTimeBuyerOnly: false,
          maxLimitAmount: 200000000,
          isEligible: true,
        },
      ],
    };

    return createSuccessResponse(result, 'FINANCE200', '금융상품 매칭 조회에 성공했습니다.');
  }

  @Get('loan-products')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
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

  @Post('loan-products/sync-test')
  @HttpCode(200)
  @ApiOperation({
    summary: '[테스트] 금융상품 외부 API 동기화',
    description:
      '한국주택금융공사 전세자금대출 금리 정보 공공API와 전세자금보증상품 상세정보 조회 공공API를 호출해 LoanProduct 테이블에 저장한다. ' +
      'officialUrl/maxLimitAmount는 은행별 값이 아니라, 두 tier(90%/100%)가 공통으로 속한 일반전세자금보증(grntDvcd=2D) 상세정보 기준으로 동일하게 채워진다. ' +
      '개발/테스트 용도이며, 운영 환경(NODE_ENV=production)에서는 호출할 수 없다.',
  })
  @ApiSuccessResponse(SyncLoanProductsResultDto, { description: '동기화 성공' })
  async syncLoanProducts(): Promise<ApiResponse<SyncLoanProductsResultDto>> {
    if (this.configService.get<string>('NODE_ENV') === 'production') {
      throw new ForbiddenException('테스트용 엔드포인트는 운영 환경에서 사용할 수 없습니다.');
    }

    const result = await this.financeService.syncLoanProductsFromExternalApi();

    return createSuccessResponse(result, 'FINANCE200', '금융상품 동기화에 성공했습니다.');
  }

  @Get('loan-products/:productId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '금융상품 상세 조회', description: '금융상품 상세 정보를 조회한다.' })
  @ApiParam({ name: 'productId', type: Number, description: '조회할 상품 ID', example: 101 })
  @ApiSuccessResponse(LoanProductDetailResultDto, { description: '금융상품 상세 조회 성공' })
  async getLoanProductDetail(
    @Param('productId', ParseIntPipe) productId: number,
  ): Promise<ApiResponse<LoanProductDetailResultDto>> {
    const result = await this.financeService.getLoanProductDetail(productId);

    return createSuccessResponse(result, 'FINANCE200', '금융상품 상세 조회에 성공했습니다.');
  }

  @Get('loan-products/:productId/documents')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
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
    const result: RequiredDocumentItemDto[] =
      productId === 101
        ? [
            {
              documentId: 5,
              documentName: '소득금액증명원',
              issuer: '국세청',
              issueMethod: DocumentIssueMethod.ONLINE,
              documentType: RequiredDocumentType.COMMON,
              isRequired: true,
            },
          ]
        : [];

    return createSuccessResponse(result, 'FINANCE200', '필요 서류 조회에 성공했습니다.');
  }

  @Get('finance-terms')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: '금융 용어 목록 조회',
    description: '금융 용어 사전을 검색어 기준으로 조회한다.',
  })
  @ApiSuccessResponse(FinanceTermItemDto, { isArray: true, description: '금융 용어 목록 조회 성공' })
  getFinanceTerms(@Query() _query: GetFinanceTermsQueryDto): ApiResponse<FinanceTermItemDto[]> {
    const result: FinanceTermItemDto[] = [{ term: 'DSR', detailDescription: null }];

    return createSuccessResponse(result, 'FINANCE200', '금융 용어 목록 조회에 성공했습니다.');
  }

  @Get('notices/:noticeId/documents')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
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
    const result: RequiredDocumentItemDto[] =
      noticeId === 1
        ? [
            {
              documentId: 5,
              documentName: '소득금액증명원',
              issuer: '국세청',
              issueMethod: DocumentIssueMethod.ONLINE,
              documentType: RequiredDocumentType.COMMON,
              isRequired: true,
            },
          ]
        : [];

    return createSuccessResponse(result, 'FINANCE200', '필요 서류 조회에 성공했습니다.');
  }

  @Get('guide-categories')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: '가이드 카테고리 목록 조회',
    description: '청약 가이드 카테고리 목록을 표시 순서대로 조회한다.',
  })
  @ApiSuccessResponse(GuideCategoryItemDto, {
    isArray: true,
    description: '가이드 카테고리 목록 조회 성공 (0건 포함)',
  })
  async getGuideCategories(): Promise<ApiResponse<GuideCategoryItemDto[]>> {
    const result = await this.financeService.getGuideCategories();

    return createSuccessResponse(result, 'FINANCE200', '가이드 카테고리 목록 조회에 성공했습니다.');
  }

  @Get('guides')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: '청약 가이드 목록 조회',
    description: '카테고리/공고 유형 조건에 맞는 청약 가이드 목록을 조회한다.',
  })
  @ApiSuccessResponse(GuideListResultDto, { description: '청약 가이드 목록 조회 성공 (0건 포함)' })
  async getGuides(@Query() query: GetGuidesQueryDto): Promise<ApiResponse<GuideListResultDto>> {
    const result = await this.financeService.getGuides(query);

    return createSuccessResponse(result, 'FINANCE200', '청약 가이드 목록 조회에 성공했습니다.');
  }

  @Get('guides/:guideId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: '청약 가이드 상세 조회',
    description: '청약 가이드 상세 콘텐츠를 조회한다.',
  })
  @ApiParam({ name: 'guideId', type: Number, description: '조회할 가이드 ID', example: 10 })
  @ApiSuccessResponse(GuideDetailResultDto, { description: '청약 가이드 상세 조회 성공' })
  async getGuideDetail(
    @Param('guideId', ParseIntPipe) guideId: number,
  ): Promise<ApiResponse<GuideDetailResultDto>> {
    const result = await this.financeService.getGuideDetail(guideId);

    return createSuccessResponse(result, 'FINANCE200', '청약 가이드 상세 조회에 성공했습니다.');
  }
}
