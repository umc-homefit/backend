# Finance/Guide API 명세

> 담당: 이든(정지훈) · 도메인: Finance/Guide
> **이 문서는 팀 Notion `api 명세서`(SSOT)를 미러링한 것이다.** 값이 충돌하면 Notion이 우선이며, Notion 수정 시 이 문서와 Swagger도 함께 맞춘다.
> Notion: https://app.notion.com/p/api-38e2a03e23d98097aa90e434b9017faa

## 공통 규칙

- 공통 Base Path는 `/api`이다.
- 아래 Endpoint는 Base Path를 제외한 경로로 작성한다.
- 응답 envelope는 `{ isSuccess, code, message, result }` 형식을 사용한다.
- 응답 code 접두사는 `FINANCE`를 사용한다.
- 금액은 **원 단위 정수**로 응답한다.
- 인증 필수 API는 `Authorization: Bearer {accessToken}` 헤더를 사용한다.

인증이 필요하지만 토큰이 없거나 유효하지 않은 경우 아래 형식으로 응답한다.

```json
{
  "isSuccess": false,
  "code": "AUTH401",
  "message": "인증이 필요합니다. 로그인 후 다시 시도해주세요.",
  "result": null
}
```

## 공통 enum

| enum | 값 | 비고 |
| --- | --- | --- |
| `providerType` | `POLICY` / `BANK` | 정책 상품/은행 상품 |
| `productCategory` | `MORTGAGE_LOAN` / `JEONSE_LOAN` / `SUBSCRIPTION_SAVINGS` | 상품 카테고리 (주택담보대출/전세대출/청약저축). 청약저축도 `loan-products` API로 통합 조회 |
| `sort` (loan-products) | `RECOMMENDED` / `LATEST` / `RATE_ASC` / `LIMIT_DESC` | 금융상품 목록 정렬 기준. 기본값 `RECOMMENDED` |
| `issueMethod` | `ONLINE` / `OFFLINE` / `BOTH` | 서류 발급 방법 |
| `documentType` | `COMMON` / `PRODUCT` / `ANNOUNCEMENT` | 서류 구분 (공통/상품별/공고별) |
| `contentType` | `TEXT` / `IMAGE` / `CHECKLIST` | 가이드 콘텐츠 타입 |
| `announcementType` | `COMMON` / `YOUTH_SAFE_HOUSE` / `ADDITIONAL_RECRUIT` | 가이드 대상 공고 유형 |

## API 목록

| 우선순위 | Method | Endpoint | 설명 |
| --- | --- | --- | --- |
| P0 | `GET` | `/loan-products` | 금융상품 목록 조회 |
| P1 | `GET` | `/loan-products/match` | 사용자 조건/공고 기준 금융상품 매칭 |
| P1 | `GET` | `/loan-products/{productId}` | 금융상품 상세 조회 |
| P1 | `GET` | `/loan-products/{productId}/documents` | 금융상품 필요서류 조회 |
| P1 | `GET` | `/finance-terms` | 금융 용어 상세 조회 (단건, `term` 필수) |
| P1 | `GET` | `/notices/{noticeId}/documents` | 공고 필요서류 조회 |
| P1 | `GET` | `/guide-categories` | 가이드 카테고리 목록 조회 |
| P1 | `GET` | `/guides` | 청약 가이드 목록 조회 |
| P1 | `GET` | `/guides/{guideId}` | 청약 가이드 상세 조회 |

---

## 1. 금융상품 목록 조회

| 항목 | 내용 |
| --- | --- |
| Method · Endpoint | `GET /loan-products` |
| 설명 | 조건에 맞는 금융상품 목록을 페이징하여 조회한다. |
| 인증 | **필수** · `Authorization: Bearer {accessToken}` |

### Query Parameter

| 이름 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `providerType` | enum | N | `POLICY` / `BANK` |
| `productCategory` | enum | N | `MORTGAGE_LOAN` / `JEONSE_LOAN` / `SUBSCRIPTION_SAVINGS` |
| `keyword` | string | N | 상품명/취급기관명 부분 검색 |
| `sort` | enum | N | `RECOMMENDED` / `LATEST` / `RATE_ASC` / `LIMIT_DESC` (기본값 `RECOMMENDED`) |
| `page` | number | N | 기본값 0 |
| `size` | number | N | 기본값 20, **최대 50** (초과 시 `COMMON400`) |

### Response (result)

```json
{
  "pageInfo": {
    "page": 0,
    "size": 20,
    "totalElements": 5,
    "totalPages": 1,
    "hasNext": false
  },
  "products": [
    {
      "productId": 103,
      "productName": "하나은행 청년 전세자금대출",
      "providerType": "BANK",
      "productCategory": "JEONSE_LOAN",
      "providerName": "하나은행",
      "providerLogoUrl": "https://homefit-assets.s3.ap-northeast-2.amazonaws.com/logos/hana-bank.png",
      "rateRange": "3.2% ~ 4.5%",
      "maxIncome": 60000000,
      "firstTimeBuyerOnly": false,
      "incomeTaxDeductible": false,
      "maxLimitAmount": 200000000,
      "minAge": 19,
      "maxAge": 34,
      "requireNoHouse": true,
      "minMonthlyDeposit": null,
      "maxMonthlyDeposit": null
    }
  ]
}
```

- `providerLogoUrl`: 제공기관 로고 이미지 URL (nullable). S3에 public-read로 올린 정적 이미지를 가리키며, 신규 컬럼이라 백필 전 기존 로우는 전부 `null`이다.

### Status

잘못된 `providerType` 값 등 Query Parameter 검증 실패 시 아래 형식으로 응답한다.

```json
{
  "isSuccess": false,
  "code": "COMMON400",
  "message": "providerType은 반드시 다음 중 하나여야합니다 : POLICY, BANK",
  "result": null
}
```

| 상태 | 설명 |
| --- | --- |
| 200 | 금융상품 목록 조회 성공 |
| 400 | 잘못된 Query Parameter (`COMMON400`) |
| 401 | 인증 필요 또는 유효하지 않은 Access Token (`AUTH401`) |
| 500 | 서버 내부 오류 |

---

## 2. 금융상품 매칭 조회

| 항목 | 내용 |
| --- | --- |
| Method · Endpoint | `GET /loan-products/match` |
| 설명 | 사용자 조건 프로필(나이/소득/자산/무주택/결혼/출산) 기준으로 신청 자격이 되는 금융상품을 조회한다. |
| 인증 | **필수** · `Authorization: Bearer {accessToken}` |

> `noticeId` 파라미터는 이번 구현 범위에서 제외했다. Notion 원본 명세엔 있었지만 "설명" 필드 자체가 사용자 금융정보 기준 매칭만 언급하고, 공고(호실 타입 단위) 기준 필터링을 뒷받침할 스키마 근거(지역 제한 등)가 없어 제거함. 필요해지면 별도 스키마 확장과 함께 재도입 검토.

### Query Parameter

| 이름 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `providerType` | enum | N | `POLICY` / `BANK` |
| `productCategory` | enum | N | `MORTGAGE_LOAN` / `JEONSE_LOAN` (청약저축은 매칭 대상이 아니라 `SUBSCRIPTION_SAVINGS`는 허용하지 않음 — 넘기면 `COMMON400`) |
| `keyword` | string | N | 상품명/취급기관명 부분 검색 |
| `sort` | enum | N | `RECOMMENDED` / `LATEST` / `RATE_ASC` / `LIMIT_DESC` (기본값 `RECOMMENDED`) |

> `productCategory=SUBSCRIPTION_SAVINGS`는 List(`GET /loan-products`)에선 정상 조회되지만 Match에선 애초에 유효값이 아니다 — 청약저축은 나이/소득/자산 매칭 개념 자체가 안 맞아 항상 매칭 후보에서 제외되는데, 예전엔 이 값을 넘겨도 검증을 통과시켜놓고 내부적으로 항상 빈 배열만 반환해 혼란을 줬다. 지금은 DTO 단계에서 `COMMON400`으로 막는다.

### Response (result)

```json
{
  "matchedCount": 2,
  "minRate": "1.0%",
  "maxLimitAmount": 500000000,
  "products": [
    {
      "productId": 101,
      "productName": "청년전용 버팀목전세자금",
      "providerType": "POLICY",
      "productCategory": "JEONSE_LOAN",
      "providerName": "주택도시기금",
      "providerLogoUrl": "https://homefit-assets.s3.ap-northeast-2.amazonaws.com/logos/hf-fund.png",
      "rateRange": "1.5% ~ 2.7%",
      "maxIncome": 60000000,
      "firstTimeBuyerOnly": false,
      "incomeTaxDeductible": false,
      "maxLimitAmount": 200000000,
      "minAge": 19,
      "maxAge": 34,
      "requireNoHouse": true,
      "minMonthlyDeposit": null,
      "maxMonthlyDeposit": null,
      "isEligible": false,
      "ageCheckSkipped": false,
      "householdHeadCheckSkipped": false,
      "marriedCheckSkipped": false,
      "newbornCheckSkipped": false,
      "firstTimeBuyerCheckSkipped": false,
      "ineligibleReasons": ["HOUSEHOLD_HEAD"]
    },
    {
      "productId": 108,
      "productName": "신혼부부전용 전세자금",
      "providerType": "POLICY",
      "productCategory": "JEONSE_LOAN",
      "providerName": "주택도시기금",
      "providerLogoUrl": "https://homefit-assets.s3.ap-northeast-2.amazonaws.com/logos/hf-fund.png",
      "rateRange": "1.2% ~ 2.1%",
      "maxIncome": 75000000,
      "firstTimeBuyerOnly": false,
      "incomeTaxDeductible": false,
      "maxLimitAmount": 300000000,
      "minAge": null,
      "maxAge": null,
      "requireNoHouse": true,
      "minMonthlyDeposit": null,
      "maxMonthlyDeposit": null,
      "isEligible": true,
      "ageCheckSkipped": false,
      "householdHeadCheckSkipped": false,
      "marriedCheckSkipped": true,
      "newbornCheckSkipped": false,
      "firstTimeBuyerCheckSkipped": false,
      "ineligibleReasons": []
    },
    {
      "productId": 110,
      "productName": "신생아 특례 버팀목전세자금",
      "providerType": "POLICY",
      "productCategory": "JEONSE_LOAN",
      "providerName": "주택도시기금",
      "providerLogoUrl": "https://homefit-assets.s3.ap-northeast-2.amazonaws.com/logos/hf-fund.png",
      "rateRange": "1.0% ~ 1.8%",
      "maxIncome": 130000000,
      "firstTimeBuyerOnly": false,
      "incomeTaxDeductible": false,
      "maxLimitAmount": 500000000,
      "minAge": null,
      "maxAge": null,
      "requireNoHouse": true,
      "minMonthlyDeposit": null,
      "maxMonthlyDeposit": null,
      "isEligible": true,
      "ageCheckSkipped": false,
      "householdHeadCheckSkipped": false,
      "marriedCheckSkipped": false,
      "newbornCheckSkipped": false,
      "firstTimeBuyerCheckSkipped": false,
      "ineligibleReasons": []
    },
    {
      "productId": 104,
      "productName": "일반 버팀목전세자금",
      "providerType": "POLICY",
      "productCategory": "JEONSE_LOAN",
      "providerName": "주택도시기금",
      "providerLogoUrl": "https://homefit-assets.s3.ap-northeast-2.amazonaws.com/logos/hf-fund.png",
      "rateRange": "2.3% ~ 3.3%",
      "maxIncome": 50000000,
      "firstTimeBuyerOnly": false,
      "incomeTaxDeductible": false,
      "maxLimitAmount": 120000000,
      "minAge": null,
      "maxAge": null,
      "requireNoHouse": true,
      "minMonthlyDeposit": null,
      "maxMonthlyDeposit": null,
      "isEligible": false,
      "ageCheckSkipped": false,
      "householdHeadCheckSkipped": false,
      "marriedCheckSkipped": false,
      "newbornCheckSkipped": false,
      "firstTimeBuyerCheckSkipped": false,
      "ineligibleReasons": ["INCOME"]
    }
  ]
}
```

- `products`는 (청약저축 제외) 조건에 맞는 상품 **전체**를 반환하며, 상품별 `isEligible`로 자격 충족 여부를 표시한다. `matchedCount`/`minRate`/`maxLimitAmount`(최상위)는 그중 `isEligible: true`인 상품만 집계한 값이다.
- `ineligibleReasons`: `isEligible: false`인 상품에 대해 어떤 조건에서 떨어졌는지 코드 배열로 알려준다. `isEligible: true`면 빈 배열. 가능한 값: `AGE`/`INCOME`/`ASSET`/`HOMELESS`/`HOUSEHOLD_HEAD`/`FIRST_TIME_BUYER`/`MARRIED`/`NEWBORN`. 한 상품이 여러 조건에서 동시에 떨어지면 배열에 여러 개가 담긴다.
- `ageCheckSkipped`: 사용자가 생년월일(`user_profiles.birth_date`)을 등록하지 않아 이 상품의 나이 조건 검사를 건너뛴 경우 `true`. birthDate가 nullable이라 발생할 수 있음 — FE에서 "생년월일 입력 시 더 정확한 매칭 가능" 안내에 활용 권장.
- `marriedCheckSkipped`/`newbornCheckSkipped`: 신혼부부 전용/신생아 특례 상품인데 혼인 상태(`maritalStatus`)·출산 여부가 아직 `UNKNOWN`/미입력이거나, 혼인일자(`marriageDate`)·출산일자(`newbornBirthDate`)가 등록되지 않아 기간 조건(혼인기간/출산 경과기간) 검사를 건너뛴 경우 `true`. `ageCheckSkipped`와 동일한 패턴.
- `householdHeadCheckSkipped`: 세대주 전용 상품인데 `householdHeadStatus`가 아직 `UNKNOWN`(미입력)이라 세대주 조건 검사를 건너뛴 경우 `true`. 마찬가지로 `ageCheckSkipped`와 동일한 패턴.
- `firstTimeBuyerOnly`(생애최초 전용 여부)는 이제 `isEligible` 판정에 반영된다 — `user_condition_profiles.is_first_time_buyer`와 비교. 값이 미입력(`null`)이면 관대하게 통과시키고 `firstTimeBuyerCheckSkipped: true`로 표시한다.
- 신혼부부 전용(`requireMarried`)/신생아 특례(`requireRecentNewborn`)/세대주 전용(`requireHouseholdHead`) 조건은 `loan_products`의 신규 컬럼과 `user_condition_profiles.maritalStatus`/`marriageDate`/`hasRecentNewborn`/`newbornBirthDate`/`householdHeadStatus`를 비교해 판정한다.
  - `maritalStatus`는 ERD 기준 VARCHAR+주석 컨벤션 문자열(`UNKNOWN`/`SINGLE`/`MARRIED`/`MARRIAGE_EXPECTED`) — `MARRIED`와 `MARRIAGE_EXPECTED`(예비신혼, ERD상 3개월 이내 결혼예정) 둘 다 기혼으로 간주해 통과시킨다. `UNKNOWN`(미입력)은 "미혼"이 아니라 "아직 모름"이므로 관대하게 통과시키고 `marriedCheckSkipped: true`로 표시한다. 네이티브 DB enum이 아니라 값 검증은 API 레이어(class-validator)에서만 한다.
  - `householdHeadStatus`도 동일한 컨벤션(`UNKNOWN`/`HEAD`/`HEAD_EXPECTED`/`RECOGNIZED`/`MEMBER`) — `HEAD`/`HEAD_EXPECTED`(예비세대주)/`RECOGNIZED`(세대주 인정자) 셋 다 세대주로 간주해 통과시킨다. `UNKNOWN`도 `maritalStatus`와 동일하게 관대히 통과 + `householdHeadCheckSkipped: true`.
  - `PUT /users/me/condition-profile`에 위 5개 필드(`maritalStatus`/`marriageDate`/`hasRecentNewborn`/`newbornBirthDate`/`householdHeadStatus`)와 `isFirstTimeBuyer`가 모두 optional로 추가되어 있어야 정상 동작한다(User 도메인, 반영 완료).
  - `maritalStatus: MARRIAGE_EXPECTED`로 저장할 때는 입력 단계(`PUT /users/me/condition-profile`)에서 `marriageDate`가 **오늘부터 3개월 이내(오늘 포함)** 인지 강제한다. 이 판정은 요청 바디만으로는 우회가 가능해 class-validator가 아니라 `UsersService`에서 DB 기존값과 병합한 유효값 기준으로 하며, 범위를 벗어나면 `USER400`으로 거부된다(형식 오류·필수 누락은 `COMMON400`). 자세한 코드 구분은 Auth/User 도메인 문서(`docs/api/auth-user.md`)의 Status 표 참고.

사용자의 금융정보(나이/소득/자산/무주택여부 등 `user_condition_profiles`)가 입력되지 않은 상태로 조회하면 매칭 판정이 불가능하므로 400을 반환한다.

```json
{
  "isSuccess": false,
  "code": "FINANCE400",
  "message": "금융정보가 입력되지 않아 매칭할 수 없습니다. 조건 프로필을 먼저 등록해주세요.",
  "result": null
}
```

| 상태 | 설명 |
| --- | --- |
| 200 | 조회 성공 |
| 400 | 잘못된 Query Parameter (`COMMON400`) 또는 사용자 금융정보 미입력 (`FINANCE400`) |
| 401 | 인증 필요 또는 유효하지 않은 Access Token (`AUTH401`) |

---

## 3. 금융상품 상세 조회

| 항목 | 내용 |
| --- | --- |
| Method · Endpoint | `GET /loan-products/{productId}` |
| 설명 | 금융상품 상세 정보를 조회한다. |
| 인증 | **필수** · `Authorization: Bearer {accessToken}` |

### Response (result)

`GET /loan-products`의 상품 필드에 아래 필드를 추가해 반환한다.

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `maxLimitAmount` | number \| null | 최대 한도 (원 단위) |
| `ltvRatio` | number \| null | LTV 한도(담보가치 대비 대출 비율, %). 대출 상품 전용 |
| `dtiRatio` | number \| null | DTI 한도(소득 대비 원리금 상환 비율, %). 대출 상품 전용 |
| `loanTermMinYears` | number \| null | 대출 기간 최소(년) |
| `loanTermMaxYears` | number \| null | 대출 기간 최대(년) |
| `preferentialRateDiscount` | number \| null | 우대금리 최대 할인폭(%p). 생애최초 전용은 `firstTimeBuyerRateDiscount` 참고 |
| `firstTimeBuyerRateDiscount` | number \| null | 생애최초 구입자 전용 추가 우대금리(%p). `firstTimeBuyerOnly`(자격 조건)와 별개 — 생애최초 전용이 아닌 상품도 값을 가질 수 있음 |
| `minMonthlyDeposit` | number \| null | 월 최소 납입액 (원 단위). 청약저축 전용 |
| `maxMonthlyDeposit` | number \| null | 월 최대 납입액 (원 단위). 청약저축 전용 |
| `officialUrl` | string \| null | 공식 안내 URL |
| `description` | string \| null | 상품 설명 |

목록 필드(`productCategory`, `providerLogoUrl`, `maxIncome`, `firstTimeBuyerOnly`, `incomeTaxDeductible`, `minAge`, `maxAge`, `requireNoHouse`)도 상세 응답에 동일하게 포함된다.

상품이 존재하지 않으면 아래 형식으로 404를 반환한다.

```json
{
  "isSuccess": false,
  "code": "FINANCE404",
  "message": "존재하지 않는 상품입니다.",
  "result": null
}
```

| 상태 | 설명 |
| --- | --- |
| 200 | 조회 성공 |
| 401 | 인증 필요 또는 유효하지 않은 Access Token (`AUTH401`) |
| 404 | 상품 없음 (`FINANCE404`) |

---

## 4. 필요서류 조회

| Method | Endpoint | 설명 | 인증 |
| --- | --- | --- | --- |
| `GET` | `/loan-products/{productId}/documents` | 금융상품 신청 필요서류 조회 | **필수** · `Authorization: Bearer {accessToken}` |
| `GET` | `/notices/{noticeId}/documents` | 공고 지원 필요서류 조회 | **필수** · `Authorization: Bearer {accessToken}` |

### Response (result)

```json
[
  {
    "documentId": 5,
    "documentName": "소득금액증명원",
    "issuer": "국세청",
    "issueMethod": "ONLINE",
    "documentType": "COMMON",
    "isRequired": true
  }
]
```

상품/공고가 존재하지 않거나 등록된 서류가 없는 경우에도 빈 배열(`[]`)로 200을 반환한다.

인증 실패 시 아래 형식으로 401을 반환한다.

```json
{
  "isSuccess": false,
  "code": "AUTH401",
  "message": "인증이 필요합니다. 로그인 후 다시 시도해주세요.",
  "result": null
}
```

| 상태 | 설명 |
| --- | --- |
| 200 | 조회 성공 (0건 포함 — 상품/공고가 존재하지 않거나 등록된 서류가 없어도 빈 배열로 200) |
| 400 | `productId`/`noticeId`가 숫자가 아님 (`COMMON400`) |
| 401 | 인증 필요 또는 유효하지 않은 Access Token (`AUTH401`) |

---

## 5. 금융 용어 상세 조회

> 이름은 "목록 조회"이지만 실제로는 용어 하나를 정확히 지정해 그 설명을 받는 **단건 상세 조회**다. 부분 검색/목록 응답이 아니므로 혼동하지 않도록 주의.
> 다건 조회(예: LTV/DTI 동시 조회)는 지원하지 않는다. 여러 용어가 필요하면 FE가 `term`을 바꿔가며 여러 번 호출한다.

| 항목 | 내용 |
| --- | --- |
| Method · Endpoint | `GET /finance-terms` |
| 설명 | 지정한 금융 용어 하나의 상세 설명을 조회한다. |
| 인증 | **필수** · `Authorization: Bearer {accessToken}` |

### Query Parameter

| 이름 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `term` | string | **Y** | 조회할 용어명 (정확히 일치, 부분검색 아님). 예: `DSR` |

### Response (result)

```json
{ "term": "DSR", "detailDescription": "DSR(Debt Service Ratio)은 연간 소득 대비 모든 대출의 원리금 상환액 비율을 의미하며, 신규 대출 한도를 산정할 때 핵심 기준으로 사용됩니다." }
```

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `term` | string | 용어명 |
| `detailDescription` | string \| null | 상세 설명 |

`term`에 해당하는 용어가 없으면 아래 형식으로 404를 반환한다.

```json
{
  "isSuccess": false,
  "code": "FINANCE404",
  "message": "존재하지 않는 용어입니다.",
  "result": null
}
```

| 상태 | 설명 |
| --- | --- |
| 200 | 조회 성공 |
| 400 | `term`이 비어있음 (`COMMON400`) |
| 401 | 인증 필요 또는 유효하지 않은 Access Token (`AUTH401`) |
| 404 | 존재하지 않는 용어 (`FINANCE404`) |

---

## 6. 가이드 카테고리 목록 조회

| 항목 | 내용 |
| --- | --- |
| Method · Endpoint | `GET /guide-categories` |
| 설명 | 청약 가이드 카테고리 목록을 표시 순서대로 조회한다. |
| 인증 | **필수** · `Authorization: Bearer {accessToken}` |

### Response (result)

```json
[
  { "categoryId": 1, "categoryName": "신청절차", "displayOrder": 1 }
]
```

인증 실패 시 아래 형식으로 401을 반환한다.

```json
{
  "isSuccess": false,
  "code": "AUTH401",
  "message": "인증이 필요합니다. 로그인 후 다시 시도해주세요.",
  "result": null
}
```

| 상태 | 설명 |
| --- | --- |
| 200 | 조회 성공 |
| 401 | 인증 필요 또는 유효하지 않은 Access Token (`AUTH401`) |

---

## 7. 청약 가이드 목록 조회

| 항목 | 내용 |
| --- | --- |
| Method · Endpoint | `GET /guides` |
| 설명 | 카테고리/공고 유형 조건에 맞는 청약 가이드 목록을 조회한다. |
| 인증 | **필수** · `Authorization: Bearer {accessToken}` |

### Query Parameter

| 이름 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `categoryId` | number | N | 가이드 카테고리 ID |
| `announcementType` | enum | N | `COMMON` / `YOUTH_SAFE_HOUSE` / `ADDITIONAL_RECRUIT` |
| `page` | number | N | 기본값 0 |
| `size` | number | N | 기본값 20, **최대 50** (초과 시 `COMMON400`) |

### Response (result)

```json
{
  "pageInfo": {
    "page": 0,
    "size": 20,
    "totalElements": 9,
    "totalPages": 1,
    "hasNext": false
  },
  "guides": [
    {
      "guideId": 10,
      "title": "추가모집 신청 절차 안내",
      "contentType": "TEXT",
      "contentBody": "1. 공고 확인\n2. 서류 준비\n3. 온라인 신청\n4. 결과 확인",
      "updatedAt": "2026-06-01T00:00:00Z"
    }
  ]
}
```

잘못된 `announcementType` 값 등 Query Parameter 검증 실패 시 아래 형식으로 응답한다.

```json
{
  "isSuccess": false,
  "code": "COMMON400",
  "message": "announcementType은 반드시 다음 중 하나여야합니다 : COMMON, YOUTH_SAFE_HOUSE, ADDITIONAL_RECRUIT",
  "result": null
}
```

| 상태 | 설명 |
| --- | --- |
| 200 | 조회 성공 (0건 포함) |
| 400 | 잘못된 Query Parameter (`COMMON400`) |
| 401 | 인증 필요 또는 유효하지 않은 Access Token (`AUTH401`) |

---

## 8. 청약 가이드 상세 조회

| 항목 | 내용 |
| --- | --- |
| Method · Endpoint | `GET /guides/{guideId}` |
| 설명 | 청약 가이드 상세 콘텐츠를 조회한다. |
| 인증 | **필수** · `Authorization: Bearer {accessToken}` |

### Response (result)

```json
{
  "guideId": 10,
  "title": "추가모집 신청 절차 안내",
  "contentType": "TEXT",
  "contentBody": "1. 공고 확인\n2. 서류 준비\n3. 온라인 신청",
  "updatedAt": "2026-06-01T00:00:00Z"
}
```

가이드가 존재하지 않으면 아래 형식으로 404를 반환한다.

```json
{
  "isSuccess": false,
  "code": "FINANCE404",
  "message": "존재하지 않는 가이드입니다.",
  "result": null
}
```

| 상태 | 설명 |
| --- | --- |
| 200 | 조회 성공 |
| 401 | 인증 필요 또는 유효하지 않은 Access Token (`AUTH401`) |
| 404 | 가이드 없음 (`FINANCE404`) |
