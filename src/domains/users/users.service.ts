import { Injectable, NotFoundException } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { 
  UpdateConditionProfileRequestDto, 
  UpdateProfileRequestDto 
} from './dto/users.dto';

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
      createdAt: condition.createdAt.toISOString(),
      updatedAt: condition.updatedAt.toISOString(),
    };
  }

  async updateConditionProfile(userId: bigint, dto: UpdateConditionProfileRequestDto) {
    const updated = await this.usersRepository.upsertConditionProfile(BigInt(userId), dto);
    return {
      userConditionProfileId: Number(updated.userConditionProfileId),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }
}