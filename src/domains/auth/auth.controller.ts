import { Body, ConflictException, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ApiSuccessResponse } from '../../common/decorators/api-success-response.decorator';
import { EmptyResultDto } from '../../common/dto/api-response.dto';
import { ApiResponse, createSuccessResponse } from '../../common/types/api-response.type';
import {
  AuthResultDto,
  LoginRequestDto,
  SignupRequestDto,
  SocialAuthRequestDto,
} from './dto/auth.dto';

/**
 * Service/DB 연동 전 단계: Notion 명세의 Example 응답을 그대로 반환하는 mock 구현이다.
 * 실제 인증/토큰 발급 로직은 AuthService + JWT 연동 시 대체된다.
 */
@ApiTags('Auth/User')
@Controller('auth')
export class AuthController {
  @Post('signup')
  @ApiOperation({ summary: '이메일(로컬) 회원가입', description: '이메일/비밀번호로 회원가입한다.' })
  @ApiSuccessResponse(AuthResultDto, { status: 201, description: '이메일 회원가입 성공' })
  signup(@Body() body: SignupRequestDto): ApiResponse<AuthResultDto> {
    if (body.email === 'duplicate@email.com') {
      throw new ConflictException('이미 존재하는 이메일 주소입니다.');
    }

    const result: AuthResultDto = {
      accessToken: 'eyJhbGci...',
      isNewUser: true,
      userId: 1001,
    };

    return createSuccessResponse(result, 'AUTH201', '이메일 회원가입 성공');
  }

  @Post('login')
  @ApiOperation({ summary: '이메일(로컬) 로그인', description: '이메일/비밀번호로 로그인하고 Access Token을 발급한다.' })
  @ApiSuccessResponse(AuthResultDto, { description: '로그인 완료' })
  login(@Body() _body: LoginRequestDto): ApiResponse<AuthResultDto> {
    const result: AuthResultDto = {
      accessToken: 'eyJhbGci...',
      isNewUser: false,
      userId: 1001,
    };

    return createSuccessResponse(result, 'AUTH200', '로그인 성공');
  }

  @Post('social')
  @ApiOperation({ summary: '소셜 회원가입 및 로그인', description: '소셜 인증 후 회원가입 또는 로그인하고 JWT를 발급한다.' })
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
  @ApiOperation({ summary: '로그아웃', description: '현재 Access Token을 무효화한다.' })
  @ApiSuccessResponse(EmptyResultDto, {
    description: '로그아웃 완료',
    example: { isSuccess: true, code: 'AUTH200', message: '로그아웃 되었습니다.', result: null },
  })
  logout(): ApiResponse<null> {
    return createSuccessResponse(null, 'AUTH200', '로그아웃 되었습니다.');
  }
}
