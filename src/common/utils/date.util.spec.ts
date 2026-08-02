import { addUtcMonthsClamped } from './date.util';

/**
 * 이 유틸은 "월을 옮길 때 대상 월에 없는 날짜로 밀리는" overflow를 막으려고 만든 것이다.
 * 예전에 setUTCFullYear만 쓰다가 윤년 2/29에서 3/1로 밀리는 버그가 있었으므로,
 * clamp가 실제로 동작하는지 경계 케이스로 고정해둔다.
 */
describe('addUtcMonthsClamped', () => {
  const iso = (date: Date) => date.toISOString().slice(0, 10);

  describe('윤년 경계', () => {
    it('윤년 2/29에서 12개월을 빼면 3/1로 밀리지 않고 2/28이 된다', () => {
      expect(iso(addUtcMonthsClamped(new Date('2024-02-29T00:00:00Z'), -12))).toBe('2023-02-28');
    });

    it('윤년 2/29에서 12개월을 더해도 2/28이 된다', () => {
      expect(iso(addUtcMonthsClamped(new Date('2024-02-29T00:00:00Z'), 12))).toBe('2025-02-28');
    });

    it('평년 2/28에서 12개월을 빼면 윤년이어도 2/28 그대로다', () => {
      expect(iso(addUtcMonthsClamped(new Date('2025-02-28T00:00:00Z'), -12))).toBe('2024-02-28');
    });
  });

  describe('말일 clamp', () => {
    it('11/30에 3개월을 더하면 2/30이 없으므로 2/28로 clamp된다', () => {
      expect(iso(addUtcMonthsClamped(new Date('2025-11-30T00:00:00Z'), 3))).toBe('2026-02-28');
    });

    it('8/31에 1개월을 더하면 9/31이 없으므로 9/30으로 clamp된다', () => {
      expect(iso(addUtcMonthsClamped(new Date('2026-08-31T00:00:00Z'), 1))).toBe('2026-09-30');
    });

    it('대상 월에 날짜가 존재하면 그대로 유지한다', () => {
      expect(iso(addUtcMonthsClamped(new Date('2026-08-02T00:00:00Z'), 3))).toBe('2026-11-02');
    });
  });

  it('원본 Date를 변경하지 않는다', () => {
    const original = new Date('2024-02-29T00:00:00Z');
    addUtcMonthsClamped(original, -12);

    expect(iso(original)).toBe('2024-02-29');
  });
});
