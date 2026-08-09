import { InternalServerErrorException } from '@nestjs/common';

import { NotificationType } from './dto/notifications.dto';
import { NotificationsRepository } from './notifications.repository';
import { NotificationsService } from './notifications.service';

describe('NotificationsService 알림 목록', () => {
  const findNotifications = jest.fn();
  const repository = { findNotifications } as unknown as NotificationsRepository;
  const service = new NotificationsService(repository);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([NotificationType.NEW_NOTICE, NotificationType.CLOSING_SOON])(
    '%s 알림 타입을 명세대로 반환한다',
    async (notificationType) => {
      findNotifications.mockResolvedValue({
        items: [createNotificationRecord(notificationType)],
        totalElements: 1,
      });

      const result = await service.getNotifications(1n, 0, 20);

      expect(result.notifications[0].type).toBe(notificationType);
      expect(result.pageInfo).toEqual({
        page: 0,
        size: 20,
        totalElements: 1,
        totalPages: 1,
        hasNext: false,
      });
    },
  );

  it('명세에 없는 알림 타입은 응답하지 않는다', async () => {
    findNotifications.mockResolvedValue({
      items: [createNotificationRecord('UNSUPPORTED_TYPE')],
      totalElements: 1,
    });

    await expect(service.getNotifications(1n, 0, 20)).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });
});

function createNotificationRecord(notificationType: string) {
  return {
    notificationLogId: 101n,
    userId: 1n,
    noticeId: null,
    notificationType,
    isRead: false,
    title: '알림 제목',
    body: '알림 내용',
    status: 'PENDING',
    sentAt: null,
    failureReason: null,
    createdAt: new Date('2026-07-01T10:00:00.000Z'),
  };
}
