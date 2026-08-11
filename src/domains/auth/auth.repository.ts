import { Injectable } from '@nestjs/common';
import { UserProvider } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findUserByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  // User와 기본 프로필(nickname)을 nested create로 하나의 원자적 쓰기로 묶는다.
  // 별도 쿼리 두 번(User 생성 -> Profile 생성)으로 하면, 두 번째가 실패했을 때
  // User만 커밋된 채로 남는 불일치 상태가 생길 수 있어서다.
  async createEmailUser(email: string, hashedPassword: string, nickname: string) {
    return this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        provider: 'LOCAL',
        status: 'ACTIVE',
        profile: {
          create: { nickname },
        },
      },
    });
  }

  async findUserByProvider(provider: UserProvider, providerId: string) {
    return this.prisma.user.findUnique({
      where: {
        provider_providerId: { provider, providerId },
      },
    });
  }

  // 이메일 가입과 동일하게 User + 기본 프로필을 nested create로 원자적으로 묶는다.
  // 이렇게 하면 아래 catch 블록의 P2002 처리(동시 가입 race condition 구제)가
  // 프로필 쪽에서 난 제약 위반을 "이미 가입된 유저"로 오인할 일도 없어진다 —
  // 이 호출 전체가 User 테이블의 UNIQUE 제약(email, provider+providerId) 위반일 때만 P2002를 던진다.
  async createSocialUser(
    provider: UserProvider,
    providerId: string,
    email: string | undefined,
    nickname: string,
  ) {
    return this.prisma.user.create({
      data: {
        provider,
        providerId,
        email,
        status: 'ACTIVE',
        profile: {
          create: { nickname },
        },
      },
    });
  }
}