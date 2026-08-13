# HomeFit AWS Terraform

Railway 운영 주소를 유지하면서 HomeFit의 AWS 2차 확장 구성을 단계적으로 만드는 IaC이다.
기본값은 NAT Gateway, RDS, ALB, EC2를 생성하지 않는다. 따라서 비용 검토 없이
`enable_*` 값을 변경하거나 `terraform apply`하지 않는다.

## 구성

- 2개 AZ의 Public / Private Application / Private Database Subnet
- Public ALB → Public EC2 Auto Scaling Group (`min=1`, `max=3`)
- EC2는 공인 IPv4로 외부 통신하되 API 인바운드는 ALB 보안 그룹에서만 허용
- Private RDS for PostgreSQL Single-AZ, RDS 관리형 master password
- ECR, Private S3, Secrets Manager, CloudWatch Logs/Alarm
- GitHub Actions OIDC 배포 Role
- 선택형 Route 53 + ACM HTTPS
- S3 Gateway VPC Endpoint로 S3 트래픽을 AWS 네트워크 안에서 처리

EventBridge 기반 크롤러/스케줄러 Worker와 실제 FCM 발송은 애플리케이션 구현이
완료된 뒤 별도 모듈로 추가한다. API 인스턴스가 여러 대일 때 인스턴스별 cron을
실행하면 중복 수집될 수 있으므로 현재 ASG와 함께 배포하지 않는다.

## 비용 안전장치

기본 `terraform.tfvars.example`은 아래 유료 런타임을 모두 비활성화한다.

```hcl
enable_nat_gateway = false
enable_database    = false
enable_compute     = false
```

- NAT Gateway: Gateway-hour, 처리 GB, 데이터 전송 과금
- ALB: Load Balancer-hour와 LCU 과금
- EC2/RDS: 인스턴스·스토리지 사용량 과금
- Public IPv4: 주소별 시간 과금
- ECR/S3/CloudWatch/Secrets Manager: 저장량·요청·Secret 등에 따른 사용량 과금

공식 요금표:

- <https://aws.amazon.com/vpc/pricing/>
- <https://aws.amazon.com/elasticloadbalancing/pricing/>
- <https://aws.amazon.com/ec2/pricing/on-demand/>
- <https://aws.amazon.com/rds/postgresql/pricing/>

2026-08-13 AWS Price List의 서울 리전 On-Demand 단가로 계산한 초기 구성의
월 비용 하한은 약 **USD 70/월**이다(730시간 기준).

| 항목 | 단가 | 월 추정 |
| --- | --- | ---: |
| ALB 1개 | USD 0.0225/시간 | USD 16.43 |
| EC2 `t3.small` 1대 | USD 0.026/시간 | USD 18.98 |
| RDS `db.t4g.micro` Single-AZ | USD 0.025/시간 | USD 18.25 |
| Public IPv4 3개 가정(ALB 2 + EC2 1) | USD 0.005/주소·시간 | USD 10.95 |
| EC2 gp3 20GiB | USD 0.0912/GB-월 | USD 1.82 |
| RDS gp3 20GiB | USD 0.131/GB-월 | USD 2.62 |
| Secrets Manager 2개 가정 | USD 0.40/Secret-월 | USD 0.80 |

여기에 ALB LCU(USD 0.008/LCU-시간), 데이터 전송, ECR/S3/CloudWatch 사용량,
세금이 추가된다. Free Tier, 크레딧, 환율은 반영하지
않았으므로 apply 직전에 AWS Pricing Calculator와 결제 계정의 크레딧을 다시 확인한다.

초기 런타임은 `application_subnet_tier = "public"`으로 두고 NAT Gateway를 생성하지
않는다. EC2에 공인 IPv4가 붙지만 SSH와 API 포트를 인터넷에 직접 열지 않으며,
API 요청은 ALB를 통해서만 들어온다. 추후 Private EC2가 필요하면
`application_subnet_tier = "private"`와 `enable_nat_gateway = true`를 함께 적용하고,
고정 비용과 AZ별 가용성을 다시 검토한다.

RDS는 비용을 고려해 Single-AZ로 시작한다. AWS Free Plan 제한에 맞춘 1일 자동 백업,
삭제 방지, 최종 스냅샷과
CloudWatch CPU·메모리·스토리지·연결 수·CPU 크레딧 알람으로 운영 위험을 보완한다.
기본 알람은 콘솔에서만 확인되며, SNS 알림이 필요하면
`cloudwatch_alarm_action_arns`에 Topic ARN을 전달한다.

일반 RDS DB 인스턴스는 0~35일을 지원하지만 0은 자동 백업을 끄므로 HomeFit은
1~35일만 허용한다. 신규 AWS Free Plan 계정은 생성 시 더 작은 한도가 적용될 수
있으므로 초기값은
`db_backup_retention_days = 1`로 두고, Paid Plan 전환 후 7일 이상으로 확대한다.

## 로컬 검증

state 버킷은 Terraform 본체와 생명주기를 분리한다. 동일 configuration에서 버킷과
그 안의 state를 함께 관리하면 초기화와 삭제 시 순환 문제가 생길 수 있기 때문이다.
최초 한 번 PowerShell 부트스트랩 스크립트로 버킷을 만들고 보안 설정을 적용한다.

```powershell
$env:AWS_PROFILE = 'homefit'
$stateBucket = .\scripts\bootstrap-state.ps1
terraform init -reconfigure -backend-config="bucket=$stateBucket"
```

버킷 이름은 AWS 계정 ID를 조합해 전역에서 고유하게 만들며, 스크립트는 여러 번
실행해도 같은 버킷에 아래 설정을 다시 맞춘다.

- 서울 리전(`ap-northeast-2`)
- S3 Object Ownership `BucketOwnerEnforced`
- 모든 public access 차단
- object versioning 활성화
- AES-256 기본 암호화
- HTTPS가 아닌 요청 거부
- Terraform native S3 lockfile 사용

원격 backend 초기화 후 다음 순서로 확인한다.

```powershell
Copy-Item terraform.tfvars.example terraform.tfvars
terraform fmt -check
terraform validate
terraform plan
```

`terraform.tfvars`, state, plan 파일은 커밋하지 않는다. backend의 bucket 이름도
코드에 고정하지 않고 `terraform init -backend-config`로 전달한다. 팀원과 CI는 같은
bucket과 key를 사용하며, `use_lockfile = true`가 동시 apply를 막는다.

## 단계별 배포

### 1. Foundation

세 `enable_*` 값을 모두 `false`로 유지한 plan을 먼저 검토한다. 이 단계는 VPC,
Subnet, ECR, S3, Secrets Manager Secret 컨테이너, IAM/OIDC, CloudWatch Log Group을
정의한다. 저장량과 요청량에 따른 비용은 여전히 발생할 수 있다.

apply 후 출력값 중 다음을 GitHub `aws-production` Environment 변수로 등록한다.

| GitHub variable | Terraform output |
| --- | --- |
| `AWS_REGION` | `aws_region` |
| `AWS_DEPLOY_ROLE_ARN` | `github_deploy_role_arn` |
| `AWS_ECR_REPOSITORY` | `ecr_repository_name` |
| `AWS_RUNTIME_ENABLED` | ASG 생성 전까지 `false` |

Repository의 Environment 이름은 Terraform 변수 `github_environment`와 같아야 한다.
워크플로는 장기 Access Key 대신 GitHub OIDC로 임시 자격 증명을 발급받는다.

`AWS_DEPLOY_ENABLED`는 job 시작 전 평가되므로 **Repository variable**로 등록하고,
초기 이미지 push 직전에 `true`로 변경한다. 나머지 값은 `aws-production`
Environment variable로 둔다.

### 2. 초기 Docker 이미지 push

`AWS_DEPLOY_ENABLED=true`, `AWS_RUNTIME_ENABLED=false`인 상태에서
`AWS Backend Deploy` workflow를 수동 실행한다. ECR에 commit SHA 태그와
`latest` 태그를 push하지만 ASG refresh는 실행하지 않는다.

### 3. Database

팀 비용 승인 후 `enable_database=true`로 apply한다. RDS master password는 RDS가
Secrets Manager에 생성·관리하며 Terraform 변수나 state에 평문으로 넣지 않는다.
신규 AWS Free Plan에서는 `db_backup_retention_days=1`을 유지한다.

Terraform이 만든 `backend_secret_arn` Secret에는 `DATABASE_URL`을 제외한 dotenv
형식의 운영 환경변수를 Secret value로 등록한다. Secret 파일은 저장소 밖의 임시
경로에서 작성하고 등록 직후 삭제한다.

```dotenv
NODE_ENV=production
PORT=3000
JWT_ACCESS_SECRET=...
JWT_ACCESS_EXPIRES_IN=1h
GOOGLE_CLIENT_ID=...
KAKAO_APP_ID=...
```

EC2 bootstrap이 RDS 관리형 Secret을 읽어 URL-encoded `DATABASE_URL`을 구성하므로
DB password를 application Secret에 중복 저장하지 않는다.

### 4. Runtime

초기 이미지와 Secret을 확인한 뒤에만 아래 값으로 apply한다.

```hcl
application_subnet_tier = "public"
enable_nat_gateway      = false
enable_database         = true
enable_compute          = true
db_multi_az             = false
db_backup_retention_days = 1
```

apply 후 `autoscaling_group_name`을 GitHub `AWS_ASG_NAME`에 넣고
`AWS_RUNTIME_ENABLED=true`로 변경한다. 이후 main push 또는 수동 실행은 ECR push 후
ASG Instance Refresh까지 수행한다.

### 5. HTTPS와 전환

기존 Route 53 hosted zone이 있을 때만 `domain_name`, `route53_zone_id`를 함께
지정한다. Terraform이 ACM DNS 검증과 ALB HTTPS listener를 만든다. AWS 주소에서
health, Swagger, 로그인, 공고 목록을 검증한 뒤 Android Base URL을 전환하며,
검증 완료 전까지 Railway를 롤백 경로로 유지한다.

## 운영 확인

1. `GET /api/health` HTTP 200
2. `/api/docs`와 `/api/docs-json` 정상 노출
3. CloudWatch `/homefit/production/backend` 로그에 Secret 평문 미노출
4. ALB Target Group healthy
5. 로그인/JWT 발급, 공고 목록, 대표 분석 API smoke test
6. 배포 실패 시 새 Instance Refresh 중단 후 Railway Base URL 유지
