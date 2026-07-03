import { Injectable } from '@nestjs/common';
import { LoanProduct, Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

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
}
