# HomeFit Backend 배포 가이드

이 문서는 특정 클라우드에 종속되지 않는 공통 배포 기준을 설명한다. Railway와 AWS 모두 동일한 Docker 이미지와 Prisma migration을 사용한다.

## 필수 환경변수

| 이름                     | 용도                    | 비고                                  |
| ------------------------ | ----------------------- | ------------------------------------- |
| `NODE_ENV`               | 실행 환경               | 운영에서는 `production`               |
| `PORT`                   | API 수신 포트           | 플랫폼이 주입한 값을 우선 사용        |
| `API_HOST_PORT`          | Compose 호스트 API 포트 | 로컬 Compose 전용, 기본값 `3000`      |
| `DATABASE_URL`           | PostgreSQL 연결 문자열  | 운영 DB의 SSL 요구사항 확인           |
| `JWT_ACCESS_SECRET`      | Access Token 서명 키    | 충분히 긴 무작위 값, 저장소 커밋 금지 |
| `JWT_REFRESH_SECRET`     | Refresh Token 서명 키   | Access Secret과 다른 값 사용          |
| `JWT_ACCESS_EXPIRES_IN`  | Access Token 만료       | 기본값 `1h`                           |
| `JWT_REFRESH_EXPIRES_IN` | Refresh Token 만료      | 기본값 `14d`                          |

공공 API, FCM, Redis 관련 값은 해당 기능을 배포할 때 추가한다. 실제 비밀값은 `.env`, GitHub Secrets 또는 배포 플랫폼의 Secret 기능으로만 관리한다.

## 공통 실행 순서

```bash
npm ci
npm run prisma:generate
npm run build
npm run prisma:migrate:deploy
npm run start:prod
```

`prisma migrate deploy`는 이미 커밋된 migration만 적용한다. 운영 서버에서는 schema 변경을 생성하는 `prisma migrate dev`를 실행하지 않는다.

## Docker Compose로 로컬 검증

1. `.env.example`을 `.env`로 복사한다.
2. 최소한 `POSTGRES_PASSWORD`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`을 로컬 테스트 값으로 채운다.
3. API와 PostgreSQL을 실행한다.

```bash
docker compose up --build
```

Compose는 PostgreSQL이 준비된 다음 migration을 한 번 적용하고, 성공한 경우에만 API를 시작한다.

- Health: `http://localhost:3000/api/health`
- Swagger: `http://localhost:3000/api/docs`
- 종료: `docker compose down`
- DB 데이터까지 삭제: `docker compose down -v` (로컬 데이터가 모두 삭제되므로 주의)

PostgreSQL 포트는 보안을 위해 호스트의 `127.0.0.1`에만 바인딩한다.
기본 호스트 포트는 기존 로컬 PostgreSQL의 `5432`와 충돌하지 않도록 `5433`을 사용한다.
API의 호스트 포트는 `.env`의 `API_HOST_PORT`로 변경한다. 컨테이너 내부에서는 `PORT=3000`을 사용하므로 로컬 호스트 포트 설정과 애플리케이션 수신 포트를 혼용하지 않는다.

## Railway 적용 기준

- 7/26 제출용 1차 플랫폼은 Railway App과 Railway PostgreSQL로 구성한다.
- 저장소의 `Dockerfile`로 이미지를 빌드한다.
- PostgreSQL 서비스를 연결하고 제공된 `DATABASE_URL`을 API 서비스에 설정한다.
- 필수 JWT Secret과 `NODE_ENV=production`을 설정한다.
- Railway가 주입하는 `PORT`를 애플리케이션 수신 포트로 사용하며, 로컬 Compose 전용인 `API_HOST_PORT`는 Railway에 설정하지 않는다.
- Pre-deploy command에는 `npm run prisma:migrate:deploy`를 사용한다.
- Start command는 Dockerfile 기본값인 `npm run start:prod`를 사용한다.
- Health check path는 `/api/health`로 설정한다.
- 1차 검증은 `dev` 브랜치로 진행하고, 제출 시에는 `dev → main` 릴리스 후 최종 `main` Commit을 배포한다.
- 첫 배포는 수동으로 진행하며 GitHub Actions/OIDC 자동 배포는 제출 이후 별도 이슈로 적용한다.
- 배포 후 Railway가 제공한 HTTPS 도메인을 Android의 API Base URL로 공유한다. 커스텀 도메인은 7/26 제출의 필수 조건으로 두지 않는다.

## 제출 후 AWS 확장 기준

- EC2 단일 서버 MVP라면 Docker Compose를 실행하되, DB 포트 `5432`를 인터넷에 공개하지 않는다.
- RDS를 사용한다면 Compose의 `db` 대신 RDS의 `DATABASE_URL`을 API 컨테이너에 주입한다.
- 외부 공개는 ALB 또는 Nginx를 통해 HTTPS `443`으로 제공한다.
- ECR, ECS, ALB 같은 AWS 확장 구성은 제출 이후 별도 이슈로 진행한다.

## 배포 후 확인

아래 순서로 최소 동작을 확인한다.

1. `GET /api/health`가 HTTP 200과 `status: ok`를 반환하는지 확인한다.
2. `/api/docs`가 열리고 현재 Swagger 명세가 노출되는지 확인한다.
3. 회원가입 또는 로그인 API로 DB 연결과 JWT 발급을 확인한다.
4. 공고 목록 API를 호출해 대표 조회 경로를 확인한다.
5. 배포 로그에서 migration 실패, DB 연결 오류, 비밀값 노출이 없는지 확인한다.

현재 `/api/health`는 프로세스의 liveness만 확인한다. DB 연결 상태까지 확인하는 readiness endpoint가 필요하면 별도 이슈로 확장한다.
