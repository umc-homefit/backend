import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

import { ApiSuccessResponse } from '../../common/decorators/api-success-response.decorator';
import { ApiResponse, createSuccessResponse } from '../../common/types/api-response.type';
import {
  EligibilityAnalysisResultDto,
  EligibilityConditionCode,
  EligibilityConditionResultStatus,
  EligibilityConditionsResultDto,
  EligibilityResultLevel,
  FinancialSummaryResultDto,
  GetMyEligibilityAnalysesQueryDto,
  MyEligibilityAnalysesResultDto,
  RequestEligibilityAnalysisResultDto,
} from './dto/eligibility.dto';
import { EligibilityService } from './eligibility.service';

const MOCK_CONDITION_RESULTS = [
  {
    conditionCode: EligibilityConditionCode.INCOME,
    conditionName: '소득 조건',
    requiredValue: '월소득 350만원 이하',
    userValue: '월소득 280만원',
    resultStatus: EligibilityConditionResultStatus.PASS,
    failReason: null,
  },
  {
    conditionCode: EligibilityConditionCode.CASH,
    conditionName: '보유 현금',
    requiredValue: '보증금 1000만원 이상',
    userValue: '보유 현금 800만원',
    resultStatus: EligibilityConditionResultStatus.FAIL,
    failReason: '예상 보증금 대비 보유 현금이 200만원 부족합니다.',
  },
  {
    conditionCode: EligibilityConditionCode.RENT_BURDEN,
    conditionName: '월세 부담률',
    requiredValue: '월소득 대비 월 주거비 40% 이하 권장',
    userValue: '28.57%',
    resultStatus: EligibilityConditionResultStatus.PASS,
    failReason: null,
  },
];

/**
 * POST 분석 생성은 EligibilityService/DB와 연동되어 있고,
 * 조회 계열 API는 추후 서비스 연동 전까지 명세 예시 응답을 반환한다.
 */
@ApiTags('Eligibility Analysis')
@ApiBearerAuth('access-token')
@Controller()
export class EligibilityController {
  constructor(private readonly eligibilityService: EligibilityService) {}

  @Post('notices/:noticeId/units/:unitId/eligibility-analyses')
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
  async requestEligibilityAnalysis(
    @Param('noticeId', ParseIntPipe) noticeId: number,
    @Param('unitId', ParseIntPipe) unitId: number,
  ): Promise<ApiResponse<RequestEligibilityAnalysisResultDto>> {
    const result = await this.eligibilityService.requestEligibilityAnalysis(noticeId, unitId);
    return createSuccessResponse(result, 'ELIGIBILITY201', '입주 가능성 분석이 완료되었습니다.');
  }

  @Get('eligibility-analyses/:analysisId')
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
  getEligibilityAnalysis(
    @Param('analysisId', ParseIntPipe) analysisId: number,
  ): ApiResponse<EligibilityAnalysisResultDto> {
    if (analysisId !== 1) {
      throw new NotFoundException('존재하지 않는 분석 결과입니다.');
    }

    const result: EligibilityAnalysisResultDto = {
      analysisId: 1,
      noticeId: 12,
      unitId: 3,
      resultLevel: EligibilityResultLevel.HIGH,
      eligibilityScore: 82,
      expectedDepositAmount: 10000000,
      expectedMonthlyRentAmount: 350000,
      maintenanceFeeAmount: 50000,
      shortageAmount: 2000000,
      rentBurdenRate: 28.57,
      summaryMessage:
        '보유 현금은 일부 부족하지만 월세 부담률이 안정적이므로 입주 가능성이 높은 편입니다.',
      conditionResults: MOCK_CONDITION_RESULTS,
      analyzedAt: '2026-07-01T00:10:00',
    };

    return createSuccessResponse(result, 'ELIGIBILITY200', '분석 결과 조회에 성공했습니다.');
  }

  @Get('eligibility-analyses/:analysisId/conditions')
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
  getEligibilityConditions(
    @Param('analysisId', ParseIntPipe) analysisId: number,
  ): ApiResponse<EligibilityConditionsResultDto> {
    if (analysisId !== 1) {
      throw new NotFoundException('존재하지 않는 분석 결과입니다.');
    }

    const result: EligibilityConditionsResultDto = {
      conditionResults: [
        ...MOCK_CONDITION_RESULTS,
        {
          conditionCode: EligibilityConditionCode.ASSET,
          conditionName: '자산 조건',
          requiredValue: '총자산 2억 5천만원 이하',
          userValue: '총자산 1억 2천만원',
          resultStatus: EligibilityConditionResultStatus.PASS,
          failReason: null,
        },
        {
          conditionCode: EligibilityConditionCode.HOMELESS,
          conditionName: '무주택 여부',
          requiredValue: '무주택자',
          userValue: '무주택자',
          resultStatus: EligibilityConditionResultStatus.PASS,
          failReason: null,
        },
      ],
    };

    return createSuccessResponse(result, 'ELIGIBILITY200', '조건별 비교 결과 조회에 성공했습니다.');
  }

  @Get('eligibility-analyses/:analysisId/financial-summary')
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
  getFinancialSummary(
    @Param('analysisId', ParseIntPipe) analysisId: number,
  ): ApiResponse<FinancialSummaryResultDto> {
    if (analysisId !== 1) {
      throw new NotFoundException('존재하지 않는 분석 결과입니다.');
    }

    const result: FinancialSummaryResultDto = {
      expectedDepositAmount: 10000000,
      expectedMonthlyRentAmount: 350000,
      maintenanceFeeAmount: 50000,
      userCashAmount: 8000000,
      shortageAmount: 2000000,
      monthlyIncomeAmount: 1400000,
      monthlyHousingCost: 400000,
      rentBurdenRate: 28.57,
      financialMessage:
        '예상 보증금 대비 보유 현금이 200만원 부족하지만, 월세 부담률은 28.57%로 안정적인 편입니다.',
    };

    return createSuccessResponse(result, 'ELIGIBILITY200', '재정 계산 결과 조회에 성공했습니다.');
  }

  @Get('users/me/eligibility-analyses')
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
