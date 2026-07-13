import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { UpdateAlertSettingsRequestDto } from './dto/notifications.dto';

@Injectable()
export class NotificationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // --- Alert Settings ---

  async findOrCreateAlertSettings(userId: bigint) {
    const existing = await this.prisma.alertSetting.findUnique({ where: { userId } });
    if (existing) {
      return existing;
    }
    // 1인 1설정 개념이라, 아직 생성 안 된 유저는 기본값으로 최초 생성해서 반환한다.
    return this.prisma.alertSetting.create({ data: { userId } });
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

  async findDeviceByUserAndToken(userId: bigint, fcmToken: string) {
    return this.prisma.userDevice.findFirst({ where: { userId, fcmToken } });
  }

  async createDevice(userId: bigint, fcmToken: string, deviceType: string) {
    return this.prisma.userDevice.create({ data: { userId, fcmToken, deviceType } });
  }

  async touchDevice(deviceId: bigint, deviceType: string) {
    return this.prisma.userDevice.update({ where: { deviceId }, data: { deviceType } });
  }

  async findDeviceByIdAndUser(deviceId: bigint, userId: bigint) {
    return this.prisma.userDevice.findFirst({ where: { deviceId, userId } });
  }

  async deleteDevice(deviceId: bigint) {
    return this.prisma.userDevice.delete({ where: { deviceId } });
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