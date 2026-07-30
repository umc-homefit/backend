/**
 * date에 months(음수 가능)만큼 UTC 기준으로 개월수를 더하되, 대상 월의 실제 일수를 넘지 않도록 날짜를 clamp한다.
 * JS Date의 setUTCMonth/setUTCFullYear는 day가 대상 월의 일수를 넘으면 다음 달로 자동 overflow되는데
 * (예: 11/30 + 3개월 -> setUTCMonth만 쓰면 2/30이 없어서 3/2로 밀림, 윤년 2/29 - 12개월도 동일 문제),
 * 이 함수는 day를 1로 고정한 뒤 월을 옮기고 마지막에 clamp된 day를 적용해 그런 밀림을 방지한다.
 */
export function addUtcMonthsClamped(date: Date, months: number): Date {
  const result = new Date(date);
  const originalDay = result.getUTCDate();

  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);

  const daysInTargetMonth = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
  ).getUTCDate();
  result.setUTCDate(Math.min(originalDay, daysInTargetMonth));

  return result;
}
