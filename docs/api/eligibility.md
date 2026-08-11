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

| enum            | 값                                                                                                                            |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `resultLevel`   | `HIGH` / `MEDIUM` / `LOW` / `NOT_ELIGIBLE` / `NEED_CHECK`                                                                     |
| `conditionCode` | `INCOME` / `ASSET` / `CASH` / `HOMELESS` / `RENT_BURDEN` / `DEBT` / `REGION` / `AGE` / `HOUSEHOLD` / `SUBSCRIPTION` / `OTHER` |
| `resultStatus`  | `PASS` / `FAIL` / `NEED_CHECK`                                                                                                |

## 1차 구현 범위

| 우선순위 | Method | Endpoint                                                  | 설명                       |
| -------- | ------ | --------------------------------------------------------- | -------------------------- |
| P0       | `POST` | `/notices/{noticeId}/units/{unitId}/eligibility-analyses` | 입주 가능성 분석 요청      |
| P0       | `GET`  | `/eligibility-analyses/{analysisId}`                      | 입주 가능성 분석 결과 조회 |
| P0       | `GET`  | `/eligibility-analyses/{analysisId}/conditions`           | 조건별 비교 결과 조회      |
| P0       | `GET`  | `/eligibility-analyses/{analysisId}/financial-summary`    | 재정 계산 결과 조회        |
| P1       | `GET`  | `/users/me/eligibility-analyses`                          | 내 분석 이력 조회          |

## MVP 계산 기준

1차 MVP에서는 복잡한 정책 판정 전체 자동화보다 최소 계산 버전을 우선한다.

- `shortageAmount` = `expectedDepositAmount - userCashAmount`, 음수면 0 처리 권장
- `monthlyHousingCost` = `expectedMonthlyRentAmount + (maintenanceFeeAmount ?? 0)`
- 월세가 미수집이면 `expectedMonthlyRentAmount`, `monthlyHousingCost`, `rentBurdenRate`는 `null`이다. 월소득이 0원이면 `rentBurdenRate`는 계산할 수 없어 `null`이다. 실제 월세 0원과 구분하며, 이 경우 `RENT_BURDEN`은 `NEED_CHECK`으로 처리한다. 다른 정책 조건에 `FAIL`이 없을 때만 최종 등급도 `NEED_CHECK`이며, `FAIL`이 있으면 `NOT_ELIGIBLE`이 우선한다.
- 현재 크롤링 데이터에 관리비 원본이 없어 `maintenanceFeeAmount`는 `null`로 반환하고, 월세가 수집된 경우 월 주거비와 월세 부담률은 월세 기준으로 계산한다.
- `rentBurdenRate` = `monthlyHousingCost / monthlyIncomeAmount * 100` (월세·월소득 정보가 있을 때)
- 월세 부담률 배점은 40점이다. 부담률이 **40% 이하이면 40점**, 40% 초과면 0점으로 계산한다.
- 자동 판정 범위는 소득·자산·무주택·나이(사용자 생년월일이 있는 경우)·보유 현금·월세 부담률이다.
- 거주지·세대·청약·기타 원문 공고 조건은 임의 해석하지 않고 `NEED_CHECK`으로 저장한다.
- 공고 조건 중 `NEED_CHECK`가 하나라도 있으면 정책 충족 점수를 부여하지 않는다.
- 자동 판정한 필수 정책 조건 중 하나라도 `FAIL`이면 최종 등급은 `NOT_ELIGIBLE`이다. `FAIL`과 `NEED_CHECK`가 함께 있으면, 이미 충족하지 못한 필수 조건이 확인됐으므로 `NOT_ELIGIBLE`을 우선한다.
- `FAIL`이 없고 `NEED_CHECK`만 있으면 최종 등급은 `NEED_CHECK`로 반환한다.
- `summaryMessage`는 최종 `resultLevel`을 먼저 안내하고, 부족 자금·월세 부담률을 근거로 덧붙이는 종합 분석 문구다.

---

## 1. 입주 가능성 분석 요청

| 항목              | 내용                                                                                                   |
| ----------------- | ------------------------------------------------------------------------------------------------------ |
| Method · Endpoint | `POST /notices/{noticeId}/units/{unitId}/eligibility-analyses`                                         |
| 설명              | 사용자 조건 프로필과 공고/주택 조건을 비교하여 점수, 등급, 부족 자금, 월세 부담률을 계산하고 저장한다. |
| 인증              | **필수**                                                                                               |

### Path Variable

| 이름       | 타입   | 설명             |
| ---------- | ------ | ---------------- |
| `noticeId` | number | 분석할 공고 ID   |
| `unitId`   | number | 분석할 주택형 ID |

### Response (result)

```json
{
  "analysisId": 1,
  "resultLevel": "HIGH",
  "eligibilityScore": 82,
  "shortageAmount": 2000000,
  "rentBurdenRate": 28.57,
  "summaryMessage": "입주 가능성이 높은 편입니다. 예상 보증금 대비 보유 현금이 200만원 부족합니다. 월세 부담률은 28.57%로 안정적인 편입니다.",
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
  "analyzedAt": "2026-07-01T00:10:00.000Z"
}
```

| 상태 | 코드           | 설명                                                          |
| ---- | -------------- | ------------------------------------------------------------- |
| 201  | ELIGIBILITY201 | 분석 생성 성공                                                |
| 400  | COMMON400      | `noticeId`/`unitId` 형식·범위 오류 또는 공고·주택 관계 불일치 |
| 401  | AUTH401        | 인증 필요                                                     |
| 404  | COMMON404      | 공고 또는 주택형 없음                                         |
| 409  | COMMON409      | 사용자 조건 프로필이 입력되지 않음                            |
| 500  | COMMON500      | 서버 내부 오류                                                |

---

## 2. 분석 결과 조회

| 항목              | 내용                                        |
| ----------------- | ------------------------------------------- |
| Method · Endpoint | `GET /eligibility-analyses/{analysisId}`    |
| 설명              | 분석 결과 ID 기준으로 분석 상세를 조회한다. |
| 인증              | **필수**                                    |

다른 사용자의 분석 결과는 존재 여부를 노출하지 않고 `404`로 응답한다.

### Response (result)

분석 상세 조회는 분석 요청(`POST /notices/{noticeId}/units/{unitId}/eligibility-analyses`) 응답 필드에 아래 필드를 추가해 반환한다. `conditionProfileSnapshot`은 **분석 상세 조회 전용** 필드다.

| 필드                        | 타입           | 설명                                                       |
| --------------------------- | -------------- | ---------------------------------------------------------- |
| `noticeId`                  | number         | 공고 ID                                                    |
| `unitId`                    | number         | 주택형 ID                                                  |
| `supplyType`                | string         | 공급 유형. MVP는 `청년안심주택`으로 고정                   |
| `exclusiveAreaM2`           | number \| null | 선택한 주택형의 전용면적(㎡)                               |
| `expectedDepositAmount`     | number         | 예상 보증금                                                |
| `expectedMonthlyRentAmount` | number \| null | 예상 월세(미수집 시 null)                                  |
| `rentBurdenRate`            | number \| null | 월세 미수집 또는 월소득 0원 시 null                        |
| `maintenanceFeeAmount`      | number \| null | 예상 관리비(현재 미수집으로 null)                          |
| `conditionProfileSnapshot`  | object \| null | 분석 시점의 사용자 조건 프로필. 도입 전 분석 이력은 `null` |

`conditionProfileSnapshot`은 아래 필드를 항상 포함하며, 값이 없는 항목만 `null`이다.

| 필드                                                                                     | 타입           | nullable |
| ---------------------------------------------------------------------------------------- | -------------- | -------- |
| `monthlyIncomeAmount`, `totalAssetAmount`, `totalDebtAmount`, `monthlyDebtPaymentAmount`, `cashSavings` | number         | N        |
| `housingOwnershipStatus`, `maritalStatus`, `householdHeadStatus`                        | string         | N        |
| `isHomeless`, `hasRecentNewborn`                                                        | boolean        | N        |
| `residenceRegionCode`, `workplaceRegionCode`, `marriageDate`, `newbornBirthDate`, `employmentStatus` | string \| null | Y        |
| `isFirstTimeBuyer`                                                                      | boolean \| null | Y      |

```json
{
  "conditionProfileSnapshot": {
    "monthlyIncomeAmount": 3000000,
    "totalAssetAmount": 50000000,
    "totalDebtAmount": 8000000,
    "monthlyDebtPaymentAmount": 400000,
    "cashSavings": 20000000,
    "housingOwnershipStatus": "HOMELESS",
    "isHomeless": true,
    "residenceRegionCode": "11110",
    "workplaceRegionCode": null,
    "maritalStatus": "SINGLE",
    "marriageDate": null,
    "hasRecentNewborn": false,
    "newbornBirthDate": null,
    "householdHeadStatus": "UNKNOWN",
    "isFirstTimeBuyer": null,
    "employmentStatus": null
  }
}
```

프론트의 분석 결과 화면은 이 스냅샷을 사용하며, 현재값 API(`GET /users/me/condition-profile`)를 호출해 덮어쓰지 않는다. `conditionProfileSnapshot`이 `null`이면 스냅샷 도입 전 분석 이력이므로 Android는 "분석 당시 조건 정보가 없어 현재 프로필로 복원할 수 없습니다." 안내 문구를 표시한다.

`conditionResults`는 `eligibilityConditionResultId` 오름차순으로 반환한다.

| 상태 | 코드           | 설명                                                                  |
| ---- | -------------- | --------------------------------------------------------------------- |
| 200  | ELIGIBILITY200 | 분석 결과 조회 성공                                                   |
| 400  | COMMON400      | `analysisId`가 정수가 아니거나 0 이하 또는 safe integer 범위를 벗어남 |
| 401  | AUTH401        | 인증 토큰이 없거나 만료됨                                             |
| 404  | COMMON404      | 분석 결과가 없거나 다른 사용자의 분석 결과인 경우                     |
| 500  | COMMON500      | 서버 내부 오류                                                        |

---

## 3. 조건별 비교 결과 조회

| 항목              | 내용                                                                                    |
| ----------------- | --------------------------------------------------------------------------------------- |
| Method · Endpoint | `GET /eligibility-analyses/{analysisId}/conditions`                                     |
| 설명              | 소득, 자산, 무주택, 나이, 거주지, 세대, 청약, 보유 현금 등 조건별 충족 여부를 조회한다. |
| 인증              | **필수**                                                                                |

분석 요청 시 계산해 저장한 조건별 결과를 반환한다. 다른 사용자의 분석 결과는 `404`로 응답한다.

### Response (result)

```json
{
  "conditionResults": [
    {
      "conditionCode": "INCOME",
      "conditionName": "소득 조건",
      "requiredValue": "월소득 350만원 이하",
      "userValue": "월소득 280만원",
      "resultStatus": "PASS",
      "failReason": null
    },
    {
      "conditionCode": "ASSET",
      "conditionName": "자산 조건",
      "requiredValue": "총자산 2억 5천만원 이하",
      "userValue": "총자산 1억 2천만원",
      "resultStatus": "PASS",
      "failReason": null
    },
    {
      "conditionCode": "HOMELESS",
      "conditionName": "무주택 여부",
      "requiredValue": "무주택자",
      "userValue": "무주택자",
      "resultStatus": "PASS",
      "failReason": null
    },
    {
      "conditionCode": "AGE",
      "conditionName": "나이 조건",
      "requiredValue": "만 19세 이상 39세 이하",
      "userValue": "만 28세",
      "resultStatus": "PASS",
      "failReason": null
    },
    {
      "conditionCode": "REGION",
      "conditionName": "거주지 조건",
      "requiredValue": "서울특별시 거주자",
      "userValue": "서울특별시",
      "resultStatus": "NEED_CHECK",
      "failReason": "공고 거주지 조건의 세부 기준 확인이 필요합니다."
    },
    {
      "conditionCode": "CASH",
      "conditionName": "보유 현금",
      "requiredValue": "보증금 1000만원 이상",
      "userValue": "보유 현금 800만원",
      "resultStatus": "FAIL",
      "failReason": "예상 보증금 대비 보유 현금이 200만원 부족합니다."
    },
    {
      "conditionCode": "RENT_BURDEN",
      "conditionName": "월세 부담률",
      "requiredValue": "월소득 대비 월 주거비 40% 이하 권장",
      "userValue": "28.57%",
      "resultStatus": "PASS",
      "failReason": null
    }
  ]
}
```

`conditionResults`는 `eligibilityConditionResultId` 오름차순으로 반환한다.
공고에 저장된 조건만 결과에 포함되며, 거주지·세대·청약·기타 원문 조건은 현재 `NEED_CHECK`으로 반환한다.

| 상태 | 코드           | 설명                                                                  |
| ---- | -------------- | --------------------------------------------------------------------- |
| 200  | ELIGIBILITY200 | 조건별 비교 결과 조회 성공                                            |
| 400  | COMMON400      | `analysisId`가 정수가 아니거나 0 이하 또는 safe integer 범위를 벗어남 |
| 401  | AUTH401        | 인증 토큰이 없거나 만료됨                                             |
| 404  | COMMON404      | 분석 결과가 없거나 다른 사용자의 분석 결과인 경우                     |
| 500  | COMMON500      | 서버 내부 오류                                                        |

---

## 4. 재정 계산 결과 조회

| 항목              | 내용                                                                            |
| ----------------- | ------------------------------------------------------------------------------- |
| Method · Endpoint | `GET /eligibility-analyses/{analysisId}/financial-summary`                      |
| 설명              | 예상 보증금, 월세, 관리비, 부족 자금, 월세 부담률 등 재정 계산 결과를 조회한다. |
| 인증              | **필수**                                                                        |

저장된 분석 결과를 기준으로 월 주거비(월세 + 관리비)와 부족 자금을 반환한다. 현재 크롤링 데이터에서 관리비 원본을 수집하지 않으므로 `maintenanceFeeAmount`는 `null`로 반환한다. 이 경우 월 주거비와 월세 부담률은 월세 기준으로 계산하며, 재정 분석 문구에 그 제한을 함께 안내한다. `userCashAmount`, `monthlyIncomeAmount`는 분석 실행 당시 사용자 조건 프로필 값을 스냅샷으로 저장해 반환한다. 다른 사용자의 분석 결과는 `404`로 응답한다.

### Response (result)

| 필드                        | 타입           | 설명                                             |
| --------------------------- | -------------- | ------------------------------------------------ |
| `expectedDepositAmount`     | number         | 예상 보증금                                      |
| `expectedMonthlyRentAmount` | number \| null | 예상 월세(미수집 시 null)                        |
| `maintenanceFeeAmount`      | number \| null | 예상 관리비(현재 미수집으로 null)                |
| `userCashAmount`            | number         | 사용자 보유 현금                                 |
| `shortageAmount`            | number         | 부족 자금                                        |
| `monthlyIncomeAmount`       | number         | 사용자 월소득                                    |
| `monthlyHousingCost`        | number \| null | 월 주거비(월세 미수집 시 null)                   |
| `rentBurdenRate`            | number \| null | 월세 부담률(월세 미수집 또는 월소득 0원 시 null) |
| `financialMessage`          | string \| null | 재정 분석 문구                                   |

| 상태 | 코드           | 설명                                                                  |
| ---- | -------------- | --------------------------------------------------------------------- |
| 200  | ELIGIBILITY200 | 재정 계산 결과 조회 성공                                              |
| 400  | COMMON400      | `analysisId`가 정수가 아니거나 0 이하 또는 safe integer 범위를 벗어남 |
| 401  | AUTH401        | 인증 토큰이 없거나 만료됨                                             |
| 404  | COMMON404      | 분석 결과가 없거나 다른 사용자의 분석 결과인 경우                     |
| 500  | COMMON500      | 서버 내부 오류                                                        |

---

## 5. 내 분석 이력 조회

| 항목              | 내용                                                                               |
| ----------------- | ---------------------------------------------------------------------------------- |
| Method · Endpoint | `GET /users/me/eligibility-analyses`                                               |
| 설명              | 로그인한 사용자의 입주 가능성 분석 이력과 카드 표시용 공고·주택형 정보를 조회한다. |
| 인증              | **필수**                                                                           |

### Query Parameter

| 이름   | 타입   | 필수 | 설명               |
| ------ | ------ | ---- | ------------------ |
| `page` | number | N    | 기본값 0           |
| `size` | number | N    | 기본값 10, 최대 50 |

### Response (result)

```json
{
  "analyses": [
    {
      "analysisId": 1,
      "noticeId": 12,
      "unitId": 3,
      "noticeTitle": "어반허브 서울스테이션 추가모집",
      "announcementNo": "2024-강동-031",
      "unitName": "59㎡",
      "exclusiveAreaM2": 59,
      "expectedDepositAmount": 32000000,
      "applicationStartAt": "2026-07-05T00:00:00.000Z",
      "applicationEndAt": "2026-07-08T09:00:00.000Z",
      "noticeStatus": "RECRUITING",
      "noticeStatusDisplayText": "모집중",
      "isAdditionalRecruitment": false,
      "resultLevel": "HIGH",
      "eligibilityScore": 82,
      "shortageAmount": 2000000,
      "rentBurdenRate": 28.57,
      "analyzedAt": "2026-07-01T00:10:00.000Z"
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

분석 일시 최신순으로 반환하며, 같은 시각의 결과는 분석 ID 내림차순으로 정렬한다. 각 이력에는 분석 당시 보증금과 현재 공고의 접수 일정·모집 상태·주택형 정보를 함께 반환한다. 현재 스키마에 경쟁률 데이터는 저장하지 않아 경쟁률은 반환하지 않는다. 분석 이력이 없으면 `analyses: []`와 `pageInfo`를 함께 반환한다.

| 상태 | 코드           | 설명                                                                   |
| ---- | -------------- | ---------------------------------------------------------------------- |
| 200  | ELIGIBILITY200 | 내 분석 이력 조회 성공. 결과가 없으면 `analyses: []`와 `pageInfo` 반환 |
| 400  | COMMON400      | `page` 또는 `size` 형식·범위 오류                                      |
| 401  | AUTH401        | 인증 토큰이 없거나 만료됨                                              |
| 500  | COMMON500      | 서버 내부 오류                                                         |
