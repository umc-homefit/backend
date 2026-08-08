import { AuthRepository } from './auth.repository';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * 이 테스트는 mock이 아니라 실제 로컬 개발 DB(.env의 DATABASE_URL)에 연결해서 돈다.
 *
 * 목적: Prisma nested create(User + Profile 동시 생성)가 진짜로 원자적인지,
 * 즉 "User 쪽 제약 위반으로 쓰기가 실패했을 때 반쪽짜리 row가 안 남는지"를
 * 실제 Postgres 트랜잭션 롤백으로 확인한다. (mock 테스트로는 증명 불가능한 부분)
 *
 * 실행 전 확인: 로컬 DB가 켜져 있어야 하고, .env의 DATABASE_URL이 올바르게 설정돼 있어야 한다.
 * 테스트가 만든 row는 afterAll에서 자동으로 정리된다.
 */
describe('AuthRepository (integration - 실제 DB, 원자성/롤백 확인)', () => {
  let prisma: PrismaService;
  let repository: AuthRepository;
  const testEmailPrefix = `rollback-test-${Date.now()}`;

  beforeAll(() => {
    prisma = new PrismaService();
    repository = new AuthRepository(prisma);
  });

  afterAll(async () => {
    // user_profiles가 users를 FK(RESTRICT)로 참조하고 있어서, User를 먼저 지우면
    // 참조 제약 위반으로 거부된다. Profile부터 지우고 나서 User를 지워야 한다.
    const testUsers = await prisma.user.findMany({
      where: { email: { startsWith: testEmailPrefix } },
      select: { userId: true },
    });
    const testUserIds = testUsers.map((u) => u.userId);

    if (testUserIds.length > 0) {
      await prisma.userProfile.deleteMany({
        where: { userId: { in: testUserIds } },
      });
      await prisma.user.deleteMany({
        where: { userId: { in: testUserIds } },
      });
    }

    await prisma.$disconnect();
  });

  it(
    'email UNIQUE 위반으로 nested create가 실패하면, 실패한 시도는 User/Profile 어느 쪽에도 ' +
      '흔적을 남기지 않는다 (실제 DB 트랜잭션 롤백 확인)',
    async () => {
      const email = `${testEmailPrefix}@example.com`;

      // 1. 첫 번째 가입 - 정상 성공해야 한다 (User + Profile 함께 생성됨)
      const firstUser = await repository.createEmailUser(email, 'hashed-pw-1', '우아한주드0001');
      expect(firstUser.email).toBe(email);

      // 2. 같은 이메일로 두 번째 시도.
      //    AuthService의 사전 중복 체크(findUserByEmail)를 거치지 않고 repository를 직접
      //    호출해서, 진짜 Postgres의 email UNIQUE 제약이 이 쓰기 전체를 막는지 확인한다.
      await expect(
        repository.createEmailUser(email, 'hashed-pw-2', '게으른이든0002'),
      ).rejects.toThrow();

      // 3. 실패한 두 번째 시도 때문에 "User는 있는데 Profile은 없는" 또는
      //    "email이 중복된 User가 2개 존재하는" 반쪽짜리/이상 상태가 생기지 않았는지
      //    DB를 직접 조회해서 확인한다.
      const usersWithEmail = await prisma.user.findMany({ where: { email } });
      expect(usersWithEmail).toHaveLength(1); // 첫 번째 성공한 유저 딱 하나만 있어야 함

      const profilesForUser = await prisma.userProfile.findMany({
        where: { userId: usersWithEmail[0].userId },
      });
      expect(profilesForUser).toHaveLength(1); // User 1개당 Profile도 정확히 1개
      expect(profilesForUser[0].nickname).toBe('우아한주드0001'); // 첫 번째 시도의 닉네임이 맞는지
    },
  );
});