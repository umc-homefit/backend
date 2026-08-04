import { PrismaService } from '../../prisma/prisma.service';
import { NoticesService } from './notices.service';

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
