import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';

import { ApiSuccessResponse } from '../../common/decorators/api-success-response.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { ApiResponse, createSuccessResponse } from '../../common/types/api-response.type';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  GetSavedNoticesQueryDto,
  SavedNoticeListResultDto,
  SaveNoticeResultDto,
  UnsaveNoticeResultDto,
} from './dto/notices.dto';
import { NoticesService } from './notices.service';

@ApiTags('Notice')
@Controller('users/me/saved-notices')
export class SavedNoticesController {
  constructor(private readonly noticesService: NoticesService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: '저장 공고 목록 조회',
    description: '로그인 사용자가 저장한 공고 목록을 최신 저장순 또는 저장 수순으로 조회한다.',
  })
  @ApiSuccessResponse(SavedNoticeListResultDto, { description: '저장 공고 목록 조회 성공' })
  async getSavedNotices(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: GetSavedNoticesQueryDto,
  ): Promise<ApiResponse<SavedNoticeListResultDto>> {
    const result = await this.noticesService.getSavedNotices(user.userId, query);

    return createSuccessResponse(result, 'NOTICE200', '저장 공고 목록 조회에 성공했습니다.');
  }

  @Post(':noticeId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: '공고 저장',
    description: '공고를 저장(찜)한다. 이미 저장된 공고를 다시 저장하면 멱등하게 200을 반환한다.',
  })
  @ApiParam({ name: 'noticeId', type: Number, description: '저장할 공고 ID', example: 1 })
  @ApiSuccessResponse(SaveNoticeResultDto, { status: 200, description: '이미 저장된 공고' })
  @ApiSuccessResponse(SaveNoticeResultDto, { status: 201, description: '공고 저장 성공' })
  async saveNotice(
    @CurrentUser() user: CurrentUserPayload,
    @Param('noticeId', ParseIntPipe) noticeId: number,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiResponse<SaveNoticeResultDto>> {
    const { result, created } = await this.noticesService.saveNotice(user.userId, noticeId);

    response.status(created ? HttpStatus.CREATED : HttpStatus.OK);

    return createSuccessResponse(
      result,
      created ? 'NOTICE201' : 'NOTICE200',
      created ? '공고 저장에 성공했습니다.' : '이미 저장된 공고입니다.',
    );
  }

  @Delete(':noticeId')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: '공고 저장 해제',
    description:
      '공고 저장을 해제한다. 이미 해제된 상태여도 공고가 존재하면 멱등하게 200을 반환한다.',
  })
  @ApiParam({ name: 'noticeId', type: Number, description: '저장 해제할 공고 ID', example: 1 })
  @ApiSuccessResponse(UnsaveNoticeResultDto, { description: '공고 저장 해제 성공' })
  async unsaveNotice(
    @CurrentUser() user: CurrentUserPayload,
    @Param('noticeId', ParseIntPipe) noticeId: number,
  ): Promise<ApiResponse<UnsaveNoticeResultDto>> {
    const result = await this.noticesService.unsaveNotice(user.userId, noticeId);

    return createSuccessResponse(result, 'NOTICE200', '공고 저장 해제에 성공했습니다.');
  }
}
