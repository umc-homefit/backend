import { createHash } from 'node:crypto';

import { NoticeConditionTargetType, NoticeFileType, Prisma, PrismaClient } from '@prisma/client';

export const NOTICE_SEED_OPT_IN_ENV = 'HOMEFIT_NOTICE_SEED';
export const NOTICE_SEED_PREFIX = 'homefit-test:notice-seed:v1:';

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

  const result = await prisma.$transaction(async (tx) => {
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
  });

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

function validateCliSafety(): void {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('NODE_ENV=production에서는 Notice Seed 실행을 거부합니다.');
  }
  if (process.env[NOTICE_SEED_OPT_IN_ENV] !== 'true') {
    throw new Error(`${NOTICE_SEED_OPT_IN_ENV}=true를 명시해야 Notice Seed를 실행할 수 있습니다.`);
  }
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL이 설정되지 않았습니다. 대상 DB를 먼저 확인해주세요.');
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
  console.log(`[notice-seed] 대상 DB: ${describeDatabaseTarget(databaseUrl)}`);

  const prisma = new PrismaClient();
  try {
    await runNoticeSeed(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  void main().catch((error: unknown) => {
    console.error('[notice-seed] 실패', error);
    process.exitCode = 1;
  });
}
