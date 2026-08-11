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
});
