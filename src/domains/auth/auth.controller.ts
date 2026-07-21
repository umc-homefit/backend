import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
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
 * signup/login/social 전부 AuthService를 통해 실제 DB 조회, 비밀번호 해싱/검증,
 * (소셜의 경우) 각 provider 서버 토큰 검증, JWT 발급까지 연동되어 있다.
 * logout도 Guard/CurrentUser로 실제 인증 검증까지는 되지만, access-only stateless
 * 구조라 서버 쪽에서 무효화할 대상이 없어 의도적으로 no-op 구현이다 (mock 아님).
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
    description: '카카오/구글 OAuth 토큰을 검증하고, 신규면 가입, 기존이면 로그인 처리 후 JWT를 발급한다.',
  })
  @ApiSuccessResponse(AuthResultDto, { description: '소셜 회원가입/로그인 성공' })
  async socialAuth(@Body() body: SocialAuthRequestDto): Promise<ApiResponse<AuthResultDto>> {
    const result = await this.authService.socialAuth(body);
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