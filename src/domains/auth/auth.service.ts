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
      accessToken: this.issueAccessToken(user.userId),
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
      accessToken: this.issueAccessToken(user.userId),
      isNewUser: false,
      userId: Number(user.userId),
    };
  }

  private issueAccessToken(userId: bigint): string {
    // JwtModule 기본 설정(JWT_ACCESS_SECRET, JWT_ACCESS_EXPIRES_IN) 사용
    return this.jwtService.sign({ sub: userId.toString() });
  }
}