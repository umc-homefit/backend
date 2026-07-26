# HomeFit Backend

청년안심주택·공공/민간 임대주택 공고 정보와 사용자의 금융 조건(소득·자산·현금·무주택 여부)을 연결해,
"이 공고가 나에게 현실적인 선택인지"를 판단할 수 있도록 돕는 주거 금융 의사결정 서비스의 백엔드.

```text
공고 탐색 → 공고 상세 → 사용자 조건 입력 → 입주 가능성 분석
→ 부족 자금/월세 부담 확인 → 금융상품 정보 확인 → 관심 공고 저장/알림
```

## 도메인 구성

| 도메인 | 주요 책임 | 담당 |
| --- | --- | --- |
| Auth/User | 회원가입, 로그인, 사용자/금융 프로필, 알림 설정 | 주드 / 박주완 |
| Notice | 공고 목록·상세·필터, 저장 공고, 주택형, 첨부파일, 크롤링 | 찬찬 / 김찬혁 |
| Eligibility | 입주 가능성 분석, 필요 자금, 월세 부담률 | 니카 / 이나경 |
| Finance/Guide | 금융상품, 필요 서류, 금융 용어, 가이드 | 이든 / 정지훈 |

> Notification(알림 설정/FCM/발송)은 별도 도메인으로 분리하지 않고 Auth/User 중심으로 처리한다.
> 신규 공고 감지까지가 Notice 책임.

## MVP 데이터 범위

- 주택 데이터: 청년안심주택 추가모집 수요가 높은 6개 단지를 우선 대상으로 한다.
- 금융 데이터: 정책금융 및 1금융권 주거 금융 상품을 우선 제공한다.

## 기술 스택

- Framework: NestJS
- Language/Runtime: TypeScript + Node.js
- Database: PostgreSQL
- ORM: Prisma
- Auth: JWT Access Token + Refresh Token
- Validation: class-validator / class-transformer
- API Docs: Swagger + Notion API 명세 + `docs/api` 미러 문서
- Queue: BullMQ (Redis) - MVP 크롤링/알림 작업 큐 적용 예정
- Scheduler: node-cron - 매일 06:00 크롤링 트리거 예정
- Crawling: Playwright / Cheerio - 대상 단지 공고 수집 (매일 06:00 크롤링)
- Push: FCM - 신규 공고 알림 적용 예정

## 로컬 실행

```bash
# 1. 의존성 설치
npm install

# 2. 환경변수 설정
cp .env.example .env   # 값 채우기

# 3. Prisma
npx prisma generate
npx prisma migrate dev

# 4. 실행
npm run start:dev
```

- Health Check: `GET http://localhost:3000/api/health`
- Swagger: `http://localhost:3000/api/docs`

## Docker 실행 및 배포

Docker Compose로 API, PostgreSQL, Prisma migration을 같은 조건에서 실행할 수 있다.

```bash
cp .env.example .env
# .env의 POSTGRES_PASSWORD, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET 입력
docker compose up --build
```

Compose는 DB 준비 확인 → `prisma migrate deploy` → API 시작 순서로 실행하며, PostgreSQL 데이터는 Docker volume에 유지된다.
호스트에서 공개할 API 포트는 `.env`의 `API_HOST_PORT`로 변경할 수 있고, 컨테이너 내부 API 포트는 `3000`으로 유지한다.

- Health Check: `GET http://localhost:3000/api/health`
- Swagger: `http://localhost:3000/api/docs`
- 종료: `docker compose down`

Railway/AWS 환경변수, migration, HTTPS, 배포 후 확인 절차는 [배포 가이드](./docs/deployment.md)를 참고한다.

## API 문서

- Notion API 명세(SSOT): https://app.notion.com/p/api-38e2a03e23d98097aa90e434b9017faa
- Swagger: `http://localhost:3000/api/docs`
- GitHub 미러 문서:
  - [docs/api/README.md](./docs/api/README.md)
  - [docs/api/auth-user.md](./docs/api/auth-user.md)
  - [docs/api/notice.md](./docs/api/notice.md)
  - [docs/api/eligibility.md](./docs/api/eligibility.md)
  - [docs/api/finance-guide.md](./docs/api/finance-guide.md)
  - [docs/api/notification.md](./docs/api/notification.md)

API 변경 PR에서는 Notion, Swagger, `docs/api` 문서를 함께 최신화한다.

## 로컬 DB 개발 원칙

- 1차 개발은 각자 로컬 PostgreSQL을 사용한다.
- DB schema 변경은 Prisma schema와 migration으로 관리한다.
- `.env`의 `DATABASE_URL`은 개인 로컬 DB 주소를 사용한다.
- DataGrip은 DB 테이블/데이터 확인용으로 사용한다.
- Postman/Swagger는 API 요청/응답 테스트용으로 사용한다.
- 공유 dev DB는 Android 연동 또는 데모 준비 단계에서 별도로 구성한다.

## 협업 규칙

- 브랜치 전략, 커밋 메시지, PR/DB/API 변경 규칙: [GIT_CONVENTION.md](./GIT_CONVENTION.md)
- 라벨 가이드: [.github/LABELS_GUIDE.md](./.github/LABELS_GUIDE.md)
- 이슈/PR 템플릿: `.github/`
- API 명세는 Notion 문서를 우선 확인하고, GitHub 미러 문서는 [docs/api](./docs/api/README.md)를 참고한다.
- `main`, `dev`는 보호 규칙을 적용한다.
- 작업 브랜치는 PR로만 반영하며, 최소 1명 리뷰 승인 후 Squash merge한다.

## 브랜치

```text
main   최종 배포/데모 기준
dev    개발 통합 브랜치 (PR 기본 대상)
feature/* fix/* chore/* docs/* refactor/*
```

## 1차 구현 범위

| 도메인 | 1차 우선 구현 API | 문서 |
| --- | --- | --- |
| Auth/User | `POST /auth/signup`, `POST /auth/login`, `GET/PUT /users/me/condition-profile` | [auth-user.md](./docs/api/auth-user.md) |
| Notice | `GET /notices`, `GET /notices/{noticeId}` | [notice.md](./docs/api/notice.md) |
| Finance/Guide | `GET /loan-products` | [finance-guide.md](./docs/api/finance-guide.md) |
| Eligibility | `POST /notices/{noticeId}/units/{unitId}/eligibility-analyses` | [eligibility.md](./docs/api/eligibility.md) |
