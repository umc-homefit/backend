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

## 기술 스택

- Framework: NestJS
- Language/Runtime: TypeScript + Node.js
- Database: PostgreSQL
- ORM: Prisma
- Auth: JWT Access Token + Refresh Token
- Validation: class-validator / class-transformer
- API Docs: Swagger + Notion API 명세
- Queue: BullMQ (Redis) - 추후 적용 예정
- Scheduler: node-cron - 추후 적용 예정
- Crawling: Playwright / Cheerio - 추후 적용 예정
- Push: FCM - 추후 적용 예정

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

## 협업 규칙

- 브랜치 전략, 커밋 메시지, PR/DB/API 변경 규칙: [GIT_CONVENTION.md](./GIT_CONVENTION.md)
- 라벨 가이드: [.github/LABELS_GUIDE.md](./.github/LABELS_GUIDE.md)
- 이슈/PR 템플릿: `.github/`
- API 명세는 Notion 문서를 우선 확인 (이슈 템플릿 `config.yml` 링크 참고)
- `main`, `dev`는 보호 규칙을 적용한다.
- 작업 브랜치는 PR로만 반영하며, 최소 1명 리뷰 승인 후 Squash merge한다.

## 브랜치

```text
main   최종 배포/데모 기준
dev    개발 통합 브랜치 (PR 기본 대상)
feature/* fix/* chore/* docs/* refactor/*
```

## 1차 구현 범위

- Auth/User: `POST /auth/signup`, `POST /auth/login`, `GET/PUT /users/me/condition-profile`
- Notice: `GET /notices`, `GET /notices/{noticeId}`
- Finance/Guide: `GET /loan-products`
- Eligibility: `POST /notices/{noticeId}/units/{unitId}/eligibility-analyses`
