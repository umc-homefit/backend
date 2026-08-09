import { createHash } from 'node:crypto';

import {
  LoanProviderType,
  NoticeConditionTargetType,
  NoticeFileType,
  Prisma,
  PrismaClient,
  ProductCategory,
} from '@prisma/client';

export const NOTICE_SEED_OPT_IN_ENV = 'HOMEFIT_NOTICE_SEED';
export const NOTICE_SEED_PREFIX = 'homefit-test:notice-seed:v1:';
export const LOAN_PRODUCT_SEED_OPT_IN_ENV = 'HOMEFIT_LOAN_PRODUCT_SEED';

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

type SeedUnit = Omit<
  Prisma.NoticeUnitCreateManyInput,
  'unitId' | 'noticeId' | 'createdAt' | 'updatedAt'
>;

type SeedCondition = Omit<
  Prisma.NoticeConditionCreateManyInput,
  'conditionId' | 'noticeId' | 'createdAt' | 'updatedAt'
>;

type SeedFile = Omit<Prisma.NoticeFileCreateManyInput, 'fileId' | 'noticeId' | 'createdAt'>;

type ComplexSeed = {
  key: string;
  name: string;
  region: string;
  district: string;
  address: string;
  sourceUrl: string;
};

type NoticeStatusScenario = 'RECRUITING' | 'CLOSING_SOON' | 'SCHEDULED' | 'CLOSED';

type NoticeSeed = {
  key: string;
  complexKey: string;
  title: string;
  scenario: NoticeStatusScenario;
  isAdditionalRecruitment: boolean;
  views: number;
  interestedCount: number;
  unit: SeedUnit;
  condition: SeedCondition;
};

export type NoticeSeedResult = {
  complexes: Array<{ key: string; complexId: bigint }>;
  notices: Array<{ key: string; noticeId: bigint; scenario: NoticeStatusScenario }>;
};

const COMPLEXES: ComplexSeed[] = [
  {
    key: 'bx201',
    name: '서울대입구역 BX201',
    region: '서울',
    district: '관악구',
    address: '서울특별시 관악구 남부순환로224길 25',
    sourceUrl: 'https://bx201.com/notice',
  },
  {
    key: 'the-classic-dongjak',
    name: '더클래식 동작',
    region: '서울',
    district: '동작구',
    address: '서울특별시 동작구 노량진동 37-1',
    sourceUrl: 'https://theclassic2030.co.kr/',
  },
  {
    key: 'gajwa-star-tower',
    name: '가좌 스타타워',
    region: '서울',
    district: '서대문구',
    address: '서울특별시 서대문구 수색로4가길 25',
    sourceUrl: 'http://www.stkaja.co.kr/bbs/board.php?bo_table=news',
  },
  {
    key: 'seocho-flower-village',
    name: '서초 꽃마을',
    region: '서울',
    district: '서초구',
    address: '서울특별시 서초구 반포대로27길 13',
    sourceUrl: 'https://seocho1502.qshop.ai/8a7g4ml6',
  },
  {
    key: 'cheonggye-lovenheim',
    name: '청계로벤하임',
    region: '서울',
    district: '종로구',
    address: '서울특별시 종로구 숭인동 240-1',
    sourceUrl: 'https://www.lovenheim.imweb.me/notice1',
  },
  {
    key: 'yongsan-vertium-friends',
    name: '용산 베르디움 프렌즈',
    region: '서울',
    district: '용산구',
    address: '서울특별시 용산구 백범로99길 40',
    sourceUrl: 'https://www.ys-vertium-friends.co.kr/main/index.php',
  },
];

const NOTICES: NoticeSeed[] = [
  {
    key: 'bx201-additional-recruiting',
    complexKey: 'bx201',
    title: '[TEST] 서울대입구역 BX201 추가모집 · 모집중',
    scenario: 'RECRUITING',
    isAdditionalRecruitment: true,
    views: 120,
    interestedCount: 32,
    unit: createUnit('20A', 20, 30, 30_000_000n, 30_000_000n, 260_000n, 320_000n, 8),
    condition: createCondition(NoticeConditionTargetType.YOUTH, '청년'),
  },
  {
    key: 'the-classic-additional-closing-soon',
    complexKey: 'the-classic-dongjak',
    title: '[TEST] 더클래식 동작 추가모집 · 마감임박',
    scenario: 'CLOSING_SOON',
    isAdditionalRecruitment: true,
    views: 240,
    interestedCount: 54,
    unit: createUnit('59A', 59, 70, 100_000_000n, 100_000_000n, 410_000n, 480_000n, 5),
    condition: createCondition(NoticeConditionTargetType.NEWLYWED, '신혼부부'),
  },
  {
    key: 'gajwa-additional-scheduled',
    complexKey: 'gajwa-star-tower',
    title: '[TEST] 가좌 스타타워 추가모집 · 모집예정',
    scenario: 'SCHEDULED',
    isAdditionalRecruitment: true,
    views: 75,
    interestedCount: 18,
    unit: createUnit('60A', 60, 82, 120_000_000n, 135_000_000n, 520_000n, 610_000n, 4),
    condition: createCondition(NoticeConditionTargetType.COMMON, '공통'),
  },
  {
    key: 'seocho-additional-closed',
    complexKey: 'seocho-flower-village',
    title: '[TEST] 서초 꽃마을 추가모집 · 모집마감',
    scenario: 'CLOSED',
    isAdditionalRecruitment: true,
    views: 310,
    interestedCount: 61,
    unit: createUnit('16A', 16.63, 24, 67_000_000n, 67_000_000n, 486_000n, 505_000n, 2),
    condition: createCondition(NoticeConditionTargetType.YOUTH, '청년'),
  },
  {
    key: 'cheonggye-additional-recruiting',
    complexKey: 'cheonggye-lovenheim',
    title: '[TEST] 청계로벤하임 추가모집 · 모집중',
    scenario: 'RECRUITING',
    isAdditionalRecruitment: true,
    views: 165,
    interestedCount: 43,
    unit: createUnit('24A', 24, 36, 50_000_000n, 85_000_000n, 300_000n, 430_000n, 7),
    condition: createCondition(NoticeConditionTargetType.OTHER, '연동 확인'),
  },
  {
    key: 'yongsan-additional-recruiting',
    complexKey: 'yongsan-vertium-friends',
    title: '[TEST] 용산 베르디움 프렌즈 추가모집 · 모집중',
    scenario: 'RECRUITING',
    isAdditionalRecruitment: true,
    views: 280,
    interestedCount: 72,
    unit: createUnit('45A', 45, 58, 90_000_000n, 115_000_000n, 450_000n, 590_000n, 6),
    condition: createCondition(NoticeConditionTargetType.NEWLYWED, '신혼부부'),
  },
  {
    key: 'bx201-general-recruiting',
    complexKey: 'bx201',
    title: '[TEST] 서울대입구역 BX201 일반모집 필터 확인',
    scenario: 'RECRUITING',
    isAdditionalRecruitment: false,
    views: 90,
    interestedCount: 12,
    unit: createUnit('30A', 30, 42, 40_000_000n, 60_000_000n, 290_000n, 390_000n, 3),
    condition: createCondition(NoticeConditionTargetType.YOUTH, '청년'),
  },
];

function createUnit(
  unitName: string,
  exclusiveAreaM2: number,
  supplyAreaM2: number,
  depositMin: bigint,
  depositMax: bigint,
  monthlyRentMin: bigint,
  monthlyRentMax: bigint,
  supplyCount: number,
): SeedUnit {
  return {
    unitName,
    exclusiveAreaM2,
    supplyAreaM2,
    depositMin,
    depositMax,
    monthlyRentMin,
    monthlyRentMax,
    supplyCount,
  };
}

function createCondition(
  targetType: NoticeConditionTargetType,
  targetLabel: string,
): SeedCondition {
  return {
    targetType,
    minAge: 19,
    maxAge: 39,
    incomeLimitAmount: 5_000_000n,
    incomeLimitText: '[TEST] Android 조건 표시 확인용 소득 문구',
    assetLimitAmount: 361_000_000n,
    assetLimitText: '[TEST] Android 조건 표시 확인용 자산 문구',
    requiresHomeless: true,
    housingOwnershipRequirement: '[TEST] 무주택 조건 표시 확인용',
    residenceRequirement: '[TEST] 서울 지역 조건 표시 확인용',
    householdRequirement: `[TEST] ${targetLabel} 대상 화면 표시 확인용`,
    subscriptionRequirement: null,
    rawConditionText:
      '[TEST DATA] Android 연동 화면 확인을 위한 가상 자격조건이며 실제 모집 자격으로 사용할 수 없습니다.',
  };
}

function createFile(complex: ComplexSeed, now: Date): SeedFile {
  return {
    fileName: `[TEST] ${complex.name} 공식 안내 링크`,
    fileType: NoticeFileType.LINK,
    fileUrl: complex.sourceUrl,
    registeredAt: now,
  };
}

function createApplicationPeriod(
  scenario: NoticeStatusScenario,
  now: Date,
): { applicationStartAt: Date; applicationEndAt: Date } {
  switch (scenario) {
    case 'CLOSING_SOON':
      return {
        applicationStartAt: new Date(now.getTime() - 2 * DAY_MS),
        applicationEndAt: new Date(now.getTime() + 48 * HOUR_MS),
      };
    case 'SCHEDULED':
      return {
        applicationStartAt: new Date(now.getTime() + 4 * DAY_MS),
        applicationEndAt: new Date(now.getTime() + 10 * DAY_MS),
      };
    case 'CLOSED':
      return {
        applicationStartAt: new Date(now.getTime() - 10 * DAY_MS),
        applicationEndAt: new Date(now.getTime() - DAY_MS),
      };
    case 'RECRUITING':
    default:
      return {
        applicationStartAt: new Date(now.getTime() - DAY_MS),
        applicationEndAt: new Date(now.getTime() + 7 * DAY_MS),
      };
  }
}

function stableHash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

async function upsertComplex(
  tx: Prisma.TransactionClient,
  seed: ComplexSeed,
): Promise<{ key: string; complexId: bigint }> {
  const existing = await tx.housingComplex.findMany({
    where: { sourceUrl: seed.sourceUrl },
    select: { complexId: true },
    orderBy: { complexId: 'asc' },
    take: 2,
  });

  if (existing.length > 1) {
    throw new Error(
      `공식 sourceUrl이 같은 단지가 둘 이상 존재합니다. 중복을 먼저 정리해주세요: ${seed.sourceUrl}`,
    );
  }

  const data = {
    name: seed.name,
    region: seed.region,
    district: seed.district,
    address: seed.address,
    sourceUrl: seed.sourceUrl,
    isActive: true,
  };

  const complex = existing[0]
    ? await tx.housingComplex.update({
        where: { complexId: existing[0].complexId },
        data,
      })
    : await tx.housingComplex.create({
        data: {
          ...data,
          crawlEnabled: false,
        },
      });

  return { key: seed.key, complexId: complex.complexId };
}

async function upsertNotice(
  tx: Prisma.TransactionClient,
  seed: NoticeSeed,
  complex: ComplexSeed,
  complexId: bigint,
  now: Date,
): Promise<{ key: string; noticeId: bigint; scenario: NoticeStatusScenario }> {
  const dedupHash = `${NOTICE_SEED_PREFIX}${stableHash(seed.key)}`;
  const period = createApplicationPeriod(seed.scenario, now);
  const rawContent =
    '[TEST DATA] HomeFit Android 연동 전용 공고입니다. 단지명·주소·공식 출처를 제외한 모집기간, 금액, 면적, 자격조건과 집계값은 UI 및 API 필터 확인용 가상 값입니다.';
  const parsedJson = JSON.stringify({
    seedVersion: 1,
    seedKey: seed.key,
    scenario: seed.scenario,
    syntheticScenarioValues: true,
    verifiedComplexSourceUrl: complex.sourceUrl,
  });

  const notice = await tx.notice.upsert({
    where: { dedupHash },
    update: {
      complexId,
      announcementNo: `TEST-ANDROID-${seed.key.toUpperCase()}`,
      title: seed.title,
      sourceUrl: complex.sourceUrl,
      contentHash: stableHash(`${seed.key}:${parsedJson}`),
      isAdditionalRecruitment: seed.isAdditionalRecruitment,
      ...period,
      rawContent,
      parsedJson,
      lastCrawledAt: null,
      views: seed.views,
      interestedCount: seed.interestedCount,
    },
    create: {
      complexId,
      announcementNo: `TEST-ANDROID-${seed.key.toUpperCase()}`,
      title: seed.title,
      sourceUrl: complex.sourceUrl,
      dedupHash,
      contentHash: stableHash(`${seed.key}:${parsedJson}`),
      isAdditionalRecruitment: seed.isAdditionalRecruitment,
      ...period,
      rawContent,
      parsedJson,
      lastCrawledAt: null,
      views: seed.views,
      interestedCount: seed.interestedCount,
    },
  });

  // 각 Seed 공고는 자식 한 건씩을 유지한다. 기존 ID를 보존해 분석 데이터가 참조 중이어도
  // 반복 실행이 가능하도록 update하고, 예상 밖 중복이 있으면 임의 삭제 대신 중단한다.
  const [units, conditions, files] = await Promise.all([
    tx.noticeUnit.findMany({ where: { noticeId: notice.noticeId }, orderBy: { unitId: 'asc' } }),
    tx.noticeCondition.findMany({
      where: { noticeId: notice.noticeId },
      orderBy: { conditionId: 'asc' },
    }),
    tx.noticeFile.findMany({ where: { noticeId: notice.noticeId }, orderBy: { fileId: 'asc' } }),
  ]);

  if (units.length > 1 || conditions.length > 1 || files.length > 1) {
    throw new Error(
      `Seed 공고에 예상보다 많은 자식 데이터가 있습니다. 임의 삭제하지 않고 중단합니다: ${seed.key}`,
    );
  }

  if (units[0]) {
    await tx.noticeUnit.update({ where: { unitId: units[0].unitId }, data: seed.unit });
  } else {
    await tx.noticeUnit.create({ data: { noticeId: notice.noticeId, ...seed.unit } });
  }

  if (conditions[0]) {
    await tx.noticeCondition.update({
      where: { conditionId: conditions[0].conditionId },
      data: seed.condition,
    });
  } else {
    await tx.noticeCondition.create({
      data: { noticeId: notice.noticeId, ...seed.condition },
    });
  }

  const file = createFile(complex, now);
  if (files[0]) {
    await tx.noticeFile.update({ where: { fileId: files[0].fileId }, data: file });
  } else {
    await tx.noticeFile.create({ data: { noticeId: notice.noticeId, ...file } });
  }

  return { key: seed.key, noticeId: notice.noticeId, scenario: seed.scenario };
}

export async function runNoticeSeed(
  prisma: PrismaClient,
  now = new Date(),
  log: (message: string) => void = console.log,
): Promise<NoticeSeedResult> {
  const beforeCount = await prisma.notice.count({
    where: { dedupHash: { startsWith: NOTICE_SEED_PREFIX } },
  });
  log(`[notice-seed] 실행 전 Seed 공고 수: ${beforeCount}`);

  const result = await prisma.$transaction(
    async (tx) => {
      const complexes: NoticeSeedResult['complexes'] = [];
      const complexIds = new Map<string, bigint>();

      for (const complexSeed of COMPLEXES) {
        const complex = await upsertComplex(tx, complexSeed);
        complexes.push(complex);
        complexIds.set(complex.key, complex.complexId);
      }

      const notices: NoticeSeedResult['notices'] = [];
      for (const noticeSeed of NOTICES) {
        const complex = COMPLEXES.find((item) => item.key === noticeSeed.complexKey);
        const complexId = complexIds.get(noticeSeed.complexKey);
        if (!complex || !complexId) {
          throw new Error(`Seed 단지 연결을 찾을 수 없습니다: ${noticeSeed.complexKey}`);
        }

        notices.push(await upsertNotice(tx, noticeSeed, complex, complexId, now));
      }

      return { complexes, notices };
    },
    // Railway Public TCP Proxy에서는 여러 관계 데이터를 순차 upsert할 때 기본 5초를 넘을 수 있다.
    // Seed 전체의 원자성은 유지하되 원격 DB 왕복 시간을 고려해 충분한 제한을 둔다.
    { maxWait: 10_000, timeout: 60_000 },
  );

  const [noticeCount, unitCount, conditionCount, fileCount] = await Promise.all([
    prisma.notice.count({ where: { dedupHash: { startsWith: NOTICE_SEED_PREFIX } } }),
    prisma.noticeUnit.count({
      where: { notice: { dedupHash: { startsWith: NOTICE_SEED_PREFIX } } },
    }),
    prisma.noticeCondition.count({
      where: { notice: { dedupHash: { startsWith: NOTICE_SEED_PREFIX } } },
    }),
    prisma.noticeFile.count({
      where: { notice: { dedupHash: { startsWith: NOTICE_SEED_PREFIX } } },
    }),
  ]);

  log(
    `[notice-seed] 완료: 단지 ${result.complexes.length}, 공고 ${noticeCount}, 주택형 ${unitCount}, 조건 ${conditionCount}, 파일 ${fileCount}`,
  );
  for (const notice of result.notices) {
    log(`[notice-seed] ${notice.scenario.padEnd(12)} ${notice.key}`);
  }

  return result;
}

/**
 * 신규 상품을 만들지 않는다 — Railway의 기존 금융상품 4건(전부 주택도시기금)은 프론트 연동
 * 테스트가 matchedCount=4/0 기준으로 이미 의존 중이라, 상품을 새로 추가하면 그 기준이 깨진다
 * (리뷰 피드백 반영). 그래서 기존 상품을 (providerName, productName)으로 찾아 필드만 갱신하고,
 * 못 찾으면 새로 만들지 않고 에러를 낸다.
 *
 * 아래 값은 Notion `홈핏 1금융권 주거 금융상품 목록`("금융상품 (2)") 페이지 — 팀이 2026-08-03
 * 웹서치로 조사해 둔 원본 자료 — 에서 가져왔다. **주의**: 이 페이지 자체가 "확인자:
 * Claude(웹서치) → 사람 검토 필요"라고 명시하고 있고, minRate/maxRate/maxLimitAmount는
 * 지금 Railway에 실제로 들어있던 값(및 금융상품 매칭 조회 Notion 문서 예시)과 다르다 —
 * 이 스크립트를 실제로 돌리면 사용자에게 보이는 금리/한도가 바뀐다는 뜻이므로, Railway에
 * 적용하기 전에 팀 검토를 거칠 것.
 * 지역/가구유형별로 값이 갈리는 필드(maxLimitAmount, maxDepositAmount, loanRatioPercent 등)는
 * "일반가구/수도권" 기준 대표값 하나를 골랐다 — 실제로는 케이스별로 여러 값이 존재한다.
 * ltvRatio/dtiRatio는 전세대출 구조상 담보 개념이 없어 전부 N/A(null)로 둔다.
 * description은 원본 문서에 상품 설명 텍스트 자체가 없어 추측하지 않고 비워뒀다(미포함).
 */
type LoanProductFieldBackfill = {
  providerName: string;
  productName: string;
  providerType: LoanProviderType;
  productCategory: ProductCategory;
  minRate: number;
  maxRate: number;
  maxLimitAmount: bigint;
  minAge: number | null;
  maxAge: number | null;
  minIncome: bigint | null;
  maxIncome: bigint | null;
  minAsset: bigint | null;
  maxAsset: bigint | null;
  requireNoHouse: boolean | null;
  requireHouseholdHead: boolean | null;
  firstTimeBuyerOnly: boolean;
  incomeTaxDeductible: boolean;
  requireMarried: boolean | null;
  maxMarriageYears: number | null;
  requireRecentNewborn: boolean | null;
  newbornWithinYears: number | null;
  loanRatioPercent: number | null;
  loanTermMinYears: number | null;
  loanTermMaxYears: number | null;
  preferentialRateDiscount: number | null;
  maxDepositAmount: bigint | null;
  maxAreaM2: number | null;
  minMonthlyDeposit: bigint | null;
  maxMonthlyDeposit: bigint | null;
  officialUrl: string;
  // 실제 로고 이미지가 준비되기 전까지는 외부 이미지를 핫링크하지 않고 null로 유지한다.
  providerLogoUrl: string | null;
};

const LOAN_PRODUCT_FIELD_BACKFILLS: LoanProductFieldBackfill[] = [
  {
    providerName: '주택도시기금',
    productName: '청년전용 버팀목전세자금',
    providerType: LoanProviderType.POLICY,
    productCategory: ProductCategory.JEONSE_LOAN,
    minRate: 2.2,
    maxRate: 3.3,
    maxLimitAmount: 150_000_000n, // 일반. 만25세미만 단독세대주는 1.2억
    minAge: 19,
    maxAge: 34,
    minIncome: 0n,
    maxIncome: 50_000_000n, // 부부합산 일반. 다자녀·2자녀 6천만, 신혼가구 7,500만까지 완화
    minAsset: 0n,
    maxAsset: 345_000_000n,
    requireNoHouse: true,
    requireHouseholdHead: true,
    firstTimeBuyerOnly: false,
    incomeTaxDeductible: false,
    requireMarried: false,
    maxMarriageYears: null,
    requireRecentNewborn: false,
    newbornWithinYears: null,
    loanRatioPercent: 80,
    loanTermMinYears: 2,
    loanTermMaxYears: 10,
    preferentialRateDiscount: 0.5, // 기본 상한 대표값(기초수급 1.0%p 등 추가 우대는 별도)
    maxDepositAmount: 300_000_000n,
    maxAreaM2: 85,
    minMonthlyDeposit: null,
    maxMonthlyDeposit: null,
    officialUrl: 'https://nhuf.molit.go.kr/FP/FP05/FP0502/FP05020301.jsp',
    providerLogoUrl: null,
  },
  {
    providerName: '주택도시기금',
    productName: '신혼부부전용 전세자금',
    providerType: LoanProviderType.POLICY,
    productCategory: ProductCategory.JEONSE_LOAN,
    minRate: 1.9,
    maxRate: 3.3,
    maxLimitAmount: 250_000_000n, // 수도권. 수도권 외 1.6억
    minAge: null,
    maxAge: null,
    minIncome: 0n,
    maxIncome: 75_000_000n,
    minAsset: 0n,
    maxAsset: 337_000_000n, // 원본 문서에 "재확인 권장" 표기 있음
    requireNoHouse: true,
    requireHouseholdHead: true,
    firstTimeBuyerOnly: false,
    incomeTaxDeductible: false,
    requireMarried: true,
    maxMarriageYears: 7,
    requireRecentNewborn: false,
    newbornWithinYears: null,
    loanRatioPercent: 80,
    loanTermMinYears: 2,
    loanTermMaxYears: 10,
    preferentialRateDiscount: 0.5, // 기본 상한 대표값(다자녀 0.7%p는 별도)
    maxDepositAmount: 500_000_000n, // 수도권. 수도권 외 4억
    maxAreaM2: null, // 원본 문서도 "확인 안됨"
    minMonthlyDeposit: null,
    maxMonthlyDeposit: null,
    officialUrl: 'https://nhuf.molit.go.kr/FP/FP05/FP0502/FP05020401.jsp',
    providerLogoUrl: null,
  },
  {
    providerName: '주택도시기금',
    productName: '신생아 특례 버팀목전세자금',
    providerType: LoanProviderType.POLICY,
    productCategory: ProductCategory.JEONSE_LOAN,
    minRate: 1.3,
    maxRate: 4.3, // 특례금리 5년 적용 후 소득구간별 3.30~4.30%로 전환
    maxLimitAmount: 300_000_000n, // 2차(최신) 서칭 값. 1차 서칭 값은 2.4억 — 원본 문서도 "재확인 권장"
    minAge: null,
    maxAge: null,
    minIncome: 0n,
    maxIncome: 130_000_000n, // 개인기준 vs 부부합산기준 해석 차이 있음 — 원본 문서도 정책 판단 필요라고 표기
    minAsset: 0n,
    maxAsset: 488_000_000n,
    requireNoHouse: true,
    requireHouseholdHead: true,
    firstTimeBuyerOnly: false,
    incomeTaxDeductible: false,
    requireMarried: false,
    maxMarriageYears: null,
    requireRecentNewborn: true,
    newbornWithinYears: 2,
    loanRatioPercent: 80,
    loanTermMinYears: 2,
    loanTermMaxYears: 12,
    preferentialRateDiscount: null, // 원본 문서에 "기본 상한" 단일값이 없고 세부 우대 티어만 존재
    maxDepositAmount: 500_000_000n, // 수도권. 수도권 외 4억
    maxAreaM2: 85, // 읍면지역 100, 오피스텔 85 이하
    minMonthlyDeposit: null,
    maxMonthlyDeposit: null,
    officialUrl: 'https://nhuf.molit.go.kr/FP/FP05/FP0502/FP05021401.jsp',
    providerLogoUrl: null,
  },
  {
    providerName: '주택도시기금',
    productName: '일반 버팀목전세자금',
    providerType: LoanProviderType.POLICY,
    productCategory: ProductCategory.JEONSE_LOAN,
    minRate: 2.5,
    maxRate: 3.5,
    maxLimitAmount: 120_000_000n, // 일반가구·수도권. 수도권 외 8천만, 신혼·2자녀이상은 더 큼
    minAge: null,
    maxAge: null,
    minIncome: 0n,
    maxIncome: 50_000_000n, // 일반. 다자녀·2자녀 6천만, 신혼가구 7,500만
    minAsset: 0n,
    maxAsset: 345_000_000n,
    requireNoHouse: true,
    requireHouseholdHead: true,
    firstTimeBuyerOnly: false,
    incomeTaxDeductible: false,
    requireMarried: false,
    maxMarriageYears: null,
    requireRecentNewborn: false,
    newbornWithinYears: null,
    loanRatioPercent: 70, // 일반가구 신규. 신혼·2자녀이상은 80
    loanTermMinYears: 2,
    loanTermMaxYears: 10,
    preferentialRateDiscount: 0.5, // 기본 상한 대표값
    maxDepositAmount: 300_000_000n, // 일반가구·수도권. 수도권 외 2억, 신혼·다자녀는 더 큼
    maxAreaM2: 85, // 수도권. 비수도권 읍면 100, 오피스텔 85 이하
    minMonthlyDeposit: null,
    maxMonthlyDeposit: null,
    officialUrl: 'https://nhuf.molit.go.kr/FP/FP05/FP0502/FP05020101.jsp',
    providerLogoUrl: null,
  },
];

async function backfillLoanProductFields(
  tx: Prisma.TransactionClient,
  item: LoanProductFieldBackfill,
  log: (message: string) => void,
): Promise<void> {
  const existing = await tx.loanProduct.findMany({
    where: { providerName: item.providerName, productName: item.productName },
    select: { productId: true },
  });

  if (existing.length === 0) {
    throw new Error(
      `백필 대상 금융상품을 찾을 수 없습니다. 신규 생성은 하지 않으므로 상품명을 먼저 확인해주세요: ${item.providerName} / ${item.productName}`,
    );
  }
  if (existing.length > 1) {
    throw new Error(
      `백필 대상 금융상품이 중복 존재합니다. 먼저 정리해주세요: ${item.providerName} / ${item.productName}`,
    );
  }

  const data: Prisma.LoanProductUncheckedUpdateInput = {
    providerType: item.providerType,
    productCategory: item.productCategory,
    minRate: item.minRate,
    maxRate: item.maxRate,
    maxLimitAmount: item.maxLimitAmount,
    minAge: item.minAge,
    maxAge: item.maxAge,
    minIncome: item.minIncome,
    maxIncome: item.maxIncome,
    minAsset: item.minAsset,
    maxAsset: item.maxAsset,
    requireNoHouse: item.requireNoHouse,
    requireHouseholdHead: item.requireHouseholdHead,
    firstTimeBuyerOnly: item.firstTimeBuyerOnly,
    incomeTaxDeductible: item.incomeTaxDeductible,
    requireMarried: item.requireMarried,
    maxMarriageYears: item.maxMarriageYears,
    requireRecentNewborn: item.requireRecentNewborn,
    newbornWithinYears: item.newbornWithinYears,
    loanRatioPercent: item.loanRatioPercent,
    loanTermMinYears: item.loanTermMinYears,
    loanTermMaxYears: item.loanTermMaxYears,
    preferentialRateDiscount: item.preferentialRateDiscount,
    maxDepositAmount: item.maxDepositAmount,
    maxAreaM2: item.maxAreaM2,
    minMonthlyDeposit: item.minMonthlyDeposit,
    maxMonthlyDeposit: item.maxMonthlyDeposit,
    officialUrl: item.officialUrl,
  };

  // providerLogoUrl은 URL이 아직 없으면(null) 아예 건드리지 않는다 — 실행해도 Railway에
  // 이미 들어있을 수 있는 기존 값을 null로 덮어쓰지 않도록, data에서 빼버린다.
  if (item.providerLogoUrl !== null) {
    data.providerLogoUrl = item.providerLogoUrl;
  } else {
    log(
      `[loan-product-field-backfill] providerLogoUrl은 건너뜀(URL 미확보): ${item.providerName} / ${item.productName}`,
    );
  }

  await tx.loanProduct.update({ where: { productId: existing[0].productId }, data });
}

export async function runLoanProductSeed(
  prisma: PrismaClient,
  log: (message: string) => void = console.log,
): Promise<void> {
  await prisma.$transaction(
    async (tx) => {
      for (const item of LOAN_PRODUCT_FIELD_BACKFILLS) {
        await backfillLoanProductFields(tx, item, log);
      }
    },
    { maxWait: 10_000, timeout: 60_000 },
  );
  log(`[loan-product-field-backfill] 완료: ${LOAN_PRODUCT_FIELD_BACKFILLS.length}건 업데이트`);
}

function validateCliSafety(): void {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('NODE_ENV=production에서는 Seed 실행을 거부합니다.');
  }
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL이 설정되지 않았습니다. 대상 DB를 먼저 확인해주세요.');
  }
  if (process.env[NOTICE_SEED_OPT_IN_ENV] !== 'true' && process.env[LOAN_PRODUCT_SEED_OPT_IN_ENV] !== 'true') {
    throw new Error(
      `${NOTICE_SEED_OPT_IN_ENV}=true 또는 ${LOAN_PRODUCT_SEED_OPT_IN_ENV}=true 중 최소 하나는 명시해야 Seed를 실행할 수 있습니다.`,
    );
  }
}

function describeDatabaseTarget(databaseUrl: string): string {
  const parsed = new URL(databaseUrl);
  const port = parsed.port ? `:${parsed.port}` : '';
  return `${parsed.protocol}//${parsed.hostname}${port}${parsed.pathname}`;
}

async function main(): Promise<void> {
  validateCliSafety();
  const databaseUrl = process.env.DATABASE_URL as string;
  console.log(`[seed] 대상 DB: ${describeDatabaseTarget(databaseUrl)}`);

  const prisma = new PrismaClient();
  try {
    if (process.env[NOTICE_SEED_OPT_IN_ENV] === 'true') {
      await runNoticeSeed(prisma);
    }
    if (process.env[LOAN_PRODUCT_SEED_OPT_IN_ENV] === 'true') {
      await runLoanProductSeed(prisma);
    }
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  void main().catch((error: unknown) => {
    console.error('[seed] 실패', error);
    process.exitCode = 1;
  });
}
