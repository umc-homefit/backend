import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { MaritalStatus, UpdateConditionProfileRequestDto } from './users.dto';

describe('UpdateConditionProfileRequestDto - MARRIAGE_EXPECTED marriageDate 3개월 경계', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  const hasMarriageDateError = async (marriageDate: string) => {
    const dto = plainToInstance(UpdateConditionProfileRequestDto, {
      maritalStatus: MaritalStatus.MARRIAGE_EXPECTED,
      marriageDate,
    });
    const errors = await validate(dto, { skipMissingProperties: true });
    return errors.some(
      (error) =>
        error.property === 'marriageDate' &&
        error.constraints?.marriageExpectedWithinMonths !== undefined,
    );
  };

  it('정확히 3개월 뒤 같은 날짜는 경계값으로 통과한다', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-30T00:00:00.000Z'));
    expect(await hasMarriageDateError('2026-10-30')).toBe(false);
  });

  it('3개월 경계를 하루 넘긴 날짜는 거절된다', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-30T00:00:00.000Z'));
    expect(await hasMarriageDateError('2026-10-31')).toBe(true);
  });

  it('오늘 날짜는 경계 내(미래 아님)로 통과한다', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-30T00:00:00.000Z'));
    expect(await hasMarriageDateError('2026-07-30')).toBe(false);
  });

  it('과거 날짜는 MARRIAGE_EXPECTED 정의(미래 예정)에 맞지 않아 거절된다', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-30T00:00:00.000Z'));
    expect(await hasMarriageDateError('2026-07-29')).toBe(true);
  });
});
