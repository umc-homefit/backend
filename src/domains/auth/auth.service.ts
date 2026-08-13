import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma, UserProvider } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { generateRandomNickname } from '../../common/utils/nickname-generator';
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

    let user;
    try {
      // User + 기본 프로필(랜덤 닉네임)을 nested create로 한 번에 원자적으로 생성한다.
      user = await this.authRepository.createEmailUser(
        dto.email,
        hashedPassword,
        generateRandomNickname(),
      );
    } catch (error) {
      // findUserByEmail → createEmailUser 사이에 동시 요청이 오면 P2002가 발생할 수 있다.
      // socialAuth의 createSocialUser와 동일하게, 재조회해서 이미 생성된 유저가 있으면
      // 동시 요청 중 하나가 먼저 성공한 것이므로 그 유저로 토큰을 발급한다.
      // 재조회해도 없다면 다른 이메일 제약 충돌이므로 409로 응답한다.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const created = await this.authRepository.findUserByEmail(dto.email);
        if (created) {
          user = created;
        } else {
          throw new ConflictException({
            code: 'AUTH409',
            message: '이미 존재하는 이메일 주소입니다.',
          });
        }
      } else {
        throw error;
      }
    }

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

    this.assertActiveStatus(user.status);

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
        // User + 기본 프로필을 nested create로 한 번에 원자적으로 생성한다.
        // 이 호출 하나가 통째로 실패/성공하므로, 아래 catch의 P2002는 오직
        // User 테이블의 UNIQUE 제약(email, provider+providerId) 위반일 때만 발생한다 —
        // 프로필 쪽 문제를 "이미 가입된 유저"로 오인할 여지가 없다.
        user = await this.authRepository.createSocialUser(
          provider,
          verified.providerId,
          verified.email,
          generateRandomNickname(),
        );
        isNewUser = true;
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          // DB가 email과 (provider, providerId) 중 어떤 UNIQUE 제약을 먼저 보고했는지는
          // 신뢰하지 않는다. 동시에 같은 소셜 계정으로 두 요청이 들어오면, 어느 쪽 제약이
          // 먼저 걸리는지는 타이밍에 따라 달라질 수 있어 결과가 들쭉날쭉해질 수 있기 때문이다.
          //
          // 대신 항상 먼저 "나(provider+providerId) 자신이 이미 생성됐는지"부터 확인한다.
          // 이미 있다면 동시 요청 중 하나가 먼저 성공한 것뿐이므로 그 유저로 정상 로그인
          // 처리한다. 없다면 그제서야 "다른 유저가 이 이메일을 쓰고 있다"는 뜻이므로 409.
          const existing = await this.authRepository.findUserByProvider(
            provider,
            verified.providerId,
          );

          if (existing) {
            user = existing;
          } else {
            throw new ConflictException({
              code: 'AUTH409',
              message: '이미 존재하는 이메일 주소입니다.',
            });
          }
        } else {
          throw error;
        }
      }
    }

    this.assertActiveStatus(user.status);

    return {
      accessToken: this.issueAccessToken(user.userId, user.email),
      isNewUser,
      userId: Number(user.userId),
    };
  }

  // login/socialAuth 공통: 탈퇴 등으로 INACTIVE 처리된 계정은 토큰 발급을 거부한다.
  // (소셜 로그인으로 재조회했을 때 status 확인 없이 우회 로그인되는 것을 막기 위함)
  private assertActiveStatus(status: string): void {
    if (status !== 'ACTIVE') {
      throw new UnauthorizedException('비활성화된 계정입니다.');
    }
  }

  async logout(userId: bigint): Promise<void> {
    void userId;
  }

  private issueAccessToken(userId: bigint, email: string | null): string {
    // JwtModule 기본 설정(JWT_ACCESS_SECRET, JWT_ACCESS_EXPIRES_IN) 사용
    return this.jwtService.sign({ sub: userId.toString(), email });
  }
}