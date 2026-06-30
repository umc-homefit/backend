# Notice 도메인 API 명세

> 담당: 김찬혁(찬찬) · 도메인: 📢 Notice
> 이 문서는 Notion API 명세와 Swagger의 원본(SSOT)으로 사용한다. API 변경 시 이 문서를 먼저 고치고 Notion/Swagger에 반영한다.
> `> ❓ 확인 필요` 표시는 팀/팀장 확정이 필요한 항목이다.

## 공통 규칙

- Response 필드는 **camelCase** (Android 연동 편의).
- 날짜/시간은 **ISO 8601 문자열** (`2026-07-01T09:00:00+09:00`).
- 금액은 **원 단위 정수** (`120000000`).
- 면적은 **㎡, 소수 1자리 숫자** (`44.9`).
- enum은 **대문자 문자열**.
- 화면 표시용 문구가 필요하면 `displayText`를 함께 제공.

### 공통 응답 형식

> ❓ 확인 필요: 공통 응답 envelope는 팀 합의 필요. 아래는 제안안.

```json
{
  "success": true,
  "code": "SUCCESS",
  "message": "요청에 성공했습니다.",
  "data": { }
}
```

페이지네이션 응답의 `data`:

```json
{
  "content": [],
  "page": 0,
  "size": 20,
  "totalElements": 137,
  "totalPages": 7,
  "hasNext": true
}
```

### 공통 enum

| enum | 값 | 의미 |
| --- | --- | --- |
| `noticeStatus` | `RECRUITING` | 모집 중 |
| | `UPCOMING` | 모집 예정 |
| | `CLOSED` | 모집 마감 |
| `recruitmentType` | `NORMAL` | 일반 모집 |
| | `ADDITIONAL` | 추가모집 |
| | `REMAINING` | 잔여세대 |
| | `UNCONTRACTED` | 미계약 |
| | `URGENT` | 긴급 |
| `sort` (목록) | `LATEST` | 최신순 (기본값) |
| | `DEADLINE` | 마감임박순 |
| | `POPULAR` | 인기순(저장 수 기준) |

> ❓ 확인 필요: 목록 기본 정렬이 `LATEST`인지 `DEADLINE`인지. 인수인계 기준 `LATEST`로 둠.
> ❓ 확인 필요: 인기순은 저장 수 기준으로 확정(팀장 확인됨). `savedCount` 기준 정렬.

---

## 1. 공고 목록 조회

| 항목 | 내용 |
| --- | --- |
| 이름 | 공고 목록 조회 |
| Method | `GET` |
| Endpoint | `/notices` |
| 설명 | 필터/정렬/페이지네이션을 적용해 공고 목록을 조회한다. |
| 인증 | 선택 (로그인 시 `isSaved` 포함) |
| 우선순위 | 🔥 P0 |
| 연결 화면 | 홈 / 공고 목록 |

### Query Parameter

| 이름 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `keyword` | string | N | 공고명/단지명 검색어 |
| `region` | string | N | 시/도 (예: `서울특별시`) |
| `district` | string | N | 구 (예: `동작구`) |
| `status` | enum | N | `RECRUITING` / `UPCOMING` / `CLOSED` |
| `isAdditionalRecruitment` | boolean | N | 추가모집류만 필터 (`ADDITIONAL`/`REMAINING`/`UNCONTRACTED`/`URGENT`) |
| `minDeposit` | integer | N | 최소 보증금(원) |
| `maxDeposit` | integer | N | 최대 보증금(원) |
| `minArea` | number | N | 최소 전용면적(㎡) |
| `maxArea` | number | N | 최대 전용면적(㎡) |
| `sort` | enum | N | `LATEST`(기본) / `DEADLINE` / `POPULAR` |
| `page` | integer | N | 0부터 시작 (기본 0) |
| `size` | integer | N | 페이지 크기 (기본 20) |

### Response Body (data.content[])

```json
{
  "noticeId": 12,
  "title": "더클래식 동작 청년안심주택 추가모집",
  "region": "서울특별시",
  "district": "동작구",
  "complexName": "더클래식 동작",
  "recruitmentType": "ADDITIONAL",
  "recruitmentTypeText": "추가모집",
  "status": "RECRUITING",
  "statusText": "모집중",
  "depositMin": 35000000,
  "depositMax": 52000000,
  "monthlyRentMin": 180000,
  "monthlyRentMax": 240000,
  "exclusiveAreaMin": 29.9,
  "exclusiveAreaMax": 44.9,
  "applicationStartDate": "2026-07-01T00:00:00+09:00",
  "applicationEndDate": "2026-07-14T18:00:00+09:00",
  "savedCount": 24,
  "viewCount": 311,
  "isSaved": false
}
```

> ❓ 확인 필요: 비로그인 사용자의 `isSaved`를 `false`로 줄지 `null`로 줄지. 기본 `false`로 둠.

### Error Response

| 상태 | code | 설명 |
| --- | --- | --- |
| 400 | `INVALID_QUERY_PARAM` | 잘못된 정렬/필터 값 (예: 알 수 없는 `sort`) |

---

## 2. 공고 상세 조회

| 항목 | 내용 |
| --- | --- |
| 이름 | 공고 상세 조회 |
| Method | `GET` |
| Endpoint | `/notices/{noticeId}` |
| 설명 | 공고 단건 상세 정보를 조회한다. 단지·주택형·자격조건·첨부파일·저장여부 포함. |
| 인증 | 선택 |
| 우선순위 | 🔥 P0 |
| 연결 화면 | 공고 상세 |

### Path Variable

| 이름 | 타입 | 설명 |
| --- | --- | --- |
| `noticeId` | integer | 공고 ID |

### Response Body (data)

```json
{
  "noticeId": 12,
  "title": "더클래식 동작 청년안심주택 추가모집",
  "recruitmentType": "ADDITIONAL",
  "recruitmentTypeText": "추가모집",
  "status": "RECRUITING",
  "statusText": "모집중",
  "complex": {
    "complexId": 3,
    "name": "더클래식 동작",
    "region": "서울특별시",
    "district": "동작구",
    "address": "서울특별시 동작구 ...",
    "latitude": 37.5012,
    "longitude": 126.9421
  },
  "supplyType": "청년안심주택",
  "applicationStartDate": "2026-07-01T00:00:00+09:00",
  "applicationEndDate": "2026-07-14T18:00:00+09:00",
  "depositMin": 35000000,
  "depositMax": 52000000,
  "monthlyRentMin": 180000,
  "monthlyRentMax": 240000,
  "exclusiveAreaMin": 29.9,
  "exclusiveAreaMax": 44.9,
  "sourceUrl": "https://soco.seoul.go.kr/...",
  "savedCount": 24,
  "viewCount": 312,
  "isSaved": false,
  "units": [
    {
      "unitId": 101,
      "typeName": "29A",
      "exclusiveArea": 29.9,
      "deposit": 35000000,
      "monthlyRent": 180000,
      "supplyCount": 12
    }
  ],
  "conditions": [
    {
      "conditionId": 501,
      "type": "AGE",
      "description": "만 19세 이상 39세 이하"
    }
  ],
  "files": [
    {
      "fileId": 9001,
      "name": "입주자모집공고문.pdf",
      "type": "PDF",
      "url": "https://.../notice.pdf"
    }
  ]
}
```

> ❓ 확인 필요: 상세 응답에 `files`/`units`/`conditions`를 인라인 포함할지(현재 포함), 별도 API(3·4번)로만 둘지. 화면 진입 즉시 노출이 필요하면 인라인 유지 권장.
> ❓ 확인 필요: 조회 수 증가 기준 — 상세 호출마다 +1 인지, 사용자/IP 중복 방지인지. 우선 호출마다 +1로 두되 추후 보완.

### Error Response

| 상태 | code | 설명 |
| --- | --- | --- |
| 404 | `NOTICE_NOT_FOUND` | 존재하지 않는 공고 |

---

## 3. 공고 주택형 조회

| 항목 | 내용 |
| --- | --- |
| 이름 | 공고 주택형 목록 조회 |
| Method | `GET` |
| Endpoint | `/notices/{noticeId}/units` |
| 설명 | 공고에 속한 주택형(타입별 면적/보증금/월세/공급세대) 목록. |
| 인증 | 불필요 |
| 우선순위 | ⭐ P1 (상세에 인라인 포함 시 후순위) |
| 연결 화면 | 공고 상세 / 입주 가능성 분석(주택형 선택) |

### Path Variable

| 이름 | 타입 | 설명 |
| --- | --- | --- |
| `noticeId` | integer | 공고 ID |

### Response Body (data[])

```json
{
  "unitId": 101,
  "typeName": "29A",
  "exclusiveArea": 29.9,
  "deposit": 35000000,
  "monthlyRent": 180000,
  "supplyCount": 12
}
```

### Error Response

| 상태 | code | 설명 |
| --- | --- | --- |
| 404 | `NOTICE_NOT_FOUND` | 존재하지 않는 공고 |

---

## 4. 공고 첨부파일 목록 조회

| 항목 | 내용 |
| --- | --- |
| 이름 | 공고 첨부파일 목록 조회 |
| Method | `GET` |
| Endpoint | `/notices/{noticeId}/files` |
| 설명 | 공고 첨부파일(공고문 PDF, 이미지, 외부 링크) 목록. |
| 인증 | 불필요 |
| 우선순위 | ⭐ P1 |
| 연결 화면 | 공고 상세 |

### Path Variable

| 이름 | 타입 | 설명 |
| --- | --- | --- |
| `noticeId` | integer | 공고 ID |

### Response Body (data[])

```json
{
  "fileId": 9001,
  "name": "입주자모집공고문.pdf",
  "type": "PDF",
  "url": "https://.../notice.pdf"
}
```

`type` enum: `PDF` / `IMAGE` / `LINK`

> ❓ 확인 필요: PDF/이미지/링크 타입을 모두 지원하는지. 파일 수가 많거나 느릴 가능성 점검.

### Error Response

| 상태 | code | 설명 |
| --- | --- | --- |
| 404 | `NOTICE_NOT_FOUND` | 존재하지 않는 공고 |

---

## 5. 공고 저장

| 항목 | 내용 |
| --- | --- |
| 이름 | 공고 저장(찜) |
| Method | `POST` |
| Endpoint | `/notices/{noticeId}/save` |
| 설명 | 로그인 사용자가 공고를 저장 목록에 추가한다. |
| 인증 | **필수** (Bearer JWT) |
| 우선순위 | 🔥 P0 |
| 연결 화면 | 공고 목록 / 공고 상세 |

### Path Variable

| 이름 | 타입 | 설명 |
| --- | --- | --- |
| `noticeId` | integer | 공고 ID |

### Request Body

없음.

### Response Body (data)

```json
{
  "noticeId": 12,
  "isSaved": true,
  "savedCount": 25
}
```

> ❓ 확인 필요: 이미 저장된 공고를 다시 저장 요청 시 처리. 권장: **idempotent 200**(현재 저장 상태 그대로 반환). `saved_notices(user_id, notice_id)`에 UNIQUE 제약.

### Error Response

| 상태 | code | 설명 |
| --- | --- | --- |
| 401 | `UNAUTHORIZED` | 미인증 |
| 404 | `NOTICE_NOT_FOUND` | 존재하지 않는 공고 |

---

## 6. 공고 저장 해제

| 항목 | 내용 |
| --- | --- |
| 이름 | 공고 저장 해제 |
| Method | `DELETE` |
| Endpoint | `/notices/{noticeId}/save` |
| 설명 | 저장 목록에서 공고를 제거한다. |
| 인증 | **필수** |
| 우선순위 | 🔥 P0 |
| 연결 화면 | 공고 상세 / 저장 공고 관리 |

### Response Body (data)

```json
{
  "noticeId": 12,
  "isSaved": false,
  "savedCount": 24
}
```

> ❓ 확인 필요: 저장되어 있지 않은 공고 해제 요청 시 처리. 권장: **idempotent 200**.

### Error Response

| 상태 | code | 설명 |
| --- | --- | --- |
| 401 | `UNAUTHORIZED` | 미인증 |
| 404 | `NOTICE_NOT_FOUND` | 존재하지 않는 공고 |

---

## 7. 내 저장 공고 목록 조회

| 항목 | 내용 |
| --- | --- |
| 이름 | 내 저장 공고 목록 조회 |
| Method | `GET` |
| Endpoint | `/users/me/saved-notices` |
| 설명 | 로그인 사용자가 저장한 공고 목록을 조회한다. |
| 인증 | **필수** |
| 우선순위 | 🔥 P0 |
| 연결 화면 | 마이페이지 / 저장 공고 관리 |

### Query Parameter

| 이름 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `sort` | enum | N | `LATEST`(기본, 저장한 시각 기준) / `POPULAR`(저장 수 기준) |
| `page` | integer | N | 기본 0 |
| `size` | integer | N | 기본 20 |

### Response Body (data.content[])

목록 조회(1번)와 동일한 카드 필드 + 저장 시각.

```json
{
  "noticeId": 12,
  "title": "더클래식 동작 청년안심주택 추가모집",
  "region": "서울특별시",
  "district": "동작구",
  "complexName": "더클래식 동작",
  "status": "RECRUITING",
  "statusText": "모집중",
  "depositMin": 35000000,
  "monthlyRentMin": 180000,
  "applicationEndDate": "2026-07-14T18:00:00+09:00",
  "savedCount": 25,
  "isSaved": true,
  "savedAt": "2026-06-28T21:10:00+09:00"
}
```

### Error Response

| 상태 | code | 설명 |
| --- | --- | --- |
| 401 | `UNAUTHORIZED` | 미인증 |

---

## 미해결 결정 모음 (회의 안건)

- [ ] 공통 응답 envelope 형식 확정
- [ ] 목록 기본 정렬: `LATEST` vs `DEADLINE`
- [ ] 조회 수 증가 기준 (호출마다 / 사용자·IP 중복 방지)
- [ ] 상세 응답에 units/files/conditions 인라인 포함 여부
- [ ] 저장/해제 중복 요청 처리: idempotent 200 (권장) vs 400
- [ ] 비로그인 `isSaved`: `false` (권장) vs `null`
- [ ] 첨부파일 타입 지원 범위 (PDF/IMAGE/LINK)
