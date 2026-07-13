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
- 디바이스/알림 리소스는 본인 소유인 경우에만 조회/삭제/수정 가능하며, 그 외에는 404로 응답한다 (403이 아님 — 리소스 존재 여부를 노출하지 않기 위함).

## ERD/API 필드 매핑

| ERD table | ERD field | API field | 설명 |
| --- | --- | --- | --- |
| `alert_settings` | `push_enabled` | `pushEnabled` | 전체 푸시 알림 여부 |
| `alert_settings` | `notice_alert_enabled` | `noticeAlertEnabled` | 신규 공고 알림 여부 |
| `alert_settings` | `schedule_alert_enabled` | `scheduleAlertEnabled` | 청약 일정 알림 여부 |
| `alert_settings` | `finance_alert_enabled` | `financeAlertEnabled` | 금융상품 알림 여부 |
| `alert_settings` | `interested_region` | `interestedRegion` | 신규 공고 알림 대상 지역 |
| `user_device` | `device_id` | `deviceId` | 디바이스 고유 ID |
| `user_device` | `fcm_token` | `deviceToken` | FCM 디바이스 토큰 (필드명 다름 주의) |
| `user_device` | `device_type` | `deviceType` | AOS / IOS |
| `notification_logs` | `notification_log_id` | `notificationId` | 알림 고유 ID |
| `notification_logs` | `notification_type` | `type` | 알림 타입 |
| `notification_logs` | `body` | `content` | 알림 본문 (필드명 다름 주의) |
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

> 동일한 `userId` + `deviceToken` 조합으로 다시 호출하면 새로 생성하지 않고 기존 디바이스의 `deviceType`만 갱신한다 (멱등 동작).

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

| 상태 | 설명 |
| --- | --- |
| 200 | 삭제 성공 |
| 404 | 존재하지 않는 디바이스이거나, 본인 소유가 아님 |

---

## 3. 알림 설정 조회

| 항목 | 내용 |
| --- | --- |
| Method · Endpoint | `GET /users/me/alert-settings` |
| 설명 | 사용자 알림 설정을 조회한다. 사용자당 1개의 설정을 가진다. |

> 설정을 한 번도 저장한 적 없는 사용자가 조회하면, 서버가 기본값(모든 알림 ON)으로 자동 생성 후 반환한다. 404를 반환하지 않는다.

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
  "pageInfo": {
    "page": 0,
    "size": 20,
    "totalElements": 95,
    "totalPages": 5,
    "hasNext": true
  },
  "notifications": [
    {
      "notificationId": 101,
      "type": "NEW_NOTICE",
      "title": "새로운 청약 공고가 등록되었습니다.",
      "content": "강남구에 새로운 행복주택 공고가 올라왔어요.",
      "isRead": false,
      "createdAt": "2026-07-01T10:00:00Z"
    }
  ]
}
```

> `content`가 DB에 없는 경우(`body`가 null) 빈 문자열(`""`)로 반환한다.

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
| 404 | 알림 없음 (본인 소유가 아닌 경우 포함) |