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

## 공통 enum

| enum | 값 | 비고 |
| --- | --- | --- |
| `providerType` | `POLICY` / `BANK` | 정책 상품/은행 상품 |
| `issueMethod` | `ONLINE` / `OFFLINE` / `BOTH` | 서류 발급 방법 |
| `contentType` | `TEXT` / `IMAGE` / `CHECKLIST` | 가이드 콘텐츠 타입 |
| `announcementType` | `COMMON` / `YOUTH_SAFE_HOUSE` / `ADDITIONAL_RECRUIT` | 가이드 대상 공고 유형 |

## API 목록

| 우선순위 | Method | Endpoint | 설명 |
| --- | --- | --- | --- |
| P0 | `GET` | `/loan-products` | 금융상품 목록 조회 |
| P1 | `GET` | `/loan-products/match` | 사용자 조건/공고 기준 금융상품 매칭 |
| P1 | `GET` | `/loan-products/{productId}` | 금융상품 상세 조회 |
| P1 | `GET` | `/loan-products/{productId}/documents` | 금융상품 필요서류 조회 |
| P1 | `GET` | `/finance-terms` | 금융 용어 목록 조회 |
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
| 인증 | 불필요 |

### Query Parameter

| 이름 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `providerType` | enum | N | `POLICY` / `BANK` |
| `page` | number | N | 기본값 0 |
| `size` | number | N | 기본값 20 |

### Response (result)

```json
{
  "totalCount": 5,
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
      "providerName": "하나은행",
      "rateRange": "3.2% ~ 4.5%"
    }
  ]
}
```

---

## 2. 금융상품 매칭 조회

| 항목 | 내용 |
| --- | --- |
| Method · Endpoint | `GET /loan-products/match` |
| 설명 | 사용자 조건과 공고 기준으로 매칭되는 금융상품을 조회한다. |
| 인증 | 현재 Swagger 기준 불필요. 사용자 조건 연동 시 인증 필수 전환 가능 |

### Query Parameter

| 이름 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `noticeId` | number | N | 매칭 기준 공고 ID |
| `providerType` | enum | N | `POLICY` / `BANK` |

### Response (result)

```json
{
  "matchedCount": 2,
  "products": [
    {
      "productId": 101,
      "productName": "청년 버팀목 전세자금대출",
      "providerType": "POLICY",
      "providerName": "주택도시기금",
      "rateRange": "1.5% ~ 2.7%",
      "maxLimitAmount": 200000000,
      "isEligible": true
    }
  ]
}
```

---

## 3. 금융상품 상세 조회

| 항목 | 내용 |
| --- | --- |
| Method · Endpoint | `GET /loan-products/{productId}` |
| 설명 | 금융상품 상세 정보를 조회한다. |

### Response (result)

`GET /loan-products`의 상품 필드에 아래 필드를 추가해 반환한다.

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `officialUrl` | string | 공식 안내 URL |
| `description` | string \| null | 상품 설명 |

| 상태 | 설명 |
| --- | --- |
| 200 | 조회 성공 |
| 404 | 상품 없음 |

---

## 4. 필요서류 조회

| Method | Endpoint | 설명 |
| --- | --- | --- |
| `GET` | `/loan-products/{productId}/documents` | 금융상품 신청 필요서류 조회 |
| `GET` | `/notices/{noticeId}/documents` | 공고 지원 필요서류 조회 |

### Response (result)

```json
[
  {
    "documentId": 5,
    "documentName": "소득금액증명원",
    "issuer": "국세청",
    "issueMethod": "ONLINE",
    "isRequired": true
  }
]
```

---

## 5. 금융 용어 목록 조회

| 항목 | 내용 |
| --- | --- |
| Method · Endpoint | `GET /finance-terms` |
| 설명 | 금융 용어 사전을 검색어 기준으로 조회한다. |

### Query Parameter

| 이름 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `term` | string | N | 부분 검색 키워드 |

### Response (result)

```json
[
  { "term": "DSR" }
]
```

---

## 6. 가이드 카테고리 목록 조회

| 항목 | 내용 |
| --- | --- |
| Method · Endpoint | `GET /guide-categories` |
| 설명 | 청약 가이드 카테고리 목록을 표시 순서대로 조회한다. |

### Response (result)

```json
[
  { "categoryId": 1, "categoryName": "신청절차", "displayOrder": 1 }
]
```

---

## 7. 청약 가이드 목록 조회

| 항목 | 내용 |
| --- | --- |
| Method · Endpoint | `GET /guides` |
| 설명 | 카테고리/공고 유형 조건에 맞는 청약 가이드 목록을 조회한다. |

### Query Parameter

| 이름 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `categoryId` | number | N | 가이드 카테고리 ID |
| `announcementType` | enum | N | `COMMON` / `YOUTH_SAFE_HOUSE` / `ADDITIONAL_RECRUIT` |
| `page` | number | N | 기본값 0 |
| `size` | number | N | 기본값 20 |

### Response (result)

```json
{
  "totalCount": 9,
  "guides": [
    {
      "guideId": 10,
      "categoryId": 1,
      "title": "추가모집 신청 절차 안내",
      "contentType": "TEXT",
      "displayOrder": 1
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

---

## 8. 청약 가이드 상세 조회

| 항목 | 내용 |
| --- | --- |
| Method · Endpoint | `GET /guides/{guideId}` |
| 설명 | 청약 가이드 상세 콘텐츠를 조회한다. |

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
