import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export enum DeviceType {
  AOS = 'AOS',
  IOS = 'IOS',
}

export class RegisterDeviceTokenRequestDto {
  @ApiProperty({ description: '푸시 발송용 기기 고유 토큰', example: 'eX_sample_FCM_token_string...' })
  @IsString()
  deviceToken: string;

  @ApiProperty({ description: '기기 OS 타입', enum: DeviceType, example: DeviceType.AOS })
  @IsIn(Object.values(DeviceType))
  deviceType: DeviceType;
}

export class RegisterDeviceTokenResultDto {
  @ApiProperty({ description: '사용자 고유 식별자', example: 1001 })
  userId: number;

  @ApiProperty({ description: '발급/매핑된 디바이스 ID', example: 12 })
  deviceId: number;
}

export class DeleteDeviceTokenResultDto {
  @ApiProperty({ description: '사용자 고유 식별자', example: 1001 })
  userId: number;
}

export class AlertSettingsResultDto {
  @ApiProperty({ description: '사용자 고유 식별자', example: 1001 })
  userId: number;

  @ApiProperty({ description: '전체 푸시 알림 여부', example: true })
  pushEnabled: boolean;

  @ApiProperty({ description: '신규 공고 알림 여부', example: true })
  noticeAlertEnabled: boolean;

  @ApiProperty({ description: '청약 일정 알림 여부', example: true })
  scheduleAlertEnabled: boolean;

  @ApiProperty({ description: '금융상품 알림 여부', example: true })
  financeAlertEnabled: boolean;

  @ApiPropertyOptional({ description: '신규 공고 알림 대상 지역', example: '서울', nullable: true })
  interestedRegion: string | null;

  @ApiProperty({ description: '최초 설정 생성 일시', example: '2026-06-28T10:00:00Z' })
  createdAt: string;

  @ApiProperty({ description: '최종 설정 수정 일시', example: '2026-07-01T14:30:00Z' })
  updatedAt: string;
}

export class UpdateAlertSettingsRequestDto {
  @ApiProperty({ description: '전체 푸시 알림 여부', example: true })
  @IsBoolean()
  pushEnabled: boolean;

  @ApiProperty({ description: '신규 공고 알림 여부', example: true })
  @IsBoolean()
  noticeAlertEnabled: boolean;

  @ApiProperty({ description: '청약 일정 알림 여부', example: true })
  @IsBoolean()
  scheduleAlertEnabled: boolean;

  @ApiProperty({ description: '금융상품 알림 여부', example: true })
  @IsBoolean()
  financeAlertEnabled: boolean;

  @ApiPropertyOptional({ description: '신규 공고 알림 대상 지역', example: '서울', nullable: true })
  @IsOptional()
  @IsString()
  interestedRegion?: string | null;
}

export class UpdateAlertSettingsResultDto {
  @ApiProperty({ description: '사용자 고유 식별자', example: 1001 })
  userId: number;

  @ApiProperty({ description: '변경된 전체 푸시 알림 상태', example: true })
  pushEnabled: boolean;

  @ApiProperty({ description: '변경된 신규 공고 알림 상태', example: true })
  noticeAlertEnabled: boolean;

  @ApiProperty({ description: '변경된 청약 일정 알림 상태', example: true })
  scheduleAlertEnabled: boolean;

  @ApiProperty({ description: '변경된 금융상품 알림 상태', example: true })
  financeAlertEnabled: boolean;

  @ApiPropertyOptional({ description: '변경된 신규 공고 알림 대상 지역', example: '서울', nullable: true })
  interestedRegion: string | null;

  @ApiProperty({ description: '최초 설정 생성 일시', example: '2026-06-28T10:00:00Z' })
  createdAt: string;

  @ApiProperty({ description: '최종 수정 일시', example: '2026-07-01T14:30:00Z' })
  updatedAt: string;
}

export class GetNotificationsQueryDto {
  @ApiPropertyOptional({ description: '요청할 페이지 번호', default: 0, example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  page?: number = 0;

  @ApiPropertyOptional({ description: '한 페이지당 알림 개수', default: 20, example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  size?: number = 20;
}

export class NotificationItemDto {
  @ApiProperty({ description: '알림 고유 ID', example: 101 })
  notificationId: number;

  @ApiProperty({ description: '알림 타입 (NEW_NOTICE, CLOSING_SOON 등)', example: 'NEW_NOTICE' })
  type: string;

  @ApiProperty({ description: '알림 제목', example: '새로운 청약 공고가 등록되었습니다.' })
  title: string;

  @ApiProperty({ description: '알림 내용', example: '강남구에 새로운 행복주택 공고가 올라왔어요.' })
  content: string;

  @ApiProperty({ description: '읽음 여부', example: false })
  isRead: boolean;

  @ApiProperty({ description: '알림 생성 일시', example: '2026-07-01T10:00:00Z' })
  createdAt: string;
}

export class MarkNotificationReadResultDto {
  @ApiProperty({ description: '읽음 처리된 알림 ID', example: 101 })
  notificationId: number;

  @ApiProperty({ description: '읽음 여부', example: true })
  isRead: boolean;
}

export class NotificationListResultDto {
  @ApiProperty({ description: '알림 목록', type: [NotificationItemDto] })
  notifications: NotificationItemDto[];

  @ApiProperty({ description: '현재 페이지 번호', example: 0 })
  currentPage: number;

  @ApiProperty({ description: '전체 페이지 수', example: 5 })
  totalPages: number;

  @ApiProperty({ description: '전체 알림 개수', example: 95 })
  totalElements: number;
}
