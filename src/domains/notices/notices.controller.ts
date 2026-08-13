import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

import { ApiErrorResponse } from '../../common/decorators/api-error-response.decorator';
import { ApiSuccessResponse } from '../../common/decorators/api-success-response.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { ApiResponse, createSuccessResponse } from '../../common/types/api-response.type';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  GetNoticesQueryDto,
  NoticeDetailResultDto,
  NoticeFilesResultDto,
  NoticeListResultDto,
  NoticeUnitsResultDto,
} from './dto/notices.dto';
import { NoticesService } from './notices.service';

@ApiTags('Notice')
@Controller('notices')
export class NoticesController {
  constructor(private readonly noticesService: NoticesService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: '공고 목록 조회',
    description: '필터, 정렬, 페이징 조건에 맞춰 공고 목록을 조회한다.',
  })
  @ApiSuccessResponse(NoticeListResultDto, { description: '공고 목록 조회 성공' })
  async getNotices(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: GetNoticesQueryDto,
  ): Promise<ApiResponse<NoticeListResultDto>> {
    const result = await this.noticesService.getNotices(user.userId, query);

    return createSuccessResponse(result, 'NOTICE200', '공고 목록 조회에 성공했습니다.');
  }

  @Get(':noticeId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: '공고 상세 조회',
    description: '특정 공고의 상세 정보, 주택형, 자격 조건, 신청 기간, 첨부파일 정보를 조회한다.',
  })
  @ApiParam({ name: 'noticeId', type: Number, description: '조회할 공고 ID', example: 1 })
  @ApiSuccessResponse(NoticeDetailResultDto, { description: '공고 상세 조회 성공' })
  async getNoticeDetail(
    @CurrentUser() user: CurrentUserPayload,
    @Param('noticeId', ParseIntPipe) noticeId: number,
  ): Promise<ApiResponse<NoticeDetailResultDto>> {
    const result = await this.noticesService.getNoticeDetail(user.userId, noticeId);

    return createSuccessResponse(result, 'NOTICE200', '공고 상세 조회에 성공했습니다.');
  }

  @Get(':noticeId/units')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: '공고 주택형 조회',
    description: '특정 공고에 포함된 주택형, 면적, 보증금, 월세, 공급 세대 수 정보를 조회한다.',
  })
  @ApiParam({ name: 'noticeId', type: Number, description: '조회할 공고 ID', example: 1 })
  @ApiSuccessResponse(NoticeUnitsResultDto, { description: '공고 주택형 조회 성공' })
  @ApiErrorResponse([
    { status: 400, code: 'COMMON400', message: 'noticeId는 숫자여야 합니다.' },
    { status: 401, code: 'AUTH401', message: '인증이 필요합니다. 로그인 후 다시 시도해주세요.' },
    { status: 404, code: 'COMMON404', message: '존재하지 않는 공고입니다.' },
  ])
  async getNoticeUnits(
    @Param('noticeId', ParseIntPipe) noticeId: number,
  ): Promise<ApiResponse<NoticeUnitsResultDto>> {
    const result = await this.noticesService.getNoticeUnits(noticeId);

    return createSuccessResponse(result, 'NOTICE200', '공고 주택형 조회에 성공했습니다.');
  }

  @Get(':noticeId/files')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: '공고 첨부파일 목록 조회',
    description: '공고에 첨부된 원문 파일/링크 목록을 조회한다.',
  })
  @ApiParam({ name: 'noticeId', type: Number, description: '조회할 공고 ID', example: 1 })
  @ApiSuccessResponse(NoticeFilesResultDto, { description: '공고 첨부파일 목록 조회 성공' })
  @ApiErrorResponse([
    { status: 400, code: 'COMMON400', message: 'noticeId는 숫자여야 합니다.' },
    { status: 401, code: 'AUTH401', message: '인증이 필요합니다. 로그인 후 다시 시도해주세요.' },
    { status: 404, code: 'COMMON404', message: '존재하지 않는 공고입니다.' },
  ])
  async getNoticeFiles(
    @Param('noticeId', ParseIntPipe) noticeId: number,
  ): Promise<ApiResponse<NoticeFilesResultDto>> {
    const result = await this.noticesService.getNoticeFiles(noticeId);

    return createSuccessResponse(result, 'NOTICE200', '공고 첨부파일 목록 조회에 성공했습니다.');
  }
}
