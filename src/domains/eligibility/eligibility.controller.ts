import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

import { ApiSuccessResponse } from '../../common/decorators/api-success-response.decorator';
import { ApiErrorResponse } from '../../common/decorators/api-error-response.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { ApiResponse, createSuccessResponse } from '../../common/types/api-response.type';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  EligibilityAnalysisResultDto,
  EligibilityConditionsResultDto,
  EligibilityResultLevel,
  FinancialSummaryResultDto,
  GetMyEligibilityAnalysesQueryDto,
  MyEligibilityAnalysesResultDto,
  RequestEligibilityAnalysisResultDto,
} from './dto/eligibility.dto';
import { EligibilityService } from './eligibility.service';

@ApiTags('Eligibility Analysis')
@ApiBearerAuth('access-token')
@Controller()
export class EligibilityController {
  constructor(private readonly eligibilityService: EligibilityService) {}

  @Post('notices/:noticeId/units/:unitId/eligibility-analyses')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: '입주 가능성 분석 요청',
    description:
      '사용자 조건 프로필과 공고/주택 조건을 비교하여 입주 가능성 점수, 등급, 부족 자금, 월세 부담률을 계산하고 저장한다.',
  })
  @ApiParam({ name: 'noticeId', type: Number, description: '분석할 공고 ID', example: 12 })
  @ApiParam({ name: 'unitId', type: Number, description: '분석할 주택 ID', example: 3 })
  @ApiSuccessResponse(RequestEligibilityAnalysisResultDto, {
    status: 201,
    description: '입주 가능성 분석 생성 성공',
  })
  @ApiErrorResponse([
    {
      status: 400,
      code: 'COMMON400',
      message:
        'noticeId/unitId가 정수가 아니거나 0 이하이거나, 주택이 해당 공고에 속하지 않습니다.',
    },
    { status: 401, code: 'AUTH401', message: '인증 토큰이 없거나 만료되었습니다.' },
    { status: 404, code: 'COMMON404', message: '존재하지 않는 공고 또는 주택 정보입니다.' },
    { status: 409, code: 'COMMON409', message: '사용자 조건 프로필이 입력되지 않았습니다.' },
    { status: 500, code: 'COMMON500', message: '서버 오류가 발생했습니다.' },
  ])
  async requestEligibilityAnalysis(
    @CurrentUser() user: CurrentUserPayload,
    @Param('noticeId', ParseIntPipe) noticeId: number,
    @Param('unitId', ParseIntPipe) unitId: number,
  ): Promise<ApiResponse<RequestEligibilityAnalysisResultDto>> {
    const result = await this.eligibilityService.requestEligibilityAnalysis(
      noticeId,
      unitId,
      user.userId,
    );
    return createSuccessResponse(result, 'ELIGIBILITY201', '입주 가능성 분석이 완료되었습니다.');
  }

  @Get('eligibility-analyses/:analysisId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: '분석 결과 조회',
    description:
      '분석 결과 ID 기준으로 입주 가능성 점수, 등급, 부족 자금, 월세 부담률, 조건별 비교 결과를 상세 조회한다.',
  })
  @ApiParam({
    name: 'analysisId',
    type: Number,
    description: '조회할 입주 가능성 분석 ID',
    example: 1,
  })
  @ApiSuccessResponse(EligibilityAnalysisResultDto, { description: '분석 결과 조회 성공' })
  @ApiErrorResponse([
    { status: 400, code: 'COMMON400', message: 'analysisId가 정수가 아니거나 0 이하입니다.' },
    { status: 401, code: 'AUTH401', message: '인증 토큰이 없거나 만료되었습니다.' },
    {
      status: 404,
      code: 'COMMON404',
      message: '분석 결과가 없거나 다른 사용자의 분석 결과입니다.',
    },
    { status: 500, code: 'COMMON500', message: '서버 오류가 발생했습니다.' },
  ])
  async getEligibilityAnalysis(
    // JwtAuthGuard가 토큰을 검증한 뒤 요청 객체에 넣어 둔 로그인 사용자 정보다.
    @CurrentUser() user: CurrentUserPayload,
    // URL의 문자열 ID를 number로 바꾸고, 숫자가 아니면 Nest가 400을 반환한다.
    @Param('analysisId', ParseIntPipe) analysisId: number,
  ): Promise<ApiResponse<EligibilityAnalysisResultDto>> {
    // 서비스에는 분석 ID뿐 아니라 "누가 조회하는가"도 전달해 소유권을 확인한다.
    const result = await this.eligibilityService.getEligibilityAnalysis(analysisId, user.userId);
    return createSuccessResponse(result, 'ELIGIBILITY200', '분석 결과 조회에 성공했습니다.');
  }

  @Get('eligibility-analyses/:analysisId/conditions')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: '조건별 비교 결과 조회',
    description:
      '소득, 자산, 무주택 여부, 보유 현금 등 사용자 조건과 공고 조건의 항목별 충족 여부를 조회한다.',
  })
  @ApiParam({
    name: 'analysisId',
    type: Number,
    description: '조회할 입주 가능성 분석 ID',
    example: 1,
  })
  @ApiSuccessResponse(EligibilityConditionsResultDto, { description: '조건별 비교 결과 조회 성공' })
  @ApiErrorResponse([
    { status: 400, code: 'COMMON400', message: 'analysisId가 정수가 아니거나 0 이하입니다.' },
    { status: 401, code: 'AUTH401', message: '인증 토큰이 없거나 만료되었습니다.' },
    {
      status: 404,
      code: 'COMMON404',
      message: '분석 결과가 없거나 다른 사용자의 분석 결과입니다.',
    },
    { status: 500, code: 'COMMON500', message: '서버 오류가 발생했습니다.' },
  ])
  async getEligibilityConditions(
    // JwtAuthGuard가 검증해 둔 사용자 정보를 전달하여 자신의 분석만 조회하게 한다.
    @CurrentUser() user: CurrentUserPayload,
    @Param('analysisId', ParseIntPipe) analysisId: number,
  ): Promise<ApiResponse<EligibilityConditionsResultDto>> {
    const result = await this.eligibilityService.getEligibilityConditions(analysisId, user.userId);
    return createSuccessResponse(result, 'ELIGIBILITY200', '조건별 비교 결과 조회에 성공했습니다.');
  }

  @Get('eligibility-analyses/:analysisId/financial-summary')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: '재정 계산 결과 조회',
    description: '예상 보증금, 월세, 관리비, 부족 자금, 월세 부담률 등 재정 계산 결과를 조회한다.',
  })
  @ApiParam({
    name: 'analysisId',
    type: Number,
    description: '조회할 입주 가능성 분석 ID',
    example: 1,
  })
  @ApiSuccessResponse(FinancialSummaryResultDto, { description: '재정 계산 결과 조회 성공' })
  @ApiErrorResponse([
    { status: 400, code: 'COMMON400', message: 'analysisId가 정수가 아니거나 0 이하입니다.' },
    { status: 401, code: 'AUTH401', message: '인증 토큰이 없거나 만료되었습니다.' },
    {
      status: 404,
      code: 'COMMON404',
      message: '분석 결과가 없거나 다른 사용자의 분석 결과입니다.',
    },
    { status: 500, code: 'COMMON500', message: '서버 오류가 발생했습니다.' },
  ])
  async getFinancialSummary(
    // 인증된 사용자 ID를 전달해 자신의 분석 결과만 조회한다.
    @CurrentUser() user: CurrentUserPayload,
    @Param('analysisId', ParseIntPipe) analysisId: number,
  ): Promise<ApiResponse<FinancialSummaryResultDto>> {
    const result = await this.eligibilityService.getFinancialSummary(analysisId, user.userId);
    return createSuccessResponse(result, 'ELIGIBILITY200', '재정 계산 결과 조회에 성공했습니다.');
  }

  @Get('users/me/eligibility-analyses')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: '내 분석 이력 조회',
    description: '로그인한 사용자가 이전에 실행한 입주 가능성 분석 이력 목록을 조회한다.',
  })
  @ApiSuccessResponse(MyEligibilityAnalysesResultDto, { description: '분석 이력 조회 성공' })
  getMyEligibilityAnalyses(
    @Query() query: GetMyEligibilityAnalysesQueryDto,
  ): ApiResponse<MyEligibilityAnalysesResultDto> {
    const page = query.page ?? 0;
    const size = query.size ?? 10;
    const totalElements = 2;
    const totalPages = Math.ceil(totalElements / size);

    const result: MyEligibilityAnalysesResultDto = {
      analyses: [
        {
          analysisId: 1,
          noticeId: 12,
          unitId: 3,
          noticeTitle: '어반허브 서울스테이션 추가모집',
          resultLevel: EligibilityResultLevel.HIGH,
          eligibilityScore: 82,
          shortageAmount: 2000000,
          rentBurdenRate: 28.57,
          analyzedAt: '2026-07-01T00:10:00',
        },
        {
          analysisId: 2,
          noticeId: 15,
          unitId: 5,
          noticeTitle: '서초 꽃마을 추가모집',
          resultLevel: EligibilityResultLevel.MEDIUM,
          eligibilityScore: 65,
          shortageAmount: 5000000,
          rentBurdenRate: 37.5,
          analyzedAt: '2026-06-30T18:10:00',
        },
      ],
      pageInfo: {
        page,
        size,
        totalElements,
        totalPages,
        hasNext: page + 1 < totalPages,
      },
    };

    return createSuccessResponse(result, 'ELIGIBILITY200', '내 분석 이력 조회에 성공했습니다.');
  }
}
