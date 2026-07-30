import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { addUtcMonthsClamped } from '../../common/utils/date.util';
import { UsersRepository } from './users.repository';
import {
  HouseholdHeadStatus,
  MaritalStatus,
  UpdateConditionProfileRequestDto,
  UpdateProfileRequestDto,
} from './dto/users.dto';

const MARRIAGE_EXPECTED_WITHIN_MONTHS = 3;

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async getBasicInfo(userId: bigint) {
    const user = await this.usersRepository.findUserById(BigInt(userId));
    if (!user) throw new NotFoundException('사용자 정보를 찾을 수 없습니다.');

    return {
      userId: Number(user.userId),
      email: user.email,
      provider: user.provider,
      status: user.status,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  async withdrawUser(userId: bigint) {
    const user = await this.usersRepository.findUserById(BigInt(userId));
    if (!user) throw new NotFoundException('사용자 정보를 찾을 수 없습니다.');

    await this.usersRepository.updateUserStatus(BigInt(userId), 'INACTIVE');
    return { success: true };
  }

  async getProfile(userId: bigint) {
    const profile = await this.usersRepository.findProfileByUserId(BigInt(userId));
    if (!profile) throw new NotFoundException('프로필 정보를 찾을 수 없습니다.');

    return {
      nickname: profile.nickname,
      birthDate: profile.birthDate ? profile.birthDate.toISOString().split('T')[0] : null,
      phoneNumber: profile.phoneNumber,
      profileImageUrl: profile.profileImageUrl,
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString(),
    };
  }

  async updateProfile(userId: bigint, dto: UpdateProfileRequestDto) {
    const updated = await this.usersRepository.upsertProfile(BigInt(userId), dto);
    return {
      userId: Number(updated.userId),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async getConditionProfile(userId: bigint) {
    const condition = await this.usersRepository.findConditionProfileByUserId(BigInt(userId));
    if (!condition) throw new NotFoundException('조건 프로필 정보를 찾을 수 없습니다.');

    return {
      monthlyIncomeAmount: Number(condition.monthlyIncomeAmount),
      totalAssetAmount: Number(condition.totalAssetAmount),
      totalDebtAmount: Number(condition.totalDebtAmount),
      monthlyDebtPaymentAmount: Number(condition.monthlyDebtPaymentAmount),
      cashSavings: Number(condition.cashSavings),
      housingOwnershipStatus: condition.housingOwnershipStatus,
      isHomeless: condition.isHomeless,
      residenceRegionCode: condition.residenceRegionCode,
      workplaceRegionCode: condition.workplaceRegionCode,
      maritalStatus: condition.maritalStatus as MaritalStatus,
      marriageDate: condition.marriageDate
        ? condition.marriageDate.toISOString().split('T')[0]
        : null,
      hasRecentNewborn: condition.hasRecentNewborn,
      newbornBirthDate: condition.newbornBirthDate
        ? condition.newbornBirthDate.toISOString().split('T')[0]
        : null,
      householdHeadStatus: condition.householdHeadStatus as HouseholdHeadStatus,
      isFirstTimeBuyer: condition.isFirstTimeBuyer,
      employmentStatus: condition.employmentStatus,
      createdAt: condition.createdAt.toISOString(),
      updatedAt: condition.updatedAt.toISOString(),
    };
  }

  /**
   * MARRIAGE_EXPECTED("3개월 이내 결혼예정") 규칙은 요청 바디만으로는 완전히 검증할 수 없다.
   * 이번 요청이 maritalStatus를 생략하면(부분 수정) 현재 유효한 상태는 DB에 이미 저장된 값이므로,
   * DTO(class-validator)가 아니라 여기서 "기존 값 + 이번 요청 값을 합친 유효값" 기준으로 검증한다.
   * (DTO에만 맡기면 maritalStatus를 생략한 채 marriageDate만 바꿔서 규칙을 우회할 수 있었다.)
   */
  async updateConditionProfile(userId: bigint, dto: UpdateConditionProfileRequestDto) {
    const needsExistingProfile =
      dto.maritalStatus === undefined ||
      (dto.maritalStatus === MaritalStatus.MARRIAGE_EXPECTED && dto.marriageDate === undefined);
    const existing = needsExistingProfile
      ? await this.usersRepository.findConditionProfileByUserId(BigInt(userId))
      : null;

    const effectiveMaritalStatus =
      dto.maritalStatus ?? (existing?.maritalStatus as MaritalStatus | undefined);

    if (effectiveMaritalStatus === MaritalStatus.MARRIAGE_EXPECTED) {
      const effectiveMarriageDate =
        dto.marriageDate !== undefined
          ? dto.marriageDate === null
            ? null
            : new Date(dto.marriageDate)
          : (existing?.marriageDate ?? null);

      if (!effectiveMarriageDate || !this.isWithinMarriageExpectedWindow(effectiveMarriageDate)) {
        throw new BadRequestException({
          code: 'USER400',
          message: `maritalStatus가 MARRIAGE_EXPECTED인 경우 marriageDate는 오늘로부터 ${MARRIAGE_EXPECTED_WITHIN_MONTHS}개월 이내의 미래 날짜여야 합니다.`,
        });
      }
    }

    const updated = await this.usersRepository.upsertConditionProfile(BigInt(userId), dto);
    return {
      userConditionProfileId: Number(updated.userConditionProfileId),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  /** marriageDate가 오늘부터 오늘+withinMonths까지(경계 포함) 범위인지 UTC 자정 기준으로 판정한다. */
  private isWithinMarriageExpectedWindow(marriageDate: Date): boolean {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const cutoff = addUtcMonthsClamped(today, MARRIAGE_EXPECTED_WITHIN_MONTHS);
    return marriageDate >= today && marriageDate <= cutoff;
  }
}
