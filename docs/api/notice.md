# Notice 도메인 API 명세

> 담당: 김찬혁(찬찬) · 도메인: 📢 Notice
> **이 문서는 팀 Notion `api 명세서`(SSOT)를 미러링한 것이다.** 값이 충돌하면 Notion이 우선이며, Notion 수정 시 이 문서와 Swagger도 함께 맞춘다.
> Notion: https://app.notion.com/p/38e2a03e23d98097aa90e434b9017faa

## 공통 규칙

- 응답 envelope: `isSuccess` / `code` / `message` / `result`.
- `code`는 도메인 접두사 + 상태코드 (예: `NOTICE200`, `NOTICE201`).
- Response 필드는 **camelCase**.
- 날짜/시간은 **ISO 8601 문자열** (`2026-07-01T10:00:00+09:00`).
- 금액은 **원 단위 정수**, 면적은 **㎡ 숫자**.
- enum은 **대문자 문자열**, 화면 표시 문구는 `...DisplayText` / `dDayText` 등으로 별도 제공.

### 공통 응답 형식

```json
{
  "isSuccess": true,
  "code": "NOTICE200",
  "message": "요청에 성공했습니다.",
  "result": { }
}
```

목록 응답의 `result`는 `{ <목록배열>, "pageInfo": { ... } }` 형태.

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
| `sort` (목록) | `LATEST`(기본) / `DEADLINE` / `POPULAR` | POPULAR = `interestedCount`(저장 수) 기준 |
| `fileType` | `PDF` / `IMAGE` / `LINK` / `DOC` / `OTHER` | |

> `isAdditionalRecruitment`는 Boolean 단일값(추가모집 여부). 잔여세대/미계약/긴급 세분류는 현재 명세에 없음 — 필요 시 회의 안건.

---

## 1. 공고 목록 조회

| 항목 | 내용 |
| --- | --- |
| Method · Endpoint | `GET /notices` |
| 설명 | 필터·정렬·페이징을 적용한 공고 목록 조회 |
| 인증 | 선택 |
| 우선순위 · 화면 | 🔥 P0 · 홈/공고 목록·필터링 |

### Query Parameter

| 이름 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `keyword` | string | N | 공고명/지역/단지명 검색어 |
| `region` | string | N | 시/도 (예: `서울`) |
| `district` | string | N | 시/군/구 (예: `강동구`) |
| `status` | enum | N | `RECRUITING`/`SCHEDULED`/`CLOSING_SOON`/`CLOSED` |
| `isAdditionalRecruitment` | boolean | N | 추가모집 여부 |
| `minDeposit` / `maxDeposit` | number | N | 보증금 범위(원) |
| `minArea` / `maxArea` | number | N | 전용면적 범위(㎡) |
| `sort` | enum | N | `LATEST`(기본)/`DEADLINE`/`POPULAR` |
| `page` | number | N | 0부터 시작 (기본 0) |
| `size` | number | N | 페이지 크기 (기본 10) |

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

> ❓ 확인 필요: 페이징 방식 — offset(`page`/`size`) vs cursor.

---

## 2. 공고 상세 조회

| 항목 | 내용 |
| --- | --- |
| Method · Endpoint | `GET /notices/{noticeId}` |
| 설명 | 공고 상세 + 주택형 + 자격조건 + 첨부파일 + 저장여부 |
| 인증 | 선택 (로그인 시 `isSaved` 포함) |
| 우선순위 · 화면 | 🔥 P0 · 공고 상세 |

### Path Variable

| 이름 | 타입 | 설명 |
| --- | --- | --- |
| `noticeId` | number | 공고 ID |

### Response (result)

`conditions`는 **단일 Object**, `units`/`files`는 **Array**.

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
    "conditions": {
      "targetType": "YOUTH",
      "minAge": 19, "maxAge": 39,
      "incomeLimitAmount": 5000000, "incomeLimitText": "도시근로자 월평균 소득 100% 이하",
      "assetLimitAmount": 361000000, "assetLimitText": "총자산 3억 6,100만 원 이하",
      "requiresHomeless": true,
      "residenceRequirement": "서울시 거주 또는 직장 소재",
      "rawConditionText": "공고문 기준 자격 조건 원문"
    },
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

> ❓ 확인 필요: 입주 조건(`conditions`) 필드 포함 범위.
> ⚠️ ERD `notice_conditions`는 1:N 테이블이나 본 응답은 단일 Object → 공고당 조건셋 1개 가정. 다중 조건이면 API/ERD 정합 필요.

---

## 3. 공고 주택형 조회

| 항목 | 내용 |
| --- | --- |
| Method · Endpoint | `GET /notices/{noticeId}/units` |
| 인증 · 우선순위 · 화면 | 불필요 · ⭐ P1 · 공고 상세 |

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
| 우선순위 · 화면 | 🔥 P0 · 공고 목록·상세 |

### Response (result) — 201

```json
{
  "isSuccess": true, "code": "NOTICE201", "message": "공고 저장에 성공했습니다.",
  "result": { "savedNoticeId": 100, "noticeId": 1, "isSaved": true, "interestedCount": 33, "savedAt": "2026-06-30T10:00:00+09:00" }
}
```

### Status

| 상태 | 설명 |
| --- | --- |
| 201 | 저장 성공 |
| 400 | **이미 저장된 공고** (비멱등 — 중복 저장 거부) |
| 401 | 인증 필요 |
| 404 | 공고 없음 |

> ❓ 확인 필요: 비로그인 저장 시도 처리.

---

## 6. 공고 저장 해제

| 항목 | 내용 |
| --- | --- |
| Method · Endpoint | `DELETE /notices/{noticeId}/save` |
| 인증 | **필수** |
| 우선순위 · 화면 | 🔥 P0 · 공고 목록·상세·저장 목록 |

### Response (result)

```json
{
  "isSuccess": true, "code": "NOTICE200", "message": "공고 저장 해제에 성공했습니다.",
  "result": { "noticeId": 1, "isSaved": false, "interestedCount": 32 }
}
```

| 상태 | 설명 |
| --- | --- |
| 200 | 해제 성공 |
| 401 | 인증 필요 |
| 404 | 공고 또는 저장 내역 없음 |

---

## 7. 저장 공고 목록 조회

| 항목 | 내용 |
| --- | --- |
| Method · Endpoint | `GET /users/me/saved-notices` |
| 설명 | 마이페이지 저장 공고 목록 |
| 인증 | **필수** |
| 우선순위 · 화면 | 🔥 P0 · 저장 공고 관리 |

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

## 미해결 결정 (회의 안건)

Notion 명세 기준 아직 열린 항목:

- [ ] 공고 목록 페이징 방식: offset vs cursor
- [ ] 공고 상세 `conditions` 포함 범위, 1:1 vs 1:N (ERD `notice_conditions`와 정합)
- [ ] 비로그인 저장 시도 처리 (401 vs 무시)
- [ ] `isAdditionalRecruitment` boolean으로 충분한지(잔여세대/미계약/긴급 세분류 필요 시 enum)
