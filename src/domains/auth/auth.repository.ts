import { Injectable } from '@nestjs/common';
import { Prisma, UserProvider } from '@prisma/client';

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
    try {
      return await this.prisma.user.create({
        data: { provider, providerId, email, status: 'ACTIVE' },
      });
    } catch (error) {
      // email이 이미 다른 계정(로컬 가입 등)에 쓰이고 있으면 UNIQUE 위반 발생.
      // 이 경우 email 없이 계정만 생성한다 (소셜 로그인 자체는 막지 않음).
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return this.prisma.user.create({
          data: { provider, providerId, status: 'ACTIVE' },
        });
      }
      throw error;
    }
  }
}