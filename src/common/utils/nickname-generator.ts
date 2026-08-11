const ADJECTIVES = [
  '우아한', '용감한', '행복한', '똑똑한', '재빠른', '든든한', '게으른', '배고픈',
  '수상한', '엉뚱한', '뻔뻔한', '까칠한', '어설픈', '능청스런', '삐딱한', '시크한',
  '허당인', '반짝이는', '유쾌한', '활기찬',
];

const ANIMALS = [
  '니카', '주드', '이든', '찬찬', '토리',
  '양파', '리비', '양고', '릴리', '제이',
];

/**
 * "우아한주드3817" 같은 형태의 랜덤 닉네임을 생성한다.
 * 형용사 + 팀원 이름 + 4자리 랜덤 숫자(0000~9999) 조합.
 * 완전한 유일성을 보장하진 않으므로(같은 조합이 우연히 나올 수 있음),
 * DB의 nickname UNIQUE 제약이 있다면 충돌 시 재시도 로직이 필요할 수 있다.
 */
export const generateRandomNickname = (): string => {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  const number = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');

  return `${adjective}${animal}${number}`;
};