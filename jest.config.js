/**
 * 유닛 테스트 전용 설정. e2e는 별도 설정(`test/jest-e2e.json`)을 쓴다.
 * testRegex가 `.spec.ts`라 `*.e2e-spec.ts`는 여기서 잡히지 않는다(앞이 `-`라 `\.spec\.ts$`에 안 걸림).
 */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testEnvironment: 'node',
  testRegex: '\\.spec\\.ts$',
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
