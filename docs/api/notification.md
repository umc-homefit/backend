# Notification API 명세

> 담당: Auth/User 중심 · 연관 도메인: Notice
> **이 문서는 팀 Notion `api 명세서`(SSOT)를 미러링한 것이다.** 값이 충돌하면 Notion이 우선이며, Notion 수정 시 이 문서와 Swagger도 함께 맞춘다.
> Notion: https://app.notion.com/p/api-38e2a03e23d98097aa90e434b9017faa

## 공통 규칙

- 공통 Base Path는 `/api`이다.
- Notification API는 사용자 하위 경로인 `/users/me` 아래에서 제공한다.
- 모든 API는 `Authorization: Bearer <accessToken>` 인증이 필요하다.
- 응답 envelope는 `{ isSuccess, code, message, result }` 형식을 사용한다.
- 응답 code 접두사는 `NOTI`를 사용한다.

## ERD/API 필드 매핑

| ERD table | ERD field | API field | 설명 |
| --- | --- | --- | --- |
| `alert_settings` | `push_enabled` | `pushEnabled` | 전체 푸시 알림 여부 |
| `alert_settings` | `notice_alert_enabled` | `noticeAlertEnabled` | 신규 공고 알림 여부 |
| `alert_settings` | `schedule_alert_enabled` | `scheduleAlertEnabled` | 청약 일정 알림 여부 |
| `alert_settings` | `finance_alert_enabled` | `financeAlertEnabled` | 금융상품 알림 여부 |
| `alert_settings` | `interested_region` | `interestedRegion` | 신규 공고 알림 대상 지역 |
| `notification_logs` | `is_read` | `isRead` | 알림 읽음 여부. 기본값 `false` 권장 |

## 공통 enum

| enum | 값 | 비고 |
| --- | --- | --- |
| `deviceType` | `AOS` / `IOS` | FCM 디바이스 OS 타입 |
| `type` | `NEW_NOTICE` / `CLOSING_SOON` | 알림 타입. 추후 일정/금융 알림 확장 가능 |

## API 목록

| 우선순위 | Method | Endpoint | 설명 |
| --- | --- | --- | --- |
| P1 | `POST` | `/users/me/devices` | 디바이스 토큰 등록/갱신 |
| P1 | `DELETE` | `/users/me/devices/{deviceId}` | 디바이스 토큰 삭제 |
| P1 | `GET` | `/users/me/alert-settings` | 알림 설정 조회 |
| P1 | `PUT` | `/users/me/alert-settings` | 알림 설정 수정 |
| P1 | `GET` | `/users/me/notifications` | 알림 목록 조회 |
| P1 | `PATCH` | `/users/me/notifications/{notificationId}/read` | 알림 읽음 처리 |

---

## 1. 디바이스 토큰 등록

| 항목 | 내용 |
| --- | --- |
| Method · Endpoint | `POST /users/me/devices` |
| 설명 | FCM 푸시 발송용 디바이스 토큰을 등록하거나 갱신한다. |

### Request Body

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `deviceToken` | string | Y | 푸시 발송용 기기 고유 토큰 |
| `deviceType` | enum | Y | `AOS` / `IOS` |

### Response (result)

```json
{
  "userId": 1001,
  "deviceId": 12
}
```

---

## 2. 디바이스 토큰 삭제

| 항목 | 내용 |
| --- | --- |
| Method · Endpoint | `DELETE /users/me/devices/{deviceId}` |
| 설명 | 등록된 FCM 디바이스 토큰을 삭제한다. |

### Path Variable

| 이름 | 타입 | 설명 |
| --- | --- | --- |
| `deviceId` | number | 삭제할 디바이스 ID |

### Response (result)

```json
{
  "userId": 1001
}
```

---

## 3. 알림 설정 조회

| 항목 | 내용 |
| --- | --- |
| Method · Endpoint | `GET /users/me/alert-settings` |
| 설명 | 사용자 알림 설정을 조회한다. 사용자당 1개의 설정을 가진다. |

### Response (result)

```json
{
  "userId": 1001,
  "pushEnabled": true,
  "noticeAlertEnabled": true,
  "scheduleAlertEnabled": true,
  "financeAlertEnabled": true,
  "interestedRegion": "서울",
  "createdAt": "2026-06-28T10:00:00Z",
  "updatedAt": "2026-07-01T14:30:00Z"
}
```

---

## 4. 알림 설정 수정

| 항목 | 내용 |
| --- | --- |
| Method · Endpoint | `PUT /users/me/alert-settings` |
| 설명 | 알림 항목별 on/off 설정을 수정한다. |

### Request Body

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `pushEnabled` | boolean | Y | 전체 푸시 알림 여부 |
| `noticeAlertEnabled` | boolean | Y | 신규 공고 알림 여부 |
| `scheduleAlertEnabled` | boolean | Y | 청약 일정 알림 여부 |
| `financeAlertEnabled` | boolean | Y | 금융상품 알림 여부 |
| `interestedRegion` | string \| null | N | 신규 공고 알림 대상 지역 |

### Response (result)

`GET /users/me/alert-settings`와 동일한 필드를 반환한다.

---

## 5. 알림 목록 조회

| 항목 | 내용 |
| --- | --- |
| Method · Endpoint | `GET /users/me/notifications` |
| 설명 | 수신된 알림 이력을 조회한다. |

### Query Parameter

| 이름 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `page` | number | N | 기본값 0 |
| `size` | number | N | 기본값 20 |

### Response (result)

```json
{
  "notifications": [
    {
      "notificationId": 101,
      "type": "NEW_NOTICE",
      "title": "새로운 청약 공고가 등록되었습니다.",
      "content": "강남구에 새로운 행복주택 공고가 올라왔어요.",
      "isRead": false,
      "createdAt": "2026-07-01T10:00:00Z"
    }
  ],
  "currentPage": 0,
  "totalPages": 5,
  "totalElements": 95
}
```

---

## 6. 알림 읽음 처리

| 항목 | 내용 |
| --- | --- |
| Method · Endpoint | `PATCH /users/me/notifications/{notificationId}/read` |
| 설명 | 수신된 알림을 읽음 상태로 변경한다. |

### Response (result)

```json
{
  "notificationId": 101,
  "isRead": true
}
```

| 상태 | 설명 |
| --- | --- |
| 200 | 읽음 처리 성공 |
| 404 | 알림 없음 |
