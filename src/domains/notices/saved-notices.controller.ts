import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ApiSuccessResponse } from '../../common/decorators/api-success-response.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { ApiResponse, createSuccessResponse } from '../../common/types/api-response.type';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetSavedNoticesQueryDto, SavedNoticeListResultDto } from './dto/notices.dto';
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
}
