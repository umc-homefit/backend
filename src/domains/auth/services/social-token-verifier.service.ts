import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { SocialProvider } from '../dto/auth.dto';

export interface VerifiedSocialUser {
  providerId: string;
  email?: string;
}

interface KakaoUserResponse {
  id: number;
  kakao_account?: {
    email?: string;
  };
}

interface GoogleTokenInfoResponse {
  aud: string;
  sub: string;
  email?: string;
}

@Injectable()
export class SocialTokenVerifierService {
  constructor(private readonly configService: ConfigService) {}

  async verify(provider: SocialProvider, oauthToken: string): Promise<VerifiedSocialUser> {
    if (provider === SocialProvider.KAKAO) {
      return this.verifyKakao(oauthToken);
    }
    return this.verifyGoogle(oauthToken);
  }

  private async verifyKakao(oauthToken: string): Promise<VerifiedSocialUser> {
    const response = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: `Bearer ${oauthToken}` },
    });

    if (!response.ok) {
      throw new UnauthorizedException('카카오 인증 토큰이 유효하지 않습니다.');
    }

    const data = (await response.json()) as KakaoUserResponse;

    return {
      providerId: String(data.id),
      email: data.kakao_account?.email,
    };
  }

  private async verifyGoogle(oauthToken: string): Promise<VerifiedSocialUser> {
    // 구글은 클라이언트가 ID Token(JWT)을 보내는 걸 전제로 한다.
    // 안드로이드가 access token을 보내는 방식이면, userinfo 엔드포인트(Authorization 헤더 방식)로
    // 바꿔야 하니 확인 필요.
    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(oauthToken)}`,
    );

    if (!response.ok) {
      throw new UnauthorizedException('구글 인증 토큰이 유효하지 않습니다.');
    }

    const data = (await response.json()) as GoogleTokenInfoResponse;

    // fail-closed: GOOGLE_CLIENT_ID가 설정 안 되어 있으면 aud 검증을 건너뛰지 않고
    // 즉시 요청을 막는다. 검증을 스킵하면 다른 앱용으로 발급된 ID Token도 통과될 수 있어서
    // (fail-open) 인증 관련 설정 누락을 절대 조용히 넘어가면 안 된다.
    const expectedClientId = this.configService.getOrThrow<string>('GOOGLE_CLIENT_ID');
    if (data.aud !== expectedClientId) {
      throw new UnauthorizedException('구글 인증 토큰의 발급 대상이 우리 앱이 아닙니다.');
    }

    return {
      providerId: data.sub,
      email: data.email,
    };
  }
}