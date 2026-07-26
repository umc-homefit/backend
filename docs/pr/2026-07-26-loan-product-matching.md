# 금융상품 매칭 조회 API 실제 구현 + 조건 프로필 확장

브랜치: `feature/loan-product-matching` → `dev`

---

## Issue

**제목**: [Finance/Guide] 금융상품 매칭 조회 API 실제 구현 + 사용자 조건 프로필 확장(결혼/출산/세대주)

**작업 유형**: `feature`
**도메인**: `Finance/Guide`, `Auth/User`
**우선순위**: P1
**작업 영역**: BE

### 배경

`GET /loan-products/match`가 Notion 명세 Example을 그대로 반환하는 mock 상태였다. 사용자 조건 프로필(나이/소득/자산/무주택/결혼/출산) 기준으로 실제 자격 심사를 하도록 구현하는 과정에서, 매칭에 필요한 정보(결혼여부·혼인일자·출산여부·출산일자·세대주여부)를 사용자가 애초에 입력할 방법이 없다는 구조적 문제를 발견해 Auth/User 도메인까지 같이 확장했다.

### 작업 범위

1. `/loan-products/match` mock → 실제 DB 연동 구현
2. 코드리뷰 반영 (에러 응답 문서화, 결혼/출산 조건 스킵 플래그, 코드 리팩터)
3. `PUT/GET /users/me/condition-profile`에 결혼/출산/세대주 관련 필드 5개 추가
4. `loan_products`에 세대주 조건 컬럼 추가 + 매칭 로직 반영
5. Notion API 명세, `docs/api` 동기화

---

## PR

## 작업 내용

- `GET /loan-products/match`를 mock에서 실제 로직으로 구현 (나이/소득/자산/무주택/결혼/출산/세대주 조건 기반 자격 심사)
- 사용자 조건 프로필에 결혼·출산·세대주 관련 정보를 저장/조회할 수 있도록 Auth/User 도메인 API 확장
- 코드리뷰(`code-review` 스킬) 피드백 반영: 스킵 플래그 일관성, index-coupling 리팩터, 마이그레이션 누락 보완
- `필요서류 조회(상품/공고용)`, `금융 용어 조회` 3개 API에 에러 응답(Swagger) 문서화

## 변경 사항

### Finance/Guide

- `src/domains/finance/finance.controller.ts`: `matchLoanProducts`를 실제 서비스 호출로 교체, `필요서류`/`금융용어` 3개 API에 `@ApiErrorResponse` 추가
- `src/domains/finance/finance.service.ts`: `matchLoanProducts` 신규 구현
  - 나이(생년월일 미입력 시 스킵), 소득(연환산), 순자산(자산-부채), 무주택, **세대주**, 결혼(기혼+예비신혼), 출산 조건 판정
  - 혼인기간/출산 경과기간 검증 불가 시 `marriedCheckSkipped`/`newbornCheckSkipped`로 노출 (`ageCheckSkipped`와 동일 패턴)
  - `product`-`dto` 페어링으로 리팩터해 index-coupling 문제 제거
- `src/domains/finance/finance.repository.ts`: `findLoanProductsForMatch`, `findUserConditionProfileByUserId`, `findUserProfileByUserId` 추가
- `src/domains/finance/dto/finance.dto.ts`: `MatchLoanProductsQueryDto`에서 `noticeId` 제거, `MatchedLoanProductDto`에 `ageCheckSkipped`/`marriedCheckSkipped`/`newbornCheckSkipped` 추가

### Auth/User

- `src/domains/users/dto/users.dto.ts`: `UpdateConditionProfileRequestDto`/`ConditionProfileResultDto`에 `maritalStatus`/`marriageDate`/`hasRecentNewborn`/`newbornBirthDate`/`householdHeadStatus` 5개 필드 추가 (모두 optional — 기존 FE 호환 유지)
- `src/domains/users/users.repository.ts`: `upsertConditionProfile`이 위 5개 필드를 create/update 모두에 반영하도록 수정 (기존엔 `maritalStatus`/`householdHeadStatus`가 `'UNKNOWN'`으로 하드코딩되어 있었음)
- `src/domains/users/users.service.ts`: `getConditionProfile` 응답에 5개 필드 매핑 추가

### 공통 / 스키마

- `prisma/schema.prisma`
  - `MaritalStatus`(`UNKNOWN`/`SINGLE`/`MARRIED`/`PLANNING_MARRIAGE`), `HouseholdHeadStatus`(`UNKNOWN`/`HEAD`/`PROSPECTIVE_HEAD`/`MEMBER`) enum 신설
  - `UserConditionProfile.maritalStatus`/`householdHeadStatus`를 `String` → 네이티브 enum으로 전환 (레거시 데이터가 `'UNKNOWN'` 고정값뿐이라 지금이 전환 부담이 가장 적은 시점)
  - `LoanProduct`에 `requireMarried`/`maxMarriageYears`/`requireRecentNewborn`/`newbornWithinYears`/`requireHouseholdHead` 컬럼 추가
- `docs/api/finance-guide.md`, `docs/api/auth-user.md` 갱신
- Notion API 명세(`엔드포인트 (4)` DB) 갱신: `noticeId` 제거, 에러 응답 표 추가, `ageCheckSkipped` 등 필드 반영

## 확인한 내용

- [x] 로컬 실행 확인 (`npx tsc --noEmit`, `npm run build` 통과)
- [x] API 응답 확인 (매칭 결과 구조/필드 확인)
- [x] Swagger/Notion API 명세/docs/api 반영
- [ ] 관련 Issue 연결 및 라벨 확인 (Issue 생성 후 연결 필요)
- [ ] 마이그레이션 적용 확인 (`npx prisma migrate dev --name add_household_head_and_marital_enums` 실행 필요 — 아직 미실행)

## 공유 사항

- **Auth/User 도메인 파일까지 이번 PR에서 함께 수정함** — User 담당자에게 사전 승인받은 상태 (GIT_CONVENTION 7번 "다른 도메인과 연결되는 테이블은 담당자와 확인 후 수정한다" 관련).
- `maritalStatus`/`householdHeadStatus`를 `String`에서 네이티브 enum으로 바꾸면서 마이그레이션이 해당 컬럼을 **DROP 후 재생성**한다. 기존 값이 전부 `'UNKNOWN'` 고정값이라 실질적 데이터 손실은 없지만, 팀원 로컬 DB에도 반영되도록 마이그레이션 실행 공유 필요.
- **아직 미해결 — 후속 이슈로 분리 필요**:
  - `firstTimeBuyerOnly`(생애최초 전용) 조건에 대응하는 사용자 필드가 없어 매칭 판정에는 미반영 (정보성 필드로만 노출)
  - "직업 상태"가 기획 문서(계산 로직)엔 요구사항으로 있는데 스키마 어디에도 없음
  - 매칭 로직에 대한 자동 테스트 없음 — 프로젝트에 테스트 인프라(jest) 자체가 없어서 별도 인프라 도입 논의 필요

## API 변경 사항

- 변경 API: `GET /loan-products/match`, `GET /users/me/condition-profile`, `PUT /users/me/condition-profile`, `GET /loan-products/{productId}/documents`, `GET /notices/{noticeId}/documents`, `GET /finance-terms`
- 변경 내용:
  - 매칭 조회: `noticeId` 쿼리 파라미터 제거, 응답에 `ageCheckSkipped`/`marriedCheckSkipped`/`newbornCheckSkipped` 추가
  - 조건 프로필 조회/수정: `maritalStatus`/`marriageDate`/`hasRecentNewborn`/`newbornBirthDate`/`householdHeadStatus` 5개 필드 추가
  - 필요서류(상품/공고용)/금융용어: 에러 응답(400/401/404) Swagger 문서화
- 문서 반영: Notion / Swagger / docs/api
- Android 확인 필요 여부: **필요** — 조건 프로필 입력 화면에 결혼/출산/세대주 입력 필드 추가 필요 (현재 FE 상태 "시작 전"이라 영향 적음)

## DB 변경 사항

- 변경 테이블: `loan_products`, `user_condition_profiles`
- 추가/수정 필드:
  - `loan_products`: `require_married`, `max_marriage_years`, `require_recent_newborn`, `newborn_within_years`, `require_household_head` 추가
  - `user_condition_profiles`: `marital_status`, `household_head_status`를 `VARCHAR` → 네이티브 enum(`marital_status_type`, `household_head_status_type`)으로 타입 변경
- migration 필요 여부: **필요** — `npx prisma migrate dev --name add_household_head_and_marital_enums` (아직 미실행, 팀원 각자 로컬에도 실행 필요)
- seed 데이터 영향: 기존 15개 상품 seed에 신규 컬럼(`require_married` 등) 값이 아직 채워지지 않음 — User 도메인 값 컨벤션 확정 후 별도 작업

---

## ERD 반영 필요 사항 (Notion ERD 문서 동기화용)

| 테이블 | 변경 | 내용 |
| --- | --- | --- |
| `user_condition_profiles` | 컬럼 타입 변경 | `marital_status VARCHAR(30)` → `marital_status_type` ENUM(`UNKNOWN`/`SINGLE`/`MARRIED`/`PLANNING_MARRIAGE`), 기본값 `UNKNOWN` |
| `user_condition_profiles` | 컬럼 타입 변경 | `household_head_status VARCHAR(30)` → `household_head_status_type` ENUM(`UNKNOWN`/`HEAD`/`PROSPECTIVE_HEAD`/`MEMBER`), 기본값 `UNKNOWN` |
| `loan_products` | 컬럼 추가 | `require_household_head BOOLEAN NULL` — 세대주(예비세대주 포함) 전용 여부 |
| `loan_products` | 컬럼 추가 (이전 커밋) | `require_married BOOLEAN`, `max_marriage_years INT`, `require_recent_newborn BOOLEAN`, `newborn_within_years INT` |

## Notion API 명세 반영 필요 사항 (07/26 `엔드포인트 (4)` DB)

- **사용자 조건 프로필 조회/수정** (`Auth/User`): Request/Response 표에 `maritalStatus`/`marriageDate`/`hasRecentNewborn`/`newbornBirthDate`/`householdHeadStatus` 5개 필드 추가 필요 (현재 미반영)
- **금융상품 매칭 조회**: 필드 설명 표에 `products[].marriedCheckSkipped`, `products[].newbornCheckSkipped` 행 누락 (Example JSON엔 이미 반영돼있음, 표만 누락)
- **필요 서류 조회(상품용)**: `200` 상태 설명이 "공고 없어도 빈 배열"로 되어있음 — 상품용 페이지이므로 "상품 없어도 빈 배열"로 오타 수정 필요
