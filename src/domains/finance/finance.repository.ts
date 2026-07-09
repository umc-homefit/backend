import { Injectable } from '@nestjs/common';
import { LoanProduct, Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

export interface LoanProductRateUpsertInput {
  productName: string;
  providerType: string;
  providerName: string;
  guaranteeRatio: number;
  minRate: number;
  maxRate: number;
  officialUrl: string;
  maxLimitAmount: number;
}

@Injectable()
export class FinanceRepository {
  constructor(private readonly prisma: PrismaService) {}

  findLoanProducts(params: {
    where: Prisma.LoanProductWhereInput;
    skip: number;
    take: number;
  }): Promise<LoanProduct[]> {
    return this.prisma.loanProduct.findMany({
      where: params.where,
      skip: params.skip,
      take: params.take,
      orderBy: { productId: 'asc' },
    });
  }

  countLoanProducts(where: Prisma.LoanProductWhereInput): Promise<number> {
    return this.prisma.loanProduct.count({ where });
  }

  findLoanProductById(productId: bigint): Promise<LoanProduct | null> {
    return this.prisma.loanProduct.findUnique({ where: { productId } });
  }

  /**
   * (providerName, productName, guaranteeRatio) 조합 기준으로 금리/제공기관 정보를 갱신하고, 없으면 새로 만든다.
   * description(상세 설명)은 이 메서드가 건드리지 않으므로, 별도로 채워둔 값이 있어도 보존된다.
   */
  upsertLoanProductRate(row: LoanProductRateUpsertInput): Promise<LoanProduct> {
    return this.prisma.loanProduct.upsert({
      where: {
        providerName_productName_guaranteeRatio: {
          providerName: row.providerName,
          productName: row.productName,
          guaranteeRatio: row.guaranteeRatio,
        },
      },
      update: {
        productName: row.productName,
        providerType: row.providerType,
        minRate: row.minRate,
        maxRate: row.maxRate,
        officialUrl: row.officialUrl,
        maxLimitAmount: row.maxLimitAmount,
      },
      create: {
        productName: row.productName,
        providerType: row.providerType,
        providerName: row.providerName,
        guaranteeRatio: row.guaranteeRatio,
        minRate: row.minRate,
        maxRate: row.maxRate,
        officialUrl: row.officialUrl,
        maxLimitAmount: row.maxLimitAmount,
      },
    });
  }
}
