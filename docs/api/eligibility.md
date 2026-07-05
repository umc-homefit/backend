# Eligibility Analysis API 명세

> 담당: 니카(이나경) · 도메인: Eligibility Analysis
> **이 문서는 팀 Notion `api 명세서`(SSOT)를 미러링한 것이다.** 값이 충돌하면 Notion이 우선이며, Notion 수정 시 이 문서와 Swagger도 함께 맞춘다.
> Notion: https://app.notion.com/p/api-38e2a03e23d98097aa90e434b9017faa

## 공통 규칙

- 공통 Base Path는 `/api`이다.
- 모든 API는 `Authorization: Bearer <accessToken>` 인증이 필요하다.
- 응답 envelope는 `{ isSuccess, code, message, result }` 형식을 사용한다.
- 응답 code 접두사는 `ELIGIBILITY`를 사용한다.
- 금액은 **원 단위 정수**, 비율은 **% 단위 숫자**로 응답한다.

## 공통 enum

| enum | 값 |
| --- | --- |
| `resultLevel` | `HIGH` / `MEDIUM` / `LOW` / `NOT_ELIGIBLE` / `NEED_CHECK` |
| `conditionCode` | `INCOME` / `ASSET` / `CASH` / `HOMELESS` / `RENT_BURDEN` / `DEBT` / `REGION` |
| `resultStatus` | `PASS` / `FAIL` / `NEED_CHECK` |

## 1차 구현 범위

| 우선순위 | Method | Endpoint | 설명 |
| --- | --- | --- | --- |
| P0 | `POST` | `/notices/{noticeId}/units/{unitId}/eligibility-analyses` | 입주 가능성 분석 요청 |

분석 결과 상세/조건별/재정 요약/내 분석 이력 조회는 Swagger에 명세하되 1차 구현에서는 P1로 본다.

## MVP 계산 기준

1차 MVP에서는 복잡한 정책 판정 전체 자동화보다 최소 계산 버전을 우선한다.

- `shortageAmount` = `expectedDepositAmount - userCashAmount`, 음수면 0 처리 권장
- `monthlyHousingCost` = `expectedMonthlyRentAmount + maintenanceFeeAmount`
- `rentBurdenRate` = `monthlyHousingCost / monthlyIncomeAmount * 100`
- 조건별 비교는 자동 판정 가능한 항목은 `PASS`/`FAIL`, 원문 해석이 필요한 항목은 `NEED_CHECK` 사용

---

## 1. 입주 가능성 분석 요청

| 항목 | 내용 |
| --- | --- |
| Method · Endpoint | `POST /notices/{noticeId}/units/{unitId}/eligibility-analyses` |
| 설명 | 사용자 조건 프로필과 공고/주택 조건을 비교하여 점수, 등급, 부족 자금, 월세 부담률을 계산하고 저장한다. |
| 인증 | **필수** |

### Path Variable

| 이름 | 타입 | 설명 |
| --- | --- | --- |
| `noticeId` | number | 분석할 공고 ID |
| `unitId` | number | 분석할 주택형 ID |

### Response (result)

```json
{
  "analysisId": 1,
  "resultLevel": "HIGH",
  "eligibilityScore": 82,
  "shortageAmount": 2000000,
  "rentBurdenRate": 28.57,
  "summaryMessage": "보유 현금은 일부 부족하지만 월세 부담률이 안정적이므로 입주 가능성이 높은 편입니다.",
  "conditionResults": [
    {
      "conditionCode": "INCOME",
      "conditionName": "소득 조건",
      "requiredValue": "월소득 350만원 이하",
      "userValue": "월소득 280만원",
      "resultStatus": "PASS",
      "failReason": null
    }
  ],
  "analyzedAt": "2026-07-01T00:10:00"
}
```

| 상태 | 설명 |
| --- | --- |
| 201 | 분석 생성 성공 |
| 401 | 인증 필요 |
| 404 | 공고 또는 주택형 없음 |

---

## 2. 분석 결과 조회

| 항목 | 내용 |
| --- | --- |
| Method · Endpoint | `GET /eligibility-analyses/{analysisId}` |
| 설명 | 분석 결과 ID 기준으로 분석 상세를 조회한다. |

### Response (result)

`POST /notices/{noticeId}/units/{unitId}/eligibility-analyses` 응답에 아래 필드를 추가해 반환한다.

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `noticeId` | number | 공고 ID |
| `unitId` | number | 주택형 ID |
| `expectedDepositAmount` | number | 예상 보증금 |
| `expectedMonthlyRentAmount` | number | 예상 월세 |
| `maintenanceFeeAmount` | number | 예상 관리비 |

---

## 3. 조건별 비교 결과 조회

| 항목 | 내용 |
| --- | --- |
| Method · Endpoint | `GET /eligibility-analyses/{analysisId}/conditions` |
| 설명 | 소득, 자산, 무주택 여부, 보유 현금 등 조건별 충족 여부를 조회한다. |

### Response (result)

```json
{
  "conditionResults": [
    {
      "conditionCode": "CASH",
      "conditionName": "보유 현금",
      "requiredValue": "보증금 1000만원 이상",
      "userValue": "보유 현금 800만원",
      "resultStatus": "FAIL",
      "failReason": "예상 보증금 대비 보유 현금이 200만원 부족합니다."
    }
  ]
}
```

---

## 4. 재정 계산 결과 조회

| 항목 | 내용 |
| --- | --- |
| Method · Endpoint | `GET /eligibility-analyses/{analysisId}/financial-summary` |
| 설명 | 예상 보증금, 월세, 관리비, 부족 자금, 월세 부담률 등 재정 계산 결과를 조회한다. |

### Response (result)

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `expectedDepositAmount` | number | 예상 보증금 |
| `expectedMonthlyRentAmount` | number | 예상 월세 |
| `maintenanceFeeAmount` | number \| null | 예상 관리비 |
| `userCashAmount` | number | 사용자 보유 현금 |
| `shortageAmount` | number | 부족 자금 |
| `monthlyIncomeAmount` | number | 사용자 월소득 |
| `monthlyHousingCost` | number | 월 주거비 |
| `rentBurdenRate` | number | 월세 부담률 |
| `financialMessage` | string \| null | 재정 분석 문구 |

---

## 5. 내 분석 이력 조회

| 항목 | 내용 |
| --- | --- |
| Method · Endpoint | `GET /users/me/eligibility-analyses` |
| 설명 | 로그인한 사용자의 입주 가능성 분석 이력을 조회한다. |

### Query Parameter

| 이름 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `page` | number | N | 기본값 0 |
| `size` | number | N | 기본값 10 |

### Response (result)

```json
{
  "analyses": [
    {
      "analysisId": 1,
      "noticeId": 12,
      "unitId": 3,
      "noticeTitle": "어반허브 서울스테이션 추가모집",
      "resultLevel": "HIGH",
      "eligibilityScore": 82,
      "shortageAmount": 2000000,
      "rentBurdenRate": 28.57,
      "analyzedAt": "2026-07-01T00:10:00"
    }
  ],
  "pageInfo": {
    "page": 0,
    "size": 10,
    "totalElements": 2,
    "totalPages": 1,
    "hasNext": false
  }
}
```
