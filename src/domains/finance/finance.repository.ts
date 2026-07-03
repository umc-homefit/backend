import { Injectable } from '@nestjs/common';
import { LoanProduct, Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

export interface LoanProductRateUpsertInput {
  productName: string;
  providerType: string;
  providerName: string;
  minRate: number;
  maxRate: number;
  officialUrl: string;
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

  /**
   * productName으로 기존 상품을 찾아 금리/제공기관 정보만 갱신하고, 없으면 새로 만든다.
   * description(상세 설명)은 이 메서드가 건드리지 않으므로, 별도로 채워둔 값이 있어도 보존된다.
   * (스키마에 productName 유니크 제약이 없어 Prisma의 upsert() 대신 find-then-update/create로 구현)
   */
  async upsertLoanProductRate(row: LoanProductRateUpsertInput): Promise<LoanProduct> {
    const existing = await this.prisma.loanProduct.findFirst({
      where: { productName: row.productName },
    });

    if (existing) {
      return this.prisma.loanProduct.update({
        where: { productId: existing.productId },
        data: {
          providerType: row.providerType,
          providerName: row.providerName,
          minRate: row.minRate,
          maxRate: row.maxRate,
        },
      });
    }

    return this.prisma.loanProduct.create({
      data: {
        productName: row.productName,
        providerType: row.providerType,
        providerName: row.providerName,
        minRate: row.minRate,
        maxRate: row.maxRate,
        officialUrl: row.officialUrl,
      },
    });
  }
}
