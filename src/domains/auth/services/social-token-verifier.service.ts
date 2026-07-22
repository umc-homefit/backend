import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';

import { SocialProvider } from '../dto/auth.dto';

export interface VerifiedSocialUser {
  providerId: string;
  email?: string;
}

interface KakaoTokenInfoResponse {
  id: number;
  app_id: number;
  expires_in: number;
}

interface KakaoUserResponse {
  id: number;
  kakao_account?: {
    email?: string;
  };
}

@Injectable()
export class SocialTokenVerifierService {
  private readonly googleClient = new OAuth2Client();

  constructor(private readonly configService: ConfigService) {}

  async verify(provider: SocialProvider, oauthToken: string): Promise<VerifiedSocialUser> {
    if (provider === SocialProvider.KAKAO) {
      return this.verifyKakao(oauthToken);
    }
    return this.verifyGoogle(oauthToken);
  }

  private async verifyKakao(oauthToken: string): Promise<VerifiedSocialUser> {
    // 1. 이 토큰이 실제로 "우리 HomeFit 앱"용으로 발급된 게 맞는지 app_id로 먼저 확인한다.
    //    (구글의 aud 검증과 같은 역할. 이게 없으면 다른 카카오 앱용 토큰도 통과될 수 있다.)
    const tokenInfoResponse = await fetch('https://kapi.kakao.com/v1/user/access_token_info', {
      headers: { Authorization: `Bearer ${oauthToken}` },
    });

    if (!tokenInfoResponse.ok) {
      throw new UnauthorizedException('카카오 인증 토큰이 유효하지 않습니다.');
    }

    const tokenInfo = (await tokenInfoResponse.json()) as KakaoTokenInfoResponse;

    // fail-closed: KAKAO_APP_ID가 없으면 검증을 건너뛰지 않고 즉시 막는다.
    const expectedAppId = this.configService.getOrThrow<string>('KAKAO_APP_ID');
    if (String(tokenInfo.app_id) !== expectedAppId) {
      throw new UnauthorizedException('카카오 인증 토큰의 발급 대상이 우리 앱이 아닙니다.');
    }

    // 2. 발급 대상 확인이 끝났으면 실제 유저 정보(이메일 등)를 조회한다.
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
    // 운영 환경 권장 방식: tokeninfo 엔드포인트(디버깅 전용, 요청 제한 있음) 대신
    // 구글 공식 라이브러리(google-auth-library)의 verifyIdToken()을 사용한다.
    // 서명 검증, 만료 확인, audience(aud) 검증까지 한 번에 안전하게 처리해준다.
    const expectedClientId = this.configService.getOrThrow<string>('GOOGLE_CLIENT_ID');

    let ticket;
    try {
      ticket = await this.googleClient.verifyIdToken({
        idToken: oauthToken,
        audience: expectedClientId,
      });
    } catch {
      throw new UnauthorizedException('구글 인증 토큰이 유효하지 않거나 발급 대상이 우리 앱이 아닙니다.');
    }

    const payload = ticket.getPayload();
    if (!payload || !payload.sub) {
      throw new UnauthorizedException('구글 인증 토큰이 유효하지 않습니다.');
    }

    return {
      providerId: payload.sub,
      email: payload.email,
    };
  }
}