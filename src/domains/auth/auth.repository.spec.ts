import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../prisma/prisma.service';
import { AuthRepository } from './auth.repository';

describe('AuthRepository', () => {
  let repository: AuthRepository;
  let prisma: { user: { create: jest.Mock } };

  beforeEach(async () => {
    prisma = {
      user: {
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthRepository, { provide: PrismaService, useValue: prisma }],
    }).compile();

    repository = module.get(AuthRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('createEmailUser는 User와 프로필(nickname)을 하나의 nested create 호출로 생성한다', async () => {
    prisma.user.create.mockResolvedValue({ userId: BigInt(1) });

    await repository.createEmailUser('test@example.com', 'hashed-pw', '우아한주드1234');

    // 별도 두 번의 쿼리(User 생성 -> Profile 생성)가 아니라, prisma.user.create가 딱 한 번만
    // 호출되고, 그 안에 profile.create가 nested로 들어있는지 확인한다.
    expect(prisma.user.create).toHaveBeenCalledTimes(1);
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        email: 'test@example.com',
        password: 'hashed-pw',
        provider: 'LOCAL',
        status: 'ACTIVE',
        profile: {
          create: { nickname: '우아한주드1234' },
        },
      },
    });
  });

  it('createSocialUser도 User와 프로필을 하나의 nested create 호출로 생성한다', async () => {
    prisma.user.create.mockResolvedValue({ userId: BigInt(2) });

    await repository.createSocialUser('GOOGLE' as never, 'google-sub-1', 'social@example.com', '게으른이든0042');

    expect(prisma.user.create).toHaveBeenCalledTimes(1);
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        provider: 'GOOGLE',
        providerId: 'google-sub-1',
        email: 'social@example.com',
        status: 'ACTIVE',
        profile: {
          create: { nickname: '게으른이든0042' },
        },
      },
    });
  });

  it('nested create 호출 자체가 실패하면(예: 프로필 쪽 제약 위반), User도 함께 생성되지 않는다', async () => {
    // prisma.user.create 하나가 통째로 reject된다는 건, User/Profile 어느 쪽도
    // 커밋되지 않는다는 뜻이다(단일 원자적 쓰기이므로 부분 성공이 존재하지 않음).
    const dbError = new Error('constraint violation on nested profile create');
    prisma.user.create.mockRejectedValue(dbError);

    await expect(
      repository.createEmailUser('rollback-test@example.com', 'hashed-pw', '허당인토리9999'),
    ).rejects.toThrow(dbError);

    expect(prisma.user.create).toHaveBeenCalledTimes(1);
  });
});