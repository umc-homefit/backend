# Auth/User 도메인 API 명세

> 담당: 주드(박주완) · 도메인: Auth/User
> **이 문서는 팀 Notion `api 명세서`(SSOT)를 미러링한 것이다.** 값이 충돌하면 Notion이 우선이며, Notion 수정 시 이 문서와 Swagger도 함께 맞춘다.
> Notion: https://app.notion.com/p/api-38e2a03e23d98097aa90e434b9017faa

## 공통 규칙

- 공통 Base Path는 `/api`이다.
- 아래 Endpoint는 Base Path를 제외한 경로로 작성한다.
- 응답 envelope는 `{ isSuccess, code, message, result }` 형식을 사용한다.
- Request/Response 필드는 **camelCase**를 사용한다.
- 인증 필요 API는 `Authorization: Bearer <accessToken>`을 사용한다.

## 공통 enum

| enum | 값 | 비고 |
| --- | --- | --- |
| `provider` | `LOCAL` / `KAKAO` / `GOOGLE` / `APPLE` | `POST /auth/social` 요청은 `KAKAO`, `GOOGLE`, `APPLE` |
| `status` | `ACTIVE` / `INACTIVE` / `DELETED` | 계정 상태. 회원가입/로그인 여부는 `isNewUser`로 판단 |
| `housingOwnershipStatus` | `HOMELESS` / `FAMILY_OWNED` / `UNKNOWN` | ERD 기준. MVP에서는 `HOMELESS` 우선 사용 |

## 1차 구현 범위

| 우선순위 | Method | Endpoint | 설명 |
| --- | --- | --- | --- |
| P0 | `POST` | `/auth/signup` | 이메일 회원가입 |
| P0 | `POST` | `/auth/login` | 이메일 로그인 |
| P0 | `GET` | `/users/me/condition-profile` | 사용자 조건 프로필 조회 |
| P0 | `PUT` | `/users/me/condition-profile` | 사용자 조건 프로필 생성/수정 |

소셜 로그인, 로그아웃, 기본 정보/프로필 조회·수정은 Swagger에 명세하되 1차 구현에서는 P1로 본다.

---

## 1. 이메일 회원가입

| 항목 | 내용 |
| --- | --- |
| Method · Endpoint | `POST /auth/signup` |
| 설명 | 이메일/비밀번호로 회원가입한다. |
| 인증 | 불필요 |

### Request Body

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `email` | string | Y | 가입할 이메일 주소 |
| `password` | string | Y | 가입할 비밀번호 |

### Response (result)

```json
{
  "accessToken": "eyJhbGci...",
  "isNewUser": true,
  "userId": 1001
}
```

| 상태 | 설명 |
| --- | --- |
| 201 | 회원가입 성공 |
| 409 | 이미 존재하는 이메일 |

---

## 2. 이메일 로그인

| 항목 | 내용 |
| --- | --- |
| Method · Endpoint | `POST /auth/login` |
| 설명 | 이메일/비밀번호로 로그인하고 Access Token을 발급한다. |
| 인증 | 불필요 |

### Request Body

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `email` | string | Y | 로그인 이메일 |
| `password` | string | Y | 비밀번호 |

### Response (result)

```json
{
  "accessToken": "eyJhbGci...",
  "isNewUser": false,
  "userId": 1001
}
```

---

## 3. 소셜 회원가입 및 로그인

| 항목 | 내용 |
| --- | --- |
| Method · Endpoint | `POST /auth/social` |
| 설명 | 소셜 인증 후 회원가입 또는 로그인하고 Access Token을 발급한다. |
| 인증 | 불필요 |

### Request Body

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `provider` | enum | Y | `KAKAO` / `GOOGLE` / `APPLE` |
| `oauthToken` | string | N | 운영 환경의 소셜 인증 토큰 |
| `providerId` | string | N | 로컬 테스트용 소셜 식별자 |

### Response (result)

`POST /auth/login`과 동일하다. 기존 회원/신규 회원 구분은 `isNewUser`로 판단한다.

---

## 4. 로그아웃

| 항목 | 내용 |
| --- | --- |
| Method · Endpoint | `POST /auth/logout` |
| 설명 | 현재 Access Token을 무효화한다. |
| 인증 | **필수** |

### Response

```json
{
  "isSuccess": true,
  "code": "AUTH200",
  "message": "로그아웃 되었습니다.",
  "result": null
}
```

---

## 5. 내 기본 정보 조회

| 항목 | 내용 |
| --- | --- |
| Method · Endpoint | `GET /users/me` |
| 인증 | **필수** |

### Response (result)

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `userId` | number | 사용자 ID |
| `email` | string | 계정 이메일 |
| `provider` | string | 인증 방식 |
| `status` | string | 계정 상태 |
| `createdAt` | string | 생성 일시 |
| `updatedAt` | string | 수정 일시 |

---

## 6. 내 프로필 조회/수정

| Method | Endpoint | 설명 |
| --- | --- | --- |
| `GET` | `/users/me/profile` | 닉네임, 생년월일, 연락처, 프로필 이미지 조회 |
| `PUT` | `/users/me/profile` | 닉네임, 생년월일, 연락처, 프로필 이미지 수정 |

### PUT Request Body

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `nickname` | string | N | 닉네임 |
| `birthDate` | string | N | 생년월일 (`YYYY-MM-DD`) |
| `phoneNumber` | string | N | 연락처 |
| `profileImageUrl` | string | N | 프로필 이미지 URL |

### PUT Response (result)

```json
{
  "userId": 1001,
  "updatedAt": "2026-07-01T15:00:00"
}
```

---

## 7. 사용자 조건 프로필 조회

| 항목 | 내용 |
| --- | --- |
| Method · Endpoint | `GET /users/me/condition-profile` |
| 설명 | 소득, 자산, 부채, 현금, 무주택 여부 등 입주 조건 프로필을 조회한다. |
| 인증 | **필수** |

### Response (result)

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `monthlyIncomeAmount` | number | 월 총소득 |
| `totalAssetAmount` | number | 총 보유 자산 |
| `totalDebtAmount` | number | 총 부채 금액 |
| `monthlyDebtPaymentAmount` | number | 월 상환액 |
| `cashSavings` | number | 보유 현금 |
| `housingOwnershipStatus` | string | 주택 소유 상태 |
| `isHomeless` | boolean | 무주택 여부 |
| `residenceRegionCode` | string \| null | 거주 지역 코드 |
| `workplaceRegionCode` | string \| null | 직장/학교 지역 코드 |
| `createdAt` | string | 최초 저장 일시 |
| `updatedAt` | string | 최종 수정 일시 |

---

## 8. 사용자 조건 프로필 수정

| 항목 | 내용 |
| --- | --- |
| Method · Endpoint | `PUT /users/me/condition-profile` |
| 설명 | 조건 프로필을 생성하거나 수정한다(upsert). |
| 인증 | **필수** |

### Request Body

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `monthlyIncomeAmount` | number | Y | 월 총소득 |
| `totalAssetAmount` | number | Y | 총 보유 자산 |
| `totalDebtAmount` | number | Y | 총 부채 금액 |
| `monthlyDebtPaymentAmount` | number | Y | 월 상환액 |
| `cashSavings` | number | Y | 보유 현금 |
| `isHomeless` | boolean | Y | 무주택 여부 |
| `housingOwnershipStatus` | string | Y | 주택 소유 상태 |
| `residenceRegionCode` | string | N | 거주 지역 코드 |
| `workplaceRegionCode` | string | N | 직장/학교 지역 코드 |

### Response (result)

```json
{
  "userConditionProfileId": 501,
  "updatedAt": "2026-07-01T14:30:00Z"
}
```

---

## 9. 저장 공고 목록 조회

`GET /users/me/saved-notices`는 Auth/User 경로 아래에 있지만 Notice 도메인 문서에서 관리한다.

- 문서: [notice.md - 저장 공고 목록 조회](./notice.md#7-저장-공고-목록-조회)
