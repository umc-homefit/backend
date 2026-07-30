import { FinanceRepository } from './finance.repository';
import { FinanceService } from './finance.service';

type IsWithinYearsFn = (date: Date, years: number, allowFuture?: boolean) => boolean;

describe('FinanceService - isWithinYears (UTC 경계 판정)', () => {
  let service: FinanceService;

  beforeEach(() => {
    service = new FinanceService({} as FinanceRepository);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const isWithinYears: IsWithinYearsFn = (date, years, allowFuture) =>
    (service as unknown as { isWithinYears: IsWithinYearsFn }).isWithinYears(date, years, allowFuture);

  it('오늘로부터 정확히 N년 전 같은 날짜는 경계값으로 포함된다', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-30T00:00:00.000Z'));
    expect(isWithinYears(new Date('2023-07-30T00:00:00.000Z'), 3)).toBe(true);
  });

  it('경계에서 하루 지난(더 과거) 날짜는 범위를 벗어난다', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-30T00:00:00.000Z'));
    expect(isWithinYears(new Date('2023-07-29T00:00:00.000Z'), 3)).toBe(false);
  });

  it('allowFuture=false(기본)이면 미래 날짜는 경계 계산 전에 무조건 탈락한다', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-30T00:00:00.000Z'));
    expect(isWithinYears(new Date('2026-07-31T00:00:00.000Z'), 3)).toBe(false);
  });

  it('allowFuture=true이면 미래 날짜도 통과할 수 있다 (MARRIAGE_EXPECTED 등)', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-30T00:00:00.000Z'));
    expect(isWithinYears(new Date('2026-07-31T00:00:00.000Z'), 3, true)).toBe(true);
  });

  it('오늘 날짜 자체는 항상 범위 내로 판정된다', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-30T00:00:00.000Z'));
    expect(isWithinYears(new Date('2026-07-30T00:00:00.000Z'), 3)).toBe(true);
  });
});
