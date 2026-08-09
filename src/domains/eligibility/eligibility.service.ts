import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { calculateNoticeStatus } from '../notices/notice-status.util';
import { NoticeStatus } from '../notices/dto/notices.dto';
import {
  EligibilityConditionCode,
  EligibilityConditionResultDto,
  EligibilityConditionResultStatus,
  EligibilityAnalysisResultDto,
  EligibilityConditionsResultDto,
  EligibilityResultLevel,
  FinancialSummaryResultDto,
  MyEligibilityAnalysesResultDto,
  MVP_SUPPLY_TYPE,
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
    // JavaScript number로 받은 ID가 BigInt로 정확히 변환 가능한 양의 정수인지 먼저 확인한다.
    if (
      !Number.isSafeInteger(noticeId) ||
      !Number.isSafeInteger(unitId) ||
      noticeId <= 0 ||
      unitId <= 0
    ) {
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
        // 나이 조건은 사용자 프로필의 생년월일을 기준으로 자동 판정한다.
        include: { user: { select: { profile: { select: { birthDate: true } } } } },
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
    // 현재 크롤링 데이터에는 관리비 원본이 없다. 임의로 0원을 저장하지 않고
    // null(미수집)로 남긴다. 이후 크롤러가 값을 제공하면 이 부분만 연결하면 된다.
    const maintenanceFeeAmount: number | null = null;
    // 관리비가 미수집된 경우에는 실제 0원이 아니라 null로 응답하되,
    // 월세 부담률은 확인 가능한 월세만으로 계속 계산한다.
    const monthlyHousingCost = expectedMonthlyRentAmount + (maintenanceFeeAmount ?? 0);
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
        birthDate: userConditionProfile.user.profile?.birthDate ?? null,
        residenceRegionCode: userConditionProfile.residenceRegionCode,
        householdHeadStatus: userConditionProfile.householdHeadStatus,
      }),
    ];
    const scoreResult = this.calculateScore({
      expectedDepositAmount,
      cashSavings,
      monthlyIncomeAmount,
      rentBurdenRate,
      // 현금·월세 부담률은 별도 배점으로 계산한다. 나머지 공고 정책 조건은 모두 등급 판단에 반영한다.
      policyConditions: conditionResults.filter(
        (conditionResult) =>
          !(
            [
              EligibilityConditionCode.CASH,
              EligibilityConditionCode.RENT_BURDEN,
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
        maintenanceFeeAmount: maintenanceFeeAmount === null ? null : BigInt(maintenanceFeeAmount),
        // 재정 요약은 분석 실행 당시 상태를 보여주므로, 변경 가능한 프로필 값을 함께 스냅샷으로 남긴다.
        userCashAmount: BigInt(cashSavings),
        monthlyIncomeAmount: BigInt(monthlyIncomeAmount),
        shortageAmount: BigInt(shortageAmount),
        rentBurdenRate,
        summaryMessage: this.createSummaryMessage(
          scoreResult,
          shortageAmount,
          rentBurdenRate,
          monthlyIncomeAmount,
          maintenanceFeeAmount,
        ),
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
      // 현재 MVP 분석 대상은 기획상 청년안심주택 6개 단지로 제한한다.
      // 공급면적(supplyAreaM2)이나 자격 대상(targetType)에서 추정하지 않고 계약 값을 명시한다.
      supplyType: MVP_SUPPLY_TYPE,
      resultLevel: analysis.resultLevel as EligibilityResultLevel,
      eligibilityScore: Number(analysis.eligibilityScore),
      expectedDepositAmount: Number(analysis.expectedDepositAmount),
      expectedMonthlyRentAmount: Number(analysis.expectedMonthlyRentAmount),
      maintenanceFeeAmount:
        analysis.maintenanceFeeAmount === null ? null : Number(analysis.maintenanceFeeAmount),
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

  async getEligibilityConditions(
    analysisId: number,
    userId: bigint,
  ): Promise<EligibilityConditionsResultDto> {
    // URL ID는 number로 들어오지만 DB의 기본 키는 BigInt이므로, 안전하게 변환 가능한 값만 허용한다.
    if (!Number.isSafeInteger(analysisId) || analysisId <= 0) {
      throw new BadRequestException('잘못된 분석 결과 ID입니다.');
    }

    // 분석 요청 시 계산해 저장한 조건 결과를 다시 계산하지 않고 그대로 읽는다.
    // 따라서 이후 공고나 사용자 프로필이 바뀌어도, 이 분석을 실행한 당시의 판단 근거를 보여 준다.
    const analysis = await this.prisma.eligibilityAnalysis.findFirst({
      where: {
        eligibilityAnalysisId: BigInt(analysisId),
        // 분석의 소유자는 연결된 사용자 조건 프로필의 userId로 확인한다.
        userConditionProfile: { userId },
      },
      select: {
        // API 명세의 응답 순서를 보장한다. ID는 응답에 노출하지 않는다.
        conditionResults: { orderBy: { eligibilityConditionResultId: 'asc' } },
      },
    });

    // 존재하지 않는 결과와 다른 사용자의 결과를 같은 404로 응답해 소유 관계를 숨긴다.
    if (!analysis) {
      throw new NotFoundException('존재하지 않는 분석 결과입니다.');
    }

    return {
      // DB enum과 nullable 문자열을 DTO 모양으로 옮겨 JSON 응답을 만든다.
      conditionResults: analysis.conditionResults.map((conditionResult) => ({
        conditionCode: conditionResult.conditionCode as EligibilityConditionCode,
        conditionName: conditionResult.conditionName,
        requiredValue: conditionResult.requiredValue,
        userValue: conditionResult.userValue,
        resultStatus: conditionResult.resultStatus as EligibilityConditionResultStatus,
        failReason: conditionResult.failReason,
      })),
    };
  }

  async getFinancialSummary(
    analysisId: number,
    userId: bigint,
  ): Promise<FinancialSummaryResultDto> {
    // BigInt 기본 키로 안전하게 변환할 수 있는 양의 정수만 분석 ID로 사용한다.
    if (!Number.isSafeInteger(analysisId) || analysisId <= 0) {
      throw new BadRequestException('잘못된 분석 결과 ID입니다.');
    }

    // 분석을 만들 때 저장한 금액·부족 자금·부담률을 조회한다.
    // 공고나 사용자의 입력값이 이후 바뀌어도 분석 당시의 계산 결과는 analysis 테이블 값을 기준으로 유지한다.
    const analysis = await this.prisma.eligibilityAnalysis.findFirst({
      where: {
        eligibilityAnalysisId: BigInt(analysisId),
        // 다른 사용자의 분석 결과는 조회하지 않도록 사용자 조건 프로필의 소유자를 함께 확인한다.
        userConditionProfile: { userId },
      },
      select: {
        expectedDepositAmount: true,
        expectedMonthlyRentAmount: true,
        maintenanceFeeAmount: true,
        userCashAmount: true,
        monthlyIncomeAmount: true,
        shortageAmount: true,
        rentBurdenRate: true,
      },
    });

    if (!analysis) {
      throw new NotFoundException('존재하지 않는 분석 결과입니다.');
    }

    // 계산 로직 문서: 월 주거비 = 월세 + 관리비.
    const maintenanceFeeAmount =
      analysis.maintenanceFeeAmount === null ? null : Number(analysis.maintenanceFeeAmount);
    const monthlyHousingCost = Number(analysis.expectedMonthlyRentAmount) + (maintenanceFeeAmount ?? 0);
    const shortageAmount = Number(analysis.shortageAmount);
    const rentBurdenRate = Number(analysis.rentBurdenRate);
    const monthlyIncomeAmount = Number(analysis.monthlyIncomeAmount);

    return {
      expectedDepositAmount: Number(analysis.expectedDepositAmount),
      expectedMonthlyRentAmount: Number(analysis.expectedMonthlyRentAmount),
      maintenanceFeeAmount,
      userCashAmount: Number(analysis.userCashAmount),
      shortageAmount,
      monthlyIncomeAmount,
      monthlyHousingCost,
      rentBurdenRate,
      financialMessage: this.createFinancialSummaryMessage(
        shortageAmount,
        rentBurdenRate,
        monthlyIncomeAmount,
        maintenanceFeeAmount,
      ),
    };
  }

  async getMyEligibilityAnalyses(
    userId: bigint,
    page: number,
    size: number,
  ): Promise<MyEligibilityAnalysesResultDto> {
    // 분석은 사용자 조건 프로필에 연결되어 있으므로, 프로필의 userId로 본인 이력만 찾는다.
    const where = { userConditionProfile: { userId } };

    // 목록 데이터와 전체 개수를 동시에 조회해 페이지 정보와 실제 목록의 기준을 맞춘다.
    const [totalElements, analyses] = await this.prisma.$transaction([
      this.prisma.eligibilityAnalysis.count({ where }),
      this.prisma.eligibilityAnalysis.findMany({
        where,
        select: {
          eligibilityAnalysisId: true,
          noticeId: true,
          unitId: true,
          expectedDepositAmount: true,
          resultLevel: true,
          eligibilityScore: true,
          shortageAmount: true,
          rentBurdenRate: true,
          analyzedAt: true,
          // 이력 화면의 공고 카드를 바로 그릴 수 있도록 분석 결과와 연결된 공고·주택형 정보를 함께 조회한다.
          notice: {
            select: {
              title: true,
              announcementNo: true,
              applicationStartAt: true,
              applicationEndAt: true,
              isAdditionalRecruitment: true,
            },
          },
          unit: { select: { unitName: true, exclusiveAreaM2: true } },
        },
        // 같은 시각에 생성된 결과도 안정적으로 정렬되도록 분석 ID를 두 번째 기준으로 사용한다.
        orderBy: [{ analyzedAt: 'desc' }, { eligibilityAnalysisId: 'desc' }],
        skip: page * size,
        take: size,
      }),
    ]);
    const totalPages = Math.ceil(totalElements / size);

    return {
      analyses: analyses.map((analysis) => {
        const noticeStatus = calculateNoticeStatus(
          analysis.notice.applicationStartAt,
          analysis.notice.applicationEndAt,
          new Date(),
        );

        return {
          // Prisma의 BigInt/Decimal/Date 객체를 API 응답에 맞는 number/ISO 문자열로 바꾼다.
          analysisId: Number(analysis.eligibilityAnalysisId),
          noticeId: Number(analysis.noticeId),
          unitId: Number(analysis.unitId),
          noticeTitle: analysis.notice.title,
          announcementNo: analysis.notice.announcementNo,
          unitName: analysis.unit.unitName,
          exclusiveAreaM2:
            analysis.unit.exclusiveAreaM2 === null ? null : Number(analysis.unit.exclusiveAreaM2),
          expectedDepositAmount: Number(analysis.expectedDepositAmount),
          applicationStartAt: analysis.notice.applicationStartAt?.toISOString() ?? null,
          applicationEndAt: analysis.notice.applicationEndAt?.toISOString() ?? null,
          noticeStatus,
          noticeStatusDisplayText: this.getNoticeStatusDisplayText(noticeStatus),
          isAdditionalRecruitment: analysis.notice.isAdditionalRecruitment,
          resultLevel: analysis.resultLevel as EligibilityResultLevel,
          eligibilityScore: Number(analysis.eligibilityScore),
          shortageAmount: Number(analysis.shortageAmount),
          rentBurdenRate: Number(analysis.rentBurdenRate),
          analyzedAt: analysis.analyzedAt.toISOString(),
        };
      }),
      pageInfo: {
        page,
        size,
        totalElements,
        totalPages,
        hasNext: page + 1 < totalPages,
      },
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
      minAge: number | null;
      maxAge: number | null;
      residenceRequirement: string | null;
      householdRequirement: string | null;
      subscriptionRequirement: string | null;
      rawConditionText: string | null;
    }>,
    userCondition: {
      monthlyIncomeAmount: number;
      totalAssetAmount: number;
      isHomeless: boolean;
      birthDate: Date | null;
      residenceRegionCode: string | null;
      householdHeadStatus: string;
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

      // 생년월일이 있으면 나이 기준은 자동 비교한다. 없으면 판단에 필요한 사용자 정보가 부족하다.
      if (noticeCondition.minAge !== null || noticeCondition.maxAge !== null) {
        const age = userCondition.birthDate ? this.calculateAge(userCondition.birthDate) : null;
        const isPassed =
          age !== null &&
          (noticeCondition.minAge === null || age >= noticeCondition.minAge) &&
          (noticeCondition.maxAge === null || age <= noticeCondition.maxAge);
        const requiredValue = this.formatAgeRequirement(
          noticeCondition.minAge,
          noticeCondition.maxAge,
        );
        results.push({
          conditionId: noticeCondition.conditionId,
          conditionCode: EligibilityConditionCode.AGE,
          conditionName: '나이 조건',
          requiredValue,
          userValue: age === null ? null : `만 ${age}세`,
          resultStatus:
            age === null
              ? EligibilityConditionResultStatus.NEED_CHECK
              : isPassed
                ? EligibilityConditionResultStatus.PASS
                : EligibilityConditionResultStatus.FAIL,
          failReason:
            age === null
              ? '생년월일 정보가 없어 나이 조건 확인이 필요합니다.'
              : isPassed
                ? null
                : '공고 나이 기준을 충족하지 못했습니다.',
        });
      }

      // 아래 조건들은 공고에 사람이 읽는 원문으로 저장된다. 의미를 임의로 해석하지 않고 NEED_CHECK으로 남긴다.
      if (noticeCondition.residenceRequirement !== null) {
        results.push(
          this.createNeedCheckCondition({
            conditionId: noticeCondition.conditionId,
            conditionCode: EligibilityConditionCode.REGION,
            conditionName: '거주지 조건',
            requiredValue: noticeCondition.residenceRequirement,
            userValue: userCondition.residenceRegionCode,
            failReason: '공고 거주지 조건의 세부 기준 확인이 필요합니다.',
          }),
        );
      }

      if (noticeCondition.householdRequirement !== null) {
        results.push(
          this.createNeedCheckCondition({
            conditionId: noticeCondition.conditionId,
            conditionCode: EligibilityConditionCode.HOUSEHOLD,
            conditionName: '세대 조건',
            requiredValue: noticeCondition.householdRequirement,
            userValue: userCondition.householdHeadStatus,
            failReason: '공고 세대 조건의 세부 기준 확인이 필요합니다.',
          }),
        );
      }

      if (noticeCondition.subscriptionRequirement !== null) {
        results.push(
          this.createNeedCheckCondition({
            conditionId: noticeCondition.conditionId,
            conditionCode: EligibilityConditionCode.SUBSCRIPTION,
            conditionName: '청약 조건',
            requiredValue: noticeCondition.subscriptionRequirement,
            userValue: null,
            failReason: '청약 조건을 비교할 사용자 정보 또는 세부 기준 확인이 필요합니다.',
          }),
        );
      }

      if (noticeCondition.rawConditionText !== null) {
        results.push(
          this.createNeedCheckCondition({
            conditionId: noticeCondition.conditionId,
            conditionCode: EligibilityConditionCode.OTHER,
            conditionName: '기타 공고 조건',
            requiredValue: noticeCondition.rawConditionText,
            userValue: null,
            failReason: '원문 공고 조건의 추가 확인이 필요합니다.',
          }),
        );
      }

      return results;
    });
  }

  private createNeedCheckCondition(params: {
    conditionId: bigint;
    conditionCode: EligibilityConditionCode;
    conditionName: string;
    requiredValue: string;
    userValue: string | null;
    failReason: string;
  }): ConditionDraft {
    return { ...params, resultStatus: EligibilityConditionResultStatus.NEED_CHECK };
  }

  private calculateAge(birthDate: Date): number {
    const today = new Date();
    let age = today.getUTCFullYear() - birthDate.getUTCFullYear();
    const hasNotHadBirthdayYet =
      today.getUTCMonth() < birthDate.getUTCMonth() ||
      (today.getUTCMonth() === birthDate.getUTCMonth() &&
        today.getUTCDate() < birthDate.getUTCDate());
    if (hasNotHadBirthdayYet) age -= 1;
    return age;
  }

  // notices 도메인과 같은 상태 enum을 사용하되, 분석 이력 응답에는 카드 표시용 문구도 함께 제공한다.
  private getNoticeStatusDisplayText(status: NoticeStatus): string {
    const displayText: Record<NoticeStatus, string> = {
      [NoticeStatus.RECRUITING]: '모집중',
      [NoticeStatus.SCHEDULED]: '모집예정',
      [NoticeStatus.CLOSING_SOON]: '마감임박',
      [NoticeStatus.CLOSED]: '마감',
    };

    return displayText[status];
  }

  private formatAgeRequirement(minAge: number | null, maxAge: number | null): string {
    if (minAge !== null && maxAge !== null) return `만 ${minAge}세 이상 ${maxAge}세 이하`;
    if (minAge !== null) return `만 ${minAge}세 이상`;
    return `만 ${maxAge}세 이하`;
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
      params.monthlyIncomeAmount > 0 &&
      params.rentBurdenRate <= this.recommendedRentBurdenRate
        ? 40
        : 0;
    const hasPolicyFail = params.policyConditions.some(
      (conditionResult) => conditionResult.resultStatus === EligibilityConditionResultStatus.FAIL,
    );
    const hasPolicyNeedCheck = params.policyConditions.some(
      (conditionResult) =>
        conditionResult.resultStatus === EligibilityConditionResultStatus.NEED_CHECK,
    );
    // 자동 판정하지 못한 공고 조건이 있으면 정책 충족 점수를 주지 않는다.
    const policyScore =
      params.policyConditions.length > 0 && !hasPolicyFail && !hasPolicyNeedCheck ? 20 : 0;
    const needsCheck =
      params.expectedDepositAmount <= 0 ||
      params.monthlyIncomeAmount <= 0 ||
      params.policyConditions.length === 0 ||
      hasPolicyNeedCheck;
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
    monthlyIncomeAmount: number,
    maintenanceFeeAmount: number | null,
  ): string {
    // 종합 문구의 첫 문장은 반드시 최종 등급을 설명한다.
    // 재정 상태는 그 등급의 근거로 뒤에 덧붙여, 점수와 안내 문구가 엇갈리지 않게 한다.
    const financialMessage = this.createFinancialSummaryMessage(
      shortageAmount,
      rentBurdenRate,
      monthlyIncomeAmount,
      maintenanceFeeAmount,
    );

    switch (scoreResult.resultLevel) {
      case EligibilityResultLevel.NOT_ELIGIBLE:
        return `필수 정책 조건을 충족하지 못해 입주 가능성이 낮습니다. ${financialMessage}`;
      case EligibilityResultLevel.NEED_CHECK:
        return `사용자 조건 또는 공고 조건 정보가 부족하여 추가 확인이 필요합니다. ${financialMessage}`;
      case EligibilityResultLevel.HIGH:
        return `입주 가능성이 높은 편입니다. ${financialMessage}`;
      case EligibilityResultLevel.MEDIUM:
        return `입주 가능성은 보통입니다. ${financialMessage}`;
      case EligibilityResultLevel.LOW:
        return `입주 가능성이 낮은 편입니다. ${financialMessage}`;
      default:
        return financialMessage;
    }
  }

  private createFinancialSummaryMessage(
    shortageAmount: number,
    rentBurdenRate: number,
    monthlyIncomeAmount: number,
    maintenanceFeeAmount: number | null,
  ): string {
    if (monthlyIncomeAmount <= 0) {
      const cashMessage =
        shortageAmount > 0
          ? `예상 보증금 대비 보유 현금이 ${this.formatKoreanAmount(shortageAmount)} 부족합니다.`
          : '예상 보증금은 보유 현금으로 충당할 수 있습니다.';
      return `${cashMessage} 월소득 정보가 없어 월세 부담률은 추가 확인이 필요합니다.`;
    }

    // 계산 로직 문서의 부담 구간(30% 이하 / 30~40% / 40% 초과)을 안내 문구에 반영한다.
    const housingCostMessage =
      rentBurdenRate <= 30
        ? `월세 부담률은 ${rentBurdenRate}%로 안정적인 편입니다.`
        : rentBurdenRate <= this.recommendedRentBurdenRate
          ? `월세 부담률은 ${rentBurdenRate}%로 주의가 필요합니다.`
          : `월세 부담률은 ${rentBurdenRate}%로 부담이 높은 편입니다.`;

    const maintenanceFeeNote =
      maintenanceFeeAmount === null ? ' 관리비 정보가 없어 월세 기준으로 계산했습니다.' : '';
    if (shortageAmount > 0) {
      return `예상 보증금 대비 보유 현금이 ${this.formatKoreanAmount(shortageAmount)} 부족합니다. ${housingCostMessage}${maintenanceFeeNote}`;
    }

    return `예상 보증금은 보유 현금으로 충당할 수 있습니다. ${housingCostMessage}${maintenanceFeeNote}`;
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
