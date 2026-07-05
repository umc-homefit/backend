import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { 
  UpdateConditionProfileRequestDto, 
  UpdateProfileRequestDto 
} from './dto/users.dto';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  // 1. 유저 기본 정보 조회
  async findUserById(userId: bigint) {
    return await this.prisma.user.findUnique({
      where: { userId },
    });
  }

  // 2. 회원 상태 수정 (탈퇴 시 Soft Delete 등에 활용)
  async updateUserStatus(userId: bigint, status: string) {
    return await this.prisma.user.update({
      where: { userId },
      data: { status },
    });
  }

  // 3. 유저 프로필 조회
  async findProfileByUserId(userId: bigint) {
    return await this.prisma.userProfile.findUnique({
      where: { userId },
    });
  }

  // 4. 유저 프로필 수정 (upsert)
  async upsertProfile(userId: bigint, dto: UpdateProfileRequestDto) {
    const birthDateObj = dto.birthDate ? new Date(dto.birthDate) : undefined;

    return await this.prisma.userProfile.upsert({
      where: { userId },
      update: {
        nickname: dto.nickname,
        birthDate: birthDateObj,
        phoneNumber: dto.phoneNumber,
        profileImageUrl: dto.profileImageUrl,
      },
      create: {
        userId,
        nickname: dto.nickname,
        birthDate: birthDateObj,
        phoneNumber: dto.phoneNumber,
        profileImageUrl: dto.profileImageUrl,
      },
    });
  }

  // 5. 금융 조건 프로필 조회
  async findConditionProfileByUserId(userId: bigint) {
    return await this.prisma.userConditionProfile.findUnique({
      where: { userId },
    });
  }

  // 6. 금융 조건 프로필 수정 (upsert)
  async upsertConditionProfile(userId: bigint, dto: UpdateConditionProfileRequestDto) {
    const conditionData = {
      monthlyIncomeAmount: BigInt(dto.monthlyIncomeAmount),
      totalAssetAmount: BigInt(dto.totalAssetAmount),
      totalDebtAmount: BigInt(dto.totalDebtAmount),
      monthlyDebtPaymentAmount: BigInt(dto.monthlyDebtPaymentAmount),
      cashSavings: BigInt(dto.cashSavings),
      isHomeless: dto.isHomeless,
      residenceRegionCode: dto.residenceRegionCode,
      workplaceRegionCode: dto.workplaceRegionCode,
      housingOwnershipStatus: dto.housingOwnershipStatus,
    };

    return await this.prisma.userConditionProfile.upsert({
      where: { userId },
      update: conditionData,
      create: { userId, ...conditionData },
    });
  }
}