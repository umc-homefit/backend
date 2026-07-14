import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { UpdateAlertSettingsRequestDto } from './dto/notifications.dto';

@Injectable()
export class NotificationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // --- Alert Settings ---

  // findFirst -> create 방식은 동시 요청 시 userId UNIQUE 위반이 날 수 있어 upsert로 원자화한다.
  // update: {}는 이미 있으면 아무 것도 안 바꾸고 그대로 반환하겠다는 의미.
  async findOrCreateAlertSettings(userId: bigint) {
    return this.prisma.alertSetting.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
  }

  async upsertAlertSettings(userId: bigint, dto: UpdateAlertSettingsRequestDto) {
    const data = {
      pushEnabled: dto.pushEnabled,
      noticeAlertEnabled: dto.noticeAlertEnabled,
      scheduleAlertEnabled: dto.scheduleAlertEnabled,
      financeAlertEnabled: dto.financeAlertEnabled,
      interestedRegion: dto.interestedRegion ?? null,
    };

    return this.prisma.alertSetting.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });
  }

  // --- Devices ---

  // fcmToken이 schema.prisma에서 @unique로 지정되어 있어야 동작한다.
  // upsert는 DB 레벨에서 원자적으로 처리되므로, 동시에 같은 토큰으로 여러 요청이 와도
  // findFirst 후 create/update로 나눠 처리할 때 생기는 레이스 컨디션이 없다.
  // 다른 유저 소유였던 토큰이어도 update 절이 userId를 덮어써서 자동으로 재할당된다.
  async upsertDeviceByToken(userId: bigint, fcmToken: string, deviceType: string) {
    return this.prisma.userDevice.upsert({
      where: { fcmToken },
      update: { userId, deviceType },
      create: { userId, fcmToken, deviceType },
    });
  }

  // 조회 후 삭제(findFirst -> delete)는 그 사이에 토큰이 다른 유저로 재할당되면
  // 엉뚱한 소유자의 디바이스를 지울 수 있는 TOCTOU 레이스가 있다.
  // deviceId + userId 조건을 delete 쿼리 자체에 걸어 원자적으로 처리한다.
  // count === 0이면 존재하지 않거나 본인 소유가 아니라는 뜻으로 취급한다.
  async deleteDeviceByIdAndUser(deviceId: bigint, userId: bigint): Promise<number> {
    const result = await this.prisma.userDevice.deleteMany({ where: { deviceId, userId } });
    return result.count;
  }

  // --- Notifications ---

  async findNotifications(userId: bigint, page: number, size: number) {
    const where = { userId };

    const [items, totalElements] = await this.prisma.$transaction([
      this.prisma.notificationLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: page * size,
        take: size,
      }),
      this.prisma.notificationLog.count({ where }),
    ]);

    return { items, totalElements };
  }

  async findNotificationByIdAndUser(notificationId: bigint, userId: bigint) {
    return this.prisma.notificationLog.findFirst({
      where: { notificationLogId: notificationId, userId },
    });
  }

  async markAsRead(notificationId: bigint) {
    return this.prisma.notificationLog.update({
      where: { notificationLogId: notificationId },
      data: { isRead: true },
    });
  }
}