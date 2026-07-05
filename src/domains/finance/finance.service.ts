import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { LoanProduct, Prisma } from '@prisma/client';

import {
  GetLoanProductsQueryDto,
  LoanProductListItemDto,
  LoanProductListResultDto,
  LoanProviderType,
  SyncLoanProductsResultDto,
} from './dto/finance.dto';
import { FinanceRepository, LoanProductRateUpsertInput } from './finance.repository';

/** officialUrl을 아직 은행별로 확보하지 못해 임시로 통일한 값 (한국주택금융공사 공식 사이트). */
const SYNC_OFFICIAL_URL = 'https://hf.go.kr/ko/index.do';

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

@Injectable()
export class FinanceService {
  constructor(private readonly financeRepository: FinanceRepository) {}

  async getLoanProducts(query: GetLoanProductsQueryDto): Promise<LoanProductListResultDto> {
    const page = query.page ?? 0;
    const size = query.size ?? 20;
    const where: Prisma.LoanProductWhereInput = query.providerType
      ? { providerType: query.providerType }
      : {};

    const [products, totalElements] = await Promise.all([
      this.financeRepository.findLoanProducts({ where, skip: page * size, take: size }),
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

  private toListItemDto(product: LoanProduct): LoanProductListItemDto {
    return {
      productId: Number(product.productId),
      productName: product.productName,
      providerType: product.providerType as LoanProviderType,
      providerName: product.providerName,
      rateRange: this.formatRateRange(product.minRate, product.maxRate),
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

  /**
   * [테스트용] 한국주택금융공사 전세자금대출 금리 정보 공공API를 호출해 LoanProduct 테이블에 반영한다.
   * productName 기준으로 있으면 금리만 갱신(update)하고, 없으면 새로 만든다(create) — description은 건드리지 않는다.
   * officialUrl은 은행별 URL을 아직 확보하지 못해 SYNC_OFFICIAL_URL로 통일한다.
   */
  async syncLoanProductsFromExternalApi(): Promise<SyncLoanProductsResultDto> {
    const items = await this.fetchLoanRateItems();
    const skippedBanks: string[] = [];
    let syncedCount = 0;

    for (const item of items) {
      const tier1Rate = Number(item.interest4_1);
      const tier2Rate = Number(item.interest4_2);
      let matched = false;

      if (tier1Rate > 0) {
        await this.financeRepository.upsertLoanProductRate(this.buildSyncRow(item, tier1Rate, 90));
        matched = true;
        syncedCount += 1;
      }
      if (tier2Rate > 0) {
        await this.financeRepository.upsertLoanProductRate(
          this.buildSyncRow(item, tier2Rate, 100),
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
  ): LoanProductRateUpsertInput {
    return {
      productName: `${item.organId} 전세자금대출 (보증비율 ${guaranteeRatio}%)`,
      providerType: LoanProviderType.BANK,
      providerName: item.organId,
      guaranteeRatio,
      minRate: rate,
      maxRate: rate,
      officialUrl: SYNC_OFFICIAL_URL,
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

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new InternalServerErrorException(
        `전세자금대출 금리 API 호출에 실패했습니다. (status: ${response.status})`,
      );
    }

    const data = (await response.json()) as RentLoanRateApiResponse;
    if (data.header.resultCode !== '00') {
      throw new InternalServerErrorException(
        `전세자금대출 금리 API 오류: ${data.header.resultMsg}`,
      );
    }

    return data.body.items;
  }
}
