import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

import { ApiSuccessResponse } from '../../common/decorators/api-success-response.decorator';
import { ApiResponse, createSuccessResponse } from '../../common/types/api-response.type';
import {
  AlertSettingsResultDto,
  DeleteDeviceTokenResultDto,
  GetNotificationsQueryDto,
  NotificationListResultDto,
  RegisterDeviceTokenRequestDto,
  RegisterDeviceTokenResultDto,
  UpdateAlertSettingsRequestDto,
  UpdateAlertSettingsResultDto,
} from './dto/notifications.dto';

/**
 * Service/DB 연동 전 단계: Notion 명세의 Example 응답을 그대로 반환하는 mock 구현이다.
 * README 기준 Notification은 별도 도메인으로 분리하지 않고 Auth/User(users) 아래에서 처리한다.
 */
@ApiTags('Notification')
@ApiBearerAuth('access-token')
@Controller('users/me')
export class NotificationsController {
  @Post('devices')
  @ApiOperation({ summary: '디바이스 토큰 등록', description: 'FCM 푸시 발송용 디바이스 토큰을 등록/갱신한다.' })
  @ApiSuccessResponse(RegisterDeviceTokenResultDto, { description: '디바이스 토큰 등록 및 갱신 완료' })
  registerDeviceToken(
    @Body() _body: RegisterDeviceTokenRequestDto,
  ): ApiResponse<RegisterDeviceTokenResultDto> {
    const result: RegisterDeviceTokenResultDto = {
      userId: 1001,
      deviceId: 12,
    };

    return createSuccessResponse(result, 'NOTI200', '디바이스 토큰 등록 성공');
  }

  @Delete('devices/:deviceId')
  @ApiOperation({ summary: '디바이스 토큰 삭제', description: '등록된 FCM 디바이스 토큰을 삭제한다.' })
  @ApiParam({ name: 'deviceId', type: Number, description: '삭제할 디바이스 고유 ID', example: 12 })
  @ApiSuccessResponse(DeleteDeviceTokenResultDto, { description: '디바이스 토큰 삭제 완료' })
  deleteDeviceToken(
    @Param('deviceId', ParseIntPipe) _deviceId: number,
  ): ApiResponse<DeleteDeviceTokenResultDto> {
    const result: DeleteDeviceTokenResultDto = {
      userId: 1001,
    };

    return createSuccessResponse(result, 'NOTI200', '디바이스 토큰 삭제 성공');
  }

  @Get('alert-settings')
  @ApiOperation({ summary: '알림 설정 조회', description: '사용자 알림 설정을 조회한다 (1인 1설정).' })
  @ApiSuccessResponse(AlertSettingsResultDto, { description: '알림 설정 상태 조회 완료' })
  getAlertSettings(): ApiResponse<AlertSettingsResultDto> {
    const result: AlertSettingsResultDto = {
      userId: 1001,
      isPushEnabled: true,
      isMarketingEnabled: false,
      createdAt: '2026-06-28T10:00:00Z',
      updatedAt: '2026-07-01T14:30:00Z',
    };

    return createSuccessResponse(result, 'NOTI200', '알림 설정 조회 성공');
  }

  @Put('alert-settings')
  @ApiOperation({ summary: '알림 설정 수정', description: '알림 항목별 on/off 설정을 수정한다.' })
  @ApiSuccessResponse(UpdateAlertSettingsResultDto, { description: '알림 설정 수정 완료' })
  updateAlertSettings(
    @Body() body: UpdateAlertSettingsRequestDto,
  ): ApiResponse<UpdateAlertSettingsResultDto> {
    const result: UpdateAlertSettingsResultDto = {
      userId: 1001,
      isPushEnabled: body.isPushEnabled,
      isMarketingEnabled: body.isMarketingEnabled,
      updatedAt: '2026-07-01T14:30:00Z',
    };

    return createSuccessResponse(result, 'NOTI200', '알림 설정 수정 성공');
  }

  @Get('notifications')
  @ApiOperation({ summary: '알림 목록 조회', description: '수신된 알림 이력을 조회한다.' })
  @ApiSuccessResponse(NotificationListResultDto, { description: '알림 목록 조회 완료' })
  getNotifications(
    @Query() _query: GetNotificationsQueryDto,
  ): ApiResponse<NotificationListResultDto> {
    const result: NotificationListResultDto = {
      notifications: [
        {
          notificationId: 101,
          type: 'NOTICE',
          title: '새로운 청약 공고가 등록되었습니다.',
          content: '강남구에 새로운 행복주택 공고가 올라왔어요. 지금 확인해보세요!',
          isRead: false,
          createdAt: '2026-07-01T10:00:00Z',
        },
        {
          notificationId: 100,
          type: 'EVENT',
          title: '홈핏 프로필 업데이트 안내',
          content: '프로필을 업데이트하고 더 정확한 매칭을 받아보세요.',
          isRead: true,
          createdAt: '2026-06-30T15:30:00Z',
        },
      ],
      currentPage: 0,
      totalPages: 5,
      totalElements: 95,
    };

    return createSuccessResponse(result, 'NOTI200', '알림 목록 조회 성공');
  }
}
