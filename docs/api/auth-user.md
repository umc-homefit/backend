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
| `provider` | `LOCAL` / `KAKAO` / `GOOGLE` | `POST /auth/social` 요청은 `KAKAO`, `GOOGLE`. `APPLE`은 미지원으로 제외됨 |
| `status` | `ACTIVE` / `INACTIVE` | 계정 상태. 회원가입/로그인 여부는 `isNewUser`로 판단 |
| `housingOwnershipStatus` | `HOMELESS` / `FAMILY_OWNED` / `UNKNOWN` | ERD 기준. MVP에서는 `HOMELESS` 우선 사용 |

## 1차 구현 범위

| 우선순위 | Method | Endpoint | 설명 |
| --- | --- | --- | --- |
| P0 | `POST` | `/auth/signup` | 이메일 회원가입 |
| P0 | `POST` | `/auth/login` | 이메일 로그인 |
| P0 | `GET` | `/users/me/condition-profile` | 사용자 조건 프로필 조회 |
| P0 | `PUT` | `/users/me/condition-profile` | 사용자 조건 프로필 생성/수정 |

소셜 로그인, 로그아웃, 기본 정보/프로필 조회·수정은 Swagger에 명세하되 1차 구현 이후 순서로 진행했다.

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
| `email` | string | Y | 가입할 이메일 주소 (이메일 형식 검증) |
| `password` | string | Y | 가입할 비밀번호. **8자 이상**이며 **영문·숫자·특수문자를 각각 1개 이상** 포함해야 한다 |

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
| 400 | 이메일 형식 오류 또는 비밀번호 조건(8자 이상, 영문·숫자·특수문자 조합) 미충족 |
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

| 상태 | 설명 |
| --- | --- |
| 200 | 로그인 성공 |
| 401 | 이메일 또는 비밀번호가 올바르지 않음 (해당 이메일이 `LOCAL` 계정이 아닌 경우 포함) |

---

## 3. 소셜 회원가입 및 로그인

| 항목 | 내용 |
| --- | --- |
| Method · Endpoint | `POST /auth/social` |
| 설명 | 카카오/구글 OAuth 토큰을 각 provider 서버에 실제로 검증하고, 신규면 가입, 기존이면 로그인 처리 후 Access Token을 발급한다. |
| 인증 | 불필요 |

### Request Body

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `provider` | enum | Y | `KAKAO` / `GOOGLE` |
| `oauthToken` | string | **Y** | 소셜 인증 토큰. 카카오는 Access Token, 구글은 ID Token(JWT) 기준이며 서버가 각 provider 서버에 실제로 검증한다 |

> ⚠️ **변경**: `providerId` 필드는 제거되었다. 실제 인증 흐름에서 클라이언트가 보낸 `providerId`를 신뢰하지 않고, 검증된 토큰에서 추출한 값만 사용하기 때문에 요청 필드에서 뺐다.

### Response (result)

`POST /auth/login`과 동일한 필드 구조다. 단, **신규 가입과 기존 로그인의 상태 코드가 다르다.**

```json
{
  "accessToken": "eyJhbGci...",
  "isNewUser": true,
  "userId": 1001
}
```

| 상태 | 설명 |
| --- | --- |
| 201 | 신규 소셜 회원가입 성공 (`AUTH201`, `isNewUser: true`) |
| 200 | 기존 소셜 계정 로그인 성공 (`AUTH200`, `isNewUser: false`) |
| 400 | `oauthToken` 누락 또는 빈 문자열 |
| 401 | `oauthToken`이 유효하지 않거나 만료됨, 또는 토큰의 발급 대상(`aud`)이 우리 앱이 아님(구글) |
| 409 | 이미 다른 방식(`LOCAL` 포함)으로 가입된 이메일로 소셜 로그인을 시도한 경우 (`AUTH409`) |

> **정책**: 소셜 인증 이메일이 이미 다른 계정(예: 이메일 회원가입으로 가입된 `LOCAL` 계정)에서 쓰이고 있으면, 별도 계정을 새로 만들지 않고 `409`로 거부한다. 계정 연결(하나의 유저가 여러 provider를 갖는 것) 기능은 현재 스키마(`User`당 `provider` 1개)로는 안전하게 구현할 수 없어 범위 밖으로 둔다.

---

## 4. 로그아웃

| 항목 | 내용 |
| --- | --- |
| Method · Endpoint | `POST /auth/logout` |
| 설명 | 인증을 확인한 뒤, 클라이언트에서 저장된 Access Token을 삭제하도록 로그아웃 응답을 반환한다. |
| 인증 | **필수** |

> ⚠️ **변경**: 서버는 Access Token만 발급하는 stateless 구조라, 서버 측에서 실제로 토큰을 무효화하지는 않는다. 로그아웃 API는 인증된 요청인지 확인만 하고, 실질적인 로그아웃 처리는 클라이언트가 저장된 토큰을 삭제하는 방식으로 이루어진다. 즉 로그아웃 이후에도 이미 발급된 Access Token은 만료 시각(현재 1시간)까지는 여전히 유효하다.

### Response

```json
{
  "isSuccess": true,
  "code": "AUTH200",
  "message": "로그아웃 되었습니다.",
  "result": null
}
```

| 상태 | 설명 |
| --- | --- |
| 200 | 로그아웃 처리(클라이언트 토큰 삭제 안내) 성공 |
| 401 | Access Token이 없거나 유효하지 않음 |

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