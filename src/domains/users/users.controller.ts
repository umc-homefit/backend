import { Body, Controller, Delete, Get, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'; // ApiBearerAuth 추가

import { ApiSuccessResponse } from '../../common/decorators/api-success-response.decorator';
import { ApiResponse, createSuccessResponse } from '../../common/types/api-response.type';
import { UsersService } from './users.service';

import {
  GetSavedNoticesQueryDto,
  NoticeSort,
  NoticeStatus,
  SavedNoticeListResultDto,
} from '../notices/dto/notices.dto';
import {
  BasicInfoResultDto,
  ConditionProfileResultDto,
  ProfileResultDto,
  UpdateConditionProfileRequestDto,
  UpdateConditionProfileResultDto,
  UpdateProfileRequestDto,
  UpdateProfileResultDto,
} from './dto/users.dto';

@ApiTags('Auth/User')
@ApiBearerAuth('access-token') // 2번 피드백 반영: Swagger 인증 명세 추가
@Controller('users/me')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // 💡 가이드: Auth 모듈이 완성되기 전까지 임시로 사용할 내부 mock ID 정의
  private getMockUserId(): number {
    return 1001; 
  }

  @Get()
  @ApiOperation({ summary: '내 기본 정보 조회', description: '로그인한 사용자의 계정 기본 정보를 조회한다.' })
  @ApiSuccessResponse(BasicInfoResultDto, { description: '내 기본 정보 조회 완료' })
  async getBasicInfo(): Promise<ApiResponse<BasicInfoResultDto>> {
    // TODO: Auth 연동 완료 후 실제 토큰에서 userId 추출할 것
    const result = await this.usersService.getBasicInfo(this.getMockUserId());
    return createSuccessResponse(result, 'USER200', '기본 정보 조회 성공');
  }

  

  @Get('profile')
  @ApiOperation({ summary: '내 프로필 조회', description: '닉네임, 생년월일, 연락처 등 프로필 정보를 조회한다.' })
  @ApiSuccessResponse(ProfileResultDto, { description: '내 프로필 정보 조회 성공' })
  async getProfile(): Promise<ApiResponse<ProfileResultDto>> {
    // TODO: Auth 연동 완료 후 실제 토큰에서 userId 추출할 것
    const result = await this.usersService.getProfile(this.getMockUserId());
    return createSuccessResponse(result, 'USER200', '프로필 조회 성공');
  }

  @Put('profile')
  @ApiOperation({ summary: '내 프로필 수정', description: '닉네임, 생년월일, 연락처, 프로필 이미지를 수정한다.' })
  @ApiSuccessResponse(UpdateProfileResultDto, { description: '프로필 수정 완료' })
  async updateProfile(@Body() body: UpdateProfileRequestDto): Promise<ApiResponse<UpdateProfileResultDto>> {
    // TODO: Auth 연동 완료 후 실제 토큰에서 userId 추출할 것
    const result = await this.usersService.updateProfile(this.getMockUserId(), body);
    return createSuccessResponse(result, 'USER200', '프로필 수정이 완료되었습니다.');
  }

  @Get('condition-profile')
  @ApiOperation({ summary: '사용자 조건 프로필 조회', description: '소득·자산·무주택 등 입주 조건 프로필을 조회한다.' })
  @ApiSuccessResponse(ConditionProfileResultDto, { description: '금융 조건 프로필 조회 완료' })
  async getConditionProfile(): Promise<ApiResponse<ConditionProfileResultDto>> {
    // TODO: Auth 연동 완료 후 실제 토큰에서 userId 추출할 것
    const result = await this.usersService.getConditionProfile(this.getMockUserId());
    return createSuccessResponse(result, 'USER200', '조회 성공');
  }

  @Put('condition-profile')
  @ApiOperation({ summary: '사용자 조건 프로필 수정', description: '소득/자산/부채/무주택 여부 등 조건 프로필을 생성/수정한다.' })
  @ApiSuccessResponse(UpdateConditionProfileResultDto, { description: '조건 프로필 수정 완료' })
  async updateConditionProfile(@Body() body: UpdateConditionProfileRequestDto): Promise<ApiResponse<UpdateConditionProfileResultDto>> {
    // TODO: Auth 연동 완료 후 실제 토큰에서 userId 추출할 것
    const result = await this.usersService.updateConditionProfile(this.getMockUserId(), body);
    return createSuccessResponse(result, 'USER200', '조건 프로필 수정 성공');
  }

  @Get('saved-notices')
  @ApiOperation({ summary: '저장 공고 목록 조회', description: '마이페이지에서 사용자가 저장한 공고 목록을 조회한다.' })
  @ApiSuccessResponse(SavedNoticeListResultDto, { description: '저장 공고 목록 조회 성공' })
  async getSavedNotices(@Query() query: GetSavedNoticesQueryDto): Promise<ApiResponse<SavedNoticeListResultDto>> {
    // 💡 공고 스크랩 파트는 차후 연동을 위해 Mock 유지
    const result: SavedNoticeListResultDto = {
      savedNotices: [
        {
          savedNoticeId: 100,
          noticeId: 1,
          title: '강동구 청년안심주택 2025-03호',
          region: '서울',
          district: '강동구',
          status: NoticeStatus.RECRUITING,
          statusDisplayText: '모집중',
          applicationEndAt: '2026-07-10T18:00:00+09:00',
          dDayText: 'D-3',
          interestedCount: 32,
          savedAt: '2026-06-30T10:00:00+09:00',
        },
      ],
      pageInfo: {
        page: query.page ?? 0,
        size: query.size ?? 10,
        totalElements: 12,
        totalPages: 2,
        hasNext: true,
      },
    };

    if (query.sort === NoticeSort.POPULAR) {
      result.savedNotices.sort((a, b) => b.interestedCount - a.interestedCount);
    }

    return createSuccessResponse(result, 'NOTICE200', '저장 공고 목록 조회에 성공했습니다.');
  }
}