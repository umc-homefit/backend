# HomeFit Backend Git 협업 규칙

이 문서는 HomeFit 백엔드 팀이 GitHub Organization Repository에서 협업할 때 사용할 기본 규칙을 정리한 문서이다.

대상 레포지토리:

- GitHub Organization: `umc-homefit`
- Backend Repository: `backend`

## 1. 브랜치 전략

기본 브랜치 구조는 아래처럼 가져간다.

```text
main
└── dev
    ├── feature/*
    ├── fix/*
    ├── chore/*
    └── refactor/*
```

### 브랜치 역할

| 브랜치 | 용도 |
| --- | --- |
| `main` | 최종 배포/데모 기준 브랜치 |
| `dev` | 개발 통합 브랜치 |
| `feature/*` | 기능 개발 브랜치 |
| `fix/*` | 버그 수정 브랜치 |
| `chore/*` | 설정, 환경, 문서 등 기능 외 작업 브랜치 |
| `refactor/*` | 기능 변경 없는 코드 구조 개선 브랜치 |

## 2. 브랜치 이름 규칙

브랜치 이름은 아래 형식을 사용한다.

```text
작업유형/도메인-작업내용
```

예시:

```text
feature/notice-list
feature/notice-detail
feature/auth-login
feature/eligibility-analysis
feature/loan-products
fix/notice-filter
chore/prisma-setup
chore/swagger-setup
docs/api-spec
refactor/notice-service
```

## 3. 커밋 메시지 규칙

커밋 메시지는 아래 형식을 사용한다.

```text
type: 작업 내용
```

| type | 의미 | 예시 |
| --- | --- | --- |
| `feat` | 기능 추가 | `feat: 공고 목록 조회 API 추가` |
| `fix` | 버그 수정 | `fix: 공고 필터 조건 오류 수정` |
| `docs` | 문서 수정 | `docs: API 명세서 작성 규칙 추가` |
| `refactor` | 리팩터링 | `refactor: notice service 구조 개선` |
| `chore` | 설정/환경 작업 | `chore: prisma 초기 설정 추가` |
| `test` | 테스트 추가/수정 | `test: 공고 목록 조회 테스트 추가` |

## 4. 작업 흐름

기능 개발은 항상 `dev`에서 새 브랜치를 생성해서 진행한다.

```bash
git switch dev
git pull origin dev
git switch -c feature/notice-list
```

작업 완료 후에는 원격 브랜치에 push한다.

```bash
git push origin feature/notice-list
```

그 다음 GitHub에서 Pull Request를 생성한다.

## 5. Pull Request 규칙

PR은 기본적으로 `dev` 브랜치로 올린다.

```text
feature/* → dev
fix/* → dev
chore/* → dev
refactor/* → dev
```

### PR 작성 시 포함할 내용

PR 본문에는 아래 내용을 가능한 범위에서 작성한다.

```md
## 작업 내용

- 

## 변경 사항

- 

## 확인한 내용

- [ ] 로컬 실행 확인
- [ ] API 응답 확인
- [ ] Swagger/Notion API 명세 반영

## 공유 사항

- 
```

### PR 체크 기준

- 최소 1명 이상 리뷰 후 merge한다.
- DB schema 변경이 있으면 PR 본문에 반드시 적는다.
- API Request/Response 변경이 있으면 Swagger와 Notion API 명세를 같이 수정한다.
- `.env` 파일은 커밋하지 않는다.
- 환경변수 예시는 `.env.example`로 관리한다.

## 6. Merge 규칙

- PR은 리뷰 후 `dev`에 merge한다.
- `main`에는 데모/배포 기준으로만 merge한다.
- 충돌이 발생하면 해당 브랜치 담당자가 우선 해결한다.
- 급한 수정이 아니라면 `main`에 직접 push하지 않는다.

## 7. 도메인별 작업 범위

현재 백엔드는 도메인 기준으로 역할을 나눈다.

| 도메인 | 주요 책임 |
| --- | --- |
| Auth/User | 회원가입, 로그인, 사용자 프로필, 사용자 조건 프로필, 알림 설정 |
| Notice | 공고 목록, 공고 상세, 주택형, 조건, 첨부파일, 저장 공고, 크롤링 |
| Eligibility Analysis | 입주 가능성 분석, 부족 자금, 월세 부담률, 조건별 분석 결과 |
| Finance/Guide | 금융상품, 필요 서류, 금융 용어, 청약 가이드 |

Notification은 별도 도메인으로 분리하기보다 Auth/User와 Notice가 연결해서 처리한다.

- 신규 공고 감지: Notice
- 알림 설정/FCM 토큰/알림 로그: Auth/User 중심

## 8. API 명세 관리 규칙

API는 Swagger와 Notion API 명세서를 함께 관리한다.

API 변경 시 아래 항목을 확인한다.

- Endpoint 변경 여부
- Request Body 변경 여부
- Query Parameter 변경 여부
- Path Variable 변경 여부
- Response Field 변경 여부
- Error Response 변경 여부
- Android 화면 영향 여부

API 명세 변경이 있는 PR은 PR 본문에 아래처럼 적는다.

```md
## API 변경 사항

- 변경 API:
- 변경 내용:
- Android 확인 필요 여부:
```

## 9. DB/Prisma 변경 규칙

DB schema 또는 Prisma schema 변경 시 PR에 반드시 명시한다.

```md
## DB 변경 사항

- 변경 테이블:
- 추가/수정/삭제 필드:
- migration 필요 여부:
- seed 데이터 영향:
```

주의사항:

- 기존 필드 삭제는 팀원과 먼저 공유한다.
- enum 값 변경은 API 응답과 Android 분기에도 영향을 줄 수 있으므로 반드시 공유한다.
- 저장 공고, 알림, 분석 결과처럼 다른 도메인과 연결되는 테이블은 담당자와 확인 후 수정한다.

## 10. 환경변수 관리

실제 `.env` 파일은 Git에 올리지 않는다.

Git에 올릴 수 있는 파일:

```text
.env.example
```

예시:

```env
DATABASE_URL=
JWT_SECRET=
PORT=3000
FCM_SERVER_KEY=
```

민감 정보는 GitHub, Notion, 카카오톡 등에 그대로 공유하지 않는다.

## 11. 코드 리뷰 시 확인할 것

리뷰어는 아래 내용을 중심으로 확인한다.

- API 명세와 실제 응답이 맞는지
- DTO 필드명이 Android와 맞는지
- DB schema 변경이 필요한 작업인지
- 에러 처리가 누락되지 않았는지
- 불필요한 console/log가 남아 있지 않은지
- `.env`나 민감 정보가 포함되지 않았는지

## 12. 1차 과제 기준 우선 작업

1차 과제 전까지 우선 준비할 항목은 아래와 같다.

- GitHub Repository 세팅
- 브랜치/PR 규칙 정리
- ERD 정리
- Prisma 초기 설정
- Swagger 초기 설정
- Notion API 명세 작성
- 공통 응답 형식 정의
- 공통 예외 처리 구조 정의
- 일부 도메인 CRUD API 구현

## 13. 확인 필요 사항

- `main` 보호 규칙 설정 여부
- `dev` 보호 규칙 설정 여부
- PR 최소 리뷰 인원
- squash merge 사용 여부
- GitHub Issue 사용 여부
- GitHub Project 사용 여부
- Swagger 배포 주소
- 개발 서버 배포 방식
