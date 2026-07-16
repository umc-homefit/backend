import type { Prisma } from '@prisma/client';

import { NoticeStatus } from './dto/notices.dto';

export const NOTICE_CLOSING_SOON_THRESHOLD_MS = 72 * 60 * 60 * 1000;

export function calculateNoticeStatus(
  applicationStartAt: Date | null,
  applicationEndAt: Date | null,
  currentDateTime: Date,
): NoticeStatus {
  if (applicationEndAt && currentDateTime.getTime() >= applicationEndAt.getTime()) {
    return NoticeStatus.CLOSED;
  }

  if (applicationStartAt && currentDateTime.getTime() < applicationStartAt.getTime()) {
    return NoticeStatus.SCHEDULED;
  }

  if (
    applicationEndAt &&
    applicationEndAt.getTime() - currentDateTime.getTime() <= NOTICE_CLOSING_SOON_THRESHOLD_MS
  ) {
    return NoticeStatus.CLOSING_SOON;
  }

  return NoticeStatus.RECRUITING;
}

export function buildNoticeStatusWhere(
  status: NoticeStatus,
  currentDateTime: Date,
): Prisma.NoticeWhereInput {
  const closingSoonBoundary = new Date(
    currentDateTime.getTime() + NOTICE_CLOSING_SOON_THRESHOLD_MS,
  );

  switch (status) {
    case NoticeStatus.CLOSED:
      return { applicationEndAt: { lte: currentDateTime } };
    case NoticeStatus.SCHEDULED:
      return {
        AND: [
          { applicationStartAt: { gt: currentDateTime } },
          {
            OR: [{ applicationEndAt: null }, { applicationEndAt: { gt: currentDateTime } }],
          },
        ],
      };
    case NoticeStatus.CLOSING_SOON:
      return {
        AND: [
          {
            OR: [{ applicationStartAt: null }, { applicationStartAt: { lte: currentDateTime } }],
          },
          {
            applicationEndAt: {
              gt: currentDateTime,
              lte: closingSoonBoundary,
            },
          },
        ],
      };
    case NoticeStatus.RECRUITING:
    default:
      return {
        AND: [
          {
            OR: [{ applicationStartAt: null }, { applicationStartAt: { lte: currentDateTime } }],
          },
          {
            OR: [{ applicationEndAt: null }, { applicationEndAt: { gt: closingSoonBoundary } }],
          },
        ],
      };
  }
}
