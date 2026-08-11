import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request = require('supertest');

import { HttpExceptionFilter } from '../../common/filters/http-exception.filter';
import { ApiResponseInterceptor } from '../../common/interceptors/api-response.interceptor';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';

/**
 * size의 @Max(50) 검증만 확인하면 되므로, 실제 DB 대신 FinanceService를 목으로 대체하고
 * main.ts와 동일한 ValidationPipe/HttpExceptionFilter만 붙여 가볍게(Docker 불필요) 검증한다.
 */
describe('FinanceController size 파라미터 검증 (@Max(50))', () => {
  let app: INestApplication;

  const financeService = {
    getLoanProducts: jest.fn().mockResolvedValue({
      pageInfo: { page: 0, size: 20, totalElements: 0, totalPages: 0, hasNext: false },
      products: [],
    }),
    getGuides: jest.fn().mockResolvedValue({
      pageInfo: { page: 0, size: 20, totalElements: 0, totalPages: 0, hasNext: false },
      guides: [],
    }),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [FinanceController],
      providers: [
        { provide: FinanceService, useValue: financeService },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new ApiResponseInterceptor());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it.each([{ path: '/loan-products' }, { path: '/guides' }])(
    '$path: size=50은 통과한다',
    async ({ path }) => {
      const response = await request(app.getHttpServer())
        .get(path)
        .query({ size: 50 })
        .expect(200);

      expect(response.body.isSuccess).toBe(true);
    },
  );

  it.each([{ path: '/loan-products' }, { path: '/guides' }])(
    '$path: size=51은 COMMON400을 반환한다',
    async ({ path }) => {
      const response = await request(app.getHttpServer())
        .get(path)
        .query({ size: 51 })
        .expect(400);

      expect(response.body).toMatchObject({
        isSuccess: false,
        code: 'COMMON400',
        result: null,
      });
    },
  );
});
