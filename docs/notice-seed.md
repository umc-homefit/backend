# Android 연동용 공고 Seed

이 Seed는 Android와 공고 목록·필터·상세 API를 확인하기 위한 개발/연동 전용 데이터다. 실제 운영 공고를 생성하는 크롤러가 아니며 배포 과정에서 자동 실행하지 않는다.

## 포함 데이터

- 서울 청년안심주택 6개 단지
- `[TEST]` 표시가 있는 공고 7건
  - 추가모집 6건, 일반모집 필터 확인용 1건
  - `RECRUITING`, `CLOSING_SOON`, `SCHEDULED`, `CLOSED` 상태 포함
  - 전용면적 20㎡, 59㎡, 59㎡ 초과 포함
  - 보증금 3천만 원, 1억 원, 1억 원 초과 포함
- 공고마다 주택형·자격조건·공식 안내 링크 각 1건

단지명·주소·공식 출처는 원문에서 확인한 값을 사용한다. 모집기간, 면적, 금액, 자격조건과 조회·저장 수는 Android 시나리오 확인용 가상 값이며 제목, 공고번호, `dedupHash`, `rawContent`에 TEST 데이터임을 표시한다.

| 단지                 | 주소                                 | 공식 출처                                           |
| -------------------- | ------------------------------------ | --------------------------------------------------- |
| 서울대입구역 BX201   | 서울특별시 관악구 남부순환로224길 25 | https://bx201.com/notice                            |
| 더클래식 동작        | 서울특별시 동작구 노량진동 37-1      | https://theclassic2030.co.kr/                       |
| 가좌 스타타워        | 서울특별시 서대문구 수색로4가길 25   | http://www.stkaja.co.kr/bbs/board.php?bo_table=news |
| 서초 꽃마을          | 서울특별시 서초구 반포대로27길 13    | https://seocho1502.qshop.ai/8a7g4ml6                |
| 청계로벤하임         | 서울특별시 종로구 숭인동 240-1       | https://www.lovenheim.imweb.me/notice1              |
| 용산 베르디움 프렌즈 | 서울특별시 용산구 백범로99길 40      | https://www.ys-vertium-friends.co.kr/main/index.php |

## 실행 전 확인

1. 대상이 로컬 또는 공유 개발/연동 PostgreSQL인지 확인한다.
2. 운영 DB가 아닌지 `DATABASE_URL`의 host와 database 이름을 다시 확인한다.
3. 최신 migration을 먼저 적용한다.
4. `NODE_ENV=production`에서는 실행할 수 없다.
5. `HOMEFIT_NOTICE_SEED=true`를 명시한 실행에서만 동작한다.

PowerShell 예시:

```powershell
$env:DATABASE_URL='postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public'
$env:NODE_ENV='development'
$env:HOMEFIT_NOTICE_SEED='true'
npm run prisma:migrate:deploy
npm run prisma:seed
```

실행 로그에는 비밀번호와 Query String을 제외한 대상 DB 주소와 Seed 전후 건수가 출력된다.

## 멱등성

- 단지는 공식 `sourceUrl`로 조회한 뒤 생성 또는 갱신한다.
- 공고는 고정된 `dedupHash`로 upsert한다.
- Seed 공고의 주택형·자격조건·파일은 트랜잭션 안에서 기존 ID를 유지하며 갱신한다.
- Seed 공고에 예상보다 많은 자식 데이터가 있으면 임의 삭제하지 않고 실행을 중단한다.
- Seed와 관련 없는 단지·공고·사용자 데이터는 삭제하지 않는다.
- 동일 DB에서 두 번 실행해도 단지 6개, 공고 7개와 각 자식 7개를 유지한다.

## 확인 요청

```text
GET /api/notices?status=RECRUITING&size=50
GET /api/notices?status=CLOSING_SOON&size=50
GET /api/notices?status=SCHEDULED&size=50
GET /api/notices?status=CLOSED&size=50
GET /api/notices?maxArea=59&maxDeposit=100000000&size=50
GET /api/notices?isAdditionalRecruitment=false&size=50
GET /api/notices/{noticeId}
```

목록·상세 API는 인증이 필요하다. Seed는 테스트 사용자나 토큰을 생성하지 않으므로 Android 연동에는 정상 로그인으로 발급한 Access Token을 사용한다.
