# HomeFit API 문서

> **이 디렉터리는 팀 Notion `api 명세서`(SSOT)를 GitHub에서 확인하기 위한 미러 문서이다.**
> 값이 충돌하면 Notion이 우선이며, API 변경 PR에서는 Notion, Swagger, 이 문서를 함께 맞춘다.
> Notion: https://app.notion.com/p/api-38e2a03e23d98097aa90e434b9017faa

## 문서 목록

| 도메인 | 문서 | Swagger Tag |
| --- | --- | --- |
| Auth/User | [auth-user.md](./auth-user.md) | `Auth/User` |
| Notice | [notice.md](./notice.md) | `Notice` |
| Eligibility Analysis | [eligibility.md](./eligibility.md) | `Eligibility Analysis` |
| Finance/Guide | [finance-guide.md](./finance-guide.md) | `Finance/Guide` |
| Notification | [notification.md](./notification.md) | `Notification` |

## 공통 규칙

- 공통 Base Path는 `/api`이다.
- 각 문서의 Endpoint는 Base Path를 제외한 경로로 작성한다. 예: 문서상 `GET /notices` -> 실제 호출 `GET /api/notices`.
- 응답 envelope는 `{ isSuccess, code, message, result }` 형식을 사용한다.
- `code`는 도메인 접두사 + 상태코드 형식을 사용한다. 예: `AUTH200`, `NOTICE200`, `ELIGIBILITY201`.
- Request/Response 필드는 **camelCase**를 사용한다.
- 날짜/시간은 **ISO 8601 문자열**을 사용한다.
- 금액은 **원 단위 정수**, 면적은 **m2 숫자**로 응답한다.
- enum은 **대문자 문자열**을 사용한다.
- 목록 페이징은 offset 방식이며 `page`/`size`를 사용한다. `page`는 0부터 시작한다.

## 공통 응답 형식

```json
{
  "isSuccess": true,
  "code": "DOMAIN200",
  "message": "요청에 성공했습니다.",
  "result": {}
}
```

## API 문서 변경 체크

API 변경 PR에서는 아래 항목을 함께 확인한다.

- Swagger controller/DTO 변경 여부
- Notion API 명세 변경 여부
- `docs/api/*.md` 변경 여부
- Android 화면/필드 영향 여부
- ERD 또는 Prisma schema 변경 필요 여부
