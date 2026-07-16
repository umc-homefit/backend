import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

import { ApiSuccessResponse } from '../../common/decorators/api-success-response.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { ApiResponse, createSuccessResponse } from '../../common/types/api-response.type';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  AlertSettingsResultDto,
  DeleteDeviceTokenResultDto,
  GetNotificationsQueryDto,
  MarkNotificationReadResultDto,
  NotificationListResultDto,
  RegisterDeviceTokenRequestDto,
  RegisterDeviceTokenResultDto,
  UpdateAlertSettingsRequestDto,
  UpdateAlertSettingsResultDto,
} from './dto/notifications.dto';
import { NotificationsService } from './notifications.service';

/**
 * alert-settings, devices, notifications 전부 NotificationsService를 통해 실제 DB와 연동되어 있다.
 */
@ApiTags('Notification')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('users/me')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('devices')
  @ApiOperation({ summary: '디바이스 토큰 등록', description: 'FCM 푸시 발송용 디바이스 토큰을 등록/갱신한다.' })
  @ApiSuccessResponse(RegisterDeviceTokenResultDto, { description: '디바이스 토큰 등록 및 갱신 완료' })
  async registerDeviceToken(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: RegisterDeviceTokenRequestDto,
  ): Promise<ApiResponse<RegisterDeviceTokenResultDto>> {
    const result = await this.notificationsService.registerDeviceToken(user.userId, body);
    return createSuccessResponse(result, 'NOTI200', '디바이스 토큰 등록 성공');
  }

  @Delete('devices/:deviceId')
  @ApiOperation({ summary: '디바이스 토큰 삭제', description: '등록된 FCM 디바이스 토큰을 삭제한다.' })
  @ApiParam({ name: 'deviceId', type: Number, description: '삭제할 디바이스 고유 ID', example: 12 })
  @ApiSuccessResponse(DeleteDeviceTokenResultDto, { description: '디바이스 토큰 삭제 완료' })
  async deleteDeviceToken(
    @CurrentUser() user: CurrentUserPayload,
    @Param('deviceId', ParseIntPipe) deviceId: number,
  ): Promise<ApiResponse<DeleteDeviceTokenResultDto>> {
    const result = await this.notificationsService.deleteDeviceToken(user.userId, deviceId);
    return createSuccessResponse(result, 'NOTI200', '디바이스 토큰 삭제 성공');
  }

  @Get('alert-settings')
  @ApiOperation({ summary: '알림 설정 조회', description: '사용자 알림 설정을 조회한다 (1인 1설정).' })
  @ApiSuccessResponse(AlertSettingsResultDto, { description: '알림 설정 상태 조회 완료' })
  async getAlertSettings(
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<ApiResponse<AlertSettingsResultDto>> {
    const result = await this.notificationsService.getAlertSettings(user.userId);
    return createSuccessResponse(result, 'NOTI200', '알림 설정 조회 성공');
  }

  @Put('alert-settings')
  @ApiOperation({ summary: '알림 설정 수정', description: '알림 항목별 on/off 설정을 수정한다.' })
  @ApiSuccessResponse(UpdateAlertSettingsResultDto, { description: '알림 설정 수정 완료' })
  async updateAlertSettings(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: UpdateAlertSettingsRequestDto,
  ): Promise<ApiResponse<UpdateAlertSettingsResultDto>> {
    const result = await this.notificationsService.updateAlertSettings(user.userId, body);
    return createSuccessResponse(result, 'NOTI200', '알림 설정 수정 성공');
  }

  @Get('notifications')
  @ApiOperation({ summary: '알림 목록 조회', description: '수신된 알림 이력을 조회한다.' })
  @ApiSuccessResponse(NotificationListResultDto, { description: '알림 목록 조회 완료' })
  async getNotifications(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: GetNotificationsQueryDto,
  ): Promise<ApiResponse<NotificationListResultDto>> {
    const page = query.page ?? 0;
    const size = query.size ?? 20;
    const result = await this.notificationsService.getNotifications(user.userId, page, size);
    return createSuccessResponse(result, 'NOTI200', '알림 목록 조회 성공');
  }

  @Patch('notifications/:notificationId/read')
  @ApiOperation({ summary: '알림 읽음 처리', description: '수신된 알림을 읽음 상태로 변경한다.' })
  @ApiParam({ name: 'notificationId', type: Number, description: '읽음 처리할 알림 ID', example: 101 })
  @ApiSuccessResponse(MarkNotificationReadResultDto, { description: '알림 읽음 처리 완료' })
  async markNotificationRead(
    @CurrentUser() user: CurrentUserPayload,
    @Param('notificationId', ParseIntPipe) notificationId: number,
  ): Promise<ApiResponse<MarkNotificationReadResultDto>> {
    const result = await this.notificationsService.markNotificationRead(
      user.userId,
      notificationId,
    );
    return createSuccessResponse(result, 'NOTI200', '알림 읽음 처리 성공');
  }
}