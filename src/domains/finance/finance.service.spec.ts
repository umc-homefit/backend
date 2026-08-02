// 로컬 getter를 쓰면 UTC와 날짜가 갈리는 타임존으로 고정한다.
// (아래 테스트는 UTC 기준으로 판정해야만 통과하므로, 로컬 getter로 되돌리면 실패한다.)
process.env.TZ = 'Asia/Seoul';

import { LoanProduct, UserConditionProfile, UserProfile } from '@prisma/client';

import { FinanceService } from './finance.service';
import { FinanceRepository } from './finance.repository';

/**
 * 나이 계산은 birthDate(Prisma DATE = 자정 UTC)와 오늘을 비교하는데, 오늘을 로컬 getter로 읽으면
 * 서버 실행 환경(로컬 Asia/Seoul vs 배포 UTC)에 따라 생일 경계가 하루 어긋난다.
 * 아래 테스트는 "UTC로는 아직 생일 전이지만 KST로는 생일이 지난" 시각에 고정해두고,
 * UTC 기준 판정이 유지되는지를 검증한다.
 */
describe('FinanceService - 나이 조건 판정', () => {
  // 2026-08-02T23:00Z == 2026-08-03 08:00 KST → UTC로는 8/2, 로컬(KST)로는 8/3
  const NOW = new Date('2026-08-02T23:00:00Z');
  const MIN_AGE = 26;

  let service: FinanceService;
  let repository: {
    findUserConditionProfileByUserId: jest.Mock;
    findUserProfileByUserId: jest.Mock;
    findLoanProductsForMatch: jest.Mock;
  };

  const conditionProfile = {
    monthlyIncomeAmount: 3_000_000n,
    totalAssetAmount: 10_000_000n,
    totalDebtAmount: 0n,
    isHomeless: true,
    householdHeadStatus: 'HEAD',
    maritalStatus: 'SINGLE',
    marriageDate: null,
    hasRecentNewborn: false,
    newbornBirthDate: null,
    isFirstTimeBuyer: true,
  } as unknown as UserConditionProfile;

  // 나이 외 조건은 전부 무제한으로 두어, isEligible이 나이 판정으로만 갈리게 한다.
  const product = {
    productId: 1n,
    productName: '나이조건 테스트 상품',
    providerType: 'POLICY',
    productCategory: 'JEONSE_LOAN',
    providerName: '주택도시기금',
    minAge: MIN_AGE,
    maxAge: null,
    minIncome: null,
    maxIncome: null,
    minAsset: null,
    maxAsset: null,
    requireNoHouse: false,
    firstTimeBuyerOnly: false,
    requireHouseholdHead: false,
    requireMarried: false,
    maxMarriageYears: null,
    requireRecentNewborn: false,
    newbornWithinYears: null,
    minRate: null,
    maxRate: null,
    maxLimitAmount: null,
  } as unknown as LoanProduct;

  /** 주어진 생년월일로 매칭을 돌려 첫 상품의 판정 결과를 반환한다. */
  const evaluateWithBirthDate = async (birthDate: string) => {
    repository.findUserProfileByUserId.mockResolvedValue({
      birthDate: new Date(`${birthDate}T00:00:00Z`),
    } as unknown as UserProfile);

    const result = await service.matchLoanProducts(1n, undefined);
    return result.products[0];
  };

  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(NOW);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    repository = {
      findUserConditionProfileByUserId: jest.fn().mockResolvedValue(conditionProfile),
      findUserProfileByUserId: jest.fn(),
      findLoanProductsForMatch: jest.fn().mockResolvedValue([product]),
    };
    service = new FinanceService(repository as unknown as FinanceRepository);
  });

  describe('생일 경계 (UTC 기준 오늘 = 2026-08-02)', () => {
    it('생일 당일이면 만 나이가 올라 조건을 통과한다', async () => {
      // 2000-08-02 생 → UTC 기준 오늘이 생일 → 만 26세
      const evaluated = await evaluateWithBirthDate('2000-08-02');

      expect(evaluated.isEligible).toBe(true);
      expect(evaluated.ineligibleReasons).toEqual([]);
    });

    it('생일 하루 전이면 아직 나이가 오르지 않아 탈락한다', async () => {
      // 2000-08-03 생 → UTC로는 생일 전이라 만 25세. 로컬(KST) getter로 계산하면
      // 오늘이 8/3이 되어 26세로 통과해버리므로, 이 케이스가 UTC 기준 유지를 보장한다.
      const evaluated = await evaluateWithBirthDate('2000-08-03');

      expect(evaluated.isEligible).toBe(false);
      expect(evaluated.ineligibleReasons).toContain('AGE');
    });

    it('생일이 하루 지났으면 통과한다', async () => {
      const evaluated = await evaluateWithBirthDate('2000-08-01');

      expect(evaluated.isEligible).toBe(true);
      expect(evaluated.ineligibleReasons).toEqual([]);
    });
  });

  describe('생년월일 미등록', () => {
    it('나이 조건 검사를 건너뛰고 통과시키되 ageCheckSkipped로 표시한다', async () => {
      repository.findUserProfileByUserId.mockResolvedValue(null);

      const result = await service.matchLoanProducts(1n, undefined);

      expect(result.products[0].isEligible).toBe(true);
      expect(result.products[0].ageCheckSkipped).toBe(true);
    });
  });
});
