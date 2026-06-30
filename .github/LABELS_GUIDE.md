# GitHub Label 적용 가이드

이 문서는 `.github/labels.yml`에 정의한 라벨을 GitHub Repository에 적용하는 방법을 정리한다.

## 1. 수동 적용

GitHub Repository의 아래 경로에서 직접 라벨을 추가할 수 있다.

```text
Settings → Issues → Labels
```

## 2. GitHub CLI로 적용

`gh` 로그인이 되어 있다면 아래 명령으로 라벨을 추가할 수 있다.

```bash
gh label create "type: feature" --color "0E8A16" --description "새로운 기능 개발"
gh label create "type: fix" --color "D73A4A" --description "버그 수정"
gh label create "type: docs" --color "0075CA" --description "문서 작성 또는 수정"
gh label create "type: chore" --color "C5DEF5" --description "설정, 환경, 빌드 등 기타 작업"
gh label create "type: refactor" --color "A2EEEF" --description "기능 변경 없는 코드 구조 개선"
gh label create "type: test" --color "BFDADC" --description "테스트 추가 또는 수정"

gh label create "priority: p0" --color "B60205" --description "반드시 처리해야 하는 핵심 작업"
gh label create "priority: p1" --color "D93F0B" --description "가능하면 처리할 주요 작업"
gh label create "priority: p2" --color "FBCA04" --description "시간이 남으면 처리할 작업"

gh label create "domain: auth-user" --color "5319E7" --description "Auth/User 도메인"
gh label create "domain: notice" --color "FBCA04" --description "Notice 도메인"
gh label create "domain: eligibility" --color "1D76DB" --description "Eligibility Analysis 도메인"
gh label create "domain: finance-guide" --color "F9D0C4" --description "Finance/Guide 도메인"
gh label create "domain: notification" --color "C2E0C6" --description "Notification 관련 작업"
gh label create "domain: common" --color "D4C5F9" --description "공통 설정, 공통 응답, 예외 처리"

gh label create "area: api" --color "0052CC" --description "API 명세 또는 API 구현"
gh label create "area: db" --color "5319E7" --description "DB, Prisma, Migration"
gh label create "area: swagger" --color "0E8A16" --description "Swagger/OpenAPI 문서화"

gh label create "status: blocked" --color "000000" --description "외부 결정이나 확인이 필요해 막힌 작업"
gh label create "status: needs-review" --color "FBCA04" --description "리뷰가 필요한 작업"
```

이미 같은 이름의 라벨이 있으면 생성에 실패할 수 있다. 그 경우 기존 라벨을 수정하거나 삭제 후 다시 생성한다.

## 3. 권장 라벨 조합

이슈에는 보통 아래처럼 라벨을 조합한다.

```text
type + domain + priority
```

예시:

```text
type: feature
domain: notice
priority: p0
```

PR에는 필요에 따라 아래 라벨을 추가한다.

```text
status: needs-review
area: api
area: db
area: swagger
```
