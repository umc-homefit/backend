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
