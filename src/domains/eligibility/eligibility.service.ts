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
  EligibilityAnalysisResultDto,
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

    // 서로 의존하지 않는 조회는 병렬로 수행해 분석 요청의 DB 대기 시간을 줄인다.
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

    // 보증금/월세 범위가 있을 때는 사용자가 준비해야 할 최대 금액을 기준으로 계산한다.
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

    // 공고에 명시된 조건과 별개로, 현금·월세 부담률은 항상 분석 결과에 포함한다.
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
        (
          [
            EligibilityConditionCode.INCOME,
            EligibilityConditionCode.ASSET,
            EligibilityConditionCode.HOMELESS,
          ] as EligibilityConditionCode[]
        ).includes(conditionResult.conditionCode),
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
      include: {
        // API 명세: conditionResults는 생성된 조건 결과 ID의 오름차순으로 반환한다.
        conditionResults: { orderBy: { eligibilityConditionResultId: 'asc' } },
      },
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
      // toISOString()은 UTC임을 나타내는 Z와 밀리초를 함께 보장한다.
      analyzedAt: analysis.analyzedAt.toISOString(),
    };
  }

  async getEligibilityAnalysis(
    analysisId: number,
    userId: bigint,
  ): Promise<EligibilityAnalysisResultDto> {
    // DB의 BigInt ID로 변환하기 전에, JavaScript number가 ID를 정확히 표현할 수 있는지 확인한다.
    if (!Number.isSafeInteger(analysisId) || analysisId <= 0) {
      throw new BadRequestException('잘못된 분석 결과 ID입니다.');
    }

    // 한 번의 조회에서 "해당 분석 ID"와 "로그인 사용자의 조건 프로필"을 모두 만족해야 한다.
    // 그래서 다른 사용자의 ID를 요청해도 결과를 찾지 못한 것처럼 404로 처리할 수 있다.
    const analysis = await this.prisma.eligibilityAnalysis.findFirst({
      where: {
        // Prisma의 BigInt 컬럼에는 JavaScript bigint 값을 전달한다.
        eligibilityAnalysisId: BigInt(analysisId),
        // 분석은 사용자 조건 프로필에 연결되어 있으므로, 프로필의 userId로 소유자를 확인한다.
        userConditionProfile: { userId },
      },
      include: {
        // API 명세: 조건 결과는 생성 ID 오름차순으로 반환한다.
        conditionResults: { orderBy: { eligibilityConditionResultId: 'asc' } },
      },
    });

    if (!analysis) {
      throw new NotFoundException('존재하지 않는 분석 결과입니다.');
    }

    return {
      // Prisma의 BigInt/Decimal은 JSON으로 바로 보낼 수 없으므로 API 명세의 number로 변환한다.
      analysisId: Number(analysis.eligibilityAnalysisId),
      noticeId: Number(analysis.noticeId),
      unitId: Number(analysis.unitId),
      resultLevel: analysis.resultLevel as EligibilityResultLevel,
      eligibilityScore: Number(analysis.eligibilityScore),
      expectedDepositAmount: Number(analysis.expectedDepositAmount),
      expectedMonthlyRentAmount: Number(analysis.expectedMonthlyRentAmount),
      maintenanceFeeAmount: Number(analysis.maintenanceFeeAmount),
      shortageAmount: Number(analysis.shortageAmount),
      rentBurdenRate: Number(analysis.rentBurdenRate),
      summaryMessage: analysis.summaryMessage,
      // DB enum 값을 DTO enum으로 표현하고, 필요한 공개 필드만 골라 응답에 담는다.
      conditionResults: analysis.conditionResults.map((conditionResult) => ({
        conditionCode: conditionResult.conditionCode as EligibilityConditionCode,
        conditionName: conditionResult.conditionName,
        requiredValue: conditionResult.requiredValue,
        userValue: conditionResult.userValue,
        resultStatus: conditionResult.resultStatus as EligibilityConditionResultStatus,
        failReason: conditionResult.failReason,
      })),
      // toISOString()은 타임존(Z)과 밀리초가 포함된 ISO 8601 UTC 문자열을 만든다.
      analyzedAt: analysis.analyzedAt.toISOString(),
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
