# GitHub Label 적용 가이드

이 문서는 `.github/labels.yml`에 정의한 라벨을 GitHub Repository에 적용/유지하는 방법을 정리한다.
HomeFit 백엔드는 이모지 기반 라벨 체계를 사용한다.

## 1. 라벨 한눈에 보기

### 작업 유형

```text
✨ feature
🐛 fix
📝 docs
🛠 chore
♻️ refactor
✅ test
```

### 우선순위

```text
🔥 P0
⭐ P1
🌱 P2
```

### 도메인

```text
🔐 Auth/User
📢 Notice
🧮 Eligibility
💰 Finance/Guide
🔔 Notification (API 카테고리, 구현은 Auth/User 중심)
⚙️ Common
```

### 작업 영역

```text
📡 API
🗄 DB
📘 Swagger
```

### 상태

```text
🚧 blocked
👀 need review
```

## 2. 수동 적용

GitHub Repository의 아래 경로에서 직접 라벨을 추가/수정할 수 있다.

```text
Settings → Issues → Labels
```

## 3. GitHub CLI로 적용

`gh` 로그인이 되어 있다면 아래 명령으로 라벨을 추가할 수 있다.
이미 같은 이름의 라벨이 있으면 `--force`로 색상/설명을 덮어쓸 수 있다.

```bash
# 작업 유형
gh label create "✨ feature"   --color "0E8A16" --description "새 기능 개발" --force
gh label create "🐛 fix"       --color "D73A4A" --description "버그 수정" --force
gh label create "📝 docs"      --color "0075CA" --description "문서 작성/수정" --force
gh label create "🛠 chore"     --color "C5DEF5" --description "설정/환경/빌드 작업" --force
gh label create "♻️ refactor"  --color "A2EEEF" --description "기능 변경 없는 구조 개선" --force
gh label create "✅ test"      --color "BFDADC" --description "테스트 추가/수정" --force

# 우선순위
gh label create "🔥 P0" --color "B60205" --description "반드시 처리해야 하는 핵심 작업" --force
gh label create "⭐ P1" --color "D93F0B" --description "가능하면 처리할 주요 작업" --force
gh label create "🌱 P2" --color "FBCA04" --description "여유 있으면 처리할 작업" --force

# 도메인
gh label create "🔐 Auth/User"     --color "5319E7" --description "로그인, 사용자, 마이페이지" --force
gh label create "📢 Notice"        --color "FBCA04" --description "공고, 저장 공고, 크롤링" --force
gh label create "🧮 Eligibility"   --color "1D76DB" --description "입주 가능성 분석" --force
gh label create "💰 Finance/Guide" --color "F9D0C4" --description "금융상품, 가이드, 용어" --force
gh label create "🔔 Notification"  --color "C2E0C6" --description "알림 API 카테고리. 구현은 Auth/User 중심" --force
gh label create "⚙️ Common"        --color "D4C5F9" --description "공통 응답, 예외 처리, 설정" --force

# 작업 영역
gh label create "📡 API"     --color "0052CC" --description "API 명세/구현" --force
gh label create "🗄 DB"      --color "5319E7" --description "ERD, Prisma, Migration" --force
gh label create "📘 Swagger" --color "0E8A16" --description "Swagger/OpenAPI 문서화" --force

# 상태
gh label create "🚧 blocked"     --color "000000" --description "확인 필요로 막힌 작업" --force
gh label create "👀 need review" --color "FBCA04" --description "리뷰가 필요한 작업" --force
```

## 4. 권장 라벨 조합

이슈에는 보통 아래처럼 라벨을 조합한다.

```text
작업 유형 + 도메인 + 우선순위
```

예시:

```text
📢 Notice + 📡 API + 🔥 P0
🧮 Eligibility + 🗄 DB + ⭐ P1
🔐 Auth/User + 🐛 fix
⚙️ Common + 📘 Swagger
```

PR에는 필요에 따라 상태 라벨을 추가한다.

```text
👀 need review
🚧 blocked
```

## 5. 참고

- GitHub 기본 라벨(`bug`, `documentation`, `enhancement` 등)은 당장 삭제하지 않는다.
- 팀 규칙으로는 이모지 라벨 위주로 사용한다.
- 팀원이 헷갈려 하면 기본 라벨 삭제를 고려한다.
