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

    const result = await service.matchLoanProducts(1n, {});
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

      const result = await service.matchLoanProducts(1n, {});

      expect(result.products[0].isEligible).toBe(true);
      expect(result.products[0].ageCheckSkipped).toBe(true);
    });
  });
});

/**
 * 혼인기간(maxMarriageYears)/출산 경과기간(newbornWithinYears) 판정도 나이와 동일하게
 * isWithinYears(달력 기준 연산, UTC 자정 정규화)를 쓰므로 같은 종류의 경계 회귀가 날 수 있다.
 * MARRIED는 allowFuture=false라 미래 혼인일이 무조건 탈락하지만, MARRIAGE_EXPECTED(예비신혼)는
 * allowFuture=true로 넘어가 아직 오지 않은 혼인예정일도 통과해야 한다 — 이 차이를 고정해둔다.
 */
describe('FinanceService - 혼인/신생아 조건 판정', () => {
  // 2026-08-02T23:00Z == 2026-08-03 08:00 KST → UTC 기준 오늘은 2026-08-02
  const NOW = new Date('2026-08-02T23:00:00Z');
  const MARRIAGE_MAX_YEARS = 3;
  const NEWBORN_WITHIN_YEARS = 2;

  let service: FinanceService;
  let repository: {
    findUserConditionProfileByUserId: jest.Mock;
    findUserProfileByUserId: jest.Mock;
    findLoanProductsForMatch: jest.Mock;
  };

  // 나이/소득/자산/무주택/세대주/생애최초 조건은 전부 무제한·통과로 두어,
  // isEligible이 오직 혼인/신생아 판정으로만 갈리게 한다.
  const baseProfile = {
    monthlyIncomeAmount: 3_000_000n,
    totalAssetAmount: 10_000_000n,
    totalDebtAmount: 0n,
    isHomeless: true,
    householdHeadStatus: 'HEAD',
    isFirstTimeBuyer: true,
  };

  const baseProduct = {
    productId: 1n,
    productName: '조건 판정 테스트 상품',
    providerType: 'POLICY',
    productCategory: 'JEONSE_LOAN',
    providerName: '주택도시기금',
    minAge: null,
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
  };

  const marriedProduct = {
    ...baseProduct,
    requireMarried: true,
    maxMarriageYears: MARRIAGE_MAX_YEARS,
  } as unknown as LoanProduct;

  const newbornProduct = {
    ...baseProduct,
    requireRecentNewborn: true,
    newbornWithinYears: NEWBORN_WITHIN_YEARS,
  } as unknown as LoanProduct;

  /** 주어진 혼인 상태/혼인일자로 매칭을 돌려 첫 상품의 판정 결과를 반환한다. */
  const evaluateMarried = async (maritalStatus: string, marriageDate: string | null) => {
    repository.findUserConditionProfileByUserId.mockResolvedValue({
      ...baseProfile,
      maritalStatus,
      marriageDate: marriageDate ? new Date(`${marriageDate}T00:00:00Z`) : null,
      hasRecentNewborn: false,
      newbornBirthDate: null,
    } as unknown as UserConditionProfile);
    repository.findLoanProductsForMatch.mockResolvedValue([marriedProduct]);

    const result = await service.matchLoanProducts(1n, {});
    return result.products[0];
  };

  /** 주어진 출산일자로 매칭을 돌려 첫 상품의 판정 결과를 반환한다. */
  const evaluateNewborn = async (newbornBirthDate: string | null) => {
    repository.findUserConditionProfileByUserId.mockResolvedValue({
      ...baseProfile,
      maritalStatus: 'SINGLE',
      marriageDate: null,
      hasRecentNewborn: true,
      newbornBirthDate: newbornBirthDate ? new Date(`${newbornBirthDate}T00:00:00Z`) : null,
    } as unknown as UserConditionProfile);
    repository.findLoanProductsForMatch.mockResolvedValue([newbornProduct]);

    const result = await service.matchLoanProducts(1n, {});
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
      findUserConditionProfileByUserId: jest.fn(),
      findUserProfileByUserId: jest.fn(),
      findLoanProductsForMatch: jest.fn(),
    };
    service = new FinanceService(repository as unknown as FinanceRepository);
  });

  describe('혼인기간 경계 (신혼부부 전용, 조건 3년 이내, UTC 기준 오늘 = 2026-08-02)', () => {
    it('정확히 3년 경계인 혼인일자면 통과한다', async () => {
      // cutoff = 2023-08-02. marriageDate가 cutoff와 같은 날이면 isWithinYears는 >=이므로 통과.
      const evaluated = await evaluateMarried('MARRIED', '2023-08-02');

      expect(evaluated.isEligible).toBe(true);
      expect(evaluated.ineligibleReasons).toEqual([]);
      expect(evaluated.marriedCheckSkipped).toBe(false);
    });

    it('경계보다 하루 더 지난 혼인일자면(혼인기간 3년 초과) 탈락한다', async () => {
      const evaluated = await evaluateMarried('MARRIED', '2023-08-01');

      expect(evaluated.isEligible).toBe(false);
      expect(evaluated.ineligibleReasons).toContain('MARRIED');
    });

    it('MARRIED인데 혼인일자가 미래면 탈락한다 (허용 안 함)', async () => {
      const evaluated = await evaluateMarried('MARRIED', '2026-08-03');

      expect(evaluated.isEligible).toBe(false);
      expect(evaluated.ineligibleReasons).toContain('MARRIED');
    });

    it('MARRIAGE_EXPECTED(예비신혼)는 미래 혼인예정일도 통과시킨다', async () => {
      const evaluated = await evaluateMarried('MARRIAGE_EXPECTED', '2026-08-10');

      expect(evaluated.isEligible).toBe(true);
      expect(evaluated.ineligibleReasons).toEqual([]);
      expect(evaluated.marriedCheckSkipped).toBe(false);
    });
  });

  describe('출산 경과기간 경계 (신생아 특례, 조건 2년 이내, UTC 기준 오늘 = 2026-08-02)', () => {
    it('정확히 2년 경계인 출산일자면 통과한다', async () => {
      // cutoff = 2024-08-02.
      const evaluated = await evaluateNewborn('2024-08-02');

      expect(evaluated.isEligible).toBe(true);
      expect(evaluated.ineligibleReasons).toEqual([]);
      expect(evaluated.newbornCheckSkipped).toBe(false);
    });

    it('경계보다 하루 더 지난 출산일자면(경과기간 2년 초과) 탈락한다', async () => {
      const evaluated = await evaluateNewborn('2024-08-01');

      expect(evaluated.isEligible).toBe(false);
      expect(evaluated.ineligibleReasons).toContain('NEWBORN');
    });

    it('출산일자가 미래면 탈락한다 (신생아 특례는 미래 날짜를 허용하지 않음)', async () => {
      const evaluated = await evaluateNewborn('2026-08-03');

      expect(evaluated.isEligible).toBe(false);
      expect(evaluated.ineligibleReasons).toContain('NEWBORN');
    });
  });
});

/**
 * providerLogoUrl은 단순 패스스루 필드라 지금은 안전해 보이지만, 그래서 오히려 매핑 함수를
 * 리팩터링하다 실수로 필드 하나가 빠져도 아무도 못 알아챌 수 있다. 목록/매칭/상세 3개 응답
 * 모두에서 DB 값(URL 값 / null)이 그대로 나오는지 고정해둔다.
 */
describe('FinanceService - providerLogoUrl 응답 매핑', () => {
  const LOGO_URL =
    'https://i.namu.wiki/i/tDsletACkcsTWUh0TVlPHOw9WADNz3swwgAYWRgLDNlsy4eVUYCZW7uRgS9HMxYqFy4rsPLEqO4iB65nz0TNLc89TiMQo6KS3ojNgwbVVtahfbcx8mIH6S5WDpsAuh2b9Z9xkCqxJyrB6EVcHzmbbw.svg';

  const baseProduct = {
    productId: 1n,
    productName: '로고 URL 테스트 상품',
    providerType: 'POLICY',
    productCategory: 'JEONSE_LOAN',
    providerName: '주택도시기금',
    minRate: null,
    maxRate: null,
    maxLimitAmount: null,
    minAge: null,
    maxAge: null,
    maxIncome: null,
    minIncome: null,
    maxAsset: null,
    minAsset: null,
    requireNoHouse: null,
    firstTimeBuyerOnly: null,
    incomeTaxDeductible: null,
    ltvRatio: null,
    dtiRatio: null,
    loanTermMinYears: null,
    loanTermMaxYears: null,
    preferentialRateDiscount: null,
    firstTimeBuyerRateDiscount: null,
    minMonthlyDeposit: null,
    maxMonthlyDeposit: null,
    officialUrl: null,
    description: null,
    requireMarried: false,
    maxMarriageYears: null,
    requireRecentNewborn: false,
    newbornWithinYears: null,
    requireHouseholdHead: false,
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

  let service: FinanceService;
  let repository: {
    findLoanProducts: jest.Mock;
    countLoanProducts: jest.Mock;
    findLoanProductById: jest.Mock;
    findUserConditionProfileByUserId: jest.Mock;
    findUserProfileByUserId: jest.Mock;
    findLoanProductsForMatch: jest.Mock;
  };

  beforeEach(() => {
    repository = {
      findLoanProducts: jest.fn(),
      countLoanProducts: jest.fn(),
      findLoanProductById: jest.fn(),
      findUserConditionProfileByUserId: jest.fn(),
      findUserProfileByUserId: jest.fn(),
      findLoanProductsForMatch: jest.fn(),
    };
    service = new FinanceService(repository as unknown as FinanceRepository);
  });

  describe('GET /loan-products (목록)', () => {
    it('DB의 providerLogoUrl 값이 그대로 응답에 나온다', async () => {
      repository.findLoanProducts.mockResolvedValue([
        { ...baseProduct, providerLogoUrl: LOGO_URL } as unknown as LoanProduct,
      ]);
      repository.countLoanProducts.mockResolvedValue(1);

      const result = await service.getLoanProducts({ page: 0, size: 20 });

      expect(result.products[0].providerLogoUrl).toBe(LOGO_URL);
    });

    it('DB의 providerLogoUrl이 null이면 null 그대로 응답에 나온다', async () => {
      repository.findLoanProducts.mockResolvedValue([
        { ...baseProduct, providerLogoUrl: null } as unknown as LoanProduct,
      ]);
      repository.countLoanProducts.mockResolvedValue(1);

      const result = await service.getLoanProducts({ page: 0, size: 20 });

      expect(result.products[0].providerLogoUrl).toBeNull();
    });
  });

  describe('GET /loan-products/match (매칭)', () => {
    it('DB의 providerLogoUrl 값이 그대로 응답에 나온다', async () => {
      repository.findUserConditionProfileByUserId.mockResolvedValue(conditionProfile);
      repository.findUserProfileByUserId.mockResolvedValue(null);
      repository.findLoanProductsForMatch.mockResolvedValue([
        { ...baseProduct, providerLogoUrl: LOGO_URL } as unknown as LoanProduct,
      ]);

      const result = await service.matchLoanProducts(1n, {});

      expect(result.products[0].providerLogoUrl).toBe(LOGO_URL);
    });

    it('DB의 providerLogoUrl이 null이면 null 그대로 응답에 나온다', async () => {
      repository.findUserConditionProfileByUserId.mockResolvedValue(conditionProfile);
      repository.findUserProfileByUserId.mockResolvedValue(null);
      repository.findLoanProductsForMatch.mockResolvedValue([
        { ...baseProduct, providerLogoUrl: null } as unknown as LoanProduct,
      ]);

      const result = await service.matchLoanProducts(1n, {});

      expect(result.products[0].providerLogoUrl).toBeNull();
    });
  });

  describe('GET /loan-products/{productId} (상세)', () => {
    it('DB의 providerLogoUrl 값이 그대로 응답에 나온다', async () => {
      repository.findLoanProductById.mockResolvedValue({
        ...baseProduct,
        providerLogoUrl: LOGO_URL,
      } as unknown as LoanProduct);

      const result = await service.getLoanProductDetail(1);

      expect(result.providerLogoUrl).toBe(LOGO_URL);
    });

    it('DB의 providerLogoUrl이 null이면 null 그대로 응답에 나온다', async () => {
      repository.findLoanProductById.mockResolvedValue({
        ...baseProduct,
        providerLogoUrl: null,
      } as unknown as LoanProduct);

      const result = await service.getLoanProductDetail(1);

      expect(result.providerLogoUrl).toBeNull();
    });
  });
});
