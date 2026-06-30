# HomeFit Backend

청년안심주택·공공/민간 임대주택 공고 정보와 사용자의 금융 조건(소득·자산·현금·무주택 여부)을 연결해,
"이 공고가 나에게 현실적인 선택인지"를 판단할 수 있도록 돕는 주거 금융 의사결정 서비스의 백엔드.

```text
공고 탐색 → 공고 상세 → 사용자 조건 입력 → 입주 가능성 분석
→ 부족 자금/월세 부담 확인 → 금융상품 정보 확인 → 관심 공고 저장/알림
```

## 도메인 구성

| 도메인 | 주요 책임 | 담당 |
| --- | --- | --- |
| Auth/User | 회원가입, 로그인, 사용자/금융 프로필, 알림 설정 | 주드 / 박주완 |
| Notice | 공고 목록·상세·필터, 저장 공고, 주택형, 첨부파일, 크롤링 | 찬찬 / 김찬혁 |
| Eligibility | 입주 가능성 분석, 필요 자금, 월세 부담률 | 니카 / 이나경 |
| Finance/Guide | 금융상품, 필요 서류, 금융 용어, 가이드 | 이든 / 정지훈 |

> Notification(알림 설정/FCM/발송)은 별도 도메인으로 분리하지 않고 Auth/User 중심으로 처리한다.
> 신규 공고 감지까지가 Notice 책임.

## 기술 스택

- Runtime: Node.js
- ORM: Prisma
- Queue: BullMQ (Redis)
- Scheduler: node-cron (매일 06:00 크롤링)
- Crawling: Playwright / Cheerio
- Push: FCM
- API Docs: Swagger + Notion API 명세

> 웹 프레임워크(Express/NestJS) 등 일부 스택은 팀 확정 후 갱신 예정.

## 로컬 실행

```bash
# 1. 의존성 설치
npm install

# 2. 환경변수 설정
cp .env.example .env   # 값 채우기

# 3. Prisma
npx prisma generate
npx prisma migrate dev

# 4. 실행
npm run dev
```

> 서버 코드/패키지 구성은 1차 과제 진행하며 추가 예정.

## 협업 규칙

- 브랜치 전략, 커밋 메시지, PR/DB/API 변경 규칙: [GIT_CONVENTION.md](./GIT_CONVENTION.md)
- 라벨 가이드: [.github/LABELS_GUIDE.md](./.github/LABELS_GUIDE.md)
- 이슈/PR 템플릿: `.github/`
- API 명세는 Notion 문서를 우선 확인 (이슈 템플릿 `config.yml` 링크 참고)

## 브랜치

```text
main   최종 배포/데모 기준
dev    개발 통합 브랜치 (PR 기본 대상)
feature/* fix/* chore/* refactor/*
```
