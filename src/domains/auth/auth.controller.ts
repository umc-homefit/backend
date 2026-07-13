import { Body, Controller, HttpCode, Post, UseGuards  } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ApiSuccessResponse } from '../../common/decorators/api-success-response.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { EmptyResultDto } from '../../common/dto/api-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ApiResponse, createSuccessResponse } from '../../common/types/api-response.type';
import { AuthService } from './auth.service';
import {
  AuthResultDto,
  LoginRequestDto,
  SignupRequestDto,
  SocialAuthRequestDto,
} from './dto/auth.dto';

/**
 * signup/login은 AuthService를 통해 실제 DB 조회, 비밀번호 해싱/검증, JWT 발급까지 연동되어 있다.
 * [Refresh Token 관련 - 초기 단계 판단으로 의도적 미도입]
 * 추후 도입 시 AuthResultDto에 refreshToken 필드 추가 + AuthService에서 발급/검증/저장 로직 구현 필요.
 * logout()도 그때 실제 무효화 로직(Refresh Token 삭제 또는 Access Token 블랙리스트)이 채워질 예정.
 * social은 아직 mock 구현이다 
 */
@ApiTags('Auth/User')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @ApiOperation({
    summary: '이메일(로컬) 회원가입',
    description: '이메일/비밀번호로 회원가입한다.',
  })
  @ApiSuccessResponse(AuthResultDto, { status: 201, description: '이메일 회원가입 성공' })
  async signup(@Body() body: SignupRequestDto): Promise<ApiResponse<AuthResultDto>> {
    const result = await this.authService.signup(body);
    return createSuccessResponse(result, 'AUTH201', '이메일 회원가입 성공');
  }
  @Post('login')
  @HttpCode(200)
  @ApiOperation({
    summary: '이메일(로컬) 로그인',
    description: '이메일/비밀번호로 로그인하고 Access Token을 발급한다.',
  })
  @ApiSuccessResponse(AuthResultDto, { description: '로그인 완료' })
  async login(@Body() body: LoginRequestDto): Promise<ApiResponse<AuthResultDto>> {
    const result = await this.authService.login(body);
    return createSuccessResponse(result, 'AUTH200', '로그인 성공');
  }

  @Post('social')
  @HttpCode(200)
  @ApiOperation({
    summary: '소셜 회원가입 및 로그인',
    description: '소셜 인증 후 회원가입 또는 로그인하고 JWT를 발급한다.',
  })
  @ApiSuccessResponse(AuthResultDto, { description: '기존 소셜 로그인' })
  socialAuth(@Body() _body: SocialAuthRequestDto): ApiResponse<AuthResultDto> {
    const result: AuthResultDto = {
      accessToken: 'eyJhbGci...',
      isNewUser: false,
      userId: 1001,
    };

    return createSuccessResponse(result, 'AUTH200', '로그인 성공');
  }

  @Post('logout')
  @HttpCode(200)
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard) // 실제 JWT 검증 가드 적용
  @ApiOperation({ summary: '로그아웃', description: '현재 Access Token을 무효화한다.' })
  @ApiSuccessResponse(EmptyResultDto, {
    description: '로그아웃 완료',
    nullable: true,
    example: { isSuccess: true, code: 'AUTH200', message: '로그아웃 되었습니다.', result: null },
  })
  async logout(@CurrentUser() user: CurrentUserPayload): Promise<ApiResponse<null>> {
    await this.authService.logout(user.userId);
    return createSuccessResponse(null, 'AUTH200', '로그아웃 되었습니다.');
  }
}
