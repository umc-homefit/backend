import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import {
  EligibilityConditionCode,
  EligibilityConditionResultDto,
  EligibilityConditionResultStatus,
  EligibilityResultLevel,
  RequestEligibilityAnalysisResultDto,
} from './dto/eligibility.dto';

type ConditionDraft = EligibilityConditionResultDto & {
  conditionId: bigint | null;
};

type ScoreResult = {
  eligibilityScore: number;
  resultLevel: EligibilityResultLevel;
  needsCheck: boolean;
  hasPolicyFail: boolean;
};

@Injectable()
export class EligibilityService {
  private readonly recommendedRentBurdenRate = 40;

  constructor(private readonly prisma: PrismaService) {}

  async requestEligibilityAnalysis(
    noticeId: number,
    unitId: number,
    userId: bigint,
  ): Promise<RequestEligibilityAnalysisResultDto> {
    if (noticeId <= 0 || unitId <= 0) {
      throw new BadRequestException('잘못된 공고 ID 또는 주택 ID입니다.');
    }

    const [notice, unit, userConditionProfile] = await Promise.all([
      this.prisma.notice.findUnique({
        where: { noticeId: BigInt(noticeId) },
        include: { conditions: true },
      }),
      this.prisma.noticeUnit.findUnique({ where: { unitId: BigInt(unitId) } }),
      this.prisma.userConditionProfile.findUnique({
        where: { userId },
      }),
    ]);

    if (!notice || !unit) {
      throw new NotFoundException('존재하지 않는 공고 또는 주택 정보입니다.');
    }

    if (unit.noticeId !== notice.noticeId) {
      throw new BadRequestException('잘못된 공고 ID 또는 주택 ID입니다.');
    }

    if (!userConditionProfile) {
      throw new ConflictException('사용자 조건 프로필이 입력되지 않았습니다.');
    }

    const expectedDepositAmount = Number(unit.depositMax ?? unit.depositMin ?? BigInt(0));
    const expectedMonthlyRentAmount = Number(
      unit.monthlyRentMax ?? unit.monthlyRentMin ?? BigInt(0),
    );
    const maintenanceFeeAmount = 0;
    const monthlyHousingCost = expectedMonthlyRentAmount + maintenanceFeeAmount;
    const monthlyIncomeAmount = Number(userConditionProfile.monthlyIncomeAmount);
    const cashSavings = Number(userConditionProfile.cashSavings);
    const shortageAmount = Math.max(expectedDepositAmount - cashSavings, 0);
    const rentBurdenRate =
      monthlyIncomeAmount > 0
        ? this.roundToTwoDecimals((monthlyHousingCost / monthlyIncomeAmount) * 100)
        : 0;

    const conditionResults = [
      this.buildCashCondition(expectedDepositAmount, cashSavings),
      this.buildRentBurdenCondition(monthlyHousingCost, monthlyIncomeAmount, rentBurdenRate),
      ...this.buildPolicyConditions(notice.conditions, {
        monthlyIncomeAmount,
        totalAssetAmount: Number(userConditionProfile.totalAssetAmount),
        isHomeless: userConditionProfile.isHomeless,
      }),
    ];
    const scoreResult = this.calculateScore({
      expectedDepositAmount,
      cashSavings,
      monthlyIncomeAmount,
      rentBurdenRate,
      policyConditions: conditionResults.filter((conditionResult) =>
        [
          EligibilityConditionCode.INCOME,
          EligibilityConditionCode.ASSET,
          EligibilityConditionCode.HOMELESS,
        ].includes(conditionResult.conditionCode),
      ),
    });

    const analysis = await this.prisma.eligibilityAnalysis.create({
      data: {
        userConditionProfileId: userConditionProfile.userConditionProfileId,
        noticeId: notice.noticeId,
        unitId: unit.unitId,
        resultLevel: scoreResult.resultLevel,
        eligibilityScore: scoreResult.eligibilityScore,
        expectedDepositAmount: BigInt(expectedDepositAmount),
        expectedMonthlyRentAmount: BigInt(expectedMonthlyRentAmount),
        maintenanceFeeAmount: BigInt(maintenanceFeeAmount),
        shortageAmount: BigInt(shortageAmount),
        rentBurdenRate,
        summaryMessage: this.createSummaryMessage(scoreResult, shortageAmount, rentBurdenRate),
        conditionResults: {
          create: conditionResults.map((conditionResult) => ({
            conditionId: conditionResult.conditionId,
            conditionCode: conditionResult.conditionCode,
            conditionName: conditionResult.conditionName,
            requiredValue: conditionResult.requiredValue,
            userValue: conditionResult.userValue,
            resultStatus: conditionResult.resultStatus,
            failReason: conditionResult.failReason,
          })),
        },
      },
      include: { conditionResults: true },
    });

    return {
      analysisId: Number(analysis.eligibilityAnalysisId),
      resultLevel: analysis.resultLevel as EligibilityResultLevel,
      eligibilityScore: Number(analysis.eligibilityScore),
      shortageAmount: Number(analysis.shortageAmount),
      rentBurdenRate: Number(analysis.rentBurdenRate),
      summaryMessage: analysis.summaryMessage,
      conditionResults: analysis.conditionResults.map((conditionResult) => ({
        conditionCode: conditionResult.conditionCode as EligibilityConditionCode,
        conditionName: conditionResult.conditionName,
        requiredValue: conditionResult.requiredValue,
        userValue: conditionResult.userValue,
        resultStatus: conditionResult.resultStatus as EligibilityConditionResultStatus,
        failReason: conditionResult.failReason,
      })),
      analyzedAt: analysis.analyzedAt.toISOString().replace(/\.\d{3}Z$/, ''),
    };
  }

  private buildCashCondition(expectedDepositAmount: number, cashSavings: number): ConditionDraft {
    const shortageAmount = Math.max(expectedDepositAmount - cashSavings, 0);
    const needsCheck = expectedDepositAmount <= 0;

    return {
      conditionId: null,
      conditionCode: EligibilityConditionCode.CASH,
      conditionName: '보유 현금',
      requiredValue: needsCheck
        ? null
        : `보증금 ${this.formatKoreanAmount(expectedDepositAmount)} 이상`,
      userValue: `보유 현금 ${this.formatKoreanAmount(cashSavings)}`,
      resultStatus: needsCheck
        ? EligibilityConditionResultStatus.NEED_CHECK
        : shortageAmount === 0
          ? EligibilityConditionResultStatus.PASS
          : EligibilityConditionResultStatus.FAIL,
      failReason: needsCheck
        ? '예상 보증금 정보가 없어 필요 자금 충족도 확인이 필요합니다.'
        : shortageAmount === 0
          ? null
          : `예상 보증금 대비 보유 현금이 ${this.formatKoreanAmount(shortageAmount)} 부족합니다.`,
    };
  }

  private buildRentBurdenCondition(
    monthlyHousingCost: number,
    monthlyIncomeAmount: number,
    rentBurdenRate: number,
  ): ConditionDraft {
    const needsCheck = monthlyIncomeAmount <= 0;
    const isPassed = rentBurdenRate <= this.recommendedRentBurdenRate;

    return {
      conditionId: null,
      conditionCode: EligibilityConditionCode.RENT_BURDEN,
      conditionName: '월세 부담률',
      requiredValue: `월소득 대비 월 주거비 ${this.recommendedRentBurdenRate}% 이하 권장`,
      userValue: needsCheck ? null : `${rentBurdenRate}%`,
      resultStatus: needsCheck
        ? EligibilityConditionResultStatus.NEED_CHECK
        : isPassed
          ? EligibilityConditionResultStatus.PASS
          : EligibilityConditionResultStatus.FAIL,
      failReason: needsCheck
        ? '월소득 정보가 없어 월세 부담률 확인이 필요합니다.'
        : isPassed
          ? null
          : `월 주거비 ${this.formatKoreanAmount(monthlyHousingCost)}가 권장 기준을 초과합니다.`,
    };
  }

  private buildPolicyConditions(
    noticeConditions: Array<{
      conditionId: bigint;
      incomeLimitAmount: bigint | null;
      incomeLimitText: string | null;
      assetLimitAmount: bigint | null;
      assetLimitText: string | null;
      requiresHomeless: boolean | null;
      housingOwnershipRequirement: string | null;
    }>,
    userCondition: {
      monthlyIncomeAmount: number;
      totalAssetAmount: number;
      isHomeless: boolean;
    },
  ): ConditionDraft[] {
    return noticeConditions.flatMap((noticeCondition) => {
      const results: ConditionDraft[] = [];

      if (noticeCondition.incomeLimitAmount !== null) {
        const limit = Number(noticeCondition.incomeLimitAmount);
        const isPassed = userCondition.monthlyIncomeAmount <= limit;
        results.push({
          conditionId: noticeCondition.conditionId,
          conditionCode: EligibilityConditionCode.INCOME,
          conditionName: '소득 조건',
          requiredValue:
            noticeCondition.incomeLimitText ?? `월소득 ${this.formatKoreanAmount(limit)} 이하`,
          userValue: `월소득 ${this.formatKoreanAmount(userCondition.monthlyIncomeAmount)}`,
          resultStatus: isPassed
            ? EligibilityConditionResultStatus.PASS
            : EligibilityConditionResultStatus.FAIL,
          failReason: isPassed ? null : '공고 소득 기준을 충족하지 못했습니다.',
        });
      }

      if (noticeCondition.assetLimitAmount !== null) {
        const limit = Number(noticeCondition.assetLimitAmount);
        const isPassed = userCondition.totalAssetAmount <= limit;
        results.push({
          conditionId: noticeCondition.conditionId,
          conditionCode: EligibilityConditionCode.ASSET,
          conditionName: '자산 조건',
          requiredValue:
            noticeCondition.assetLimitText ?? `총자산 ${this.formatKoreanAmount(limit)} 이하`,
          userValue: `총자산 ${this.formatKoreanAmount(userCondition.totalAssetAmount)}`,
          resultStatus: isPassed
            ? EligibilityConditionResultStatus.PASS
            : EligibilityConditionResultStatus.FAIL,
          failReason: isPassed ? null : '공고 자산 기준을 충족하지 못했습니다.',
        });
      }

      if (noticeCondition.requiresHomeless !== null) {
        const isPassed = !noticeCondition.requiresHomeless || userCondition.isHomeless;
        results.push({
          conditionId: noticeCondition.conditionId,
          conditionCode: EligibilityConditionCode.HOMELESS,
          conditionName: '무주택 여부',
          requiredValue:
            noticeCondition.housingOwnershipRequirement ??
            (noticeCondition.requiresHomeless ? '무주택자' : '무관'),
          userValue: userCondition.isHomeless ? '무주택자' : '무주택자 아님',
          resultStatus: isPassed
            ? EligibilityConditionResultStatus.PASS
            : EligibilityConditionResultStatus.FAIL,
          failReason: isPassed ? null : '무주택 요건을 충족하지 못했습니다.',
        });
      }

      return results;
    });
  }

  private calculateScore(params: {
    expectedDepositAmount: number;
    cashSavings: number;
    monthlyIncomeAmount: number;
    rentBurdenRate: number;
    policyConditions: ConditionDraft[];
  }): ScoreResult {
    const cashScore =
      params.expectedDepositAmount > 0
        ? Math.min(params.cashSavings / params.expectedDepositAmount, 1) * 40
        : 0;
    const rentScore =
      params.monthlyIncomeAmount > 0 && params.rentBurdenRate <= this.recommendedRentBurdenRate
        ? 40
        : 0;
    const hasPolicyFail = params.policyConditions.some(
      (conditionResult) => conditionResult.resultStatus === EligibilityConditionResultStatus.FAIL,
    );
    const policyScore = params.policyConditions.length > 0 && !hasPolicyFail ? 20 : 0;
    const needsCheck =
      params.expectedDepositAmount <= 0 ||
      params.monthlyIncomeAmount <= 0 ||
      params.policyConditions.length === 0;
    const eligibilityScore = Math.round(cashScore + rentScore + policyScore);

    return {
      eligibilityScore,
      hasPolicyFail,
      needsCheck,
      resultLevel: this.calculateResultLevel(eligibilityScore, hasPolicyFail, needsCheck),
    };
  }

  private calculateResultLevel(
    eligibilityScore: number,
    hasPolicyFail: boolean,
    needsCheck: boolean,
  ): EligibilityResultLevel {
    if (hasPolicyFail) {
      return EligibilityResultLevel.NOT_ELIGIBLE;
    }

    if (needsCheck) {
      return EligibilityResultLevel.NEED_CHECK;
    }

    if (eligibilityScore >= 80) {
      return EligibilityResultLevel.HIGH;
    }

    if (eligibilityScore >= 50) {
      return EligibilityResultLevel.MEDIUM;
    }

    return EligibilityResultLevel.LOW;
  }

  private createSummaryMessage(
    scoreResult: ScoreResult,
    shortageAmount: number,
    rentBurdenRate: number,
  ): string {
    if (scoreResult.resultLevel === EligibilityResultLevel.NOT_ELIGIBLE) {
      return '필수 정책 조건을 충족하지 못했습니다.';
    }

    if (scoreResult.resultLevel === EligibilityResultLevel.NEED_CHECK) {
      return '사용자 조건 또는 공고 조건 정보가 부족하여 추가 확인이 필요합니다.';
    }

    if (shortageAmount > 0 && rentBurdenRate <= this.recommendedRentBurdenRate) {
      return '보유 현금은 일부 부족하지만 월세 부담률이 안정적이므로 입주 가능성이 높은 편입니다.';
    }

    if (shortageAmount > 0) {
      return '예상 보증금 대비 보유 현금이 부족하여 추가 자금 계획이 필요합니다.';
    }

    return '필요 자금과 월세 부담률이 안정적이며 주요 정책 조건을 충족합니다.';
  }

  private formatKoreanAmount(amount: number): string {
    if (amount >= 10000 && amount % 10000 === 0) {
      return `${amount / 10000}만원`;
    }

    if (amount >= 10000) {
      return `${this.roundToTwoDecimals(amount / 10000)}만원`;
    }

    return `${amount}원`;
  }

  private roundToTwoDecimals(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
