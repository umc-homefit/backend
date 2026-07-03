import { Injectable } from '@nestjs/common';
import { LoanProduct, Prisma } from '@prisma/client';

import {
  GetLoanProductsQueryDto,
  LoanProductListItemDto,
  LoanProductListResultDto,
  LoanProviderType,
} from './dto/finance.dto';
import { FinanceRepository } from './finance.repository';

const RATE_UNKNOWN_TEXT = '금리 정보 없음';

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
      maxLimitAmount: product.maxLimitAmount === null ? null : Number(product.maxLimitAmount),
    };
  }

  private formatRateRange(minRate: Prisma.Decimal | null, maxRate: Prisma.Decimal | null): string {
    if (minRate === null || maxRate === null) {
      return RATE_UNKNOWN_TEXT;
    }
    return `${minRate.toString()}% ~ ${maxRate.toString()}%`;
  }
}
