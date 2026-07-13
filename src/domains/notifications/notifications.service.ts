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
    // 토큰 자체로 전역 조회: 같은 기기가 다른 계정 소유였을 수 있어서(로그아웃 후 재로그인 등)
    const existing = await this.notificationsRepository.findDeviceByToken(dto.deviceToken);

    let device;
    if (!existing) {
      device = await this.notificationsRepository.createDevice(userId, dto.deviceToken, dto.deviceType);
    } else if (existing.userId === userId) {
      device = await this.notificationsRepository.touchDevice(existing.deviceId, dto.deviceType);
    } else {
      // 다른 유저 소유였던 토큰 -> 현재 유저로 재할당 (이전 유저에게 알림이 새는 것 방지)
      device = await this.notificationsRepository.reassignDevice(
        existing.deviceId,
        userId,
        dto.deviceType,
      );
    }

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