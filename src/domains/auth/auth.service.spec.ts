import { ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma, UserProvider, UserStatus } from '@prisma/client';

import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { SocialProvider } from './dto/auth.dto';
import { SocialTokenVerifierService } from './services/social-token-verifier.service';

describe('AuthService - 신규 가입 흐름 (User + 기본 프로필 원자적 생성)', () => {
  let service: AuthService;
  let authRepository: jest.Mocked<AuthRepository>;
  let socialTokenVerifier: jest.Mocked<SocialTokenVerifierService>;

  const mockUser = {
    userId: BigInt(1),
    email: 'test@example.com',
    provider: UserProvider.GOOGLE,
    providerId: 'google-sub-123',
    password: null,
    status: UserStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: AuthRepository,
          useValue: {
            findUserByEmail: jest.fn(),
            createEmailUser: jest.fn(),
            findUserByProvider: jest.fn(),
            createSocialUser: jest.fn(),
          },
        },
        { provide: JwtService, useValue: { sign: jest.fn().mockReturnValue('mocked.jwt') } },
        { provide: SocialTokenVerifierService, useValue: { verify: jest.fn() } },
      ],
    }).compile();

    service = module.get(AuthService);
    authRepository = module.get(AuthRepository);
    socialTokenVerifier = module.get(SocialTokenVerifierService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('이메일 신규 가입', () => {
    it('User+프로필 생성 호출이 정확히 1회이며, 랜덤 닉네임을 넘긴다', async () => {
      authRepository.findUserByEmail.mockResolvedValue(null);
      authRepository.createEmailUser.mockResolvedValue({
        ...mockUser,
        provider: UserProvider.LOCAL,
        password: 'hashed',
      });

      const result = await service.signup({
        email: 'new@example.com',
        password: 'Home2026#',
      });

      expect(result.isNewUser).toBe(true);
      expect(authRepository.createEmailUser).toHaveBeenCalledTimes(1);

      // 세 번째 인자(nickname)가 실제로 문자열로 전달됐는지만 확인 (정확한 값은 랜덤이라 형태만 체크)
      const [, , nicknameArg] = authRepository.createEmailUser.mock.calls[0];
      expect(typeof nicknameArg).toBe('string');
      expect(nicknameArg.length).toBeGreaterThan(0);
    });

    it('User+프로필 생성(nested create) 호출이 실패하면 signup() 전체가 실패하고, 별도 호출은 없다', async () => {
      authRepository.findUserByEmail.mockResolvedValue(null);
      authRepository.createEmailUser.mockRejectedValue(new Error('DB write failed'));

      await expect(
        service.signup({ email: 'fail@example.com', password: 'Home2026#' }),
      ).rejects.toThrow('DB write failed');

      // 예전 구조라면 createEmailUser 성공 후 별도로 createDefaultProfile을 호출했지만,
      // 지금은 단일 호출이라 실패 시 그걸로 끝 - 추가로 시도되는 쓰기 자체가 없다.
      expect(authRepository.createEmailUser).toHaveBeenCalledTimes(1);
    });
  });

  describe('소셜 신규 가입', () => {
    it('신규 유저는 User+프로필 생성 호출이 정확히 1회이며, 랜덤 닉네임을 넘긴다', async () => {
      socialTokenVerifier.verify.mockResolvedValue({
        providerId: 'google-sub-123',
        email: 'social-new@example.com',
      });
      authRepository.findUserByProvider.mockResolvedValue(null);
      authRepository.findUserByEmail.mockResolvedValue(null);
      authRepository.createSocialUser.mockResolvedValue(mockUser);

      const result = await service.socialAuth({
        provider: SocialProvider.GOOGLE,
        oauthToken: 'valid-token',
      });

      expect(result.isNewUser).toBe(true);
      expect(authRepository.createSocialUser).toHaveBeenCalledTimes(1);

      const [, , , nicknameArg] = authRepository.createSocialUser.mock.calls[0];
      expect(typeof nicknameArg).toBe('string');
      expect(nicknameArg.length).toBeGreaterThan(0);
    });

    it('User+프로필 생성이 실패하고 findUserByProvider로도 구제 안 되면 409로 변환된다 (부분 생성 상태 없음)', async () => {
      socialTokenVerifier.verify.mockResolvedValue({
        providerId: 'google-sub-race',
        email: 'race@example.com',
      });
      authRepository.findUserByProvider
        .mockResolvedValueOnce(null) // 최초 조회: 없음
        .mockResolvedValueOnce(null); // catch 블록에서 재조회: 그래도 없음 (진짜 다른 유저의 이메일 충돌)
      authRepository.findUserByEmail.mockResolvedValue(null);

      const prismaError = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '6.0.0',
        meta: { target: ['email'] },
      });
      authRepository.createSocialUser.mockRejectedValue(prismaError);

      await expect(
        service.socialAuth({ provider: SocialProvider.GOOGLE, oauthToken: 'valid-token' }),
      ).rejects.toThrow(ConflictException);

      // 실패한 단일 nested create 호출 외에, 별도로 프로필만 다시 만들려는 시도는 없다.
      expect(authRepository.createSocialUser).toHaveBeenCalledTimes(1);
    });
  });

  describe('기존 소셜 사용자 로그인 시 프로필 재생성 안 함', () => {
    it('findUserByProvider가 기존 유저를 찾으면 createSocialUser(및 프로필 생성)를 아예 호출하지 않는다', async () => {
      socialTokenVerifier.verify.mockResolvedValue({
        providerId: 'google-sub-123',
        email: 'existing@example.com',
      });
      authRepository.findUserByProvider.mockResolvedValue(mockUser);

      const result = await service.socialAuth({
        provider: SocialProvider.GOOGLE,
        oauthToken: 'valid-token',
      });

      expect(result.isNewUser).toBe(false);
      // 기존 유저를 찾았으니, User/프로필 생성 로직(nested create) 자체가 아예 실행되면 안 된다.
      expect(authRepository.createSocialUser).not.toHaveBeenCalled();
      expect(authRepository.findUserByEmail).not.toHaveBeenCalled();
    });
  });
});