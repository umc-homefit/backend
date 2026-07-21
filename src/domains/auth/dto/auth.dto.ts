import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn, IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

export class SignupRequestDto {
  @ApiProperty({ description: '가입할 이메일 주소', example: 'user@email.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: '가입할 비밀번호 (영문, 숫자, 특수문자 조합, 최소 8자)', example: 'fitpass123!' })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/, {
    message: '비밀번호는 영문, 숫자, 특수문자를 각각 최소 1개 이상 포함해야 합니다.',
  })
  password: string;
}

export class LoginRequestDto {
  @ApiProperty({ description: '로그인 이메일', example: 'user@email.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: '비밀번호 (local 전용)', example: 'fitpass123!' })
  @IsString()
  password: string;
}

export class AuthResultDto {
  @ApiProperty({ description: 'API 인증용 JWT 토큰', example: 'eyJhbGci...' })
  accessToken: string;

  @ApiProperty({ description: '신규 가입 여부', example: true })
  isNewUser: boolean;

  @ApiProperty({ description: '사용자 고유 식별자', example: 1001 })
  userId: number;
}

// APPLE은 현재 미지원이라 제거함 (PR 리뷰 반영, 지원 재개 시 다시 추가)
export enum SocialProvider {
  KAKAO = 'KAKAO',
  GOOGLE = 'GOOGLE',
}

export class SocialAuthRequestDto {
  @ApiProperty({ description: '인증 방식', enum: SocialProvider, example: SocialProvider.KAKAO })
  @IsIn(Object.values(SocialProvider))
  provider: SocialProvider;

  @ApiProperty({
    description: '소셜 인증 토큰 - 카카오/구글 서버에 실제로 검증한다.',
    example: 'eyJhbGci...',
  })
  @IsString()
  @IsNotEmpty()
  oauthToken: string;
}