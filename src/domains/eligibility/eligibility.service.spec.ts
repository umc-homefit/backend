import { PrismaService } from '../../prisma/prisma.service';
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
