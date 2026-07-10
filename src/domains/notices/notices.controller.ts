import {
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

import { ApiSuccessResponse } from '../../common/decorators/api-success-response.decorator';
import { ApiResponse, createSuccessResponse } from '../../common/types/api-response.type';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  GetNoticesQueryDto,
  NoticeDetailResultDto,
  NoticeFilesResultDto,
  NoticeFileType,
  NoticeListResultDto,
  NoticeUnitsResultDto,
  SaveNoticeResultDto,
  UnsaveNoticeResultDto,
} from './dto/notices.dto';
import { NoticesService } from './notices.service';

@ApiTags('Notice')
@Controller('notices')
export class NoticesController {
  constructor(private readonly noticesService: NoticesService) {}

  @Get()
  @ApiOperation({
    summary: '공고 목록 조회',
    description: '필터, 정렬, 페이징 조건에 맞춰 공고 목록을 조회한다.',
  })
  @ApiSuccessResponse(NoticeListResultDto, { description: '공고 목록 조회 성공' })
  async getNotices(@Query() query: GetNoticesQueryDto): Promise<ApiResponse<NoticeListResultDto>> {
    const result = await this.noticesService.getNotices(query);

    return createSuccessResponse(result, 'NOTICE200', '공고 목록 조회에 성공했습니다.');
  }

  @Get(':noticeId')
  @ApiOperation({
    summary: '공고 상세 조회',
    description: '특정 공고의 상세 정보, 주택형, 자격 조건, 신청 기간, 첨부파일 정보를 조회한다.',
  })
  @ApiParam({ name: 'noticeId', type: Number, description: '조회할 공고 ID', example: 1 })
  @ApiSuccessResponse(NoticeDetailResultDto, { description: '공고 상세 조회 성공' })
  async getNoticeDetail(
    @Param('noticeId', ParseIntPipe) noticeId: number,
  ): Promise<ApiResponse<NoticeDetailResultDto>> {
    const result = await this.noticesService.getNoticeDetail(noticeId);

    return createSuccessResponse(result, 'NOTICE200', '공고 상세 조회에 성공했습니다.');
  }

  @Get(':noticeId/units')
  @ApiOperation({
    summary: '공고 주택형 조회',
    description: '특정 공고에 포함된 주택형, 면적, 보증금, 월세, 공급 세대 수 정보를 조회한다.',
  })
  @ApiParam({ name: 'noticeId', type: Number, description: '조회할 공고 ID', example: 1 })
  @ApiSuccessResponse(NoticeUnitsResultDto, { description: '공고 주택형 조회 성공' })
  getNoticeUnits(
    @Param('noticeId', ParseIntPipe) noticeId: number,
  ): ApiResponse<NoticeUnitsResultDto> {
    if (noticeId !== 1) {
      throw new NotFoundException('존재하지 않는 공고입니다.');
    }

    const result: NoticeUnitsResultDto = {
      units: [
        {
          unitId: 10,
          unitName: '24A',
          exclusiveAreaM2: 24.0,
          supplyAreaM2: 36.0,
          depositMin: 32000000,
          depositMax: 48000000,
          monthlyRentMin: 280000,
          monthlyRentMax: 410000,
          supplyCount: 18,
        },
      ],
    };

    return createSuccessResponse(result, 'NOTICE200', '공고 주택형 조회에 성공했습니다.');
  }

  @Get(':noticeId/files')
  @ApiOperation({
    summary: '공고 첨부파일 목록 조회',
    description: '공고에 첨부된 원문 파일/링크 목록을 조회한다.',
  })
  @ApiParam({ name: 'noticeId', type: Number, description: '조회할 공고 ID', example: 1 })
  @ApiSuccessResponse(NoticeFilesResultDto, { description: '공고 첨부파일 목록 조회 성공' })
  getNoticeFiles(
    @Param('noticeId', ParseIntPipe) noticeId: number,
  ): ApiResponse<NoticeFilesResultDto> {
    if (noticeId !== 1) {
      throw new NotFoundException('존재하지 않는 공고입니다.');
    }

    const result: NoticeFilesResultDto = {
      files: [
        {
          fileId: 1,
          fileName: '2026-03호 공고문.pdf',
          fileType: NoticeFileType.PDF,
          fileUrl: 'https://example.com/notice.pdf',
          registeredAt: '2026-06-29T10:00:00+09:00',
        },
        {
          fileId: 2,
          fileName: '입주자 모집 안내 책자',
          fileType: NoticeFileType.LINK,
          fileUrl: 'https://example.com/guide',
          registeredAt: '2026-06-29T10:00:00+09:00',
        },
      ],
    };

    return createSuccessResponse(result, 'NOTICE200', '공고 첨부파일 목록 조회에 성공했습니다.');
  }

  @Post(':noticeId/save')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: '공고 저장',
    description: '공고를 저장(찜)한다. 이미 저장된 공고를 다시 저장하면 멱등하게 200을 반환한다.',
  })
  @ApiParam({ name: 'noticeId', type: Number, description: '저장할 공고 ID', example: 1 })
  @ApiSuccessResponse(SaveNoticeResultDto, { status: 201, description: '공고 저장 성공' })
  saveNotice(@Param('noticeId', ParseIntPipe) noticeId: number): ApiResponse<SaveNoticeResultDto> {
    if (noticeId !== 1) {
      throw new NotFoundException('존재하지 않는 공고입니다.');
    }

    const result: SaveNoticeResultDto = {
      savedNoticeId: 100,
      noticeId,
      isSaved: true,
      interestedCount: 33,
      savedAt: '2026-06-30T10:00:00+09:00',
    };

    return createSuccessResponse(result, 'NOTICE201', '공고 저장에 성공했습니다.');
  }

  @Delete(':noticeId/save')
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
  unsaveNotice(
    @Param('noticeId', ParseIntPipe) noticeId: number,
  ): ApiResponse<UnsaveNoticeResultDto> {
    if (noticeId !== 1) {
      throw new NotFoundException('존재하지 않는 공고입니다.');
    }

    const result: UnsaveNoticeResultDto = {
      noticeId,
      isSaved: false,
      interestedCount: 32,
    };

    return createSuccessResponse(result, 'NOTICE200', '공고 저장 해제에 성공했습니다.');
  }
}