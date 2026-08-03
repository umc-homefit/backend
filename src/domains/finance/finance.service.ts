import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  DocumentMapping,
  ExternalApiErrorType,
  Guide,
  LoanProduct,
  Prisma,
  RequiredDocument,
  UserConditionProfile,
} from '@prisma/client';

import { addUtcMonthsClamped } from '../../common/utils/date.util';
import { HouseholdHeadStatus, MaritalStatus } from '../users/dto/users.dto';
import {
  FinanceTermItemDto,
  GetGuidesQueryDto,
  GetLoanProductsQueryDto,
  GuideCategoryItemDto,
  GuideContentType,
  GuideDetailResultDto,
  GuideListItemDto,
  GuideListResultDto,
  LoanProductDetailResultDto,
  LoanProductListItemDto,
  LoanProductListResultDto,
  LoanProductSort,
  LoanProviderType,
  MatchedLoanProductDto,
  MatchLoanProductsResultDto,
  ProductCategory,
  RequiredDocumentItemDto,
  SyncLoanProductsResultDto,
} from './dto/finance.dto';
import { FinanceRepository, LoanProductRateUpsertInput } from './finance.repository';

/**
 * user_condition_profiles.marital_status/household_head_status는 ERD상 VARCHAR + 주석 컨벤션이라
 * Prisma 필드 타입이 순수 string이다 — 그래서 아래 배열도 string[]로 선언한다 (enum 리터럴 값만 채워서 사용).
 */
/** requireMarried 상품에서 "기혼으로 간주"할 상태. 예비신혼(결혼예정, ERD 기준 3개월 이내)도 신혼부부 상품 대상이라 포함한다. */
const MARRIED_ELIGIBLE_STATUSES: string[] = [
  MaritalStatus.MARRIED,
  MaritalStatus.MARRIAGE_EXPECTED,
];
/** requireHouseholdHead 상품에서 "세대주로 간주"할 상태. 예비세대주/세대주 인정자도 포함한다. */
const HOUSEHOLD_HEAD_ELIGIBLE_STATUSES: string[] = [
  HouseholdHeadStatus.HEAD,
  HouseholdHeadStatus.HEAD_EXPECTED,
  HouseholdHeadStatus.RECOGNIZED,
];

/**
 * 은행별 전세자금대출(rent-loan-rate-info)의 90%/100% 두 tier가 모두 해당하는 단일 보증상품(일반전세자금보증)의 보증구분코드.
 * officialUrl/maxLimitAmount는 은행별이 아니라 이 보증상품 기준으로 동일하게 적용된다.
 */
const SYNC_GUARANTEE_DVCD = '2D';

const EXTERNAL_API_NAME = {
  LOAN_RATE_API: 'LOAN_RATE_API',
  LOAN_GUARANTEE_INFO_API: 'LOAN_GUARANTEE_INFO_API',
} as const;

const EXTERNAL_API_ERROR_TYPE = ExternalApiErrorType;

interface RentLoanRateApiItem {
  organId: string;
  interest4_1: string;
  interest4_2: string;
  callCenter: string;
}

interface RentLoanRateApiResponse {
  header: { resultCode: string; resultMsg: string };
  body: { items: RentLoanRateApiItem[] };
}

interface LoanGuaranteeDetailInfoApiItem {
  guidUrl: string;
  maxLoanLmtAmt: string;
}

interface LoanGuaranteeDetailInfoApiResponse {
  header: { resultCode: string; resultMsg: string };
  body: { item: LoanGuaranteeDetailInfoApiItem };
}

@Injectable()
export class FinanceService {
  constructor(private readonly financeRepository: FinanceRepository) {}

  /**
   * 사용자 조건 프로필(나이/소득/자산/무주택/결혼/출산) 기준으로 신청 자격이 되는 금융상품을 매칭한다.
   * 청약저축(SUBSCRIPTION_SAVINGS)은 보증금 마련 목적이 아니라 별도 안내 대상이라 매칭 후보에서 제외한다.
   */
  async matchLoanProducts(
    userId: bigint,
    providerType: LoanProviderType | undefined,
  ): Promise<MatchLoanProductsResultDto> {
    // where절이 providerType(파라미터)에만 의존하고 프로필 조회 결과와 무관하므로,
    // 세 쿼리를 순차 대기시키지 않고 한 번에 병렬로 실행한다.
    const where: Prisma.LoanProductWhereInput = {
      AND: [
        {
          OR: [
            { productCategory: null },
            { productCategory: { not: ProductCategory.SUBSCRIPTION_SAVINGS } },
          ],
        },
        ...(providerType ? [{ providerType }] : []),
      ],
    };

    const [conditionProfile, userProfile, products] = await Promise.all([
      this.financeRepository.findUserConditionProfileByUserId(userId),
      this.financeRepository.findUserProfileByUserId(userId),
      this.financeRepository.findLoanProductsForMatch(where),
    ]);

    if (!conditionProfile) {
      throw new BadRequestException({
        code: 'FINANCE400',
        message: '금융정보가 입력되지 않아 매칭할 수 없습니다. 조건 프로필을 먼저 등록해주세요.',
      });
    }

    const age = this.calculateAge(userProfile?.birthDate ?? null);
    // product와 평가 결과(dto)를 한 쌍으로 묶어서 만든다 — 두 배열을 index로 짝짓지 않아
    // 한쪽만 따로 filter/reorder해도 어긋나지 않는다.
    const evaluations = products.map((product) => ({
      product,
      dto: this.evaluateProductMatch(product, conditionProfile, age),
    }));
    const eligibleProducts = evaluations
      .filter((evaluation) => evaluation.dto.isEligible)
      .map((evaluation) => evaluation.product);

    return {
      matchedCount: eligibleProducts.length,
      minRate: this.pickMinRate(eligibleProducts),
      maxLimitAmount: this.pickMaxLimitAmount(eligibleProducts),
      products: evaluations.map((evaluation) => evaluation.dto),
    };
  }

  private evaluateProductMatch(
    product: LoanProduct,
    profile: UserConditionProfile,
    age: number | null,
  ): MatchedLoanProductDto {
    const annualIncome = Number(profile.monthlyIncomeAmount) * 12;
    const netAsset = Number(profile.totalAssetAmount) - Number(profile.totalDebtAmount);
    const ageCheckSkipped = age === null && (product.minAge !== null || product.maxAge !== null);

    const passesAge = age === null || this.isWithinRange(age, product.minAge, product.maxAge);
    const passesIncome = this.isWithinRange(
      annualIncome,
      product.minIncome === null ? null : Number(product.minIncome),
      product.maxIncome === null ? null : Number(product.maxIncome),
    );
    const passesAsset = this.isWithinRange(
      netAsset,
      product.minAsset === null ? null : Number(product.minAsset),
      product.maxAsset === null ? null : Number(product.maxAsset),
    );
    const passesHomeless = !product.requireNoHouse || profile.isHomeless;
    const householdHead = this.evaluateHouseholdHeadCondition(product, profile);
    const married = this.evaluateMarriedCondition(product, profile);
    const newborn = this.evaluateNewbornCondition(product, profile);
    // isFirstTimeBuyer가 null(미입력)이면 나이와 동일하게 관대하게 통과시키고 스킵 플래그로 알린다.
    const firstTimeBuyerCheckSkipped =
      product.firstTimeBuyerOnly === true && profile.isFirstTimeBuyer === null;
    const passesFirstTimeBuyer = !product.firstTimeBuyerOnly || profile.isFirstTimeBuyer !== false;

    const isEligible =
      passesAge &&
      passesIncome &&
      passesAsset &&
      passesHomeless &&
      householdHead.passed &&
      passesFirstTimeBuyer &&
      married.passed &&
      newborn.passed;

    const ineligibleReasons = this.collectIneligibleReasons({
      passesAge,
      passesIncome,
      passesAsset,
      passesHomeless,
      passesHouseholdHead: householdHead.passed,
      passesFirstTimeBuyer,
      passesMarried: married.passed,
      passesNewborn: newborn.passed,
    });

    return {
      productId: Number(product.productId),
      productName: product.productName,
      providerType: product.providerType as LoanProviderType,
      productCategory: product.productCategory as ProductCategory | null,
      providerName: product.providerName,
      rateRange: this.formatRateRange(product.minRate, product.maxRate),
      maxIncome: product.maxIncome === null ? null : Number(product.maxIncome),
      firstTimeBuyerOnly: product.firstTimeBuyerOnly,
      maxLimitAmount: product.maxLimitAmount === null ? null : Number(product.maxLimitAmount),
      isEligible,
      ageCheckSkipped,
      householdHeadCheckSkipped: householdHead.skipped,
      marriedCheckSkipped: married.skipped,
      newbornCheckSkipped: newborn.skipped,
      firstTimeBuyerCheckSkipped,
      ineligibleReasons,
    };
  }

  /** isEligible=false일 때 어떤 조건에서 떨어졌는지 코드 배열로 모은다. 전부 통과하면 빈 배열. */
  private collectIneligibleReasons(passed: {
    passesAge: boolean;
    passesIncome: boolean;
    passesAsset: boolean;
    passesHomeless: boolean;
    passesHouseholdHead: boolean;
    passesFirstTimeBuyer: boolean;
    passesMarried: boolean;
    passesNewborn: boolean;
  }): string[] {
    const reasons: string[] = [];
    if (!passed.passesAge) reasons.push('AGE');
    if (!passed.passesIncome) reasons.push('INCOME');
    if (!passed.passesAsset) reasons.push('ASSET');
    if (!passed.passesHomeless) reasons.push('HOMELESS');
    if (!passed.passesHouseholdHead) reasons.push('HOUSEHOLD_HEAD');
    if (!passed.passesFirstTimeBuyer) reasons.push('FIRST_TIME_BUYER');
    if (!passed.passesMarried) reasons.push('MARRIED');
    if (!passed.passesNewborn) reasons.push('NEWBORN');
    return reasons;
  }

  /** min/max 둘 다 null이면 조건 없음으로 간주해 통과시킨다. */
  private isWithinRange(value: number, min: number | null, max: number | null): boolean {
    if (min !== null && value < min) {
      return false;
    }
    if (max !== null && value > max) {
      return false;
    }
    return true;
  }

  /**
   * requireHouseholdHead=true인 상품(세대주 전용) 매칭. 세대주/예비세대주만 통과한다.
   * householdHeadStatus가 UNKNOWN(미입력)이면 "세대주가 아님"이 아니라 "아직 모름"이므로
   * ageCheckSkipped와 동일하게 관대히 통과시키고 skipped=true로 표시한다.
   */
  private evaluateHouseholdHeadCondition(
    product: LoanProduct,
    profile: UserConditionProfile,
  ): { passed: boolean; skipped: boolean } {
    if (!product.requireHouseholdHead) {
      return { passed: true, skipped: false };
    }
    if (profile.householdHeadStatus === HouseholdHeadStatus.UNKNOWN) {
      return { passed: true, skipped: true };
    }
    return {
      passed: HOUSEHOLD_HEAD_ELIGIBLE_STATUSES.includes(profile.householdHeadStatus),
      skipped: false,
    };
  }

  /**
   * requireMarried=true인 상품(신혼부부 전용) 매칭. 기혼(MARRIED)뿐 아니라 예비신혼
   * (MARRIAGE_EXPECTED)도 신혼부부 상품 대상이라 함께 통과시킨다.
   * maritalStatus가 UNKNOWN(미입력)인 경우도 "미혼/조건 미충족"이 아니라 "아직 모름"이므로
   * ageCheckSkipped와 동일하게 관대히 통과시키고 skipped=true로 표시한다.
   * 기혼 자체는 확인됐지만 marriageDate가 없어 혼인기간(maxMarriageYears) 조건을 검증하지
   * 못한 경우도 마찬가지로 skipped=true로 표시한다.
   */
  private evaluateMarriedCondition(
    product: LoanProduct,
    profile: UserConditionProfile,
  ): { passed: boolean; skipped: boolean } {
    if (!product.requireMarried) {
      return { passed: true, skipped: false };
    }
    if (profile.maritalStatus === MaritalStatus.UNKNOWN) {
      return { passed: true, skipped: true };
    }
    if (!MARRIED_ELIGIBLE_STATUSES.includes(profile.maritalStatus)) {
      return { passed: false, skipped: false };
    }
    if (product.maxMarriageYears === null) {
      return { passed: true, skipped: false };
    }
    if (!profile.marriageDate) {
      return { passed: true, skipped: true };
    }
    return {
      passed: this.isWithinYears(
        profile.marriageDate,
        product.maxMarriageYears,
        profile.maritalStatus === MaritalStatus.MARRIAGE_EXPECTED,
      ),
      skipped: false,
    };
  }

  /**
   * requireRecentNewborn=true인 상품(신생아 특례) 매칭. hasRecentNewborn은 확인됐지만
   * newbornBirthDate가 없어 newbornWithinYears 조건을 검증 못한 경우 skipped=true.
   */
  private evaluateNewbornCondition(
    product: LoanProduct,
    profile: UserConditionProfile,
  ): { passed: boolean; skipped: boolean } {
    if (!product.requireRecentNewborn) {
      return { passed: true, skipped: false };
    }
    if (!profile.hasRecentNewborn) {
      return { passed: false, skipped: false };
    }
    if (product.newbornWithinYears === null) {
      return { passed: true, skipped: false };
    }
    if (!profile.newbornBirthDate) {
      return { passed: true, skipped: true };
    }
    return {
      passed: this.isWithinYears(profile.newbornBirthDate, product.newbornWithinYears),
      skipped: false,
    };
  }

  /**
   * date가 오늘로부터 최대 years년 이내인지 달력 기준으로 정확히 판정한다 (365.25일 근사 대신 실제 날짜 연산).
   * marriageDate/newbornBirthDate는 Prisma에서 시간 정보 없는 DATE(자정 UTC)로 들어오므로,
   * today/cutoff도 로컬 타임존이 아닌 UTC 자정 기준으로 맞춰야 서버 실행 환경(로컬 Asia/Seoul vs 배포 UTC)에
   * 따라 경계일 판정이 최대 하루 어긋나는 것을 방지할 수 있다.
   * cutoff는 setUTCFullYear를 직접 쓰지 않고 addUtcMonthsClamped(년 -> 개월 환산)로 계산한다 —
   * today가 2/29(윤년)이면 setUTCFullYear만으로는 없는 날짜(2/29 아닌 해)라 3/1로 밀리는 overflow가 있었다.
   * allowFuture=false(기본)면 미래 날짜는 무조건 탈락시킨다 — 혼인/출산은 이미 발생한 사실이어야 하므로.
   * MARRIAGE_EXPECTED처럼 아직 발생하지 않은 미래 혼인일을 다루는 호출에서만 true로 넘긴다.
   */
  private isWithinYears(date: Date, years: number, allowFuture = false): boolean {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    if (!allowFuture && date > today) {
      return false;
    }
    const cutoff = addUtcMonthsClamped(today, -years * 12);
    return date >= cutoff;
  }

  /**
   * 생년월일 기준 만 나이. birthDate가 없으면 나이 조건 검사를 스킵할 수 있도록 null을 반환한다.
   * birthDate는 Prisma에서 시간 정보 없는 DATE(자정 UTC)로 들어오므로 today도 UTC getter로 읽는다 —
   * 로컬 getter를 쓰면 서버 실행 환경(로컬 Asia/Seoul vs 배포 UTC)에 따라 생일 당일 판정이 하루
   * 어긋난다. 같은 파일의 isWithinYears와 동일하게 UTC 기준으로 통일한 것.
   */
  private calculateAge(birthDate: Date | null): number | null {
    if (!birthDate) {
      return null;
    }
    const today = new Date();
    let age = today.getUTCFullYear() - birthDate.getUTCFullYear();
    const hasHadBirthdayThisYear =
      today.getUTCMonth() > birthDate.getUTCMonth() ||
      (today.getUTCMonth() === birthDate.getUTCMonth() &&
        today.getUTCDate() >= birthDate.getUTCDate());
    if (!hasHadBirthdayThisYear) {
      age -= 1;
    }
    return age;
  }

  private pickMinRate(products: LoanProduct[]): string | null {
    const rates = products.map((product) => product.minRate).filter((rate) => rate !== null);
    if (rates.length === 0) {
      return null;
    }
    const min = rates.reduce((current, rate) => (rate.lessThan(current) ? rate : current));
    return `${min.toString()}%`;
  }

  private pickMaxLimitAmount(products: LoanProduct[]): number | null {
    const limits = products
      .map((product) => product.maxLimitAmount)
      .filter((limit) => limit !== null);
    if (limits.length === 0) {
      return null;
    }
    const max = limits.reduce((current, limit) => (limit > current ? limit : current));
    return Number(max);
  }

  async getLoanProducts(query: GetLoanProductsQueryDto): Promise<LoanProductListResultDto> {
    const page = query.page ?? 0;
    const size = query.size ?? 20;
    const where: Prisma.LoanProductWhereInput = {
      ...(query.providerType ? { providerType: query.providerType } : {}),
      ...(query.productCategory ? { productCategory: query.productCategory } : {}),
      ...(query.keyword
        ? {
            OR: [
              { productName: { contains: query.keyword, mode: 'insensitive' } },
              { providerName: { contains: query.keyword, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [products, totalElements] = await Promise.all([
      this.financeRepository.findLoanProducts({
        where,
        skip: page * size,
        take: size,
        orderBy: this.buildLoanProductOrderBy(query.sort),
      }),
      this.financeRepository.countLoanProducts(where),
    ]);

    const totalPages = Math.ceil(totalElements / size);

    return {
      pageInfo: {
        page,
        size,
        totalElements,
        totalPages,
        hasNext: page + 1 < totalPages,
      },
      products: products.map((product) => this.toListItemDto(product)),
    };
  }

  async getLoanProductDetail(productId: number): Promise<LoanProductDetailResultDto> {
    const product = await this.findOrThrow(
      () => this.financeRepository.findLoanProductById(BigInt(productId)),
      '존재하지 않는 상품입니다.',
    );

    return this.toDetailResultDto(product);
  }

  async getLoanProductDocuments(productId: number): Promise<RequiredDocumentItemDto[]> {
    const mappings = await this.financeRepository.findDocumentMappingsByProductId(
      BigInt(productId),
    );

    return mappings.map((mapping) => this.toRequiredDocumentItemDto(mapping));
  }

  async getNoticeDocuments(noticeId: number): Promise<RequiredDocumentItemDto[]> {
    const mappings = await this.financeRepository.findDocumentMappingsByNoticeId(BigInt(noticeId));

    return mappings.map((mapping) => this.toRequiredDocumentItemDto(mapping));
  }

  async getFinanceTerm(term: string): Promise<FinanceTermItemDto> {
    const financeTerm = await this.findOrThrow(
      () => this.financeRepository.findFinanceTermByTerm(term),
      '존재하지 않는 용어입니다.',
    );

    return { term: financeTerm.term, detailDescription: financeTerm.detailDescription };
  }

  /** repo 조회 결과가 없으면 FINANCE404로 통일해서 던진다. (상품/가이드/용어 상세조회가 공유) */
  private async findOrThrow<T>(finder: () => Promise<T | null>, message: string): Promise<T> {
    const result = await finder();

    if (!result) {
      throw new NotFoundException({ code: 'FINANCE404', message });
    }

    return result;
  }

  private toRequiredDocumentItemDto(
    mapping: DocumentMapping & { document: RequiredDocument },
  ): RequiredDocumentItemDto {
    return {
      documentId: Number(mapping.document.documentId),
      documentName: mapping.document.documentName,
      issuer: mapping.document.issuer,
      issueMethod: mapping.document.issueMethod,
      documentType: mapping.document.documentType,
      isRequired: mapping.isRequired,
    };
  }

  private buildLoanProductOrderBy(
    sort: LoanProductSort | undefined,
  ): Prisma.LoanProductOrderByWithRelationInput[] {
    switch (sort) {
      case LoanProductSort.LATEST:
        return [{ createdAt: 'desc' }, { productId: 'desc' }];
      case LoanProductSort.RATE_ASC:
        return [{ minRate: { sort: 'asc', nulls: 'last' } }, { productId: 'asc' }];
      case LoanProductSort.LIMIT_DESC:
        return [{ maxLimitAmount: { sort: 'desc', nulls: 'last' } }, { productId: 'asc' }];
      case LoanProductSort.RECOMMENDED:
      default:
        return [{ productId: 'asc' }];
    }
  }

  private toListItemDto(product: LoanProduct): LoanProductListItemDto {
    return {
      productId: Number(product.productId),
      productName: product.productName,
      providerType: product.providerType as LoanProviderType,
      productCategory: product.productCategory as ProductCategory | null,
      providerName: product.providerName,
      rateRange: this.formatRateRange(product.minRate, product.maxRate),
      maxIncome: product.maxIncome === null ? null : Number(product.maxIncome),
      firstTimeBuyerOnly: product.firstTimeBuyerOnly,
      maxLimitAmount: product.maxLimitAmount === null ? null : Number(product.maxLimitAmount),
    };
  }

  private toDetailResultDto(product: LoanProduct): LoanProductDetailResultDto {
    return {
      productId: Number(product.productId),
      productName: product.productName,
      providerType: product.providerType as LoanProviderType,
      productCategory: product.productCategory as ProductCategory | null,
      providerName: product.providerName,
      rateRange: this.formatRateRange(product.minRate, product.maxRate),
      maxIncome: product.maxIncome === null ? null : Number(product.maxIncome),
      firstTimeBuyerOnly: product.firstTimeBuyerOnly,
      maxLimitAmount: product.maxLimitAmount === null ? null : Number(product.maxLimitAmount),
      ltvRatio: product.ltvRatio,
      dtiRatio: product.dtiRatio,
      loanTermMinYears: product.loanTermMinYears,
      loanTermMaxYears: product.loanTermMaxYears,
      preferentialRateDiscount:
        product.preferentialRateDiscount === null ? null : Number(product.preferentialRateDiscount),
      minMonthlyDeposit:
        product.minMonthlyDeposit === null ? null : Number(product.minMonthlyDeposit),
      maxMonthlyDeposit:
        product.maxMonthlyDeposit === null ? null : Number(product.maxMonthlyDeposit),
      officialUrl: product.officialUrl,
      description: product.description,
    };
  }

  private formatRateRange(
    minRate: Prisma.Decimal | null,
    maxRate: Prisma.Decimal | null,
  ): string | null {
    if (minRate === null || maxRate === null) {
      return null;
    }
    return `${minRate.toString()}% ~ ${maxRate.toString()}%`;
  }

  async getGuideCategories(): Promise<GuideCategoryItemDto[]> {
    const categories = await this.financeRepository.findGuideCategories();

    return categories.map((category) => ({
      categoryId: Number(category.categoryId),
      categoryName: category.categoryName,
      displayOrder: category.displayOrder,
    }));
  }

  async getGuides(query: GetGuidesQueryDto): Promise<GuideListResultDto> {
    const page = query.page ?? 0;
    const size = query.size ?? 20;
    const where: Prisma.GuideWhereInput = {
      ...(query.categoryId !== undefined ? { categoryId: BigInt(query.categoryId) } : {}),
      ...(query.announcementType ? { announcementType: query.announcementType } : {}),
    };

    const [guides, totalElements] = await Promise.all([
      this.financeRepository.findGuides({ where, skip: page * size, take: size }),
      this.financeRepository.countGuides(where),
    ]);

    const totalPages = Math.ceil(totalElements / size);

    return {
      pageInfo: {
        page,
        size,
        totalElements,
        totalPages,
        hasNext: page + 1 < totalPages,
      },
      guides: guides.map((guide) => this.toGuideListItemDto(guide)),
    };
  }

  async getGuideDetail(guideId: number): Promise<GuideDetailResultDto> {
    const guide = await this.findOrThrow(
      () => this.financeRepository.findGuideById(BigInt(guideId)),
      '존재하지 않는 가이드입니다.',
    );

    return this.toGuideDto(guide);
  }

  private toGuideListItemDto(guide: Guide): GuideListItemDto {
    return this.toGuideDto(guide);
  }

  private toGuideDto(guide: Guide): GuideDetailResultDto {
    return {
      guideId: Number(guide.guideId),
      title: guide.title,
      contentType: guide.contentType as GuideContentType,
      contentBody: guide.contentBody,
      updatedAt: guide.updatedAt.toISOString(),
    };
  }

  /**
   * [테스트용] 전세자금대출 금리 정보 API와 전세자금보증상품 상세정보 API를 함께 호출해 LoanProduct 테이블에 반영한다.
   * (providerName, productName, guaranteeRatio) 기준으로 있으면 갱신(update)하고, 없으면 새로 만든다(create) — description은 건드리지 않는다.
   */
  async syncLoanProductsFromExternalApi(): Promise<SyncLoanProductsResultDto> {
    const [items, detailInfo] = await Promise.all([
      this.fetchLoanRateItems(),
      this.fetchLoanGuaranteeDetailInfo(SYNC_GUARANTEE_DVCD),
    ]);
    const officialUrl = detailInfo.guidUrl;
    const maxLimitAmount = Number(detailInfo.maxLoanLmtAmt);
    if (!Number.isSafeInteger(maxLimitAmount) || maxLimitAmount <= 0) {
      throw new BadGatewayException(
        `전세자금보증상품 상세정보 API의 maxLoanLmtAmt 값이 올바르지 않습니다: ${detailInfo.maxLoanLmtAmt}`,
      );
    }
    const skippedBanks: string[] = [];
    let syncedCount = 0;

    for (const item of items) {
      const tier1Rate = Number(item.interest4_1);
      const tier2Rate = Number(item.interest4_2);
      let matched = false;

      if (tier1Rate > 0) {
        await this.financeRepository.upsertLoanProductRate(
          this.buildSyncRow(item, tier1Rate, 90, officialUrl, maxLimitAmount),
        );
        matched = true;
        syncedCount += 1;
      }
      if (tier2Rate > 0) {
        await this.financeRepository.upsertLoanProductRate(
          this.buildSyncRow(item, tier2Rate, 100, officialUrl, maxLimitAmount),
        );
        matched = true;
        syncedCount += 1;
      }

      if (!matched) {
        skippedBanks.push(item.organId);
      }
    }

    return {
      fetchedBankCount: items.length,
      syncedCount,
      skippedBanks,
    };
  }

  private buildSyncRow(
    item: RentLoanRateApiItem,
    rate: number,
    guaranteeRatio: number,
    officialUrl: string,
    maxLimitAmount: number,
  ): LoanProductRateUpsertInput {
    return {
      productName: `${item.organId} 전세자금대출 (보증비율 ${guaranteeRatio}%)`,
      providerType: LoanProviderType.BANK,
      productCategory: ProductCategory.JEONSE_LOAN,
      providerName: item.organId,
      guaranteeRatio,
      minRate: rate,
      maxRate: rate,
      officialUrl,
      maxLimitAmount,
    };
  }

  private async fetchLoanRateItems(): Promise<RentLoanRateApiItem[]> {
    const baseUrl = process.env.LOAN_RATE_API_BASE_URL;
    const serviceKey = process.env.LOAN_RATE_API_SERVICE_KEY;

    if (!baseUrl || !serviceKey) {
      throw new InternalServerErrorException(
        'LOAN_RATE_API_BASE_URL/LOAN_RATE_API_SERVICE_KEY 환경변수가 설정되지 않았습니다.',
      );
    }

    const url = new URL(baseUrl);
    url.searchParams.set('serviceKey', serviceKey);
    url.searchParams.set('numOfRows', '100');
    url.searchParams.set('pageNo', '1');
    url.searchParams.set('dataType', 'json');
    const requestUrl = this.maskServiceKey(url);
    const startedAt = new Date();
    const apiName = EXTERNAL_API_NAME.LOAN_RATE_API;

    const response = await this.executeExternalApiCall(() => fetch(url.toString()), {
      apiName,
      requestUrl,
      startedAt,
    });

    if (!response.ok) {
      const message = `전세자금대출 금리 API 호출에 실패했습니다. (status: ${response.status})`;
      await this.logExternalApiFailure({
        apiName,
        errorType: EXTERNAL_API_ERROR_TYPE.HTTP_ERROR,
        httpStatusCode: response.status,
        requestUrl,
        errorMessage: message,
        startedAt,
      });
      throw new InternalServerErrorException(message);
    }

    const data = await this.parseExternalApiResponse<RentLoanRateApiResponse>(response, {
      apiName,
      requestUrl,
      startedAt,
      validate: (parsed) => Boolean(parsed?.header) && Array.isArray(parsed?.body?.items),
      invalidMessage: '전세자금대출 금리 API 응답에 header 또는 body.items가 없습니다.',
    });
    if (data.header.resultCode !== '00') {
      const message = `전세자금대출 금리 API 오류: ${data.header.resultMsg}`;
      await this.logExternalApiFailure({
        apiName,
        errorType: EXTERNAL_API_ERROR_TYPE.RESULT_CODE_ERROR,
        httpStatusCode: response.status,
        requestUrl,
        errorMessage: message,
        startedAt,
      });
      throw new InternalServerErrorException(message);
    }

    return data.body.items;
  }

  private async fetchLoanGuaranteeDetailInfo(
    grntDvcd: string,
  ): Promise<LoanGuaranteeDetailInfoApiItem> {
    const baseUrl = process.env.LOAN_GUARANTEE_INFO_API_BASE_URL;
    const serviceKey = process.env.LOAN_RATE_API_SERVICE_KEY;

    if (!baseUrl || !serviceKey) {
      throw new InternalServerErrorException(
        'LOAN_GUARANTEE_INFO_API_BASE_URL/LOAN_RATE_API_SERVICE_KEY 환경변수가 설정되지 않았습니다.',
      );
    }

    const url = new URL(baseUrl);
    url.searchParams.set('serviceKey', serviceKey);
    url.searchParams.set('dataType', 'json');
    url.searchParams.set('grntDvcd', grntDvcd);
    const requestUrl = this.maskServiceKey(url);
    const startedAt = new Date();
    const apiName = EXTERNAL_API_NAME.LOAN_GUARANTEE_INFO_API;

    const response = await this.executeExternalApiCall(() => fetch(url.toString()), {
      apiName,
      requestUrl,
      startedAt,
    });

    if (!response.ok) {
      const message = `전세자금보증상품 상세정보 API 호출에 실패했습니다. (status: ${response.status})`;
      await this.logExternalApiFailure({
        apiName,
        errorType: EXTERNAL_API_ERROR_TYPE.HTTP_ERROR,
        httpStatusCode: response.status,
        requestUrl,
        errorMessage: message,
        startedAt,
      });
      throw new InternalServerErrorException(message);
    }

    const data = await this.parseExternalApiResponse<LoanGuaranteeDetailInfoApiResponse>(response, {
      apiName,
      requestUrl,
      startedAt,
      validate: (parsed) => Boolean(parsed?.header) && Boolean(parsed?.body),
      invalidMessage: '전세자금보증상품 상세정보 API 응답에 header 또는 body가 없습니다.',
    });
    if (data.header.resultCode !== '00') {
      const message = `전세자금보증상품 상세정보 API 오류: ${data.header.resultMsg}`;
      await this.logExternalApiFailure({
        apiName,
        errorType: EXTERNAL_API_ERROR_TYPE.RESULT_CODE_ERROR,
        httpStatusCode: response.status,
        requestUrl,
        errorMessage: message,
        startedAt,
      });
      throw new InternalServerErrorException(message);
    }

    const item = data.body?.item;
    if (!item || !item.guidUrl) {
      const message = '전세자금보증상품 상세정보 API 응답에 item 또는 guidUrl이 없습니다.';
      await this.logExternalApiFailure({
        apiName,
        errorType: EXTERNAL_API_ERROR_TYPE.INVALID_RESPONSE,
        httpStatusCode: response.status,
        requestUrl,
        errorMessage: message,
        startedAt,
      });
      throw new BadGatewayException(message);
    }

    return item;
  }

  /**
   * fetch() 자체가 던지는 네트워크 단계 오류(DNS 실패, 연결 거부, 타임아웃 등)를 잡아
   * NETWORK_ERROR로 로그를 남긴 뒤 InternalServerErrorException으로 통일해 던진다.
   */
  private async executeExternalApiCall(
    call: () => Promise<Response>,
    context: { apiName: string; requestUrl: string; startedAt: Date },
  ): Promise<Response> {
    try {
      return await call();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.logExternalApiFailure({
        apiName: context.apiName,
        errorType: EXTERNAL_API_ERROR_TYPE.NETWORK_ERROR,
        httpStatusCode: null,
        requestUrl: context.requestUrl,
        errorMessage: message,
        startedAt: context.startedAt,
      });
      throw new InternalServerErrorException(
        `외부 API 호출 중 네트워크 오류가 발생했습니다: ${message}`,
      );
    }
  }

  /**
   * response.json() 파싱 실패나 header/body 누락(구조 이상)도 INVALID_RESPONSE로 로그를 남기도록 공통 처리한다.
   * try/catch 밖에서 파싱하면 예외가 로그 없이 그대로 튀어나가던 문제를 막기 위함.
   */
  private async parseExternalApiResponse<T>(
    response: Response,
    context: {
      apiName: string;
      requestUrl: string;
      startedAt: Date;
      validate: (parsed: T) => boolean;
      invalidMessage: string;
    },
  ): Promise<T> {
    let parsed: T;
    try {
      parsed = (await response.json()) as T;
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      const message = `${context.invalidMessage} (JSON 파싱 실패: ${detail})`;
      await this.logExternalApiFailure({
        apiName: context.apiName,
        errorType: EXTERNAL_API_ERROR_TYPE.INVALID_RESPONSE,
        httpStatusCode: response.status,
        requestUrl: context.requestUrl,
        errorMessage: message,
        startedAt: context.startedAt,
      });
      throw new BadGatewayException(message);
    }

    if (!context.validate(parsed)) {
      await this.logExternalApiFailure({
        apiName: context.apiName,
        errorType: EXTERNAL_API_ERROR_TYPE.INVALID_RESPONSE,
        httpStatusCode: response.status,
        requestUrl: context.requestUrl,
        errorMessage: context.invalidMessage,
        startedAt: context.startedAt,
      });
      throw new BadGatewayException(context.invalidMessage);
    }

    return parsed;
  }

  private async logExternalApiFailure(params: {
    apiName: string;
    errorType: ExternalApiErrorType;
    httpStatusCode: number | null;
    requestUrl: string;
    errorMessage: string;
    startedAt: Date;
  }): Promise<void> {
    await this.financeRepository.createExternalApiCallLog(params);
  }

  /** 로그/에러 메시지에 serviceKey 같은 인증정보가 남지 않도록 마스킹한 URL 문자열을 반환한다. */
  private maskServiceKey(url: URL): string {
    const masked = new URL(url.toString());
    if (masked.searchParams.has('serviceKey')) {
      masked.searchParams.set('serviceKey', '***');
    }
    return masked.toString();
  }
}
