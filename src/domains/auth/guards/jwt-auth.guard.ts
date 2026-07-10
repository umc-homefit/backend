import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = any>(err: unknown, user: TUser, info: unknown, _context: ExecutionContext): TUser {
    if (err || !user) {
      // Passport 기본 메시지("Unauthorized") 대신 프로젝트 톤에 맞는 한글 메시지로 통일
      throw new UnauthorizedException('인증이 필요합니다. 로그인 후 다시 시도해주세요.');
    }
    return user;
  }
}