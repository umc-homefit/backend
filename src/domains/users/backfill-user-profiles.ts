/**
 * 특정 계정 3개(테스트용)에만 기본 프로필(랜덤 닉네임)을 채워주는 스코프 한정 백필 스크립트.
 *
 * 안전장치:
 * 1. 대상 이메일을 하드코딩된 목록으로 딱 3개만 한정한다 (전체 유저를 스캔하지 않음).
 * 2. 하나의 $transaction 안에서 처리한다. 대상 조회 결과가 정확히 3건이 아니면
 *    (이미 프로필이 있거나, 이메일이 틀렸거나, 계정 자체가 없는 경우) 아무것도 쓰지 않고
 *    즉시 에러로 중단한다 - 부분 반영 자체가 발생할 수 없다.
 * 3. 실행 전 "접속 대상이 어디인지" 호스트/DB명만 콘솔에 출력한다. 비밀번호는
 *    코드·로그·콘솔 어디에도 절대 출력하지 않는다.
 * 4. DB 접속 정보는 코드에 하드코딩하지 않고, 실행 시점에 셸 환경변수로만 받는다
 *    (BACKFILL_DATABASE_URL - 다른 스크립트의 DATABASE_URL/TEST_DATABASE_URL과
 *    헷갈리지 않도록 이름을 분리했다). .env 파일에 적어두지 말고, 실행 직전에만
 *    셸에서 설정하고 끝나면 세션을 닫아 흔적을 남기지 않는다.
 *
 * 실행 (PowerShell):
 *   $env:BACKFILL_DATABASE_URL="postgresql://...실제 대상 DB URL..."
 *   npx ts-node src/domains/users/backfill-user-profiles.ts
 *
 * 실행 후: 이 스크립트 파일과 셸 히스토리에 남은 URL을 커밋/공유하지 않도록 주의한다.
 */
import { PrismaClient } from '@prisma/client';

import { generateRandomNickname } from '../../common/utils/nickname-generator';

const TARGET_EMAILS = [
  'test-noprofile@homefit.com',
  'test-eligible@homefit.com',
  'test-ineligible@homefit.com',
];

async function main() {
  const dbUrl = process.env.BACKFILL_DATABASE_URL;
  if (!dbUrl) {
    throw new Error(
      '[Backfill] BACKFILL_DATABASE_URL이 설정되지 않았습니다. 실행 전 셸에서 지정해주세요.',
    );
  }

  // 접속 대상 확인용 - 비밀번호는 절대 출력하지 않고 호스트/포트/DB명만 보여준다.
  const parsed = new URL(dbUrl);
  console.log(
    `[Backfill] 접속 대상: ${parsed.protocol}//${parsed.hostname}:${parsed.port}${parsed.pathname}`,
  );
  console.log(`[Backfill] 이 정보가 의도한 DB(Railway 등)가 맞는지 확인 후 계속 진행됩니다.`);
  console.log(`[Backfill] 대상 계정 ${TARGET_EMAILS.length}개: ${TARGET_EMAILS.join(', ')}`);

  const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });

  try {
    const created = await prisma.$transaction(async (tx) => {
      // "프로필 row 자체가 없는 경우"뿐 아니라, "프로필은 있는데 nickname만 비어있는 경우"도
      // 대상에 포함한다 (PUT /users/me/profile로 다른 필드만 먼저 채운 계정이 있을 수 있어서).
      const users = await tx.user.findMany({
        where: {
          email: { in: TARGET_EMAILS },
          OR: [{ profile: null }, { profile: { nickname: null } }],
        },
        include: { profile: true },
      });

      // 딱 3건이 아니면 아무것도 쓰지 않고 트랜잭션 자체를 실패시킨다.
      if (users.length !== TARGET_EMAILS.length) {
        const foundEmails = users.map((u) => u.email);
        const missing = TARGET_EMAILS.filter((email) => !foundEmails.includes(email));
        throw new Error(
          `[Backfill] 예상 대상 수(${TARGET_EMAILS.length})와 실제 조회 수(${users.length})가 다릅니다. ` +
            `누락/이미 닉네임 보유: ${missing.length > 0 ? missing.join(', ') : '(대상 자체가 이미 닉네임 보유 중)'}. ` +
            `안전을 위해 아무것도 반영하지 않고 중단합니다.`,
        );
      }

      const results: { email: string; nickname: string }[] = [];
      for (const user of users) {
        const nickname = generateRandomNickname();

        if (user.profile) {
          // 프로필 row는 있지만 nickname만 비어있는 경우 -> 닉네임만 채워 넣는다.
          await tx.userProfile.update({
            where: { userId: user.userId },
            data: { nickname },
          });
        } else {
          // 프로필 row 자체가 없는 경우 -> 새로 생성한다.
          await tx.userProfile.create({ data: { userId: user.userId, nickname } });
        }

        results.push({ email: user.email ?? '(이메일 없음)', nickname });
      }

      return results;
    });

    if (created.length !== 3) {
      // 트랜잭션이 이미 커밋된 뒤라면 여기 도달할 일이 없어야 정상이지만, 이중 확인 차원.
      throw new Error(`[Backfill] 반영 건수가 3건이 아닙니다 (실제: ${created.length}건).`);
    }

    console.log(`[Backfill] 완료. 정확히 ${created.length}건 반영됨:`);
    created.forEach((r) => console.log(`  - ${r.email} -> ${r.nickname}`));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('[Backfill] 실행 중 오류:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});