import { PrismaService } from '../../prisma/prisma.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import {
  EligibilityConditionCode,
  EligibilityConditionResultStatus,
  MVP_SUPPLY_TYPE,
} from './dto/eligibility.dto';
import { EligibilityService } from './eligibility.service';

describe('EligibilityService 분석 결과 조회', () => {
  const findFirst = jest.fn();
  const prisma = {
    eligibilityAnalysis: { findFirst },
  } as unknown as PrismaService;
  const service = new EligibilityService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('MVP 공급 유형과 선택한 주택형의 전용면적을 반환한다', async () => {
    findFirst.mockResolvedValue({
      eligibilityAnalysisId: 1n,
      noticeId: 12n,
      unitId: 3n,
      resultLevel: 'HIGH',
      eligibilityScore: 82,
      expectedDepositAmount: 10_000_000n,
      expectedMonthlyRentAmount: 350_000n,
      maintenanceFeeAmount: null,
      shortageAmount: 2_000_000n,
      rentBurdenRate: 28.57,
      summaryMessage: '입주 가능성이 높은 편입니다.',
      conditionResults: [],
      unit: { exclusiveAreaM2: 59 },
      analyzedAt: new Date('2026-07-01T00:10:00.000Z'),
    });

    const result = await service.getEligibilityAnalysis(1, 1n);

    expect(result.supplyType).toBe(MVP_SUPPLY_TYPE);
    expect(result.exclusiveAreaM2).toBe(59);
  });
});

describe('EligibilityService 점수 및 등급 계산', () => {
  const service = new EligibilityService({} as PrismaService);
  const calculateScore = (params: {
    rentBurdenRate: number;
    policyStatus: EligibilityConditionResultStatus;
  }) =>
    (
      service as unknown as {
        calculateScore: (input: {
          expectedDepositAmount: number;
          cashSavings: number;
          monthlyIncomeAmount: number;
          rentBurdenRate: number;
          policyConditions: Array<{
            conditionCode: EligibilityConditionCode;
            resultStatus: EligibilityConditionResultStatus;
          }>;
        }) => { eligibilityScore: number; resultLevel: string };
      }
    ).calculateScore({
      expectedDepositAmount: 10_000_000,
      cashSavings: 10_000_000,
      monthlyIncomeAmount: 1_000_000,
      rentBurdenRate: params.rentBurdenRate,
      policyConditions: [
        {
          conditionCode: EligibilityConditionCode.INCOME,
          resultStatus: params.policyStatus,
        },
      ],
    });

  it('월세 부담률 40%는 월세 배점 40점을 받아 HIGH가 된다', () => {
    expect(calculateScore({ rentBurdenRate: 40, policyStatus: EligibilityConditionResultStatus.PASS }))
      .toMatchObject({ eligibilityScore: 100, resultLevel: 'HIGH' });
  });

  it('월세 부담률이 40%를 초과하면 월세 배점을 받지 않는다', () => {
    expect(calculateScore({ rentBurdenRate: 40.01, policyStatus: EligibilityConditionResultStatus.PASS }))
      .toMatchObject({ eligibilityScore: 60, resultLevel: 'MEDIUM' });
  });

  it('필수 정책 조건 FAIL은 점수와 무관하게 NOT_ELIGIBLE이 우선한다', () => {
    expect(calculateScore({ rentBurdenRate: 0, policyStatus: EligibilityConditionResultStatus.FAIL }))
      .toMatchObject({ resultLevel: 'NOT_ELIGIBLE' });
  });

  it('자동 판정할 수 없는 정책 조건은 NEED_CHECK으로 처리한다', () => {
    expect(
      calculateScore({ rentBurdenRate: 0, policyStatus: EligibilityConditionResultStatus.NEED_CHECK }),
    ).toMatchObject({ resultLevel: 'NEED_CHECK' });
  });
});

describe('EligibilityService 분석 생성·누락 데이터 처리', () => {
  const create = jest.fn();
  const findNotice = jest.fn();
  const findUnit = jest.fn();
  const findProfile = jest.fn();
  const prisma = {
    notice: { findUnique: findNotice },
    noticeUnit: { findUnique: findUnit },
    userConditionProfile: { findUnique: findProfile },
    eligibilityAnalysis: { create },
  } as unknown as PrismaService;
  const service = new EligibilityService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
    findNotice.mockResolvedValue({
      noticeId: 1n,
      conditions: [
        {
          conditionId: 10n,
          incomeLimitAmount: 5_000_000n,
          incomeLimitText: null,
          assetLimitAmount: null,
          assetLimitText: null,
          requiresHomeless: null,
          housingOwnershipRequirement: null,
          minAge: null,
          maxAge: null,
          residenceRequirement: null,
          householdRequirement: null,
          subscriptionRequirement: null,
          rawConditionText: null,
        },
      ],
    });
    findUnit.mockResolvedValue({
      unitId: 2n,
      noticeId: 1n,
      depositMin: 10_000_000n,
      depositMax: 10_000_000n,
      monthlyRentMin: 200_000n,
      monthlyRentMax: 200_000n,
    });
    findProfile.mockResolvedValue({
      userConditionProfileId: 3n,
      monthlyIncomeAmount: 3_000_000n,
      totalAssetAmount: 50_000_000n,
      cashSavings: 10_000_000n,
      isHomeless: true,
      residenceRegionCode: null,
      householdHeadStatus: 'UNKNOWN',
      user: { profile: { birthDate: null } },
    });
    create.mockImplementation(({ data }) =>
      Promise.resolve({
        eligibilityAnalysisId: 4n,
        resultLevel: data.resultLevel,
        eligibilityScore: data.eligibilityScore,
        shortageAmount: data.shortageAmount,
        rentBurdenRate: data.rentBurdenRate,
        summaryMessage: data.summaryMessage,
        conditionResults: data.conditionResults.create,
        analyzedAt: new Date('2026-08-11T00:00:00.000Z'),
      }),
    );
  });

  it('분석 결과와 조건별 비교 결과를 계산해 함께 저장한다', async () => {
    const result = await service.requestEligibilityAnalysis(1, 2, 1n);

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userConditionProfileId: 3n,
          noticeId: 1n,
          unitId: 2n,
          expectedDepositAmount: 10_000_000n,
          expectedMonthlyRentAmount: 200_000n,
          shortageAmount: 0n,
          conditionResults: expect.objectContaining({
            create: expect.arrayContaining([
              expect.objectContaining({ conditionCode: EligibilityConditionCode.CASH }),
              expect.objectContaining({ conditionCode: EligibilityConditionCode.RENT_BURDEN }),
              expect.objectContaining({ conditionCode: EligibilityConditionCode.INCOME }),
            ]),
          }),
        }),
      }),
    );
    expect(result).toMatchObject({ analysisId: 4, resultLevel: 'HIGH', eligibilityScore: 100 });
  });

  it('사용자 조건 프로필이 없으면 분석을 생성하지 않고 409으로 처리한다', async () => {
    findProfile.mockResolvedValue(null);

    await expect(service.requestEligibilityAnalysis(1, 2, 1n)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(create).not.toHaveBeenCalled();
  });
});

describe('EligibilityService 분석 소유권·이력 페이지네이션', () => {
  const findFirst = jest.fn();
  const count = jest.fn();
  const findMany = jest.fn();
  const transaction = jest.fn();
  const prisma = {
    eligibilityAnalysis: { findFirst, count, findMany },
    $transaction: transaction,
  } as unknown as PrismaService;
  const service = new EligibilityService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('다른 사용자의 분석 결과는 404로 숨기고 사용자 조건 프로필 소유자를 함께 조회한다', async () => {
    findFirst.mockResolvedValue(null);

    await expect(service.getEligibilityAnalysis(10, 2n)).rejects.toBeInstanceOf(NotFoundException);
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userConditionProfile: { userId: 2n } }),
      }),
    );
  });

  it('이력 조회는 페이지 크기만큼 건너뛰고 전체 개수 기반 페이지 정보를 반환한다', async () => {
    count.mockResolvedValue(3);
    findMany.mockResolvedValue([
      {
        eligibilityAnalysisId: 3n,
        noticeId: 1n,
        unitId: 2n,
        expectedDepositAmount: 10_000_000n,
        resultLevel: 'HIGH',
        eligibilityScore: 100,
        shortageAmount: 0n,
        rentBurdenRate: 20,
        analyzedAt: new Date('2026-08-11T00:00:00.000Z'),
        notice: {
          title: '테스트 공고',
          announcementNo: 'TEST-1',
          applicationStartAt: null,
          applicationEndAt: null,
          isAdditionalRecruitment: false,
        },
        unit: { unitName: '20A', exclusiveAreaM2: 20 },
      },
    ]);
    transaction.mockImplementation((queries: Promise<unknown>[]) => Promise.all(queries));

    const result = await service.getMyEligibilityAnalyses(1n, 1, 2);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 2, take: 2, where: { userConditionProfile: { userId: 1n } } }),
    );
    expect(result.pageInfo).toEqual({
      page: 1,
      size: 2,
      totalElements: 3,
      totalPages: 2,
      hasNext: false,
    });
    expect(result.analyses).toHaveLength(1);
    expect(result.analyses[0]).toMatchObject({ analysisId: 3, noticeId: 1, unitId: 2 });
  });
});
