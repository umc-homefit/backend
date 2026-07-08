import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface JwtPayload {
  sub: string;
  email: string | null;
}

export interface JwtValidatedUser {
  userId: bigint;
  email: string | null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  // 여기서 반환하는 값이 req.user에 그대로 들어간다.
  async validate(payload: JwtPayload): Promise<JwtValidatedUser> {
    return { userId: BigInt(payload.sub), email: payload.email };
  }
}