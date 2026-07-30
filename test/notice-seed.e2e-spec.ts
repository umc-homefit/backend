import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { StartedPostgreSqlContainer, PostgreSqlContainer } from '@testcontainers/postgresql';
import request = require('supertest');

import { runNoticeSeed, NOTICE_SEED_PREFIX, NoticeSeedResult } from '../prisma/seed';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ApiResponseInterceptor } from '../src/common/interceptors/api-response.interceptor';
import { PrismaService } from '../src/prisma/prisma.service';

const execFileAsync = promisify(execFile);

describe('Android 연동용 Notice Seed (e2e)', () => {
  let app: INestApplication;
  let container: StartedPostgreSqlContainer;
  let prisma: PrismaService;
  let accessToken: string;
  let firstRun: NoticeSeedResult;
  let secondRun: NoticeSeedResult;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('homefit_seed_e2e')
      .withUsername('homefit')
      .withPassword('homefit-seed-e2e-password')
      .start();

    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = container.getConnectionUri();
    process.env.JWT_ACCESS_SECRET = 'homefit-seed-e2e-access-secret';
    process.env.JWT_REFRESH_SECRET = 'homefit-seed-e2e-refresh-secret';
    process.env.JWT_ACCESS_EXPIRES_IN = '1h';
    process.env.JWT_REFRESH_EXPIRES_IN = '14d';

    await applyMigrations(process.env.DATABASE_URL);

    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new ApiResponseInterceptor());
    await app.init();

    prisma = app.get(PrismaService);
    const seedNow = new Date();
    firstRun = await runNoticeSeed(prisma, seedNow, () => undefined);
    secondRun = await runNoticeSeed(prisma, seedNow, () => undefined);

    const user = await prisma.user.create({
      data: {
        email: 'notice-seed-e2e@homefit.test',
        provider: 'LOCAL',
        status: 'ACTIVE',
      },
    });
    accessToken = app.get(JwtService).sign({
      sub: user.userId.toString(),
      email: user.email,
    });
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    if (container) {
      await container.stop();
    }
  });

  it('두 번 실행해도 단지·공고·자식 데이터가 중복되지 않는다', async () => {
    expect(firstRun.complexes).toHaveLength(6);
    expect(firstRun.notices).toHaveLength(7);
    expect(secondRun.complexes.map((item) => item.complexId)).toEqual(
      firstRun.complexes.map((item) => item.complexId),
    );
    expect(secondRun.notices.map((item) => item.noticeId)).toEqual(
      firstRun.notices.map((item) => item.noticeId),
    );

    const [noticeCount, unitCount, conditionCount, fileCount] = await Promise.all([
      prisma.notice.count({ where: { dedupHash: { startsWith: NOTICE_SEED_PREFIX } } }),
      prisma.noticeUnit.count({
        where: { notice: { dedupHash: { startsWith: NOTICE_SEED_PREFIX } } },
      }),
      prisma.noticeCondition.count({
        where: { notice: { dedupHash: { startsWith: NOTICE_SEED_PREFIX } } },
      }),
      prisma.noticeFile.count({
        where: { notice: { dedupHash: { startsWith: NOTICE_SEED_PREFIX } } },
      }),
    ]);

    expect({ noticeCount, unitCount, conditionCount, fileCount }).toEqual({
      noticeCount: 7,
      unitCount: 7,
      conditionCount: 7,
      fileCount: 7,
    });
  });

  it.each([
    ['RECRUITING', 4],
    ['CLOSING_SOON', 1],
    ['SCHEDULED', 1],
    ['CLOSED', 1],
  ])('%s 상태 시나리오를 목록 API에서 확인한다', async (status, expectedCount) => {
    const response = await getNotices().query({ status, page: 0, size: 50 }).expect(200);

    expect(response.body.result.notices).toHaveLength(expectedCount);
    for (const notice of response.body.result.notices) {
      expect(notice.title).toContain('[TEST]');
      expect(notice.status).toBe(status);
    }
  });

  it('면적·보증금 경계와 일반모집 필터 시나리오를 제공한다', async () => {
    const boundaryNoticeId = noticeId('the-classic-additional-closing-soon');
    const overBoundaryNoticeId = noticeId('gajwa-additional-scheduled');

    const boundaryResponse = await getNotices()
      .query({ maxArea: 59, maxDeposit: 100000000, page: 0, size: 50 })
      .expect(200);
    const boundaryIds = boundaryResponse.body.result.notices.map(
      (notice: { noticeId: number }) => notice.noticeId,
    );
    expect(boundaryIds).toContain(boundaryNoticeId);
    expect(boundaryIds).not.toContain(overBoundaryNoticeId);

    const generalResponse = await getNotices()
      .query({ isAdditionalRecruitment: false, page: 0, size: 50 })
      .expect(200);
    expect(generalResponse.body.result.notices).toHaveLength(1);
    expect(generalResponse.body.result.notices[0]).toMatchObject({
      title: '[TEST] 서울대입구역 BX201 일반모집 필터 확인',
      isAdditionalRecruitment: false,
    });
  });

  it('상세 API가 주택형·자격조건·공식 안내 링크를 반환한다', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/notices/${noticeId('bx201-additional-recruiting')}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.result).toMatchObject({
      title: '[TEST] 서울대입구역 BX201 추가모집 · 모집중',
      units: [
        expect.objectContaining({
          unitName: '20A',
          exclusiveAreaM2: 20,
          depositMin: 30000000,
        }),
      ],
      conditions: [
        expect.objectContaining({
          targetType: 'YOUTH',
          requiresHomeless: true,
        }),
      ],
      files: [
        expect.objectContaining({
          fileType: 'LINK',
          fileUrl: 'https://bx201.com/notice',
        }),
      ],
    });
  });

  function getNotices(): request.Test {
    return request(app.getHttpServer())
      .get('/api/notices')
      .set('Authorization', `Bearer ${accessToken}`);
  }

  function noticeId(key: string): number {
    const notice = secondRun.notices.find((item) => item.key === key);
    if (!notice) {
      throw new Error(`Seed 공고를 찾을 수 없습니다: ${key}`);
    }
    return Number(notice.noticeId);
  }
});

async function applyMigrations(databaseUrl: string): Promise<void> {
  const prismaCliPath = require.resolve('prisma/build/index.js');
  await execFileAsync(process.execPath, [prismaCliPath, 'migrate', 'deploy'], {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });
}
