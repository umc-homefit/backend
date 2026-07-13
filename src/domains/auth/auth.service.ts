import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { AuthRepository } from './auth.repository';
import { AuthResultDto, LoginRequestDto, SignupRequestDto } from './dto/auth.dto';

const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
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
  
  async logout(userId: bigint): Promise<void> {
    // TODO: 현재는 access token만 발급하는 stateless 구조라 서버에서 무효화할 대상이 없다.
    // refresh token을 도입하거나 access token 블랙리스트(Redis 등)를 쓰게 되면 여기서 실제 삭제/무효화 처리.
    void userId;
  }

  private issueAccessToken(userId: bigint, email: string | null): string {
    // JwtModule 기본 설정(JWT_ACCESS_SECRET, JWT_ACCESS_EXPIRES_IN) 사용
    return this.jwtService.sign({ sub: userId.toString(), email });
  }
}