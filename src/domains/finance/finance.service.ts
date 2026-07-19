import {
  BadGatewayException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ExternalApiErrorType, Guide, LoanProduct, Prisma } from '@prisma/client';

import {
  GetGuidesQueryDto,
  GetLoanProductsQueryDto,
  GuideCategoryItemDto,
  GuideContentType,
  GuideDetailResultDto,
  GuideListItemDto,
  GuideListResultDto,
  LoanProductDetailResultDto,
  LoanProductListItemDto,
  LoanProductListResultDto,
  LoanProductSort,
  LoanProviderType,
  ProductCategory,
  SyncLoanProductsResultDto,
} from './dto/finance.dto';
import { FinanceRepository, LoanProductRateUpsertInput } from './finance.repository';

/**
 * 은행별 전세자금대출(rent-loan-rate-info)의 90%/100% 두 tier가 모두 해당하는 단일 보증상품(일반전세자금보증)의 보증구분코드.
 * officialUrl/maxLimitAmount는 은행별이 아니라 이 보증상품 기준으로 동일하게 적용된다.
 */
const SYNC_GUARANTEE_DVCD = '2D';

const EXTERNAL_API_NAME = {
  LOAN_RATE_API: 'LOAN_RATE_API',
  LOAN_GUARANTEE_INFO_API: 'LOAN_GUARANTEE_INFO_API',
} as const;

const EXTERNAL_API_ERROR_TYPE = ExternalApiErrorType;

interface RentLoanRateApiItem {
  organId: string;
  interest4_1: string;
  interest4_2: string;
  callCenter: string;
}

interface RentLoanRateApiResponse {
  header: { resultCode: string; resultMsg: string };
  body: { items: RentLoanRateApiItem[] };
}

interface LoanGuaranteeDetailInfoApiItem {
  guidUrl: string;
  maxLoanLmtAmt: string;
}

interface LoanGuaranteeDetailInfoApiResponse {
  header: { resultCode: string; resultMsg: string };
  body: { item: LoanGuaranteeDetailInfoApiItem };
}

@Injectable()
export class FinanceService {
  constructor(private readonly financeRepository: FinanceRepository) {}

  async getLoanProducts(query: GetLoanProductsQueryDto): Promise<LoanProductListResultDto> {
    const page = query.page ?? 0;
    const size = query.size ?? 20;
    const where: Prisma.LoanProductWhereInput = {
      ...(query.providerType ? { providerType: query.providerType } : {}),
      ...(query.productCategory ? { productCategory: query.productCategory } : {}),
      ...(query.keyword
        ? {
            OR: [
              { productName: { contains: query.keyword, mode: 'insensitive' } },
              { providerName: { contains: query.keyword, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [products, totalElements] = await Promise.all([
      this.financeRepository.findLoanProducts({
        where,
        skip: page * size,
        take: size,
        orderBy: this.buildLoanProductOrderBy(query.sort),
      }),
      this.financeRepository.countLoanProducts(where),
    ]);

    const totalPages = Math.ceil(totalElements / size);

    return {
      pageInfo: {
        page,
        size,
        totalElements,
        totalPages,
        hasNext: page + 1 < totalPages,
      },
      products: products.map((product) => this.toListItemDto(product)),
    };
  }

  async getLoanProductDetail(productId: number): Promise<LoanProductDetailResultDto> {
    const product = await this.financeRepository.findLoanProductById(BigInt(productId));

    if (!product) {
      throw new NotFoundException({ code: 'FINANCE404', message: '존재하지 않는 상품입니다.' });
    }

    return this.toDetailResultDto(product);
  }

  private buildLoanProductOrderBy(
    sort: LoanProductSort | undefined,
  ): Prisma.LoanProductOrderByWithRelationInput[] {
    switch (sort) {
      case LoanProductSort.LATEST:
        return [{ createdAt: 'desc' }, { productId: 'desc' }];
      case LoanProductSort.RATE_ASC:
        return [{ minRate: { sort: 'asc', nulls: 'last' } }, { productId: 'asc' }];
      case LoanProductSort.LIMIT_DESC:
        return [{ maxLimitAmount: { sort: 'desc', nulls: 'last' } }, { productId: 'asc' }];
      case LoanProductSort.RECOMMENDED:
      default:
        return [{ productId: 'asc' }];
    }
  }

  private toListItemDto(product: LoanProduct): LoanProductListItemDto {
    return {
      productId: Number(product.productId),
      productName: product.productName,
      providerType: product.providerType as LoanProviderType,
      productCategory: product.productCategory as ProductCategory | null,
      providerName: product.providerName,
      rateRange: this.formatRateRange(product.minRate, product.maxRate),
      maxIncome: product.maxIncome === null ? null : Number(product.maxIncome),
      firstTimeBuyerOnly: product.firstTimeBuyerOnly,
      maxLimitAmount: product.maxLimitAmount === null ? null : Number(product.maxLimitAmount),
    };
  }

  private toDetailResultDto(product: LoanProduct): LoanProductDetailResultDto {
    return {
      productId: Number(product.productId),
      productName: product.productName,
      providerType: product.providerType as LoanProviderType,
      productCategory: product.productCategory as ProductCategory | null,
      providerName: product.providerName,
      rateRange: this.formatRateRange(product.minRate, product.maxRate),
      maxIncome: product.maxIncome === null ? null : Number(product.maxIncome),
      firstTimeBuyerOnly: product.firstTimeBuyerOnly,
      maxLimitAmount: product.maxLimitAmount === null ? null : Number(product.maxLimitAmount),
      ltvRatio: product.ltvRatio,
      dtiRatio: product.dtiRatio,
      loanTermMinYears: product.loanTermMinYears,
      loanTermMaxYears: product.loanTermMaxYears,
      preferentialRateDiscount:
        product.preferentialRateDiscount === null ? null : Number(product.preferentialRateDiscount),
      minMonthlyDeposit:
        product.minMonthlyDeposit === null ? null : Number(product.minMonthlyDeposit),
      maxMonthlyDeposit:
        product.maxMonthlyDeposit === null ? null : Number(product.maxMonthlyDeposit),
      officialUrl: product.officialUrl,
      description: product.description,
    };
  }

  private formatRateRange(
    minRate: Prisma.Decimal | null,
    maxRate: Prisma.Decimal | null,
  ): string | null {
    if (minRate === null || maxRate === null) {
      return null;
    }
    return `${minRate.toString()}% ~ ${maxRate.toString()}%`;
  }

  async getGuideCategories(): Promise<GuideCategoryItemDto[]> {
    const categories = await this.financeRepository.findGuideCategories();

    return categories.map((category) => ({
      categoryId: Number(category.categoryId),
      categoryName: category.categoryName,
      displayOrder: category.displayOrder,
    }));
  }

  async getGuides(query: GetGuidesQueryDto): Promise<GuideListResultDto> {
    const page = query.page ?? 0;
    const size = query.size ?? 20;
    const where: Prisma.GuideWhereInput = {
      ...(query.categoryId !== undefined ? { categoryId: BigInt(query.categoryId) } : {}),
      ...(query.announcementType ? { announcementType: query.announcementType } : {}),
    };

    const [guides, totalElements] = await Promise.all([
      this.financeRepository.findGuides({ where, skip: page * size, take: size }),
      this.financeRepository.countGuides(where),
    ]);

    const totalPages = Math.ceil(totalElements / size);

    return {
      pageInfo: {
        page,
        size,
        totalElements,
        totalPages,
        hasNext: page + 1 < totalPages,
      },
      guides: guides.map((guide) => this.toGuideListItemDto(guide)),
    };
  }

  async getGuideDetail(guideId: number): Promise<GuideDetailResultDto> {
    const guide = await this.financeRepository.findGuideById(BigInt(guideId));

    if (!guide) {
      throw new NotFoundException({ code: 'FINANCE404', message: '존재하지 않는 가이드입니다.' });
    }

    return this.toGuideDto(guide);
  }

  private toGuideListItemDto(guide: Guide): GuideListItemDto {
    return this.toGuideDto(guide);
  }

  private toGuideDto(guide: Guide): GuideDetailResultDto {
    return {
      guideId: Number(guide.guideId),
      title: guide.title,
      contentType: guide.contentType as GuideContentType,
      contentBody: guide.contentBody,
      updatedAt: guide.updatedAt.toISOString(),
    };
  }

  /**
   * [테스트용] 전세자금대출 금리 정보 API와 전세자금보증상품 상세정보 API를 함께 호출해 LoanProduct 테이블에 반영한다.
   * (providerName, productName, guaranteeRatio) 기준으로 있으면 갱신(update)하고, 없으면 새로 만든다(create) — description은 건드리지 않는다.
   */
  async syncLoanProductsFromExternalApi(): Promise<SyncLoanProductsResultDto> {
    const [items, detailInfo] = await Promise.all([
      this.fetchLoanRateItems(),
      this.fetchLoanGuaranteeDetailInfo(SYNC_GUARANTEE_DVCD),
    ]);
    const officialUrl = detailInfo.guidUrl;
    const maxLimitAmount = Number(detailInfo.maxLoanLmtAmt);
    if (!Number.isSafeInteger(maxLimitAmount) || maxLimitAmount <= 0) {
      throw new BadGatewayException(
        `전세자금보증상품 상세정보 API의 maxLoanLmtAmt 값이 올바르지 않습니다: ${detailInfo.maxLoanLmtAmt}`,
      );
    }
    const skippedBanks: string[] = [];
    let syncedCount = 0;

    for (const item of items) {
      const tier1Rate = Number(item.interest4_1);
      const tier2Rate = Number(item.interest4_2);
      let matched = false;

      if (tier1Rate > 0) {
        await this.financeRepository.upsertLoanProductRate(
          this.buildSyncRow(item, tier1Rate, 90, officialUrl, maxLimitAmount),
        );
        matched = true;
        syncedCount += 1;
      }
      if (tier2Rate > 0) {
        await this.financeRepository.upsertLoanProductRate(
          this.buildSyncRow(item, tier2Rate, 100, officialUrl, maxLimitAmount),
        );
        matched = true;
        syncedCount += 1;
      }

      if (!matched) {
        skippedBanks.push(item.organId);
      }
    }

    return {
      fetchedBankCount: items.length,
      syncedCount,
      skippedBanks,
    };
  }

  private buildSyncRow(
    item: RentLoanRateApiItem,
    rate: number,
    guaranteeRatio: number,
    officialUrl: string,
    maxLimitAmount: number,
  ): LoanProductRateUpsertInput {
    return {
      productName: `${item.organId} 전세자금대출 (보증비율 ${guaranteeRatio}%)`,
      providerType: LoanProviderType.BANK,
      productCategory: ProductCategory.JEONSE_LOAN,
      providerName: item.organId,
      guaranteeRatio,
      minRate: rate,
      maxRate: rate,
      officialUrl,
      maxLimitAmount,
    };
  }

  private async fetchLoanRateItems(): Promise<RentLoanRateApiItem[]> {
    const baseUrl = process.env.LOAN_RATE_API_BASE_URL;
    const serviceKey = process.env.LOAN_RATE_API_SERVICE_KEY;

    if (!baseUrl || !serviceKey) {
      throw new InternalServerErrorException(
        'LOAN_RATE_API_BASE_URL/LOAN_RATE_API_SERVICE_KEY 환경변수가 설정되지 않았습니다.',
      );
    }

    const url = new URL(baseUrl);
    url.searchParams.set('serviceKey', serviceKey);
    url.searchParams.set('numOfRows', '100');
    url.searchParams.set('pageNo', '1');
    url.searchParams.set('dataType', 'json');
    const requestUrl = this.maskServiceKey(url);
    const startedAt = new Date();
    const apiName = EXTERNAL_API_NAME.LOAN_RATE_API;

    const response = await this.executeExternalApiCall(() => fetch(url.toString()), {
      apiName,
      requestUrl,
      startedAt,
    });

    if (!response.ok) {
      const message = `전세자금대출 금리 API 호출에 실패했습니다. (status: ${response.status})`;
      await this.logExternalApiFailure({
        apiName,
        errorType: EXTERNAL_API_ERROR_TYPE.HTTP_ERROR,
        httpStatusCode: response.status,
        requestUrl,
        errorMessage: message,
        startedAt,
      });
      throw new InternalServerErrorException(message);
    }

    const data = await this.parseExternalApiResponse<RentLoanRateApiResponse>(response, {
      apiName,
      requestUrl,
      startedAt,
      validate: (parsed) => Boolean(parsed?.header) && Array.isArray(parsed?.body?.items),
      invalidMessage: '전세자금대출 금리 API 응답에 header 또는 body.items가 없습니다.',
    });
    if (data.header.resultCode !== '00') {
      const message = `전세자금대출 금리 API 오류: ${data.header.resultMsg}`;
      await this.logExternalApiFailure({
        apiName,
        errorType: EXTERNAL_API_ERROR_TYPE.RESULT_CODE_ERROR,
        httpStatusCode: response.status,
        requestUrl,
        errorMessage: message,
        startedAt,
      });
      throw new InternalServerErrorException(message);
    }

    return data.body.items;
  }

  private async fetchLoanGuaranteeDetailInfo(
    grntDvcd: string,
  ): Promise<LoanGuaranteeDetailInfoApiItem> {
    const baseUrl = process.env.LOAN_GUARANTEE_INFO_API_BASE_URL;
    const serviceKey = process.env.LOAN_RATE_API_SERVICE_KEY;

    if (!baseUrl || !serviceKey) {
      throw new InternalServerErrorException(
        'LOAN_GUARANTEE_INFO_API_BASE_URL/LOAN_RATE_API_SERVICE_KEY 환경변수가 설정되지 않았습니다.',
      );
    }

    const url = new URL(baseUrl);
    url.searchParams.set('serviceKey', serviceKey);
    url.searchParams.set('dataType', 'json');
    url.searchParams.set('grntDvcd', grntDvcd);
    const requestUrl = this.maskServiceKey(url);
    const startedAt = new Date();
    const apiName = EXTERNAL_API_NAME.LOAN_GUARANTEE_INFO_API;

    const response = await this.executeExternalApiCall(() => fetch(url.toString()), {
      apiName,
      requestUrl,
      startedAt,
    });

    if (!response.ok) {
      const message = `전세자금보증상품 상세정보 API 호출에 실패했습니다. (status: ${response.status})`;
      await this.logExternalApiFailure({
        apiName,
        errorType: EXTERNAL_API_ERROR_TYPE.HTTP_ERROR,
        httpStatusCode: response.status,
        requestUrl,
        errorMessage: message,
        startedAt,
      });
      throw new InternalServerErrorException(message);
    }

    const data = await this.parseExternalApiResponse<LoanGuaranteeDetailInfoApiResponse>(response, {
      apiName,
      requestUrl,
      startedAt,
      validate: (parsed) => Boolean(parsed?.header) && Boolean(parsed?.body),
      invalidMessage: '전세자금보증상품 상세정보 API 응답에 header 또는 body가 없습니다.',
    });
    if (data.header.resultCode !== '00') {
      const message = `전세자금보증상품 상세정보 API 오류: ${data.header.resultMsg}`;
      await this.logExternalApiFailure({
        apiName,
        errorType: EXTERNAL_API_ERROR_TYPE.RESULT_CODE_ERROR,
        httpStatusCode: response.status,
        requestUrl,
        errorMessage: message,
        startedAt,
      });
      throw new InternalServerErrorException(message);
    }

    const item = data.body?.item;
    if (!item || !item.guidUrl) {
      const message = '전세자금보증상품 상세정보 API 응답에 item 또는 guidUrl이 없습니다.';
      await this.logExternalApiFailure({
        apiName,
        errorType: EXTERNAL_API_ERROR_TYPE.INVALID_RESPONSE,
        httpStatusCode: response.status,
        requestUrl,
        errorMessage: message,
        startedAt,
      });
      throw new BadGatewayException(message);
    }

    return item;
  }

  /**
   * fetch() 자체가 던지는 네트워크 단계 오류(DNS 실패, 연결 거부, 타임아웃 등)를 잡아
   * NETWORK_ERROR로 로그를 남긴 뒤 InternalServerErrorException으로 통일해 던진다.
   */
  private async executeExternalApiCall(
    call: () => Promise<Response>,
    context: { apiName: string; requestUrl: string; startedAt: Date },
  ): Promise<Response> {
    try {
      return await call();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.logExternalApiFailure({
        apiName: context.apiName,
        errorType: EXTERNAL_API_ERROR_TYPE.NETWORK_ERROR,
        httpStatusCode: null,
        requestUrl: context.requestUrl,
        errorMessage: message,
        startedAt: context.startedAt,
      });
      throw new InternalServerErrorException(
        `외부 API 호출 중 네트워크 오류가 발생했습니다: ${message}`,
      );
    }
  }

  /**
   * response.json() 파싱 실패나 header/body 누락(구조 이상)도 INVALID_RESPONSE로 로그를 남기도록 공통 처리한다.
   * try/catch 밖에서 파싱하면 예외가 로그 없이 그대로 튀어나가던 문제를 막기 위함.
   */
  private async parseExternalApiResponse<T>(
    response: Response,
    context: {
      apiName: string;
      requestUrl: string;
      startedAt: Date;
      validate: (parsed: T) => boolean;
      invalidMessage: string;
    },
  ): Promise<T> {
    let parsed: T;
    try {
      parsed = (await response.json()) as T;
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      const message = `${context.invalidMessage} (JSON 파싱 실패: ${detail})`;
      await this.logExternalApiFailure({
        apiName: context.apiName,
        errorType: EXTERNAL_API_ERROR_TYPE.INVALID_RESPONSE,
        httpStatusCode: response.status,
        requestUrl: context.requestUrl,
        errorMessage: message,
        startedAt: context.startedAt,
      });
      throw new BadGatewayException(message);
    }

    if (!context.validate(parsed)) {
      await this.logExternalApiFailure({
        apiName: context.apiName,
        errorType: EXTERNAL_API_ERROR_TYPE.INVALID_RESPONSE,
        httpStatusCode: response.status,
        requestUrl: context.requestUrl,
        errorMessage: context.invalidMessage,
        startedAt: context.startedAt,
      });
      throw new BadGatewayException(context.invalidMessage);
    }

    return parsed;
  }

  private async logExternalApiFailure(params: {
    apiName: string;
    errorType: ExternalApiErrorType;
    httpStatusCode: number | null;
    requestUrl: string;
    errorMessage: string;
    startedAt: Date;
  }): Promise<void> {
    await this.financeRepository.createExternalApiCallLog(params);
  }

  /** 로그/에러 메시지에 serviceKey 같은 인증정보가 남지 않도록 마스킹한 URL 문자열을 반환한다. */
  private maskServiceKey(url: URL): string {
    const masked = new URL(url.toString());
    if (masked.searchParams.has('serviceKey')) {
      masked.searchParams.set('serviceKey', '***');
    }
    return masked.toString();
  }
}
