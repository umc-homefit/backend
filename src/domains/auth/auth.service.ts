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
    // oauthToken 누락/공백은 DTO의 @IsNotEmpty()가 400으로 이미 막아준다(ValidationPipe).
    // 카카오/구글 서버에 실제로 토큰을 검증해서 진짜 providerId를 받아온다.
    const verified = await this.socialTokenVerifier.verify(dto.provider, dto.oauthToken);

    // dto.provider(우리가 정의한 SocialProvider enum)와 Prisma의 UserProvider enum은
    // 값(KAKAO/GOOGLE)은 같지만 TS 타입은 서로 달라서 캐스팅이 필요하다.
    const provider = dto.provider as unknown as UserProvider;

    let user = await this.authRepository.findUserByProvider(provider, verified.providerId);
    let isNewUser = false;

    if (!user) {
      // 정책: 이미 다른 provider(LOCAL 포함)로 같은 이메일이 가입되어 있으면
      // 별도 계정을 새로 만들지 않고 signup과 동일하게 409로 거부한다.
      // (계정 연결 기능은 지금 스키마(User당 provider 1개)로는 안전하게 구현할 수 없어서 범위 밖으로 둠)
      if (verified.email) {
        const existingByEmail = await this.authRepository.findUserByEmail(verified.email);
        if (existingByEmail) {
          throw new ConflictException({
            code: 'AUTH409',
            message: '이미 존재하는 이메일 주소입니다.',
          });
        }
      }

      try {
        user = await this.authRepository.createSocialUser(
          provider,
          verified.providerId,
          verified.email,
        );
        isNewUser = true;
      } catch (error) {
        // 동시에 같은 provider+providerId로 가입 요청이 들어온 race condition만 구제한다.
        // (먼저 생성된 유저를 찾아서 로그인 처리로 이어감. 그 외 원인은 그대로 던짐)
        const existing = await this.authRepository.findUserByProvider(
          provider,
          verified.providerId,
        );
        if (!existing) {
          throw error;
        }
        user = existing;
      }
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