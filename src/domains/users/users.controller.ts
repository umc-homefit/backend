import { Body, Controller, Get, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ApiSuccessResponse } from '../../common/decorators/api-success-response.decorator';
import { ApiResponse, createSuccessResponse } from '../../common/types/api-response.type';
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

/**
 * Service/DB 연동 전 단계: Notion 명세의 Example 응답을 그대로 반환하는 mock 구현이다.
 * 실제 저장/조회 로직은 UsersService + Auth 연동 시 대체된다.
 */
@ApiTags('Auth/User')
@ApiBearerAuth('access-token')
@Controller('users/me')
export class UsersController {
  @Get()
  @ApiOperation({ summary: '내 기본 정보 조회', description: '로그인한 사용자의 계정 기본 정보를 조회한다.' })
  @ApiSuccessResponse(BasicInfoResultDto, { description: '내 기본 정보 조회 완료' })
  getBasicInfo(): ApiResponse<BasicInfoResultDto> {
    const result: BasicInfoResultDto = {
      userId: 1001,
      email: 'user@email.com',
      provider: 'KAKAO',
      status: 'ACTIVE',
      createdAt: '2026-07-01T09:00:00Z',
      updatedAt: '2026-07-01T14:30:00Z',
    };

    return createSuccessResponse(result, 'USER200', '기본 정보 조회 성공');
  }

  @Get('profile')
  @ApiOperation({ summary: '내 프로필 조회', description: '닉네임, 관심 지역 등 프로필 정보를 조회한다.' })
  @ApiSuccessResponse(ProfileResultDto, { description: '내 프로필 정보 조회 성공' })
  getProfile(): ApiResponse<ProfileResultDto> {
    const result: ProfileResultDto = {
      nickname: '홈핏러',
      birthDate: '1998-05-20',
      phoneNumber: '010-1234-5678',
      profileImageUrl: 'https://.../1.png',
      createdAt: '2026-07-01T09:00:00Z',
      updatedAt: '2026-07-01T14:30:00Z',
    };

    return createSuccessResponse(result, 'USER200', '프로필 조회 성공');
  }

  @Put('profile')
  @ApiOperation({ summary: '내 프로필 수정', description: '닉네임, 생년월일, 연락처, 프로필 이미지를 수정한다.' })
  @ApiSuccessResponse(UpdateProfileResultDto, { description: '프로필 수정 완료' })
  updateProfile(@Body() _body: UpdateProfileRequestDto): ApiResponse<UpdateProfileResultDto> {
    const result: UpdateProfileResultDto = {
      userId: 1001,
      updatedAt: '2026-07-01T15:00:00',
    };

    return createSuccessResponse(result, 'USER200', '프로필 수정이 완료되었습니다.');
  }

  @Get('condition-profile')
  @ApiOperation({
    summary: '사용자 조건 프로필 조회',
    description: '소득·자산·무주택 등 입주 조건 프로필을 조회한다.',
  })
  @ApiSuccessResponse(ConditionProfileResultDto, { description: '금융 조건 프로필 조회 완료' })
  getConditionProfile(): ApiResponse<ConditionProfileResultDto> {
    const result: ConditionProfileResultDto = {
      monthlyIncomeAmount: 3000000,
      totalAssetAmount: 50000000,
      totalDebtAmount: 8000000,
      monthlyDebtPaymentAmount: 400000,
      cashSavings: 20000000,
      housingOwnershipStatus: 'HOMELESS',
      isHomeless: true,
      residenceRegionCode: '11110',
      workplaceRegionCode: '11680',
      createdAt: '2026-07-01T09:00:00Z',
      updatedAt: '2026-07-01T14:30:00Z',
    };

    return createSuccessResponse(result, 'USER200', '조회 성공');
  }

  @Put('condition-profile')
  @ApiOperation({
    summary: '사용자 조건 프로필 수정',
    description: '소득/자산/부채/무주택 여부 등 조건 프로필을 생성하거나 수정한다 (upsert).',
  })
  @ApiSuccessResponse(UpdateConditionProfileResultDto, { description: '조건 프로필 수정 완료' })
  updateConditionProfile(
    @Body() _body: UpdateConditionProfileRequestDto,
  ): ApiResponse<UpdateConditionProfileResultDto> {
    const result: UpdateConditionProfileResultDto = {
      userConditionProfileId: 501,
      updatedAt: '2026-07-01T14:30:00Z',
    };

    return createSuccessResponse(result, 'USER200', '조건 프로필 수정 성공');
  }

  @Get('saved-notices')
  @ApiOperation({ summary: '저장 공고 목록 조회', description: '마이페이지에서 사용자가 저장한 공고 목록을 조회한다.' })
  @ApiSuccessResponse(SavedNoticeListResultDto, { description: '저장 공고 목록 조회 성공' })
  getSavedNotices(
    @Query() query: GetSavedNoticesQueryDto,
  ): ApiResponse<SavedNoticeListResultDto> {
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
