import { PrismaClient } from '@prisma/client';

import { AuthRepository } from './auth.repository';

/**
 * ⚠️ 이 테스트는 mock이 아니라 실제 DB에 연결해서 돈다.
 *
 * 파일명이 "*.spec.ts"도 "*.e2e-spec.ts"도 아닌 "*.integration.test.ts"인 이유:
 * jest.config.js(testRegex '\.spec\.ts$')와 test/jest-e2e.json(testRegex
 * '.e2e-spec.ts$') 둘 다 이 파일을 인식하지 못하게 이름을 지었다. 즉 기본
 * `npm test`와 `npm run test:e2e` 어디에도 자동으로 안 걸린다.
 *
 * 별도 config 파일 없이, package.json의 "test:integration" 스크립트가
 * `jest --testRegex="\.integration\.test\.ts$"`로 testRegex만 커맨드라인에서
 * 덮어써서 이 파일만 골라 실행한다 (jest.config.js의 나머지 설정은 그대로 재사용됨):
 *   npm run test:integration
 *
 * 안전장치: 앱이 평소 쓰는 DATABASE_URL은 절대 참조하지 않고,
 * 완전히 별개의 전용 환경변수 TEST_DATABASE_URL만 사용한다.
 * 값이 없거나 localhost가 아니면 즉시 실패한다 (원격/운영 DB 오염 방지).
 * .env 파일을 새로 만들 필요 없이, 실행 직전에 셸에서 임시로 지정하면 된다.
 *
 * 사전 준비 (최초 1회, DB 자체는 만들어야 함):
 *   1. 로컬 Postgres에 테스트 전용 DB 생성: CREATE DATABASE homefit_test;
 *   2. 그 DB에 마이그레이션 적용 (한 번만):
 *      $env:DATABASE_URL="postgresql://user:pw@localhost:5432/homefit_test?schema=public"
 *      npx prisma migrate deploy
 *
 * 실행:
 *   $env:TEST_DATABASE_URL="postgresql://user:pw@localhost:5432/homefit_test?schema=public"
 *   npm run test:integration
 */
describe('AuthRepository (integration - 별도 테스트 전용 DB)', () => {
  let prisma: PrismaClient;
  let repository: AuthRepository;
  const testEmailPrefix = `rollback-test-${Date.now()}`;

  beforeAll(() => {
    const testDbUrl = process.env.TEST_DATABASE_URL;

    if (!testDbUrl) {
      throw new Error(
        '[안전장치] TEST_DATABASE_URL이 설정되지 않았습니다. ' +
          '실행 전에 셸에서 임시로 지정해주세요 (.env 파일 불필요). ' +
          '이 테스트는 DATABASE_URL을 절대 사용하지 않습니다 (운영/공유 DB 오염 방지).',
      );
    }

    const isLocalDb = testDbUrl.includes('localhost') || testDbUrl.includes('127.0.0.1');
    if (!isLocalDb) {
      throw new Error(
        '[안전장치] TEST_DATABASE_URL이 localhost/127.0.0.1을 가리키고 있지 않습니다. ' +
          '원격 DB에 테스트 데이터가 생성되는 것을 막기 위한 가드입니다.',
      );
    }

    prisma = new PrismaClient({ datasources: { db: { url: testDbUrl } } });
    repository = new AuthRepository(prisma as unknown as never);
  });

  afterAll(async () => {
    const testUsers = await prisma.user.findMany({
      where: { email: { startsWith: testEmailPrefix } },
      select: { userId: true },
    });
    const testUserIds = testUsers.map((u) => u.userId);

    if (testUserIds.length > 0) {
      await prisma.userProfile.deleteMany({ where: { userId: { in: testUserIds } } });
      await prisma.user.deleteMany({ where: { userId: { in: testUserIds } } });
    }

    await prisma.$disconnect();
  });

  it(
    '프로필 컬럼 제약(nickname VARCHAR(50)) 위반으로 "프로필 쪽" 쓰기 자체가 실패하면, ' +
      'User도 함께 생성되지 않는다 (진짜 프로필 생성 실패 시나리오)',
    async () => {
      const email = `${testEmailPrefix}-profile-fail@example.com`;
      const tooLongNickname = 'a'.repeat(60);

      await expect(
        repository.createEmailUser(email, 'hashed-pw', tooLongNickname),
      ).rejects.toThrow();

      const usersWithEmail = await prisma.user.findMany({ where: { email } });
      expect(usersWithEmail).toHaveLength(0);
    },
  );

  it(
    'email UNIQUE 위반(User 쪽 실패)으로 nested create가 실패해도, 이전 성공 건은 그대로 ' +
      '있고 실패한 시도는 흔적을 안 남긴다',
    async () => {
      const email = `${testEmailPrefix}-email-conflict@example.com`;

      const firstUser = await repository.createEmailUser(email, 'hashed-pw-1', '우아한주드0001');
      expect(firstUser.email).toBe(email);

      await expect(
        repository.createEmailUser(email, 'hashed-pw-2', '게으른이든0002'),
      ).rejects.toThrow();

      const usersWithEmail = await prisma.user.findMany({ where: { email } });
      expect(usersWithEmail).toHaveLength(1);

      const profilesForUser = await prisma.userProfile.findMany({
        where: { userId: usersWithEmail[0].userId },
      });
      expect(profilesForUser).toHaveLength(1);
      expect(profilesForUser[0].nickname).toBe('우아한주드0001');
    },
  );
});