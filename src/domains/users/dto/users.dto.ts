import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  IsInt,
  Min,
  IsDateString
} from 'class-validator';

// 1. 프로필 수정 요청 DTO
export class UpdateProfileRequestDto {
  @ApiPropertyOptional({ description: '수정할 닉네임', example: '홈핏유저', nullable: true })
  @IsOptional()
  @IsString()
  nickname?: string;

  @ApiPropertyOptional({ description: '수정할 생년월일 (YYYY-MM-DD)', example: '1998-05-20', nullable: true })
  @IsOptional()
  @IsDateString() // 피드백 반영: 날짜 형식 검증 추가
  birthDate?: string;

  @ApiPropertyOptional({ description: '수정할 연락처', example: '010-1234-5678', nullable: true })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional({
    description: '수정할 프로필 이미지 경로',
    example: 'https://cdn.homefit.com/profile/1001.png',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  profileImageUrl?: string;
}

// 2. 프로필 수정 결과 DTO
export class UpdateProfileResultDto {
  @ApiProperty({ description: '수정된 사용자 ID', example: 1001 })
  userId: number;

  @ApiProperty({ description: '수정 완료 시간', example: '2026-07-01T15:00:00' })
  updatedAt: string;
}

// 3. 조건 프로필 수정 요청 DTO
export class UpdateConditionProfileRequestDto {
  @ApiProperty({ description: '월 총소득', example: 3000000 })
  @IsInt() 
  @Min(0)  
  monthlyIncomeAmount: number;

  @ApiProperty({ description: '총 보유 자산', example: 50000000 })
  @IsInt()
  @Min(0)
  totalAssetAmount: number;

  @ApiProperty({ description: '총 부채 금액', example: 8000000 })
  @IsInt()
  @Min(0)
  totalDebtAmount: number;

  @ApiProperty({ description: '월 상환액', example: 400000 })
  @IsInt()
  @Min(0)
  monthlyDebtPaymentAmount: number;

  @ApiProperty({ description: '보유 현금', example: 20000000 })
  @IsInt()
  @Min(0)
  cashSavings: number;

  @ApiProperty({ description: '무주택 여부', example: true })
  @IsBoolean()
  isHomeless: boolean;

  @ApiPropertyOptional({ description: '거주 지역 코드', example: '11110', nullable: true })
  @IsOptional()
  @IsString()
  residenceRegionCode?: string;

  @ApiPropertyOptional({ description: '직장/학교 지역 코드', example: '11680', nullable: true })
  @IsOptional()
  @IsString()
  workplaceRegionCode?: string;

  @ApiProperty({ description: '주택 소유 상태', example: 'HOMELESS' })
  @IsString()
  housingOwnershipStatus: string;
}

// 4. 조건 프로필 수정 결과 DTO
export class UpdateConditionProfileResultDto {
  @ApiProperty({ description: '조건 프로필 ID', example: 501 })
  userConditionProfileId: number;

  @ApiProperty({ description: '최종 수정 일시', example: '2026-07-01T14:30:00Z' })
  updatedAt: string;
}

// 5. 프로필 조회 결과 DTO
export class ProfileResultDto {
  @ApiPropertyOptional({ description: '별명', example: '홈핏러', nullable: true })
  nickname: string | null;

  @ApiPropertyOptional({ description: '생년월일', example: '1998-05-20', nullable: true })
  birthDate: string | null;

  @ApiPropertyOptional({ description: '연락처', example: '010-1234-5678', nullable: true })
  phoneNumber: string | null;

  @ApiPropertyOptional({ description: '이미지 경로', example: 'https://.../1.png', nullable: true })
  profileImageUrl: string | null;

  @ApiProperty({ description: '생성 일시', example: '2026-07-01T09:00:00Z' })
  createdAt: string;

  @ApiProperty({ description: '최종 수정 일시', example: '2026-07-01T14:30:00Z' })
  updatedAt: string;
}

// 6. 기본 정보 조회 결과 DTO
export class BasicInfoResultDto {
  @ApiProperty({ description: '사용자 고유 식별자', example: 1001 })
  userId: number;

  @ApiProperty({ description: '계정 이메일', example: 'user@email.com' })
  email: string | null;

  @ApiProperty({ description: '인증 방식', example: 'KAKAO' })
  provider: string;

  @ApiProperty({ description: '계정 상태', example: 'ACTIVE' })
  status: string;

  @ApiProperty({ description: '생성 일시', example: '2026-07-01T09:00:00Z' })
  createdAt: string;

  @ApiProperty({ description: '수정 일시', example: '2026-07-01T14:30:00Z' })
  updatedAt: string;
}

// 7. 조건 프로필 조회 결과 DTO
export class ConditionProfileResultDto {
  @ApiProperty({ description: '월 총소득', example: 3000000 })
  monthlyIncomeAmount: number;

  @ApiProperty({ description: '총 보유 자산', example: 50000000 })
  totalAssetAmount: number;

  @ApiProperty({ description: '총 부채 금액', example: 8000000 })
  totalDebtAmount: number;

  @ApiProperty({ description: '월 상환액', example: 400000 })
  monthlyDebtPaymentAmount: number;

  @ApiProperty({ description: '보유 현금', example: 20000000 })
  cashSavings: number;

  @ApiProperty({ description: '주택 소유 상태', example: 'HOMELESS' })
  housingOwnershipStatus: string;

  @ApiProperty({ description: '무주택 여부', example: true })
  isHomeless: boolean;

  @ApiPropertyOptional({ description: '거주 지역 코드', example: '11110', nullable: true })
  residenceRegionCode: string | null;

  @ApiPropertyOptional({ description: '직장/학교 지역 코드', example: '11680', nullable: true })
  workplaceRegionCode: string | null;

  @ApiProperty({ description: '최초 저장 일시', example: '2026-07-01T09:00:00Z' })
  createdAt: string;

  @ApiProperty({ description: '최종 수정 일시', example: '2026-07-01T14:30:00Z' })
  updatedAt: string;
}