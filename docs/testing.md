# HomeFit Backend 테스트 가이드

## 타입 체크

```bash
npm run typecheck
```

`tsconfig.json` 기준으로 전체 파일을 컴파일 없이(`--noEmit`) 검사한다. `prisma generate`가 선행 실행되므로 별도 준비는 필요 없다.

`npm run build`와 검사 범위가 다르니 주의한다.

| | `npm run build` | `npm run typecheck` |
| --- | --- | --- |
| `src/**` | ✅ | ✅ |
| `prisma/seed.ts` | ❌ | ✅ |
| `test/**`, `*.spec.ts` | ❌ | ✅ |

`build`는 `tsconfig.build.json`을 쓰는데, 여기서 `prisma`를 `exclude`한다. 제외하지 않으면 출력이 `dist/src/main.js`로 밀려 `start:prod`의 `node dist/main.js`가 깨지기 때문에 의도된 설정이다.

그 결과 `prisma/seed.ts`는 빌드에도 `npm test`(`.spec.ts`만 수집)에도 잡히지 않는다. **seed를 수정했으면 `npm run typecheck`를 반드시 돌린다.**

## Notice API E2E 테스트

공고 API E2E 테스트는 Jest와 Supertest로 실제 NestJS HTTP 요청을 보내고, Testcontainers가 실행한 임시 PostgreSQL에 기존 Prisma migration을 적용한다.

테스트가 검증하는 주요 계약은 다음과 같다.

- 공고 목록·상세의 인증과 공통 응답 envelope
- 면적·보증금 상한 Query Parameter 생략 시 제한 없음
- 상한값 전달 시 경계값 포함과 초과값 제외
- 지역·상태·추가모집·정렬·페이지네이션
- 공고 상세의 주택형·자격조건·첨부파일·저장 여부
- 공고 저장·저장 해제 멱등성과 저장 수
- 잘못된 Query 400, 무인증 401, 없는 공고 404

### 사전 조건

- Node.js와 프로젝트 의존성이 설치되어 있어야 한다.
- Docker Desktop 또는 호환 Docker 엔진이 실행 중이어야 한다.
- 개발자의 로컬 `.env`나 PostgreSQL 데이터를 사용하거나 삭제하지 않는다.

### 실행

```bash
npm run test:e2e
```

테스트는 아래 순서로 독립 실행된다.

1. 임시 PostgreSQL 컨테이너 생성
2. `prisma migrate deploy`로 저장소의 migration 적용
3. 고정된 사용자·공고·주택형·조건·첨부파일 fixture 생성
4. HTTP API 계약 검증
5. NestJS 애플리케이션과 PostgreSQL 컨테이너 정리

실제 크롤링 사이트, AWS/Railway 리소스, 개발용 PostgreSQL에는 의존하지 않는다.
