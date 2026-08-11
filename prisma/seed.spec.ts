import { PrismaClient } from '@prisma/client';

import { runLoanProductSeed } from './seed';

/**
 * LOAN_PRODUCT_LOGO_BACKFILLS는 현재 4건 모두 providerLogoUrl이 null이다.
 * 이 상태에서 실행해도 "완료"로 읽히던 회귀를 막기 위해, DB 접근 없이 0건 경고를 남기는지 확인한다.
 */
describe('runLoanProductSeed - 로고 백필 0건 로깅', () => {
  it('URL 미확보 상태에서는 DB 조회·수정 없이 반영 0건 / 건너뜀 4건 경고를 남긴다', async () => {
    const findMany = jest.fn();
    const update = jest.fn();
    const tx = { loanProduct: { findMany, update } };
    const prisma = {
      $transaction: jest.fn((callback: (tx: unknown) => Promise<unknown>) => callback(tx)),
    } as unknown as PrismaClient;
    const log = jest.fn();

    await runLoanProductSeed(prisma, log);

    expect(findMany).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();

    const messages = log.mock.calls.map(([message]) => message as string);
    expect(messages).toEqual(
      expect.arrayContaining([
        expect.stringContaining('⚠️ 반영 0건 / 건너뜀 4건 (전체 4건)'),
        expect.stringContaining(
          'LOAN_PRODUCT_LOGO_BACKFILLS의 providerLogoUrl이 모두 null이라 DB는 변경되지 않았습니다.',
        ),
      ]),
    );
    expect(messages.some((message) => message.includes('완료 —'))).toBe(false);
  });
});
