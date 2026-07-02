# Notice 도메인 API 명세

> 담당: 김찬혁(찬찬) · 도메인: Notice
> **이 문서는 팀 Notion `api 명세서`(SSOT)를 미러링한 것이다.** 값이 충돌하면 Notion이 우선이며, Notion 수정 시 이 문서와 Swagger도 함께 맞춘다.
> Notion: https://app.notion.com/p/38e2a03e23d98097aa90e434b9017faa

## 공통 규칙

- 공통 Base Path는 `/api`이다.
- 아래 Endpoint는 Base Path를 제외한 경로로 작성한다. 예: 문서상 `GET /notices` -> 실제 호출 `GET /api/notices`.
- 응답 envelope는 `{ isSuccess, code, message, result }` 형식을 사용한다.
- `code`는 도메인 접두사 + 상태코드 형식을 사용한다. 예: `NOTICE200`, `NOTICE201`.
- Request/Response 필드는 **camelCase**를 사용한다.
- 날짜/시간은 **ISO 8601 문자열** (`2026-07-01T10:00:00+09:00`).
- 금액은 **원 단위 정수**, 면적은 **m2 숫자**로 응답한다.
- enum은 **대문자 문자열**을 사용하고, 화면 표시 문구는 `...DisplayText`, `dDayText` 등 별도 필드로 제공한다.
- 목록 페이징은 offset 방식이며 `page`/`size`를 사용한다. `page`는 0부터 시작한다.

### 공통 응답 형식

```json
{
  "isSuccess": true,
  "code": "NOTICE200",
  "message": "요청에 성공했습니다.",
  "result": {}
}
```

목록 응답의 `result`는 `{ <목록배열>, "pageInfo": { ... } }` 형태를 사용한다.

```json
{
  "pageInfo": {
    "page": 0,
    "size": 10,
    "totalElements": 36,
    "totalPages": 4,
    "hasNext": true
  }
}
```

### 공통 enum

| enum | 값 | 비고 |
| --- | --- | --- |
| `status` (공고 상태) | `RECRUITING` / `SCHEDULED` / `CLOSING_SOON` / `CLOSED` | `statusDisplayText`로 표시 문구 동반 |
| `sort` (목록) | `LATEST`(기본) / `DEADLINE` / `POPULAR` | 1차는 `LATEST`, `DEADLINE` 우선. `POPULAR`은 저장 수 기반 P1 |
| `fileType` | `PDF` / `IMAGE` / `LINK` / `DOC` / `OTHER` | |

`isAdditionalRecruitment`는 boolean 단일값으로 사용한다.

- `false`: 일반 공고
- `true`: 추가모집 공고

## 1차 구현 범위

1차 과제 기준 Notice 도메인의 최소 구현 API는 아래 2개이다.

| 우선순위 | Method | Endpoint | 설명 |
| --- | --- | --- | --- |
| P0 | `GET` | `/notices` | 공고 목록 조회 |
| P0 | `GET` | `/notices/{noticeId}` | 공고 상세 조회 |

주택형/첨부파일 단독 조회, 저장 공고 API, 인기순 정렬, 상세 필터는 P1로 분리한다.

---

## 1. 공고 목록 조회

| 항목 | 내용 |
| --- | --- |
| Method · Endpoint | `GET /notices` |
| 설명 | 필터·정렬·페이징을 적용한 공고 목록 조회 |
| 인증 | 선택 |
| 우선순위 · 화면 | 🔥 P0 · 홈/공고 목록·필터링 |

### Query Parameter

| 이름 | 타입 | 필수 | 1차 기준 | 설명 |
| --- | --- | --- | --- | --- |
| `region` | string | N | P0 | 시/도. 예: `서울` |
| `district` | string | N | P0 | 시/군/구. 예: `강동구` |
| `status` | enum | N | P0 | `RECRUITING` / `SCHEDULED` / `CLOSING_SOON` / `CLOSED` |
| `isAdditionalRecruitment` | boolean | N | P0 | 추가모집 여부 |
| `sort` | enum | N | P0 | `LATEST` 기본, `DEADLINE` |
| `page` | number | N | P0 | 0부터 시작. 기본 0 |
| `size` | number | N | P0 | 페이지 크기. 기본 10 |
| `keyword` | string | N | P1 | 공고명/지역/단지명 검색어 |
| `minDeposit` / `maxDeposit` | number | N | P1 | 보증금 범위 |
| `minArea` / `maxArea` | number | N | P1 | 전용면적 범위 |

`POPULAR` 정렬은 저장 공고 수(`interestedCount`) 기준이며 저장 기능 구현 이후 P1로 처리한다.

### Response (result)

`result.notices[]` 항목 + `result.pageInfo`.

```json
{
  "isSuccess": true,
  "code": "NOTICE200",
  "message": "공고 목록 조회에 성공했습니다.",
  "result": {
    "notices": [
      {
        "noticeId": 1,
        "title": "강동구 청년안심주택 2025-03호",
        "region": "서울",
        "district": "강동구",
        "unitSummary": "전용 24㎡",
        "depositMin": 32000000,
        "depositMax": 48000000,
        "monthlyRentMin": 280000,
        "monthlyRentMax": 410000,
        "status": "RECRUITING",
        "statusDisplayText": "모집중",
        "isAdditionalRecruitment": true,
        "applicationStartAt": "2026-07-01T10:00:00+09:00",
        "applicationEndAt": "2026-07-10T18:00:00+09:00",
        "dDayText": "D-3",
        "views": 120,
        "interestedCount": 32
      }
    ],
    "pageInfo": { "page": 0, "size": 10, "totalElements": 36, "totalPages": 4, "hasNext": true }
  }
}
```

### Status

| 상태 | 설명 |
| --- | --- |
| 200 | 공고 목록 조회 성공 |
| 400 | 잘못된 Query Parameter |
| 500 | 서버 내부 오류 |

---

## 2. 공고 상세 조회

| 항목 | 내용 |
| --- | --- |
| Method · Endpoint | `GET /notices/{noticeId}` |
| 설명 | 공고 상세 + 주택형 + 자격조건 + 첨부파일 + 저장여부 |
| 인증 | 선택 (로그인 시 `isSaved` 포함) |
| 우선순위 · 화면 | 🔥 P0 · 공고 상세 |

로그인하지 않은 사용자는 `isSaved`를 `false`로 반환한다. 로그인 사용자는 실제 저장 여부를 반환한다.

### Path Variable

| 이름 | 타입 | 설명 |
| --- | --- | --- |
| `noticeId` | number | 공고 ID |

### Response (result)

1차 구현에서는 상세 응답에 `units`, `conditions`, `files`를 함께 포함한다. 단독 조회 API는 P1로 분리한다.

```json
{
  "isSuccess": true,
  "code": "NOTICE200",
  "message": "공고 상세 조회에 성공했습니다.",
  "result": {
    "noticeId": 1,
    "title": "강동구 청년안심주택 2025-03호",
    "announcementNo": "2025-03",
    "region": "서울",
    "district": "강동구",
    "address": "서울 강동구 천호동 123-4",
    "sourceUrl": "https://example.com/notice",
    "status": "RECRUITING",
    "statusDisplayText": "모집중",
    "isAdditionalRecruitment": true,
    "applicationStartAt": "2026-07-01T10:00:00+09:00",
    "applicationEndAt": "2026-07-10T18:00:00+09:00",
    "views": 120,
    "interestedCount": 32,
    "isSaved": true,
    "units": [
      {
        "unitId": 10, "unitName": "24A",
        "exclusiveAreaM2": 24.0, "supplyAreaM2": 36.0,
        "depositMin": 32000000, "depositMax": 48000000,
        "monthlyRentMin": 280000, "monthlyRentMax": 410000,
        "supplyCount": 18
      }
    ],
    "conditions": [
      {
        "conditionId": 1,
        "targetType": "YOUTH",
        "minAge": 19, "maxAge": 39,
        "incomeLimitAmount": 5000000, "incomeLimitText": "도시근로자 월평균 소득 100% 이하",
        "assetLimitAmount": 361000000, "assetLimitText": "총자산 3억 6,100만 원 이하",
        "requiresHomeless": true,
        "residenceRequirement": "서울시 거주 또는 직장 소재",
        "rawConditionText": "공고문 기준 자격 조건 원문"
      }
    ],
    "files": [
      { "fileId": 1, "fileName": "2025-03호 공고문.pdf", "fileType": "PDF", "fileUrl": "https://example.com/notice.pdf", "registeredAt": "2026-06-29T10:00:00+09:00" }
    ]
  }
}
```

### Status

| 상태 | 설명 |
| --- | --- |
| 200 | 성공 |
| 404 | 공고 없음 |
| 500 | 서버 내부 오류 |

---

## 3. 공고 주택형 조회

| 항목 | 내용 |
| --- | --- |
| Method · Endpoint | `GET /notices/{noticeId}/units` |
| 인증 · 우선순위 · 화면 | 불필요 · ⭐ P1 · 공고 상세 |

공고 상세 응답에 `units`를 포함하므로 1차 구현에서는 필수 구현 범위에서 제외한다.

### Response (result.units[])

```json
{
  "isSuccess": true, "code": "NOTICE200", "message": "공고 주택형 조회에 성공했습니다.",
  "result": {
    "units": [
      { "unitId": 10, "unitName": "24A", "exclusiveAreaM2": 24.0, "supplyAreaM2": 36.0,
        "depositMin": 32000000, "depositMax": 48000000,
        "monthlyRentMin": 280000, "monthlyRentMax": 410000, "supplyCount": 18 }
    ]
  }
}
```

| 상태 | 설명 |
| --- | --- |
| 200 | 성공 |
| 404 | 공고 없음 |

---

## 4. 공고 첨부파일 목록 조회

| 항목 | 내용 |
| --- | --- |
| Method · Endpoint | `GET /notices/{noticeId}/files` |
| 인증 · 우선순위 · 화면 | 불필요 · ⭐ P1 · 공고 상세 |

공고 상세 응답에 `files`를 포함하므로 1차 구현에서는 필수 구현 범위에서 제외한다.

### Response (result.files[])

`fileType`: `PDF` / `IMAGE` / `LINK` / `DOC` / `OTHER`

```json
{
  "isSuccess": true, "code": "NOTICE200", "message": "공고 첨부파일 목록 조회에 성공했습니다.",
  "result": {
    "files": [
      { "fileId": 1, "fileName": "2025-03호 공고문.pdf", "fileType": "PDF", "fileUrl": "https://example.com/notice.pdf", "registeredAt": "2026-06-29T10:00:00+09:00" },
      { "fileId": 2, "fileName": "입주자 모집 안내 책자", "fileType": "LINK", "fileUrl": "https://example.com/guide", "registeredAt": "2026-06-29T10:00:00+09:00" }
    ]
  }
}
```

| 상태 | 설명 |
| --- | --- |
| 200 | 성공 |
| 404 | 공고 없음 |

---

## 5. 공고 저장

| 항목 | 내용 |
| --- | --- |
| Method · Endpoint | `POST /notices/{noticeId}/save` |
| 설명 | 공고 저장(찜). 저장 수 기준 인기순에 반영 |
| 인증 | **필수** |
| 우선순위 · 화면 | ⭐ P1 · 공고 목록·상세 |

저장 요청은 멱등하게 처리한다.

- 처음 저장한 경우: 201
- 이미 저장된 공고를 다시 저장한 경우: 200 + `isSaved: true`

### Response (result)

```json
{
  "isSuccess": true, "code": "NOTICE201", "message": "공고 저장에 성공했습니다.",
  "result": { "savedNoticeId": 100, "noticeId": 1, "isSaved": true, "interestedCount": 33, "savedAt": "2026-06-30T10:00:00+09:00" }
}
```

### Status

| 상태 | 설명 |
| --- | --- |
| 200 | 이미 저장된 공고 |
| 201 | 저장 성공 |
| 401 | 인증 필요 |
| 404 | 공고 없음 |

---

## 6. 공고 저장 해제

| 항목 | 내용 |
| --- | --- |
| Method · Endpoint | `DELETE /notices/{noticeId}/save` |
| 인증 | **필수** |
| 우선순위 · 화면 | ⭐ P1 · 공고 목록·상세·저장 목록 |

저장 해제 요청도 멱등하게 처리한다. 이미 저장 해제된 상태여도 공고가 존재하면 `isSaved: false`로 200을 반환한다.

### Response (result)

```json
{
  "isSuccess": true, "code": "NOTICE200", "message": "공고 저장 해제에 성공했습니다.",
  "result": { "noticeId": 1, "isSaved": false, "interestedCount": 32 }
}
```

| 상태 | 설명 |
| --- | --- |
| 200 | 해제 성공 또는 이미 해제된 상태 |
| 401 | 인증 필요 |
| 404 | 공고 없음 |

---

## 7. 저장 공고 목록 조회

| 항목 | 내용 |
| --- | --- |
| Method · Endpoint | `GET /users/me/saved-notices` |
| 설명 | 마이페이지 저장 공고 목록 |
| 인증 | **필수** |
| 우선순위 · 화면 | ⭐ P1 · 저장 공고 관리 |

### Query Parameter

| 이름 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `sort` | enum | N | `LATEST`(savedAt 기준) / `POPULAR`(interestedCount 기준) |
| `page` | number | N | 기본 0 |
| `size` | number | N | 기본 10 |

### Response (result)

`result.savedNotices[]` + `result.pageInfo`.

```json
{
  "isSuccess": true, "code": "NOTICE200", "message": "저장 공고 목록 조회에 성공했습니다.",
  "result": {
    "savedNotices": [
      {
        "savedNoticeId": 100, "noticeId": 1,
        "title": "강동구 청년안심주택 2025-03호",
        "region": "서울", "district": "강동구",
        "status": "RECRUITING", "statusDisplayText": "모집중",
        "applicationEndAt": "2026-07-10T18:00:00+09:00",
        "dDayText": "D-3", "interestedCount": 32,
        "savedAt": "2026-06-30T10:00:00+09:00"
      }
    ],
    "pageInfo": { "page": 0, "size": 10, "totalElements": 12, "totalPages": 2, "hasNext": true }
  }
}
```

| 상태 | 설명 |
| --- | --- |
| 200 | 성공 |
| 401 | 인증 필요 |
| 500 | 서버 내부 오류 |

---

## 추후 논의

- 추가모집을 boolean보다 세분화해야 하는지 여부
- `POPULAR` 정렬의 정확한 기준과 집계 방식
- 저장 공고 API의 1차 구현 포함 여부
