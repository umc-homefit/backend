import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class SignupRequestDto {
  @ApiProperty({ description: '가입할 이메일 주소', example: 'user@email.com' })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: '가입할 비밀번호 (영문, 숫자, 특수문자 조합, 최소 8자)',
    example: 'fitpass123!',
  })
  @IsString()
  @MinLength(8)
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

export enum SocialProvider {
  KAKAO = 'KAKAO',
  GOOGLE = 'GOOGLE',
}

export class SocialAuthRequestDto {
  @ApiProperty({ description: '인증 방식', enum: SocialProvider, example: SocialProvider.KAKAO })
  @IsIn(Object.values(SocialProvider))
  provider: SocialProvider;

  @ApiPropertyOptional({
    description: '소셜 인증 토큰 (운영 환경 필수)',
    example: 'eyJhbGci...',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  oauthToken?: string;

  @ApiPropertyOptional({
    description: '소셜 식별자 (로컬 테스트 전용)',
    example: '123456789',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  providerId?: string;
}
