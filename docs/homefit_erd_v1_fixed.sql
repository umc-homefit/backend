-- HomeFit ERD DDL v2 fixed
-- Source: Homefit_ERD.sql export updated on 2026-07-03.
-- Purpose: keep the repository ERD DDL aligned with the current ERDCloud/API review state.
-- Note: this file is for ERD/document review. Runtime DB changes should be managed through Prisma schema and migrations.
-- Fixes applied in this repository copy:
-- 1. Current ERD export reflected.
-- 2. UNIQUE constraints required by ERD comments and API behavior are materialized near the bottom of this file.

CREATE TABLE "saved_notices" (
	"saved_notice_id"	BIGINT		NOT NULL,
	"user_id"	BIGINT		NOT NULL,
	"notice_id"	BIGINT		NOT NULL,
	"created_at"	DATETIME	DEFAULT CURRENT_TIMESTAMP	NOT NULL
);

COMMENT ON COLUMN "saved_notices"."saved_notice_id" IS '저장 PK';

COMMENT ON COLUMN "saved_notices"."user_id" IS 'FK → users.user_id, UNIQUE(user_id, notice_id) 필요: 같은 사용자의 같은 공고 중복 저장 방지';

COMMENT ON COLUMN "saved_notices"."notice_id" IS 'FK → notices.notice_id, UNIQUE(user_id, notice_id) 필요: 같은 사용자의 같은 공고 중복 저장 방지';

COMMENT ON COLUMN "saved_notices"."created_at" IS '저장 시각';

CREATE TABLE "user_profiles" (
	"profile_id"	BIGINT		NOT NULL,
	"user_id"	BIGINT		NOT NULL,
	"nickname"	VARCHAR(50)		NULL,
	"birth_date"	DATE		NULL,
	"phone_number"	VARCHAR(20)		NULL,
	"profile_image_url"	VARCHAR(255)		NULL,
	"created_at"	DATETIME		NOT NULL,
	"updated_at"	DATETIME		NOT NULL
);

COMMENT ON COLUMN "user_profiles"."profile_id" IS 'PK: 프로필 고유 식별자 (camelCase: profile_id)';

COMMENT ON COLUMN "user_profiles"."user_id" IS 'FK: 사용자 ID, UNIQUE : 사용자 ID (1:1 매핑)(camelCase: userId)';

COMMENT ON COLUMN "user_profiles"."nickname" IS '별명 (camelCase: nickname)';

COMMENT ON COLUMN "user_profiles"."birth_date" IS '생년월일 (camelCase: birthDate, ISO 8601)';

COMMENT ON COLUMN "user_profiles"."phone_number" IS '연락처 (camelCase: phoneNumber)';

COMMENT ON COLUMN "user_profiles"."profile_image_url" IS '프로필 이미지 URL (camelCase: profileImageUrl)';

COMMENT ON COLUMN "user_profiles"."created_at" IS '생성 시각 (ISO 8601 문자열 기준)';

COMMENT ON COLUMN "user_profiles"."updated_at" IS '수정 시각 ((ISO 8601 문자열 기준)';

CREATE TABLE "notification_logs" (
	"notification_log_id"	BIGINT		NOT NULL,
	"user_id"	BIGINT		NOT NULL,
	"notice_id"	BIGINT		NULL,
	"notification_type"	VARCHAR(30)		NOT NULL,
	"is_read"	TINYINT(1)	DEFAULT 0	NOT NULL,
	"title"	VARCHAR(255)		NOT NULL,
	"body"	TEXT		NULL,
	"status"	VARCHAR(30)		NOT NULL,
	"sent_at"	DATETIME		NULL,
	"failure_reason"	TEXT		NULL,
	"created_at"	DATETIME	DEFAULT CURRENT_TIMESTAMP	NOT NULL
);

COMMENT ON COLUMN "notification_logs"."notification_log_id" IS '알림 로그 PK';

COMMENT ON COLUMN "notification_logs"."user_id" IS 'FK → users.user_id';

COMMENT ON COLUMN "notification_logs"."notice_id" IS 'FK → notices.notice_id';

COMMENT ON COLUMN "notification_logs"."notification_type" IS 'enum: NEW_NOTICE, CLOSING_SOON';

COMMENT ON COLUMN "notification_logs"."is_read" IS '알림 읽음 여부, 0: 읽지 않음, 1: 읽음';

COMMENT ON COLUMN "notification_logs"."title" IS '푸시 제목';

COMMENT ON COLUMN "notification_logs"."body" IS '푸시 내용';

COMMENT ON COLUMN "notification_logs"."status" IS 'enum: PENDING, SENT, FAILED, RETRYING';

COMMENT ON COLUMN "notification_logs"."sent_at" IS '실제 발송 시각';

COMMENT ON COLUMN "notification_logs"."failure_reason" IS '실패 메시지';

COMMENT ON COLUMN "notification_logs"."created_at" IS '로그 생성 시각';

CREATE TABLE "notice_files" (
	"file_id"	BIGINT		NOT NULL,
	"notice_id"	BIGINT		NOT NULL,
	"file_name"	VARCHAR(255)		NOT NULL,
	"file_type"	VARCHAR(30)		NOT NULL,
	"file_url"	TEXT		NOT NULL,
	"registered_at"	DATETIME		NULL,
	"created_at"	DATETIME	DEFAULT CURRENT_TIMESTAMP	NOT NULL
);

COMMENT ON COLUMN "notice_files"."file_id" IS '파일 PK';

COMMENT ON COLUMN "notice_files"."notice_id" IS 'FK → notices.notice_id';

COMMENT ON COLUMN "notice_files"."file_name" IS '파일 이름';

COMMENT ON COLUMN "notice_files"."file_type" IS 'enum: PDF, IMAGE, LINK, DOC, OTHER';

COMMENT ON COLUMN "notice_files"."file_url" IS '첨부파일 URL';

COMMENT ON COLUMN "notice_files"."registered_at" IS '공고 사이트 등록일';

COMMENT ON COLUMN "notice_files"."created_at" IS '생성 시각';

CREATE TABLE "alert_settings" (
	"alert_setting_id"	BIGINT		NOT NULL,
	"user_id"	BIGINT		NOT NULL,
	"push_enabled"	TINYINT(1)	DEFAULT 1	NOT NULL,
	"notice_alert_enabled"	TINYINT(1)	DEFAULT 1	NOT NULL,
	"schedule_alert_enabled"	TINYINT(1)	DEFAULT 1	NOT NULL,
	"finance_alert_enabled"	TINYINT(1)	DEFAULT 1	NOT NULL,
	"interested_region"	VARCHAR(100)		NULL,
	"created_at"	DATETIME	DEFAULT CURRENT_TIMESTAMP	NOT NULL,
	"updated_at"	DATETIME	DEFAULT CURRENT_TIMESTAMP	NOT NULL
);

COMMENT ON COLUMN "alert_settings"."alert_setting_id" IS '알림 설정 고유 ID';

COMMENT ON COLUMN "alert_settings"."user_id" IS 'users.user_id 참조, 사용자 1명당 알림 설정 1개, UNIQUE 필요: 사용자 1명당 알림 설정 1개';

COMMENT ON COLUMN "alert_settings"."push_enabled" IS '전체 푸시 알림 여부, 0: 비활성, 1: 활성';

COMMENT ON COLUMN "alert_settings"."notice_alert_enabled" IS '신규 공고 알림 여부, 0: 비활성, 1: 활성';

COMMENT ON COLUMN "alert_settings"."schedule_alert_enabled" IS '청약 일정 알림 여부, 0: 비활성, 1: 활성';

COMMENT ON COLUMN "alert_settings"."finance_alert_enabled" IS '금융상품 알림 여부, 0: 비활성, 1: 활성';

COMMENT ON COLUMN "alert_settings"."interested_region" IS '신규 공고 알림 대상자 조회 기준';

COMMENT ON COLUMN "alert_settings"."created_at" IS '생성 시각';

COMMENT ON COLUMN "alert_settings"."updated_at" IS '수정 시각';

CREATE TABLE "housing_complexes" (
	"complex_id"	BIGINT		NOT NULL,
	"name"	VARCHAR(255)		NOT NULL,
	"region"	VARCHAR(100)		NOT NULL,
	"district"	VARCHAR(100)		NULL,
	"address"	VARCHAR(255)		NULL,
	"source_url"	TEXT		NULL,
	"is_active"	TINYINT(1)	DEFAULT 1	NOT NULL,
	"crawl_enabled"	TINYINT(1)	DEFAULT 1	NOT NULL,
	"created_at"	DATETIME	DEFAULT CURRENT_TIMESTAMP	NOT NULL,
	"updated_at"	DATETIME	DEFAULT CURRENT_TIMESTAMP	NOT NULL
);

COMMENT ON COLUMN "housing_complexes"."complex_id" IS '단지 PK';

COMMENT ON COLUMN "housing_complexes"."name" IS '예: 어반허브 서울스테이션';

COMMENT ON COLUMN "housing_complexes"."region" IS '시/도';

COMMENT ON COLUMN "housing_complexes"."district" IS '시/군/구';

COMMENT ON COLUMN "housing_complexes"."address" IS '단지 주소';

COMMENT ON COLUMN "housing_complexes"."source_url" IS '공고 수집 대상 URL';

COMMENT ON COLUMN "housing_complexes"."is_active" IS '0: 비활성, 1: 활성';

COMMENT ON COLUMN "housing_complexes"."crawl_enabled" IS '0: 제외, 1: 크롤링 대상';

COMMENT ON COLUMN "housing_complexes"."created_at" IS '생성 시각';

COMMENT ON COLUMN "housing_complexes"."updated_at" IS '수정 시각';

CREATE TABLE "finance_terms" (
	"term_id"	bigint		NOT NULL,
	"term"	varchar(50)		NOT NULL,
	"detail_description"	text	DEFAULT NULL	NULL,
	"created_at"	datetime	DEFAULT CURRENT_TIMESTAMP	NOT NULL
);

COMMENT ON COLUMN "finance_terms"."term_id" IS '용어 pk';

COMMENT ON COLUMN "finance_terms"."term" IS '용어명';

COMMENT ON COLUMN "finance_terms"."detail_description" IS '설명';

COMMENT ON COLUMN "finance_terms"."created_at" IS '생성시각';

CREATE TABLE "user_condition_profiles" (
	"user_condition_profile_id"	BIGINT		NOT NULL,
	"user_id"	BIGINT		NOT NULL,
	"monthly_income_amount"	BIGINT	DEFAULT 0	NOT NULL,
	"total_asset_amount"	BIGINT	DEFAULT 0	NOT NULL,
	"total_debt_amount"	BIGINT	DEFAULT 0	NOT NULL,
	"monthly_debt_payment_amount"	BIGINT	DEFAULT 0	NOT NULL,
	"cash_savings"	BIGINT	DEFAULT 0	NOT NULL,
	"housing_ownership_status"	VARCHAR(50)		NOT NULL,
	"is_homeless"	TINYINT(1)		NOT NULL,
	"residence_region_code"	VARCHAR(100)		NULL,
	"workplace_region_code"	VARCHAR(100)		NULL,
	"created_at"	DATETIME		NOT NULL,
	"updated_at"	DATETIME		NOT NULL
);

COMMENT ON COLUMN "user_condition_profiles"."user_condition_profile_id" IS 'PK: 사용자 조건 프로필 ID (camelCase: userConditionProfileId)';

COMMENT ON COLUMN "user_condition_profiles"."user_id" IS 'FK: 사용자 ID, UNIQUE : 사용자 ID (1:1 매핑)(camelCase: userId)';

COMMENT ON COLUMN "user_condition_profiles"."monthly_income_amount" IS '월간 총소득 (원 단위 정수)';

COMMENT ON COLUMN "user_condition_profiles"."total_asset_amount" IS '총 보유 자산 (원 단위 정수)';

COMMENT ON COLUMN "user_condition_profiles"."total_debt_amount" IS '총 부채 금액 (원 단위 정수)';

COMMENT ON COLUMN "user_condition_profiles"."monthly_debt_payment_amount" IS '월 상환액 (원 단위 정수)';

COMMENT ON COLUMN "user_condition_profiles"."cash_savings" IS '보유 현금 (원 단위 정수)';

COMMENT ON COLUMN "user_condition_profiles"."housing_ownership_status" IS 'enum: HOMELESS, OWNED, FAMILY_OWNED, UNKNOWN';

COMMENT ON COLUMN "user_condition_profiles"."is_homeless" IS '1: 무주택, 0: 무주택 아님';

COMMENT ON COLUMN "user_condition_profiles"."residence_region_code" IS '거주 지역 (검색용 지역 코드)';

COMMENT ON COLUMN "user_condition_profiles"."workplace_region_code" IS '직장/학교 지역 (검색용 지역 코드)';

COMMENT ON COLUMN "user_condition_profiles"."created_at" IS '생성 일시 (ISO 8601 문자열 기준)';

COMMENT ON COLUMN "user_condition_profiles"."updated_at" IS '수정 일시 (ISO 8601 문자열 기준)';

CREATE TABLE "loan_products" (
	"product_id"	bigint		NOT NULL,
	"product_name"	varchar(255)		NOT NULL,
	"provider_type"	ENUM('POLICY', 'BANK')		NOT NULL,
	"provider_name"	varchar(100)		NOT NULL,
	"min_rate"	decimal(5, 2)	DEFAULT NULL	NULL,
	"max_rate"	decimal(5, 2)	DEFAULT NULL	NULL,
	"max_limit_amount"	bigint	DEFAULT NULL	NULL,
	"min_age"	int	DEFAULT NULL	NULL,
	"max_age"	int	DEFAULT NULL	NULL,
	"max_income"	bigint	DEFAULT NULL	NULL,
	"max_asset"	bigint	DEFAULT NULL	NULL,
	"require_no_house"	boolean	DEFAULT true	NOT NULL,
	"official_url"	varchar(500)		NOT NULL,
	"description"	text	DEFAULT NULL	NULL,
	"created_at"	datetime	DEFAULT CURRENT_TIMESTAMP	NOT NULL,
	"updated_at"	datetime	DEFAULT CURRENT_TIMESTAMP	NOT NULL
);

COMMENT ON COLUMN "loan_products"."product_id" IS '금융상품 pk';

COMMENT ON COLUMN "loan_products"."product_name" IS '상품명   예) 청년 버팀목 전세자금대출';

COMMENT ON COLUMN "loan_products"."provider_type" IS '제공기관유형  POLICY는 정책금융, BANK는 1금융권';

COMMENT ON COLUMN "loan_products"."provider_name" IS '취급기관명  예) 국민은행, 서울시';

COMMENT ON COLUMN "loan_products"."min_rate" IS '최저금리 (%)';

COMMENT ON COLUMN "loan_products"."max_rate" IS '최고금리 (%)';

COMMENT ON COLUMN "loan_products"."max_limit_amount" IS '최대한도';

COMMENT ON COLUMN "loan_products"."min_age" IS '신청최소연령 | 만 나이 기준';

COMMENT ON COLUMN "loan_products"."max_age" IS '신청최대연령 | 만 나이 기준';

COMMENT ON COLUMN "loan_products"."max_income" IS '소득상한';

COMMENT ON COLUMN "loan_products"."max_asset" IS '자산상한';

COMMENT ON COLUMN "loan_products"."require_no_house" IS '무주택 조건 필요 여부';

COMMENT ON COLUMN "loan_products"."official_url" IS '공식 사이트 링크';

COMMENT ON COLUMN "loan_products"."description" IS '상품설명';

COMMENT ON COLUMN "loan_products"."created_at" IS '생성일 | 생성시각';

COMMENT ON COLUMN "loan_products"."updated_at" IS '수정시각';

CREATE TABLE "users" (
	"user_id"	BIGINT		NOT NULL,
	"email"	VARCHAR(255)		NULL,
	"password"	VARCHAR(255)		NULL,
	"provider"	VARCHAR(50)		NOT NULL,
	"provider_id"	VARCHAR(255)		NULL,
	"status"	VARCHAR(20)		NOT NULL,
	"created_at"	DATETIME		NOT NULL,
	"updated_at"	DATETIME		NOT NULL
);

COMMENT ON COLUMN "users"."user_id" IS 'PK: 사용자 ID (camelCase: userId)';

COMMENT ON COLUMN "users"."email" IS '로그인 이메일 ,UNIQUE: NULL 허용 검토 및 이메일 로그인 중복 방지';

COMMENT ON COLUMN "users"."password" IS '로컬 가입자용 비밀번호';

COMMENT ON COLUMN "users"."provider" IS 'enum: LOCAL, KAKAO, GOOGLE 등';

COMMENT ON COLUMN "users"."provider_id" IS 'COMPOSITE UNIQUE: 소셜 로그인 식별자 (provider와 결합)';

COMMENT ON COLUMN "users"."status" IS 'enum: ACTIVE, INACTIVE, DELETED';

COMMENT ON COLUMN "users"."created_at" IS '생성 시각 (ISO 8601 문자열 기준)';

COMMENT ON COLUMN "users"."updated_at" IS '계정 정보 수정 시 갱신 (ISO 8601 문자열 기준)';

CREATE TABLE "crawl_logs" (
	"crawl_log_id"	BIGINT		NOT NULL,
	"complex_id"	BIGINT		NULL,
	"status"	VARCHAR(30)		NOT NULL,
	"crawler_type"	VARCHAR(30)		NULL,
	"error_type"	VARCHAR(50)		NULL,
	"started_at"	DATETIME		NOT NULL,
	"finished_at"	DATETIME		NULL,
	"attempt_count"	INT	DEFAULT 0	NOT NULL,
	"error_message"	TEXT		NULL,
	"created_notice_count"	INT	DEFAULT 0	NOT NULL,
	"updated_notice_count"	INT	DEFAULT 0	NOT NULL,
	"created_at"	DATETIME	DEFAULT CURRENT_TIMESTAMP	NOT NULL
);

COMMENT ON COLUMN "crawl_logs"."crawl_log_id" IS '크롤링 로그 PK';

COMMENT ON COLUMN "crawl_logs"."complex_id" IS 'FK → housing_complexes.complex_id';

COMMENT ON COLUMN "crawl_logs"."status" IS 'enum: SUCCESS, FAILED, PARTIAL';

COMMENT ON COLUMN "crawl_logs"."crawler_type" IS 'enum: PLAYWRIGHT, CHEERIO, MANUAL';

COMMENT ON COLUMN "crawl_logs"."error_type" IS 'enum: NETWORK_ERROR, PARSE_ERROR, TIMEOUT, UNKNOWN';

COMMENT ON COLUMN "crawl_logs"."started_at" IS '크롤링 시작 시각';

COMMENT ON COLUMN "crawl_logs"."finished_at" IS '크롤링 종료 시각';

COMMENT ON COLUMN "crawl_logs"."attempt_count" IS '최대 3회';

COMMENT ON COLUMN "crawl_logs"."error_message" IS '실패 사유';

COMMENT ON COLUMN "crawl_logs"."created_notice_count" IS '신규 INSERT 수';

COMMENT ON COLUMN "crawl_logs"."updated_notice_count" IS '변경 UPDATE 수';

COMMENT ON COLUMN "crawl_logs"."created_at" IS '로그 생성 시각';

CREATE TABLE "notice_conditions" (
	"condition_id"	BIGINT		NOT NULL,
	"notice_id"	BIGINT		NOT NULL,
	"target_type"	VARCHAR(100)		NULL,
	"min_age"	INT		NULL,
	"max_age"	INT		NULL,
	"income_limit_amount"	BIGINT		NULL,
	"income_limit_text"	TEXT		NULL,
	"asset_limit_amount"	BIGINT		NULL,
	"asset_limit_text"	TEXT		NULL,
	"requires_homeless"	TINYINT(1)		NULL,
	"housing_ownership_requirement"	TEXT		NULL,
	"residence_requirement"	TEXT		NULL,
	"household_requirement"	TEXT		NULL,
	"subscription_requirement"	TEXT		NULL,
	"raw_condition_text"	TEXT		NULL,
	"created_at"	DATETIME	DEFAULT CURRENT_TIMESTAMP	NOT NULL,
	"updated_at"	DATETIME	DEFAULT CURRENT_TIMESTAMP	NOT NULL
);

COMMENT ON COLUMN "notice_conditions"."condition_id" IS '조건 PK';

COMMENT ON COLUMN "notice_conditions"."notice_id" IS 'FK → notices.notice_id';

COMMENT ON COLUMN "notice_conditions"."target_type" IS 'enum: YOUTH, NEWLYWED, COMMON, OTHER';

COMMENT ON COLUMN "notice_conditions"."min_age" IS '연령 조건';

COMMENT ON COLUMN "notice_conditions"."max_age" IS '연령 조건';

COMMENT ON COLUMN "notice_conditions"."income_limit_amount" IS '원 단위';

COMMENT ON COLUMN "notice_conditions"."income_limit_text" IS '원문 설명';

COMMENT ON COLUMN "notice_conditions"."asset_limit_amount" IS '원 단위';

COMMENT ON COLUMN "notice_conditions"."asset_limit_text" IS '원문 설명';

COMMENT ON COLUMN "notice_conditions"."requires_homeless" IS '0: 무관, 1: 무주택 필요';

COMMENT ON COLUMN "notice_conditions"."housing_ownership_requirement" IS '화면 표시용';

COMMENT ON COLUMN "notice_conditions"."residence_requirement" IS '거주지 조건';

COMMENT ON COLUMN "notice_conditions"."household_requirement" IS '가구원/세대 조건';

COMMENT ON COLUMN "notice_conditions"."subscription_requirement" IS '청약 관련 조건';

COMMENT ON COLUMN "notice_conditions"."raw_condition_text" IS '파싱 전 조건 원문';

COMMENT ON COLUMN "notice_conditions"."created_at" IS '생성 시각';

COMMENT ON COLUMN "notice_conditions"."updated_at" IS '수정 시각';

CREATE TABLE "eligibility_analyses" (
	"eligibility_analysis_id"	BIGINT		NOT NULL,
	"user_condition_profile_id"	BIGINT		NOT NULL,
	"notice_id"	BIGINT		NOT NULL,
	"unit_id"	BIGINT		NOT NULL,
	"result_level"	VARCHAR(30)		NOT NULL,
	"eligibility_score"	DECIMAL(5,2)		NOT NULL,
	"expected_deposit_amount"	BIGINT		NOT NULL,
	"expected_monthly_rent_amount"	BIGINT		NOT NULL,
	"maintenance_fee_amount"	BIGINT	DEFAULT 0	NOT NULL,
	"shortage_amount"	BIGINT		NOT NULL,
	"rent_burden_rate"	DECIMAL(5,2)		NOT NULL,
	"summary_message"	VARCHAR(500)		NULL,
	"analyzed_at"	DATETIME	DEFAULT CURRENT_TIMESTAMP	NOT NULL
);

COMMENT ON COLUMN "eligibility_analyses"."notice_id" IS '공고 PK';

COMMENT ON COLUMN "eligibility_analyses"."unit_id" IS '주택형 PK';

COMMENT ON COLUMN "eligibility_analyses"."result_level" IS 'enum: HIGH, MEDIUM, LOW, NOT_ELIGIBLE, NEED_CHECK';

CREATE TABLE "guides" (
	"guide_id"	BIGINT		NOT NULL,
	"category_id"	BIGINT		NOT NULL,
	"title"	varchar(255)		NOT NULL,
	"content_type"	varchar(20)		NOT NULL,
	"content_body"	text		NOT NULL,
	"announcement_type"	varchar(50)		NOT NULL,
	"display_order"	INT		NOT NULL,
	"created_at"	DATETIME	DEFAULT CURRENT_TIMESTAMP	NOT NULL,
	"updated_at"	DATETIME	DEFAULT CURRENT_TIMESTAMP	NOT NULL
);

COMMENT ON COLUMN "guides"."guide_id" IS '가이드 pk';

COMMENT ON COLUMN "guides"."category_id" IS '가이드 카테고리pk';

COMMENT ON COLUMN "guides"."title" IS '예)청년안심주택 최초 신청 절차 안내';

COMMENT ON COLUMN "guides"."content_type" IS 'enum: TEXT / IMAGE  / CHECKLIST';

COMMENT ON COLUMN "guides"."content_body" IS 'TEXT는 일반 문단, IMAGE는 이미지 URL 한 줄, CHECKLIST는 줄마다 체크 아이콘을 붙여서 표시';

COMMENT ON COLUMN "guides"."announcement_type" IS 'enum: YOUTH_SAFE_HOUSE / ADDITIONAL_RECRUIT / COMMON';

COMMENT ON COLUMN "guides"."display_order" IS '노출순서';

COMMENT ON COLUMN "guides"."created_at" IS '생성시각';

COMMENT ON COLUMN "guides"."updated_at" IS '수정시각';

CREATE TABLE "user_device" (
	"device_id"	BIGINT		NOT NULL,
	"user_id"	BIGINT		NOT NULL,
	"fcm_token"	VARCHAR(255)		NOT NULL,
	"device_type"	VARCHAR(20)		NULL,
	"created_at"	DATETIME		NOT NULL,
	"updated_at"	DATETIME		NOT NULL
);

COMMENT ON COLUMN "user_device"."device_id" IS 'PK: 기기 고유 식별자';

COMMENT ON COLUMN "user_device"."user_id" IS 'FK: 사용자 ID';

COMMENT ON COLUMN "user_device"."fcm_token" IS '푸시 발송용 토큰';

COMMENT ON COLUMN "user_device"."device_type" IS 'ANDROID / IOS 등 디바이스 타입';

COMMENT ON COLUMN "user_device"."created_at" IS '디바이스 토큰 생성 (ISO 8601 문자열 기준)';

COMMENT ON COLUMN "user_device"."updated_at" IS '토큰 정보 갱신  (ISO 8601 문자열 기준)';

CREATE TABLE "document_mappings" (
	"mapping_id"	bigint		NOT NULL,
	"notice_id"	BIGINT		NULL,
	"product_id"	bigint		NULL,
	"document_id"	bigint		NOT NULL,
	"target_type"	varchar(50)		NOT NULL,
	"is_required"	boolean	DEFAULT true	NOT NULL
);

COMMENT ON COLUMN "document_mappings"."mapping_id" IS '서류매핑 pk';

COMMENT ON COLUMN "document_mappings"."notice_id" IS '공고 PK';

COMMENT ON COLUMN "document_mappings"."product_id" IS '금융상품';

COMMENT ON COLUMN "document_mappings"."document_id" IS '필요서류';

COMMENT ON COLUMN "document_mappings"."target_type" IS 'enum: ANNOUNCEMENT, PRODUCT';

COMMENT ON COLUMN "document_mappings"."is_required" IS '필수여부';

CREATE TABLE "eligibility_condition_results" (
	"eligibility_condition_result_id"	BIGINT		NOT NULL,
	"eligibility_analysis_id"	BIGINT		NOT NULL,
	"condition_id"	BIGINT		NULL,
	"condition_code"	VARCHAR(50)		NOT NULL,
	"condition_name"	VARCHAR(100)		NOT NULL,
	"required_value"	VARCHAR(255)		NULL,
	"user_value"	VARCHAR(255)		NULL,
	"result_status"	VARCHAR(30)		NOT NULL,
	"fail_reason"	VARCHAR(500)		NULL
);

COMMENT ON COLUMN "eligibility_condition_results"."condition_id" IS 'notice_conditions 매핑 조건인 경우만 존재';

COMMENT ON COLUMN "eligibility_condition_results"."condition_code" IS 'enum: INCOME, ASSET, CASH, HOMELESS, RENT_BURDEN, DEBT, REGION';

COMMENT ON COLUMN "eligibility_condition_results"."result_status" IS 'enum: PASS, FAIL, NEED_CHECK';

CREATE TABLE "notice_units" (
	"unit_id"	BIGINT		NOT NULL,
	"notice_id"	BIGINT		NOT NULL,
	"unit_name"	VARCHAR(100)		NULL,
	"exclusive_area_m2"	DECIMAL(6,2)		NULL,
	"supply_area_m2"	DECIMAL(6,2)		NULL,
	"deposit_min"	BIGINT		NULL,
	"deposit_max"	BIGINT		NULL,
	"monthly_rent_min"	BIGINT		NULL,
	"monthly_rent_max"	BIGINT		NULL,
	"supply_count"	INT		NULL,
	"created_at"	DATETIME	DEFAULT CURRENT_TIMESTAMP	NOT NULL,
	"updated_at"	DATETIME	DEFAULT CURRENT_TIMESTAMP	NOT NULL
);

COMMENT ON COLUMN "notice_units"."unit_id" IS '주택형 PK';

COMMENT ON COLUMN "notice_units"."notice_id" IS 'FK → notices.notice_id';

COMMENT ON COLUMN "notice_units"."unit_name" IS 'A타입, 24㎡ 등';

COMMENT ON COLUMN "notice_units"."exclusive_area_m2" IS '전용면적, 단위: ㎡';

COMMENT ON COLUMN "notice_units"."supply_area_m2" IS '공급면적, 단위: ㎡';

COMMENT ON COLUMN "notice_units"."deposit_min" IS '원 단위';

COMMENT ON COLUMN "notice_units"."deposit_max" IS '원 단위';

COMMENT ON COLUMN "notice_units"."monthly_rent_min" IS '원 단위';

COMMENT ON COLUMN "notice_units"."monthly_rent_max" IS '원 단위';

COMMENT ON COLUMN "notice_units"."supply_count" IS '세대수';

COMMENT ON COLUMN "notice_units"."created_at" IS '생성 시각';

COMMENT ON COLUMN "notice_units"."updated_at" IS '수정 시각';

CREATE TABLE "guide_categories" (
	"category_id"	BIGINT		NOT NULL,
	"category_name"	varchar(100)		NOT NULL,
	"display_order"	INT		NOT NULL
);

COMMENT ON COLUMN "guide_categories"."category_id" IS '가이드 카테고리pk';

COMMENT ON COLUMN "guide_categories"."category_name" IS '카테고리명 (신청절차/자격조건/서류준비/계약절차  등)';

COMMENT ON COLUMN "guide_categories"."display_order" IS '노출순서';

CREATE TABLE "notices" (
	"notice_id"	BIGINT		NOT NULL,
	"complex_id"	BIGINT		NOT NULL,
	"announcement_no"	VARCHAR(100)		NULL,
	"title"	VARCHAR(255)		NOT NULL,
	"source_url"	TEXT		NOT NULL,
	"dedup_hash"	VARCHAR(255)		NOT NULL,
	"content_hash"	VARCHAR(255)		NULL,
	"status"	VARCHAR(30)		NOT NULL,
	"is_additional_recruitment"	TINYINT(1)	DEFAULT 0	NOT NULL,
	"application_start_at"	DATETIME		NULL,
	"application_end_at"	DATETIME		NULL,
	"raw_content"	TEXT		NULL,
	"parsed_json"	TEXT		NULL,
	"last_crawled_at"	DATETIME		NULL,
	"views"	INT	DEFAULT 0	NOT NULL,
	"interested_count"	INT	DEFAULT 0	NOT NULL,
	"created_at"	DATETIME	DEFAULT CURRENT_TIMESTAMP	NOT NULL,
	"updated_at"	DATETIME	DEFAULT CURRENT_TIMESTAMP	NOT NULL
);

COMMENT ON COLUMN "notices"."notice_id" IS '공고 PK';

COMMENT ON COLUMN "notices"."complex_id" IS 'FK → housing_complexes.complex_id';

COMMENT ON COLUMN "notices"."announcement_no" IS '외부 공고 번호';

COMMENT ON COLUMN "notices"."title" IS '공고명';

COMMENT ON COLUMN "notices"."source_url" IS '원문 링크';

COMMENT ON COLUMN "notices"."dedup_hash" IS '공고번호+제목+모집기간+URL 기반, UNIQUE 필요: 크롤링 공고 중복 저장 방지';

COMMENT ON COLUMN "notices"."content_hash" IS '변경 감지용';

COMMENT ON COLUMN "notices"."status" IS 'enum: RECRUITING, SCHEDULED, CLOSING_SOON, CLOSED';

COMMENT ON COLUMN "notices"."is_additional_recruitment" IS '0: 일반 공고, 1: 추가모집 공고';

COMMENT ON COLUMN "notices"."application_start_at" IS '신청 시작';

COMMENT ON COLUMN "notices"."application_end_at" IS '신청 마감';

COMMENT ON COLUMN "notices"."raw_content" IS '크롤링 원문 텍스트';

COMMENT ON COLUMN "notices"."parsed_json" IS 'HTML → JSON 변환 결과';

COMMENT ON COLUMN "notices"."last_crawled_at" IS '마지막 수집 시각';

COMMENT ON COLUMN "notices"."views" IS '조회 수 캐시';

COMMENT ON COLUMN "notices"."interested_count" IS '전체 사용자 저장 수 캐시 컬럼, saved_notices 기준 집계';

COMMENT ON COLUMN "notices"."created_at" IS '생성 시각';

COMMENT ON COLUMN "notices"."updated_at" IS '수정 시각';

CREATE TABLE "required_documents" (
	"document_id"	bigint		NOT NULL,
	"document_name"	varchar(255)		NOT NULL,
	"issuer"	varchar(100)	DEFAULT NULL	NULL,
	"issue_method"	ENUM('ONLINE', 'OFFLINE', 'BOTH')		NOT NULL,
	"validity_period_days"	int	DEFAULT NULL	NULL,
	"document_type"	ENUM('COMMON', 'PRODUCT', 'ANNOUNCEMENT')		NOT NULL,
	"description"	text	DEFAULT NULL	NULL,
	"created_at"	datetime	DEFAULT CURRENT_TIMESTAMP	NOT NULL
);

COMMENT ON COLUMN "required_documents"."document_id" IS '필요서류 pk';

COMMENT ON COLUMN "required_documents"."document_name" IS '서류명';

COMMENT ON COLUMN "required_documents"."issuer" IS '발급처 예) 정부24, 주민센터';

COMMENT ON COLUMN "required_documents"."issue_method" IS '발급방법';

COMMENT ON COLUMN "required_documents"."validity_period_days" IS '유효기간';

COMMENT ON COLUMN "required_documents"."document_type" IS '서류구분 | COMMON은 공통, PRODUCT는 상품별, ANNOUNCEMENT는 공고별';

COMMENT ON COLUMN "required_documents"."description" IS '서류설명';

COMMENT ON COLUMN "required_documents"."created_at" IS '생성시각';

ALTER TABLE "saved_notices" ADD CONSTRAINT "PK_SAVED_NOTICES" PRIMARY KEY (
	"saved_notice_id"
);

ALTER TABLE "user_profiles" ADD CONSTRAINT "PK_USER_PROFILES" PRIMARY KEY (
	"profile_id"
);

ALTER TABLE "notification_logs" ADD CONSTRAINT "PK_NOTIFICATION_LOGS" PRIMARY KEY (
	"notification_log_id"
);

ALTER TABLE "notice_files" ADD CONSTRAINT "PK_NOTICE_FILES" PRIMARY KEY (
	"file_id"
);

ALTER TABLE "alert_settings" ADD CONSTRAINT "PK_ALERT_SETTINGS" PRIMARY KEY (
	"alert_setting_id"
);

ALTER TABLE "housing_complexes" ADD CONSTRAINT "PK_HOUSING_COMPLEXES" PRIMARY KEY (
	"complex_id"
);

ALTER TABLE "finance_terms" ADD CONSTRAINT "PK_FINANCE_TERMS" PRIMARY KEY (
	"term_id"
);

ALTER TABLE "user_condition_profiles" ADD CONSTRAINT "PK_USER_CONDITION_PROFILES" PRIMARY KEY (
	"user_condition_profile_id"
);

ALTER TABLE "loan_products" ADD CONSTRAINT "PK_LOAN_PRODUCTS" PRIMARY KEY (
	"product_id"
);

ALTER TABLE "users" ADD CONSTRAINT "PK_USERS" PRIMARY KEY (
	"user_id"
);

ALTER TABLE "crawl_logs" ADD CONSTRAINT "PK_CRAWL_LOGS" PRIMARY KEY (
	"crawl_log_id"
);

ALTER TABLE "notice_conditions" ADD CONSTRAINT "PK_NOTICE_CONDITIONS" PRIMARY KEY (
	"condition_id"
);

ALTER TABLE "eligibility_analyses" ADD CONSTRAINT "PK_ELIGIBILITY_ANALYSES" PRIMARY KEY (
	"eligibility_analysis_id"
);

ALTER TABLE "guides" ADD CONSTRAINT "PK_GUIDES" PRIMARY KEY (
	"guide_id"
);

ALTER TABLE "user_device" ADD CONSTRAINT "PK_USER_DEVICE" PRIMARY KEY (
	"device_id"
);

ALTER TABLE "document_mappings" ADD CONSTRAINT "PK_DOCUMENT_MAPPINGS" PRIMARY KEY (
	"mapping_id"
);

ALTER TABLE "eligibility_condition_results" ADD CONSTRAINT "PK_ELIGIBILITY_CONDITION_RESULTS" PRIMARY KEY (
	"eligibility_condition_result_id"
);

ALTER TABLE "notice_units" ADD CONSTRAINT "PK_NOTICE_UNITS" PRIMARY KEY (
	"unit_id"
);

ALTER TABLE "guide_categories" ADD CONSTRAINT "PK_GUIDE_CATEGORIES" PRIMARY KEY (
	"category_id"
);

ALTER TABLE "notices" ADD CONSTRAINT "PK_NOTICES" PRIMARY KEY (
	"notice_id"
);

ALTER TABLE "required_documents" ADD CONSTRAINT "PK_REQUIRED_DOCUMENTS" PRIMARY KEY (
	"document_id"
);

ALTER TABLE "users" ADD CONSTRAINT "UK_USERS_EMAIL" UNIQUE (
	"email"
);

ALTER TABLE "users" ADD CONSTRAINT "UK_USERS_PROVIDER_PROVIDER_ID" UNIQUE (
	"provider",
	"provider_id"
);

ALTER TABLE "user_profiles" ADD CONSTRAINT "UK_USER_PROFILES_USER_ID" UNIQUE (
	"user_id"
);

ALTER TABLE "user_condition_profiles" ADD CONSTRAINT "UK_USER_CONDITION_PROFILES_USER_ID" UNIQUE (
	"user_id"
);

ALTER TABLE "alert_settings" ADD CONSTRAINT "UK_ALERT_SETTINGS_USER_ID" UNIQUE (
	"user_id"
);

ALTER TABLE "saved_notices" ADD CONSTRAINT "UK_SAVED_NOTICES_USER_NOTICE" UNIQUE (
	"user_id",
	"notice_id"
);

ALTER TABLE "notices" ADD CONSTRAINT "UK_NOTICES_DEDUP_HASH" UNIQUE (
	"dedup_hash"
);

ALTER TABLE "finance_terms" ADD CONSTRAINT "UK_FINANCE_TERMS_TERM" UNIQUE (
	"term"
);

ALTER TABLE "saved_notices" ADD CONSTRAINT "FK_users_TO_saved_notices_1" FOREIGN KEY (
	"user_id"
)
REFERENCES "users" (
	"user_id"
);

ALTER TABLE "saved_notices" ADD CONSTRAINT "FK_notices_TO_saved_notices_1" FOREIGN KEY (
	"notice_id"
)
REFERENCES "notices" (
	"notice_id"
);

ALTER TABLE "user_profiles" ADD CONSTRAINT "FK_users_TO_user_profiles_1" FOREIGN KEY (
	"user_id"
)
REFERENCES "users" (
	"user_id"
);

ALTER TABLE "notification_logs" ADD CONSTRAINT "FK_users_TO_notification_logs_1" FOREIGN KEY (
	"user_id"
)
REFERENCES "users" (
	"user_id"
);

ALTER TABLE "notification_logs" ADD CONSTRAINT "FK_notices_TO_notification_logs_1" FOREIGN KEY (
	"notice_id"
)
REFERENCES "notices" (
	"notice_id"
);

ALTER TABLE "notice_files" ADD CONSTRAINT "FK_notices_TO_notice_files_1" FOREIGN KEY (
	"notice_id"
)
REFERENCES "notices" (
	"notice_id"
);

ALTER TABLE "alert_settings" ADD CONSTRAINT "FK_users_TO_alert_settings_1" FOREIGN KEY (
	"user_id"
)
REFERENCES "users" (
	"user_id"
);

ALTER TABLE "user_condition_profiles" ADD CONSTRAINT "FK_users_TO_user_condition_profiles_1" FOREIGN KEY (
	"user_id"
)
REFERENCES "users" (
	"user_id"
);

ALTER TABLE "crawl_logs" ADD CONSTRAINT "FK_housing_complexes_TO_crawl_logs_1" FOREIGN KEY (
	"complex_id"
)
REFERENCES "housing_complexes" (
	"complex_id"
);

ALTER TABLE "notice_conditions" ADD CONSTRAINT "FK_notices_TO_notice_conditions_1" FOREIGN KEY (
	"notice_id"
)
REFERENCES "notices" (
	"notice_id"
);

ALTER TABLE "eligibility_analyses" ADD CONSTRAINT "FK_user_condition_profiles_TO_eligibility_analyses_1" FOREIGN KEY (
	"user_condition_profile_id"
)
REFERENCES "user_condition_profiles" (
	"user_condition_profile_id"
);

ALTER TABLE "eligibility_analyses" ADD CONSTRAINT "FK_notices_TO_eligibility_analyses_1" FOREIGN KEY (
	"notice_id"
)
REFERENCES "notices" (
	"notice_id"
);

ALTER TABLE "eligibility_analyses" ADD CONSTRAINT "FK_notice_units_TO_eligibility_analyses_1" FOREIGN KEY (
	"unit_id"
)
REFERENCES "notice_units" (
	"unit_id"
);

ALTER TABLE "guides" ADD CONSTRAINT "FK_guide_categories_TO_guides_1" FOREIGN KEY (
	"category_id"
)
REFERENCES "guide_categories" (
	"category_id"
);

ALTER TABLE "user_device" ADD CONSTRAINT "FK_users_TO_user_device_1" FOREIGN KEY (
	"user_id"
)
REFERENCES "users" (
	"user_id"
);

ALTER TABLE "document_mappings" ADD CONSTRAINT "FK_notices_TO_document_mappings_1" FOREIGN KEY (
	"notice_id"
)
REFERENCES "notices" (
	"notice_id"
);

ALTER TABLE "document_mappings" ADD CONSTRAINT "FK_loan_products_TO_document_mappings_1" FOREIGN KEY (
	"product_id"
)
REFERENCES "loan_products" (
	"product_id"
);

ALTER TABLE "document_mappings" ADD CONSTRAINT "FK_required_documents_TO_document_mappings_1" FOREIGN KEY (
	"document_id"
)
REFERENCES "required_documents" (
	"document_id"
);

ALTER TABLE "eligibility_condition_results" ADD CONSTRAINT "FK_eligibility_analyses_TO_eligibility_condition_results_1" FOREIGN KEY (
	"eligibility_analysis_id"
)
REFERENCES "eligibility_analyses" (
	"eligibility_analysis_id"
);

ALTER TABLE "eligibility_condition_results" ADD CONSTRAINT "FK_notice_conditions_TO_eligibility_condition_results_1" FOREIGN KEY (
	"condition_id"
)
REFERENCES "notice_conditions" (
	"condition_id"
);

ALTER TABLE "notice_units" ADD CONSTRAINT "FK_notices_TO_notice_units_1" FOREIGN KEY (
	"notice_id"
)
REFERENCES "notices" (
	"notice_id"
);

ALTER TABLE "notices" ADD CONSTRAINT "FK_housing_complexes_TO_notices_1" FOREIGN KEY (
	"complex_id"
)
REFERENCES "housing_complexes" (
	"complex_id"
);
