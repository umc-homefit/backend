import { Injectable } from '@nestjs/common';
import { ExternalApiCallLog, Guide, GuideCategory, LoanProduct, Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

export interface LoanProductRateUpsertInput {
  productName: string;
  providerType: string;
  productCategory: string;
  providerName: string;
  guaranteeRatio: number;
  minRate: number;
  maxRate: number;
  officialUrl: string;
  maxLimitAmount: number;
}

export interface ExternalApiCallLogInput {
  apiName: string;
  errorType: string;
  httpStatusCode: number | null;
  requestUrl: string | null;
  errorMessage: string;
  startedAt: Date;
}

@Injectable()
export class FinanceRepository {
  /** DB 컬럼이 timezone 없는 TIMESTAMP라 UTC 값 그대로 저장하면 KST보다 9시간 느리게 보임. 저장 직전에 밀어서 넣는다. */
  private readonly kstOffsetMs = 9 * 60 * 60 * 1000;

  constructor(private readonly prisma: PrismaService) {}

  private toKstDate(date: Date): Date {
    return new Date(date.getTime() + this.kstOffsetMs);
  }

  findLoanProducts(params: {
    where: Prisma.LoanProductWhereInput;
    skip: number;
    take: number;
    orderBy: Prisma.LoanProductOrderByWithRelationInput[];
  }): Promise<LoanProduct[]> {
    return this.prisma.loanProduct.findMany({
      where: params.where,
      skip: params.skip,
      take: params.take,
      orderBy: params.orderBy,
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
        productCategory: row.productCategory,
        minRate: row.minRate,
        maxRate: row.maxRate,
        officialUrl: row.officialUrl,
        maxLimitAmount: row.maxLimitAmount,
      },
      create: {
        productName: row.productName,
        providerType: row.providerType,
        productCategory: row.productCategory,
        providerName: row.providerName,
        guaranteeRatio: row.guaranteeRatio,
        minRate: row.minRate,
        maxRate: row.maxRate,
        officialUrl: row.officialUrl,
        maxLimitAmount: row.maxLimitAmount,
      },
    });
  }

  findGuideCategories(): Promise<GuideCategory[]> {
    return this.prisma.guideCategory.findMany({ orderBy: { displayOrder: 'asc' } });
  }

  findGuides(params: {
    where: Prisma.GuideWhereInput;
    skip: number;
    take: number;
  }): Promise<Guide[]> {
    return this.prisma.guide.findMany({
      where: params.where,
      skip: params.skip,
      take: params.take,
      orderBy: [{ categoryId: 'asc' }, { displayOrder: 'asc' }, { guideId: 'asc' }],
    });
  }

  countGuides(where: Prisma.GuideWhereInput): Promise<number> {
    return this.prisma.guide.count({ where });
  }

  findGuideById(guideId: bigint): Promise<Guide | null> {
    return this.prisma.guide.findUnique({ where: { guideId } });
  }

  createExternalApiCallLog(input: ExternalApiCallLogInput): Promise<ExternalApiCallLog> {
    return this.prisma.externalApiCallLog.create({
      data: {
        apiName: input.apiName,
        status: 'FAILED',
        errorType: input.errorType,
        httpStatusCode: input.httpStatusCode,
        requestUrl: input.requestUrl,
        errorMessage: input.errorMessage,
        startedAt: this.toKstDate(input.startedAt),
        failedAt: this.toKstDate(new Date()),
        createdAt: this.toKstDate(new Date()),
      },
    });
  }
}
