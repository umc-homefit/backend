import { Injectable } from '@nestjs/common';
import { UserProvider } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findUserByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async createEmailUser(email: string, hashedPassword: string) {
    return this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        provider: 'LOCAL',
        status: 'ACTIVE',
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

  async createSocialUser(provider: UserProvider, providerId: string, email?: string) {
    // email 중복 체크는 AuthService.socialAuth()에서 생성 전에 이미 처리한다.
    // 여기서 나는 UNIQUE 위반은 동시 요청으로 인한 race condition 정도이며,
    // 그 처리도 AuthService 쪽에서 findUserByProvider로 구제한다.
    return this.prisma.user.create({
      data: { provider, providerId, email, status: 'ACTIVE' },
    });
  }
}