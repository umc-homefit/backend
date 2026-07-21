import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserProvider } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { AuthRepository } from './auth.repository';
import {
  AuthResultDto,
  LoginRequestDto,
  SignupRequestDto,
  SocialAuthRequestDto,
} from './dto/auth.dto';
import { SocialTokenVerifierService } from './services/social-token-verifier.service';

const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly socialTokenVerifier: SocialTokenVerifierService,
  ) {}

  async signup(dto: SignupRequestDto): Promise<AuthResultDto> {
    const existing = await this.authRepository.findUserByEmail(dto.email);
    if (existing) {
      throw new ConflictException({
        code: 'AUTH409',
        message: '이미 존재하는 이메일 주소입니다.',
      });
    }

    const hashedPassword = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = await this.authRepository.createEmailUser(dto.email, hashedPassword);

    return {
      accessToken: this.issueAccessToken(user.userId, user.email),
      isNewUser: true,
      userId: Number(user.userId),
    };
  }

  async login(dto: LoginRequestDto): Promise<AuthResultDto> {
    const user = await this.authRepository.findUserByEmail(dto.email);

    // provider가 LOCAL이 아니거나 password가 없으면(소셜 계정) 로컬 로그인 대상이 아님
    if (!user || user.provider !== 'LOCAL' || !user.password) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    return {
      accessToken: this.issueAccessToken(user.userId, user.email),
      isNewUser: false,
      userId: Number(user.userId),
    };
  }

  async socialAuth(dto: SocialAuthRequestDto): Promise<AuthResultDto> {
    if (!dto.oauthToken) {
      throw new UnauthorizedException('소셜 인증 토큰이 필요합니다.');
    }

    // 카카오/구글 서버에 실제로 토큰을 검증해서 진짜 providerId를 받아온다.
    // dto.providerId(로컬 테스트 전용 필드)는 실제 검증 흐름에서는 사용하지 않는다.
    const verified = await this.socialTokenVerifier.verify(dto.provider, dto.oauthToken);

    // dto.provider(우리가 정의한 SocialProvider enum)와 Prisma의 UserProvider enum은
    // 값(KAKAO/GOOGLE)은 같지만 TS 타입은 서로 달라서 캐스팅이 필요하다.
    const provider = dto.provider as unknown as UserProvider;

    let user = await this.authRepository.findUserByProvider(provider, verified.providerId);
    let isNewUser = false;

    if (!user) {
      user = await this.authRepository.createSocialUser(
        provider,
        verified.providerId,
        verified.email,
      );
      isNewUser = true;
    }

    return {
      accessToken: this.issueAccessToken(user.userId, user.email),
      isNewUser,
      userId: Number(user.userId),
    };
  }

  async logout(userId: bigint): Promise<void> {
    void userId;
  }

  private issueAccessToken(userId: bigint, email: string | null): string {
    // JwtModule 기본 설정(JWT_ACCESS_SECRET, JWT_ACCESS_EXPIRES_IN) 사용
    return this.jwtService.sign({ sub: userId.toString(), email });
  }
}