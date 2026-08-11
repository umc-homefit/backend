import { PrismaService } from '../../prisma/prisma.service';
import { NoticesService } from './notices.service';

describe('NoticesService 공고 목록', () => {
  const noticeCount = jest.fn();
  const findNotices = jest.fn();
  const transaction = jest.fn();
  const prisma = {
    notice: {
      count: noticeCount,
      findMany: findNotices,
    },
    $transaction: transaction,
  } as unknown as PrismaService;
  const service = new NoticesService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    ['공고번호가 있으면 문자열을', '2026-03호'],
    ['공고번호가 없으면 null을', null],
  ])('%s 반환한다', async (_description, announcementNo) => {
    transaction.mockResolvedValue([1, [createNoticeListRecord(announcementNo)]]);

    const result = await service.getNotices(1n, {});

    expect(result.notices[0].announcementNo).toBe(announcementNo);
  });
});

describe('NoticesService 저장 공고 목록', () => {
  const savedNoticeCount = jest.fn();
  const findSavedNotices = jest.fn();
  const transaction = jest.fn();
  const prisma = {
    savedNotice: {
      count: savedNoticeCount,
      findMany: findSavedNotices,
    },
    $transaction: transaction,
  } as unknown as PrismaService;
  const service = new NoticesService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('공고번호·면적 요약·보증금 범위·접수 시작일을 반환한다', async () => {
    const applicationStartAt = new Date('2026-07-01T10:00:00.000Z');
    const applicationEndAt = new Date('2026-07-10T18:00:00.000Z');
    transaction.mockResolvedValue([
      1,
      [
        createSavedNoticeRecord({
          applicationStartAt,
          applicationEndAt,
          units: [
            {
              unitId: 1n,
              exclusiveAreaM2: 24,
              depositMin: 32000000n,
              depositMax: 48000000n,
            },
            {
              unitId: 2n,
              exclusiveAreaM2: 59,
              depositMin: 50000000n,
              depositMax: 100000000n,
            },
          ],
        }),
      ],
    ]);

    const result = await service.getSavedNotices(1n, {});

    expect(findSavedNotices).toHaveBeenCalledWith(
      expect.objectContaining({
        include: {
          notice: {
            include: expect.objectContaining({
              units: { orderBy: { unitId: 'asc' } },
            }),
          },
        },
      }),
    );
    expect(result.savedNotices[0]).toMatchObject({
      announcementNo: '2026-03호',
      unitSummary: '전용 24㎡',
      depositMin: 32000000,
      depositMax: 100000000,
      applicationStartAt: '2026-07-01T10:00:00+09:00',
      applicationEndAt: '2026-07-10T18:00:00+09:00',
    });
    expect(result.savedNotices[0]).not.toHaveProperty('competitionRate');
  });

  it('공고번호·주택형·보증금·접수 기간 원본이 없으면 null을 반환한다', async () => {
    transaction.mockResolvedValue([
      1,
      [
        createSavedNoticeRecord({
          announcementNo: null,
          applicationStartAt: null,
          applicationEndAt: null,
          units: [],
        }),
      ],
    ]);

    const result = await service.getSavedNotices(1n, {});

    expect(result.savedNotices[0]).toMatchObject({
      announcementNo: null,
      unitSummary: null,
      depositMin: null,
      depositMax: null,
      applicationStartAt: null,
      applicationEndAt: null,
    });
  });
});

describe('NoticesService 공고 주택형·첨부파일 조회', () => {
  const findNotice = jest.fn();
  const prisma = {
    notice: {
      findUnique: findNotice,
    },
  } as unknown as PrismaService;
  const service = new NoticesService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('주택형을 unitId 오름차순으로 조회하고 API DTO로 변환한다', async () => {
    findNotice.mockResolvedValue({
      units: [
        {
          unitId: 10n,
          noticeId: 7n,
          unitName: '24A',
          exclusiveAreaM2: 24,
          supplyAreaM2: 36,
          depositMin: 32000000n,
          depositMax: 48000000n,
          monthlyRentMin: 280000n,
          monthlyRentMax: 410000n,
          supplyCount: 18,
          createdAt: new Date('2026-06-29T01:00:00.000Z'),
          updatedAt: new Date('2026-06-29T01:00:00.000Z'),
        },
      ],
    });

    const result = await service.getNoticeUnits(7);

    expect(findNotice).toHaveBeenCalledWith({
      where: { noticeId: 7n },
      select: { units: { orderBy: { unitId: 'asc' } } },
    });
    expect(result.units).toEqual([
      {
        unitId: 10,
        unitName: '24A',
        exclusiveAreaM2: 24,
        supplyAreaM2: 36,
        depositMin: 32000000,
        depositMax: 48000000,
        monthlyRentMin: 280000,
        monthlyRentMax: 410000,
        supplyCount: 18,
      },
    ]);
  });

  it('첨부파일을 fileId 오름차순으로 조회하고 날짜를 ISO 8601로 변환한다', async () => {
    findNotice.mockResolvedValue({
      files: [
        {
          fileId: 20n,
          noticeId: 7n,
          fileName: '공고문.pdf',
          fileType: 'PDF',
          fileUrl: 'https://example.com/files/notice.pdf',
          registeredAt: new Date('2026-06-29T10:00:00.000Z'),
          createdAt: new Date('2026-06-29T10:00:00.000Z'),
        },
      ],
    });

    const result = await service.getNoticeFiles(7);

    expect(findNotice).toHaveBeenCalledWith({
      where: { noticeId: 7n },
      select: { files: { orderBy: { fileId: 'asc' } } },
    });
    expect(result.files).toEqual([
      {
        fileId: 20,
        fileName: '공고문.pdf',
        fileType: 'PDF',
        fileUrl: 'https://example.com/files/notice.pdf',
        registeredAt: '2026-06-29T10:00:00+09:00',
      },
    ]);
  });

  it.each([
    ['주택형', () => service.getNoticeUnits(999)],
    ['첨부파일', () => service.getNoticeFiles(999)],
  ])('공고가 없으면 %s 조회를 COMMON404 대상으로 처리한다', async (_label, call) => {
    findNotice.mockResolvedValue(null);

    await expect(call()).rejects.toThrow('존재하지 않는 공고입니다.');
  });
});

function createNoticeListRecord(announcementNo: string | null) {
  const createdAt = new Date('2026-07-01T00:00:00.000Z');

  return {
    noticeId: 1n,
    complexId: 1n,
    announcementNo,
    title: '강동구 청년안심주택 추가모집',
    sourceUrl: 'https://example.com/notices/1',
    dedupHash: 'notice-list-test',
    contentHash: null,
    isAdditionalRecruitment: true,
    applicationStartAt: null,
    applicationEndAt: null,
    rawContent: null,
    parsedJson: null,
    lastCrawledAt: null,
    views: 120,
    interestedCount: 32,
    createdAt,
    updatedAt: createdAt,
    complex: {
      complexId: 1n,
      name: '강동구 청년안심주택',
      region: '서울',
      district: '강동구',
      address: '서울특별시 강동구',
      sourceUrl: 'https://example.com/complexes/1',
      isActive: true,
      crawlEnabled: true,
      createdAt,
      updatedAt: createdAt,
    },
    units: [],
    savedNotices: [],
    _count: {
      savedNotices: 32,
    },
  };
}

function createSavedNoticeRecord(overrides: {
  announcementNo?: string | null;
  applicationStartAt: Date | null;
  applicationEndAt: Date | null;
  units: Array<{
    unitId: bigint;
    exclusiveAreaM2: number | null;
    depositMin: bigint | null;
    depositMax: bigint | null;
  }>;
}) {
  return {
    savedNoticeId: 100n,
    userId: 1n,
    noticeId: 1n,
    createdAt: new Date('2026-06-30T10:00:00.000Z'),
    notice: {
      announcementNo:
        overrides.announcementNo === undefined ? '2026-03호' : overrides.announcementNo,
      title: '강동구 청년안심주택 추가모집',
      isAdditionalRecruitment: true,
      applicationStartAt: overrides.applicationStartAt,
      applicationEndAt: overrides.applicationEndAt,
      complex: {
        region: '서울',
        district: '강동구',
      },
      units: overrides.units,
      _count: {
        savedNotices: 32,
      },
    },
  };
}
