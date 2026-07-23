import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { StartedPostgreSqlContainer, PostgreSqlContainer } from '@testcontainers/postgresql';
import request = require('supertest');

import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ApiResponseInterceptor } from '../src/common/interceptors/api-response.interceptor';
import { PrismaService } from '../src/prisma/prisma.service';

const execFileAsync = promisify(execFile);

type NoticeFixture = {
  boundaryNoticeId: number;
  largeNoticeId: number;
  smallNoticeId: number;
};

describe('Notice API contract (e2e)', () => {
  let app: INestApplication;
  let container: StartedPostgreSqlContainer;
  let prisma: PrismaService;
  let accessToken: string;
  let fixture: NoticeFixture;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('homefit_e2e')
      .withUsername('homefit')
      .withPassword('homefit-e2e-password')
      .start();

    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = container.getConnectionUri();
    process.env.JWT_ACCESS_SECRET = 'homefit-notice-e2e-access-secret';
    process.env.JWT_REFRESH_SECRET = 'homefit-notice-e2e-refresh-secret';
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
    const seeded = await seedNoticeFixtures(prisma);
    fixture = seeded.fixture;
    accessToken = app.get(JwtService).sign({
      sub: seeded.primaryUserId.toString(),
      email: 'notice-e2e@homefit.test',
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

  it('공고 목록은 인증되지 않은 요청을 AUTH401로 거부한다', async () => {
    const response = await request(app.getHttpServer()).get('/api/notices').expect(401);

    expect(response.body).toMatchObject({
      isSuccess: false,
      code: 'AUTH401',
      result: null,
    });
  });

  it('상한 Query Parameter를 생략하면 면적과 보증금 상한을 적용하지 않는다', async () => {
    const response = await getNotices().query({ sort: 'LATEST', page: 0, size: 10 }).expect(200);
    const noticeIds = response.body.result.notices.map(
      (notice: { noticeId: number }) => notice.noticeId,
    );

    expect(response.body).toMatchObject({
      isSuccess: true,
      code: 'NOTICE200',
      result: {
        pageInfo: {
          page: 0,
          size: 10,
          totalElements: 3,
          totalPages: 1,
          hasNext: false,
        },
      },
    });
    expect(noticeIds).toEqual(
      expect.arrayContaining([
        fixture.boundaryNoticeId,
        fixture.largeNoticeId,
        fixture.smallNoticeId,
      ]),
    );
  });

  it('maxArea와 maxDeposit은 경계값을 포함하고 초과 공고를 제외한다', async () => {
    const response = await getNotices()
      .query({ maxArea: 59, maxDeposit: 100000000, sort: 'LATEST' })
      .expect(200);
    const noticeIds = response.body.result.notices.map(
      (notice: { noticeId: number }) => notice.noticeId,
    );

    expect(noticeIds).toContain(fixture.boundaryNoticeId);
    expect(noticeIds).toContain(fixture.smallNoticeId);
    expect(noticeIds).not.toContain(fixture.largeNoticeId);
  });

  it('하한 Query만 전달하면 선택값 이상인 공고를 상한 없이 조회한다', async () => {
    const response = await getNotices()
      .query({ minArea: 20, minDeposit: 50000000, sort: 'LATEST' })
      .expect(200);
    const noticeIds = response.body.result.notices.map(
      (notice: { noticeId: number }) => notice.noticeId,
    );

    expect(noticeIds).toEqual(
      expect.arrayContaining([fixture.boundaryNoticeId, fixture.largeNoticeId]),
    );
    expect(noticeIds).not.toContain(fixture.smallNoticeId);
  });

  it('59㎡·1억 원 이상 마지막 눈금은 각각 상한 없이 조회한다', async () => {
    const areaResponse = await getNotices().query({ minArea: 59, sort: 'LATEST' }).expect(200);
    const areaNoticeIds = areaResponse.body.result.notices.map(
      (notice: { noticeId: number }) => notice.noticeId,
    );

    expect(areaNoticeIds).toEqual(
      expect.arrayContaining([fixture.boundaryNoticeId, fixture.largeNoticeId]),
    );
    expect(areaNoticeIds).not.toContain(fixture.smallNoticeId);

    const depositResponse = await getNotices()
      .query({ minDeposit: 100000000, sort: 'LATEST' })
      .expect(200);
    const depositNoticeIds = depositResponse.body.result.notices.map(
      (notice: { noticeId: number }) => notice.noticeId,
    );

    expect(depositNoticeIds).toContain(fixture.largeNoticeId);
    expect(depositNoticeIds).not.toContain(fixture.boundaryNoticeId);
    expect(depositNoticeIds).not.toContain(fixture.smallNoticeId);
  });

  it('지역·상태·추가모집·페이지네이션 계약을 함께 적용한다', async () => {
    const response = await getNotices()
      .query({
        region: '서울',
        district: '강동구',
        status: 'RECRUITING',
        isAdditionalRecruitment: true,
        sort: 'DEADLINE',
        page: 0,
        size: 1,
      })
      .expect(200);

    expect(response.body.result.notices).toHaveLength(1);
    expect(response.body.result.notices[0]).toMatchObject({
      noticeId: fixture.boundaryNoticeId,
      region: '서울',
      district: '강동구',
      status: 'RECRUITING',
      isAdditionalRecruitment: true,
    });
    expect(response.body.result.pageInfo).toEqual({
      page: 0,
      size: 1,
      totalElements: 1,
      totalPages: 1,
      hasNext: false,
    });
  });

  it('잘못된 공고 목록 Query Parameter는 COMMON400을 반환한다', async () => {
    const response = await getNotices().query({ maxArea: 'invalid' }).expect(400);

    expect(response.body).toMatchObject({
      isSuccess: false,
      code: 'COMMON400',
      result: null,
    });
  });

  it('공고 상세는 주택형·조건·첨부파일과 사용자 저장 여부를 반환한다', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/notices/${fixture.boundaryNoticeId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body).toMatchObject({
      isSuccess: true,
      code: 'NOTICE200',
      result: {
        noticeId: fixture.boundaryNoticeId,
        title: '경계값 청년안심주택',
        status: 'RECRUITING',
        isAdditionalRecruitment: true,
        isSaved: false,
        interestedCount: 1,
        units: [
          {
            unitName: '59A',
            exclusiveAreaM2: 59,
            depositMax: 100000000,
          },
        ],
        conditions: [
          {
            targetType: 'YOUTH',
            minAge: 19,
            maxAge: 39,
            requiresHomeless: true,
          },
        ],
        files: [
          {
            fileName: '경계값-공고문.pdf',
            fileType: 'PDF',
          },
        ],
      },
    });
  });

  it('존재하지 않는 공고 상세는 COMMON404를 반환한다', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/notices/999999')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);

    expect(response.body).toMatchObject({
      isSuccess: false,
      code: 'COMMON404',
      result: null,
    });
  });

  it('공고 저장과 저장 해제는 멱등하며 interestedCount를 중복 증가시키지 않는다', async () => {
    const firstSave = await saveBoundaryNotice().expect(201);
    const secondSave = await saveBoundaryNotice().expect(200);

    expect(firstSave.body.result).toMatchObject({
      noticeId: fixture.boundaryNoticeId,
      isSaved: true,
      interestedCount: 2,
    });
    expect(secondSave.body.result).toMatchObject({
      savedNoticeId: firstSave.body.result.savedNoticeId,
      noticeId: fixture.boundaryNoticeId,
      isSaved: true,
      interestedCount: 2,
    });

    const savedList = await request(app.getHttpServer())
      .get('/api/users/me/saved-notices')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(savedList.body.result.savedNotices).toEqual([
      expect.objectContaining({
        noticeId: fixture.boundaryNoticeId,
        interestedCount: 2,
      }),
    ]);

    const firstUnsave = await unsaveBoundaryNotice().expect(200);
    const secondUnsave = await unsaveBoundaryNotice().expect(200);

    expect(firstUnsave.body.result).toEqual({
      noticeId: fixture.boundaryNoticeId,
      isSaved: false,
      interestedCount: 1,
    });
    expect(secondUnsave.body.result).toEqual(firstUnsave.body.result);
  });

  function getNotices() {
    return request(app.getHttpServer())
      .get('/api/notices')
      .set('Authorization', `Bearer ${accessToken}`);
  }

  function saveBoundaryNotice() {
    return request(app.getHttpServer())
      .post(`/api/notices/${fixture.boundaryNoticeId}/save`)
      .set('Authorization', `Bearer ${accessToken}`);
  }

  function unsaveBoundaryNotice() {
    return request(app.getHttpServer())
      .delete(`/api/notices/${fixture.boundaryNoticeId}/save`)
      .set('Authorization', `Bearer ${accessToken}`);
  }
});

async function applyMigrations(databaseUrl: string): Promise<void> {
  const prismaCliPath = require.resolve('prisma/build/index.js');

  await execFileAsync(process.execPath, [prismaCliPath, 'migrate', 'deploy'], {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });
}

async function seedNoticeFixtures(prisma: PrismaService): Promise<{
  primaryUserId: bigint;
  fixture: NoticeFixture;
}> {
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;

  const [primaryUser, secondaryUser, seoulComplex, busanComplex] = await prisma.$transaction([
    prisma.user.create({
      data: {
        email: 'notice-e2e@homefit.test',
        provider: 'LOCAL',
        status: 'ACTIVE',
      },
    }),
    prisma.user.create({
      data: {
        email: 'notice-e2e-secondary@homefit.test',
        provider: 'LOCAL',
        status: 'ACTIVE',
      },
    }),
    prisma.housingComplex.create({
      data: {
        name: '강동 청년안심주택',
        region: '서울',
        district: '강동구',
        address: '서울 강동구 천호동 1',
      },
    }),
    prisma.housingComplex.create({
      data: {
        name: '부산 청년주택',
        region: '부산',
        district: '해운대구',
        address: '부산 해운대구 우동 1',
      },
    }),
  ]);

  const boundaryNotice = await prisma.notice.create({
    data: {
      complexId: seoulComplex.complexId,
      announcementNo: 'E2E-BOUNDARY',
      title: '경계값 청년안심주택',
      sourceUrl: 'https://example.com/notices/e2e-boundary',
      dedupHash: 'e2e-boundary',
      isAdditionalRecruitment: true,
      applicationStartAt: new Date(now.getTime() - dayMs),
      applicationEndAt: new Date(now.getTime() + 10 * dayMs),
      views: 100,
      createdAt: new Date(now.getTime() - 60 * 60 * 1000),
      units: {
        create: {
          unitName: '59A',
          exclusiveAreaM2: 59,
          supplyAreaM2: 70,
          depositMin: 50000000,
          depositMax: 100000000,
          monthlyRentMin: 300000,
          monthlyRentMax: 450000,
          supplyCount: 10,
        },
      },
      conditions: {
        create: {
          targetType: 'YOUTH',
          minAge: 19,
          maxAge: 39,
          incomeLimitAmount: 5000000,
          incomeLimitText: '월평균 소득 기준 이하',
          assetLimitAmount: 361000000,
          assetLimitText: '총자산 기준 이하',
          requiresHomeless: true,
          residenceRequirement: '서울시 거주 또는 직장 소재',
          rawConditionText: 'E2E 공고 조건 원문',
        },
      },
      files: {
        create: {
          fileName: '경계값-공고문.pdf',
          fileType: 'PDF',
          fileUrl: 'https://example.com/files/e2e-boundary.pdf',
          registeredAt: now,
        },
      },
    },
  });

  const largeNotice = await prisma.notice.create({
    data: {
      complexId: seoulComplex.complexId,
      announcementNo: 'E2E-LARGE',
      title: '상한 초과 청년안심주택',
      sourceUrl: 'https://example.com/notices/e2e-large',
      dedupHash: 'e2e-large',
      applicationStartAt: new Date(now.getTime() - dayMs),
      applicationEndAt: new Date(now.getTime() + 20 * dayMs),
      views: 200,
      createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      units: {
        create: {
          unitName: '75A',
          exclusiveAreaM2: 75,
          supplyAreaM2: 90,
          depositMin: 120000000,
          depositMax: 150000000,
          monthlyRentMin: 500000,
          monthlyRentMax: 650000,
          supplyCount: 5,
        },
      },
    },
  });

  const smallNotice = await prisma.notice.create({
    data: {
      complexId: busanComplex.complexId,
      announcementNo: 'E2E-SMALL',
      title: '소형 마감 공고',
      sourceUrl: 'https://example.com/notices/e2e-small',
      dedupHash: 'e2e-small',
      applicationStartAt: new Date(now.getTime() - 10 * dayMs),
      applicationEndAt: new Date(now.getTime() - dayMs),
      views: 50,
      createdAt: new Date(now.getTime() - 3 * 60 * 60 * 1000),
      units: {
        create: {
          unitName: '20A',
          exclusiveAreaM2: 20,
          supplyAreaM2: 30,
          depositMin: 10000000,
          depositMax: 30000000,
          monthlyRentMin: 150000,
          monthlyRentMax: 250000,
          supplyCount: 20,
        },
      },
    },
  });

  await prisma.savedNotice.create({
    data: {
      userId: secondaryUser.userId,
      noticeId: boundaryNotice.noticeId,
    },
  });

  return {
    primaryUserId: primaryUser.userId,
    fixture: {
      boundaryNoticeId: Number(boundaryNotice.noticeId),
      largeNoticeId: Number(largeNotice.noticeId),
      smallNoticeId: Number(smallNotice.noticeId),
    },
  };
}
