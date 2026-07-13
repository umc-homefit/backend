import { Injectable, NotFoundException } from '@nestjs/common';

import {
  AlertSettingsResultDto,
  DeleteDeviceTokenResultDto,
  MarkNotificationReadResultDto,
  NotificationListResultDto,
  RegisterDeviceTokenRequestDto,
  RegisterDeviceTokenResultDto,
  UpdateAlertSettingsRequestDto,
  UpdateAlertSettingsResultDto,
} from './dto/notifications.dto';
import { NotificationsRepository } from './notifications.repository';

@Injectable()
export class NotificationsService {
  constructor(private readonly notificationsRepository: NotificationsRepository) {}

  // --- Devices ---

  async registerDeviceToken(
    userId: bigint,
    dto: RegisterDeviceTokenRequestDto,
  ): Promise<RegisterDeviceTokenResultDto> {
    const existing = await this.notificationsRepository.findDeviceByUserAndToken(
      userId,
      dto.deviceToken,
    );

    const device = existing
      ? await this.notificationsRepository.touchDevice(existing.deviceId, dto.deviceType)
      : await this.notificationsRepository.createDevice(userId, dto.deviceToken, dto.deviceType);

    return {
      userId: Number(userId),
      deviceId: Number(device.deviceId),
    };
  }

  async deleteDeviceToken(userId: bigint, deviceId: number): Promise<DeleteDeviceTokenResultDto> {
    const device = await this.notificationsRepository.findDeviceByIdAndUser(
      BigInt(deviceId),
      userId,
    );
    if (!device) {
      throw new NotFoundException('존재하지 않는 디바이스입니다.');
    }

    await this.notificationsRepository.deleteDevice(BigInt(deviceId));

    return { userId: Number(userId) };
  }

  // --- Alert Settings ---

  async getAlertSettings(userId: bigint): Promise<AlertSettingsResultDto> {
    const settings = await this.notificationsRepository.findOrCreateAlertSettings(userId);
    return this.toAlertSettingsDto(settings);
  }

  async updateAlertSettings(
    userId: bigint,
    dto: UpdateAlertSettingsRequestDto,
  ): Promise<UpdateAlertSettingsResultDto> {
    const settings = await this.notificationsRepository.upsertAlertSettings(userId, dto);
    return this.toAlertSettingsDto(settings);
  }

  private toAlertSettingsDto(settings: {
    userId: bigint;
    pushEnabled: boolean;
    noticeAlertEnabled: boolean;
    scheduleAlertEnabled: boolean;
    financeAlertEnabled: boolean;
    interestedRegion: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): AlertSettingsResultDto {
    return {
      userId: Number(settings.userId),
      pushEnabled: settings.pushEnabled,
      noticeAlertEnabled: settings.noticeAlertEnabled,
      scheduleAlertEnabled: settings.scheduleAlertEnabled,
      financeAlertEnabled: settings.financeAlertEnabled,
      interestedRegion: settings.interestedRegion,
      createdAt: settings.createdAt.toISOString(),
      updatedAt: settings.updatedAt.toISOString(),
    };
  }

  // --- Notifications ---

  async getNotifications(
    userId: bigint,
    page: number,
    size: number,
  ): Promise<NotificationListResultDto> {
    const { items, totalElements } = await this.notificationsRepository.findNotifications(
      userId,
      page,
      size,
    );
    const totalPages = Math.ceil(totalElements / size);

    return {
      notifications: items.map((item) => ({
        notificationId: Number(item.notificationLogId),
        type: item.notificationType,
        title: item.title,
        content: item.body ?? '',
        isRead: item.isRead,
        createdAt: item.createdAt.toISOString(),
      })),
      pageInfo: {
        page,
        size,
        totalElements,
        totalPages,
        hasNext: (page + 1) * size < totalElements,
      },
    };
  }

  async markNotificationRead(
    userId: bigint,
    notificationId: number,
  ): Promise<MarkNotificationReadResultDto> {
    const notification = await this.notificationsRepository.findNotificationByIdAndUser(
      BigInt(notificationId),
      userId,
    );
    if (!notification) {
      throw new NotFoundException('존재하지 않는 알림입니다.');
    }

    const updated = await this.notificationsRepository.markAsRead(BigInt(notificationId));

    return {
      notificationId: Number(updated.notificationLogId),
      isRead: updated.isRead,
    };
  }
}