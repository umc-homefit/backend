import { PrismaService } from '../../prisma/prisma.service';
import { MVP_SUPPLY_TYPE } from './dto/eligibility.dto';
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
      conditionProfileSnapshot: {
        monthlyIncomeAmount: 3_000_000,
        totalAssetAmount: 50_000_000,
        totalDebtAmount: 8_000_000,
        monthlyDebtPaymentAmount: 400_000,
        cashSavings: 20_000_000,
        housingOwnershipStatus: 'HOMELESS',
        isHomeless: true,
        residenceRegionCode: '11110',
        workplaceRegionCode: null,
        maritalStatus: 'SINGLE',
        marriageDate: null,
        hasRecentNewborn: false,
        newbornBirthDate: null,
        householdHeadStatus: 'HEAD',
        isFirstTimeBuyer: false,
        employmentStatus: null,
      },
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
    expect(result.conditionProfileSnapshot).toMatchObject({
      monthlyIncomeAmount: 3_000_000,
      totalAssetAmount: 50_000_000,
      cashSavings: 20_000_000,
    });
  });

  it('스냅샷 도입 전 분석 이력은 null을 반환한다', async () => {
    findFirst.mockResolvedValue({
      eligibilityAnalysisId: 1n,
      noticeId: 12n,
      unitId: 3n,
      resultLevel: 'HIGH',
      eligibilityScore: 82,
      expectedDepositAmount: 10_000_000n,
      expectedMonthlyRentAmount: 350_000n,
      maintenanceFeeAmount: null,
      conditionProfileSnapshot: null,
      shortageAmount: 2_000_000n,
      rentBurdenRate: 28.57,
      summaryMessage: null,
      conditionResults: [],
      unit: { exclusiveAreaM2: null },
      analyzedAt: new Date('2026-07-01T00:10:00.000Z'),
    });

    const result = await service.getEligibilityAnalysis(1, 1n);

    expect(result.conditionProfileSnapshot).toBeNull();
  });
});

describe('EligibilityService 분석 시점 프로필 스냅샷 저장', () => {
  const create = jest.fn();
  const prisma = {
    notice: { findUnique: jest.fn().mockResolvedValue({ noticeId: 1n, conditions: [] }) },
    noticeUnit: {
      findUnique: jest
        .fn()
        .mockResolvedValue({
          unitId: 1n,
          noticeId: 1n,
          depositMin: 1n,
          depositMax: null,
          monthlyRentMin: 1n,
          monthlyRentMax: null,
        }),
    },
    userConditionProfile: {
      findUnique: jest.fn().mockResolvedValue({
        userConditionProfileId: 1n,
        monthlyIncomeAmount: 3_000_000n,
        totalAssetAmount: 50_000_000n,
        totalDebtAmount: 8_000_000n,
        monthlyDebtPaymentAmount: 400_000n,
        cashSavings: 20_000_000n,
        housingOwnershipStatus: 'HOMELESS',
        isHomeless: true,
        residenceRegionCode: null,
        workplaceRegionCode: '11680',
        maritalStatus: 'SINGLE',
        marriageDate: null,
        hasRecentNewborn: false,
        newbornBirthDate: null,
        householdHeadStatus: 'HEAD',
        isFirstTimeBuyer: null,
        employmentStatus: null,
        user: { profile: { birthDate: new Date('2000-01-02T00:00:00Z') } },
      }),
    },
    eligibilityAnalysis: { create },
  } as unknown as PrismaService;

  it('BigInt·Date·null을 JSON 스냅샷으로 변환해 생성 데이터에 저장한다', async () => {
    create.mockImplementation(({ data }) =>
      Promise.resolve({
        eligibilityAnalysisId: 1n,
        resultLevel: data.resultLevel,
        eligibilityScore: data.eligibilityScore,
        shortageAmount: data.shortageAmount,
        rentBurdenRate: data.rentBurdenRate,
        summaryMessage: data.summaryMessage,
        conditionResults: data.conditionResults.create,
        analyzedAt: new Date('2026-08-11T00:00:00Z'),
      }),
    );
    await new EligibilityService(prisma).requestEligibilityAnalysis(1, 1, 1n);
    expect(create.mock.calls[0][0].data.conditionProfileSnapshot).toEqual(
      expect.objectContaining({
        monthlyIncomeAmount: 3_000_000,
        totalDebtAmount: 8_000_000,
        marriageDate: null,
        workplaceRegionCode: '11680',
        isFirstTimeBuyer: null,
      }),
    );
  });
});

describe('EligibilityService 분석 요청의 월세 미수집 처리', () => {
  const noticeFindUnique = jest.fn();
  const noticeUnitFindUnique = jest.fn();
  const conditionProfileFindUnique = jest.fn();
  const analysisCreate = jest.fn();
  const prisma = {
    notice: { findUnique: noticeFindUnique },
    noticeUnit: { findUnique: noticeUnitFindUnique },
    userConditionProfile: { findUnique: conditionProfileFindUnique },
    eligibilityAnalysis: { create: analysisCreate },
  } as unknown as PrismaService;
  const service = new EligibilityService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
    noticeFindUnique.mockResolvedValue({ noticeId: 1n, conditions: [] });
    conditionProfileFindUnique.mockResolvedValue({
      userConditionProfileId: 1n,
      monthlyIncomeAmount: 3_000_000n,
      totalAssetAmount: 20_000_000n,
      cashSavings: 20_000_000n,
      isHomeless: true,
      residenceRegionCode: null,
      householdHeadStatus: 'HEAD',
      user: { profile: { birthDate: new Date('2000-01-01T00:00:00Z') } },
    });
    analysisCreate.mockImplementation(({ data }) =>
      Promise.resolve({
        eligibilityAnalysisId: 1n,
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

  it('월세가 미수집이면 부담률을 저장하지 않고 NEED_CHECK으로 처리한다', async () => {
    noticeUnitFindUnique.mockResolvedValue({
      unitId: 1n,
      noticeId: 1n,
      depositMin: 10_000_000n,
      depositMax: null,
      monthlyRentMin: null,
      monthlyRentMax: null,
    });

    const result = await service.requestEligibilityAnalysis(1, 1, 1n);
    const createData = analysisCreate.mock.calls[0][0].data;
    const rentCondition = createData.conditionResults.create.find(
      (condition: { conditionCode: string }) => condition.conditionCode === 'RENT_BURDEN',
    );

    expect(createData.expectedMonthlyRentAmount).toBeNull();
    expect(createData.rentBurdenRate).toBeNull();
    expect(rentCondition.resultStatus).toBe('NEED_CHECK');
    expect(result.rentBurdenRate).toBeNull();
    expect(result.resultLevel).toBe('NEED_CHECK');
  });

  it('월세가 미수집이어도 정책 조건 FAIL이 있으면 NOT_ELIGIBLE이 우선한다', async () => {
    noticeFindUnique.mockResolvedValueOnce({
      noticeId: 1n,
      conditions: [
        {
          conditionId: 10n,
          incomeLimitAmount: 1_000_000n,
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
    noticeUnitFindUnique.mockResolvedValue({
      unitId: 1n,
      noticeId: 1n,
      depositMin: 10_000_000n,
      depositMax: null,
      monthlyRentMin: null,
      monthlyRentMax: null,
    });

    const result = await service.requestEligibilityAnalysis(1, 1, 1n);
    const conditions = analysisCreate.mock.calls[0][0].data.conditionResults.create;

    expect(conditions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ conditionCode: 'RENT_BURDEN', resultStatus: 'NEED_CHECK' }),
        expect.objectContaining({ conditionCode: 'INCOME', resultStatus: 'FAIL' }),
      ]),
    );
    expect(result.resultLevel).toBe('NOT_ELIGIBLE');
  });

  it('실제 월세 0원은 미수집과 구분해 부담률 0%로 계산한다', async () => {
    noticeUnitFindUnique.mockResolvedValue({
      unitId: 1n,
      noticeId: 1n,
      depositMin: 10_000_000n,
      depositMax: null,
      monthlyRentMin: 0n,
      monthlyRentMax: null,
    });

    const result = await service.requestEligibilityAnalysis(1, 1, 1n);
    const createData = analysisCreate.mock.calls[0][0].data;
    const rentCondition = createData.conditionResults.create.find(
      (condition: { conditionCode: string }) => condition.conditionCode === 'RENT_BURDEN',
    );

    expect(createData.expectedMonthlyRentAmount).toBe(0n);
    expect(createData.rentBurdenRate).toBe(0);
    expect(rentCondition.resultStatus).toBe('PASS');
    expect(result.rentBurdenRate).toBe(0);
  });

  it('월세가 있어도 월소득이 0원이면 부담률을 계산하지 않는다', async () => {
    conditionProfileFindUnique.mockResolvedValueOnce({
      userConditionProfileId: 1n,
      monthlyIncomeAmount: 0n,
      totalAssetAmount: 20_000_000n,
      cashSavings: 20_000_000n,
      isHomeless: true,
      residenceRegionCode: null,
      householdHeadStatus: 'HEAD',
      user: { profile: { birthDate: new Date('2000-01-01T00:00:00Z') } },
    });
    noticeUnitFindUnique.mockResolvedValue({
      unitId: 1n,
      noticeId: 1n,
      depositMin: 10_000_000n,
      depositMax: null,
      monthlyRentMin: 300_000n,
      monthlyRentMax: null,
    });

    const result = await service.requestEligibilityAnalysis(1, 1, 1n);
    const createData = analysisCreate.mock.calls[0][0].data;
    const rentCondition = createData.conditionResults.create.find(
      (condition: { conditionCode: string }) => condition.conditionCode === 'RENT_BURDEN',
    );

    expect(createData.rentBurdenRate).toBeNull();
    expect(rentCondition.resultStatus).toBe('NEED_CHECK');
    expect(result.rentBurdenRate).toBeNull();
  });
});
