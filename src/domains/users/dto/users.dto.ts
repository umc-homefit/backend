import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsInt,
  Min,
  IsDateString,
  ValidateIf,
} from 'class-validator';

/**
 * user_condition_profiles.marital_status는 ERD상 VARCHAR + 주석 컨벤션(네이티브 DB enum 아님).
 * 값 목록만 TS enum으로 관리해 class-validator/Swagger에서 타입 안정성을 준다.
 */
export enum MaritalStatus {
  UNKNOWN = 'UNKNOWN',
  SINGLE = 'SINGLE',
  MARRIED = 'MARRIED',
  MARRIAGE_EXPECTED = 'MARRIAGE_EXPECTED', // 3개월 이내 결혼예정 (ERD 기준)
}

/** user_condition_profiles.household_head_status도 동일하게 VARCHAR + 주석 컨벤션. */
export enum HouseholdHeadStatus {
  UNKNOWN = 'UNKNOWN',
  HEAD = 'HEAD',
  HEAD_EXPECTED = 'HEAD_EXPECTED', // 예비세대주
  RECOGNIZED = 'RECOGNIZED', // 세대주 인정자
  MEMBER = 'MEMBER',
}

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

  @ApiPropertyOptional({
    description: '혼인 상태',
    enum: MaritalStatus,
    example: MaritalStatus.SINGLE,
  })
  @IsOptional()
  @IsEnum(MaritalStatus, {
    message: 'maritalStatus는 반드시 다음 중 하나여야합니다 : UNKNOWN, SINGLE, MARRIED, MARRIAGE_EXPECTED',
  })
  maritalStatus?: MaritalStatus;

  @ApiPropertyOptional({
    description: '혼인일자 (YYYY-MM-DD). null을 명시적으로 보내면 기존 값을 지운다.',
    example: '2025-05-01',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((o) => o.marriageDate !== null)
  @IsDateString()
  marriageDate?: string | null;

  @ApiPropertyOptional({ description: '최근 출산 여부', example: false })
  @IsOptional()
  @IsBoolean()
  hasRecentNewborn?: boolean;

  @ApiPropertyOptional({
    description: '출산일자 (YYYY-MM-DD). null을 명시적으로 보내면 기존 값을 지운다.',
    example: '2026-03-01',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((o) => o.newbornBirthDate !== null)
  @IsDateString()
  newbornBirthDate?: string | null;

  @ApiPropertyOptional({
    description: '세대주 여부',
    enum: HouseholdHeadStatus,
    example: HouseholdHeadStatus.HEAD,
  })
  @IsOptional()
  @IsEnum(HouseholdHeadStatus, {
    message:
      'householdHeadStatus는 반드시 다음 중 하나여야합니다 : UNKNOWN, HEAD, HEAD_EXPECTED, RECOGNIZED, MEMBER',
  })
  householdHeadStatus?: HouseholdHeadStatus;

  @ApiPropertyOptional({ description: '생애최초 주택 구입자 여부', example: false })
  @IsOptional()
  @IsBoolean()
  isFirstTimeBuyer?: boolean;

  @ApiPropertyOptional({
    description: '직업 상태 (값 컨벤션 기획 확인 중, 아직 미확정)',
    example: 'EMPLOYED',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  employmentStatus?: string;
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

  @ApiProperty({ description: '혼인 상태', enum: MaritalStatus, example: MaritalStatus.SINGLE })
  maritalStatus: MaritalStatus;

  @ApiPropertyOptional({ description: '혼인일자', example: '2025-05-01', nullable: true })
  marriageDate: string | null;

  @ApiProperty({ description: '최근 출산 여부', example: false })
  hasRecentNewborn: boolean;

  @ApiPropertyOptional({ description: '출산일자', example: '2026-03-01', nullable: true })
  newbornBirthDate: string | null;

  @ApiProperty({
    description: '세대주 여부',
    enum: HouseholdHeadStatus,
    example: HouseholdHeadStatus.HEAD,
  })
  householdHeadStatus: HouseholdHeadStatus;

  @ApiPropertyOptional({ description: '생애최초 주택 구입자 여부', example: false, nullable: true })
  isFirstTimeBuyer: boolean | null;

  @ApiPropertyOptional({
    description: '직업 상태 (값 컨벤션 기획 확인 중)',
    example: 'EMPLOYED',
    nullable: true,
  })
  employmentStatus: string | null;

  @ApiProperty({ description: '최초 저장 일시', example: '2026-07-01T09:00:00Z' })
  createdAt: string;

  @ApiProperty({ description: '최종 수정 일시', example: '2026-07-01T14:30:00Z' })
  updatedAt: string;
}