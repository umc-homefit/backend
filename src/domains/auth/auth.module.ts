import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type { StringValue } from 'ms';

import { AuthController } from './auth.controller';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { SocialTokenVerifierService } from './services/social-token-verifier.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        // 프로젝트의 다른 설정값(jwt.strategy.ts, social-token-verifier.service.ts)과 동일하게
        // fail-closed 원칙을 적용한다: 시크릿이 없으면 서버가 정상 응답하는 대신 기동 단계에서 즉시 실패한다.
        secret: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          // jsonwebtoken의 SignOptions.expiresIn은 일반 string이 아니라 ms 패키지의
          // 템플릿 리터럴 타입(StringValue, 예: '1h'/'7d')을 요구한다. `as any`는 이 타입 검증을
          // 완전히 무력화하므로, 실제로 필요한 타입으로만 좁혀서 캐스팅한다.
          expiresIn: configService.get<string>('JWT_ACCESS_EXPIRES_IN', '1h') as StringValue,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthRepository, JwtStrategy, SocialTokenVerifierService],
  exports: [AuthService],
})
export class AuthModule {}