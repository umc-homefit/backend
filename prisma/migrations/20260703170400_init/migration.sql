-- CreateTable
CREATE TABLE "users" (
    "user_id" BIGSERIAL NOT NULL,
    "email" VARCHAR(255),
    "password" VARCHAR(255),
    "provider" VARCHAR(50) NOT NULL,
    "provider_id" VARCHAR(255),
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PK_USERS" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "user_profiles" (
    "profile_id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "nickname" VARCHAR(50),
    "birth_date" DATE,
    "phone_number" VARCHAR(20),
    "profile_image_url" VARCHAR(255),
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PK_USER_PROFILES" PRIMARY KEY ("profile_id")
);

-- CreateTable
CREATE TABLE "user_condition_profiles" (
    "user_condition_profile_id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "monthly_income_amount" BIGINT NOT NULL DEFAULT 0,
    "total_asset_amount" BIGINT NOT NULL DEFAULT 0,
    "total_debt_amount" BIGINT NOT NULL DEFAULT 0,
    "monthly_debt_payment_amount" BIGINT NOT NULL DEFAULT 0,
    "cash_savings" BIGINT NOT NULL DEFAULT 0,
    "housing_ownership_status" VARCHAR(50) NOT NULL DEFAULT 'UNKNOWN',
    "is_homeless" BOOLEAN NOT NULL DEFAULT false,
    "residence_region_code" VARCHAR(100),
    "workplace_region_code" VARCHAR(100),
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PK_USER_CONDITION_PROFILES" PRIMARY KEY ("user_condition_profile_id")
);

-- CreateTable
CREATE TABLE "alert_settings" (
    "alert_setting_id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "push_enabled" BOOLEAN NOT NULL DEFAULT true,
    "notice_alert_enabled" BOOLEAN NOT NULL DEFAULT true,
    "schedule_alert_enabled" BOOLEAN NOT NULL DEFAULT true,
    "finance_alert_enabled" BOOLEAN NOT NULL DEFAULT true,
    "interested_region" VARCHAR(100),
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PK_ALERT_SETTINGS" PRIMARY KEY ("alert_setting_id")
);

-- CreateTable
CREATE TABLE "user_device" (
    "device_id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "fcm_token" VARCHAR(255) NOT NULL,
    "device_type" VARCHAR(20),
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PK_USER_DEVICE" PRIMARY KEY ("device_id")
);

-- CreateTable
CREATE TABLE "housing_complexes" (
    "complex_id" BIGSERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "region" VARCHAR(100) NOT NULL,
    "district" VARCHAR(100),
    "address" VARCHAR(255),
    "source_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "crawl_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PK_HOUSING_COMPLEXES" PRIMARY KEY ("complex_id")
);

-- CreateTable
CREATE TABLE "notices" (
    "notice_id" BIGSERIAL NOT NULL,
    "complex_id" BIGINT NOT NULL,
    "announcement_no" VARCHAR(100),
    "title" VARCHAR(255) NOT NULL,
    "source_url" TEXT NOT NULL,
    "dedup_hash" VARCHAR(255) NOT NULL,
    "content_hash" VARCHAR(255),
    "status" VARCHAR(30) NOT NULL,
    "is_additional_recruitment" BOOLEAN NOT NULL DEFAULT false,
    "application_start_at" TIMESTAMP(0),
    "application_end_at" TIMESTAMP(0),
    "raw_content" TEXT,
    "parsed_json" TEXT,
    "last_crawled_at" TIMESTAMP(0),
    "views" INTEGER NOT NULL DEFAULT 0,
    "interested_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PK_NOTICES" PRIMARY KEY ("notice_id")
);

-- CreateTable
CREATE TABLE "notice_units" (
    "unit_id" BIGSERIAL NOT NULL,
    "notice_id" BIGINT NOT NULL,
    "unit_name" VARCHAR(100),
    "exclusive_area_m2" DECIMAL(6,2),
    "supply_area_m2" DECIMAL(6,2),
    "deposit_min" BIGINT,
    "deposit_max" BIGINT,
    "monthly_rent_min" BIGINT,
    "monthly_rent_max" BIGINT,
    "supply_count" INTEGER,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PK_NOTICE_UNITS" PRIMARY KEY ("unit_id")
);

-- CreateTable
CREATE TABLE "notice_conditions" (
    "condition_id" BIGSERIAL NOT NULL,
    "notice_id" BIGINT NOT NULL,
    "target_type" VARCHAR(100),
    "min_age" INTEGER,
    "max_age" INTEGER,
    "income_limit_amount" BIGINT,
    "income_limit_text" TEXT,
    "asset_limit_amount" BIGINT,
    "asset_limit_text" TEXT,
    "requires_homeless" BOOLEAN,
    "housing_ownership_requirement" TEXT,
    "residence_requirement" TEXT,
    "household_requirement" TEXT,
    "subscription_requirement" TEXT,
    "raw_condition_text" TEXT,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PK_NOTICE_CONDITIONS" PRIMARY KEY ("condition_id")
);

-- CreateTable
CREATE TABLE "notice_files" (
    "file_id" BIGSERIAL NOT NULL,
    "notice_id" BIGINT NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_type" VARCHAR(30) NOT NULL,
    "file_url" TEXT NOT NULL,
    "registered_at" TIMESTAMP(0),
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PK_NOTICE_FILES" PRIMARY KEY ("file_id")
);

-- CreateTable
CREATE TABLE "saved_notices" (
    "saved_notice_id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "notice_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PK_SAVED_NOTICES" PRIMARY KEY ("saved_notice_id")
);

-- CreateTable
CREATE TABLE "notification_logs" (
    "notification_log_id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "notice_id" BIGINT,
    "notification_type" VARCHAR(30) NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "title" VARCHAR(255) NOT NULL,
    "body" TEXT,
    "status" VARCHAR(30) NOT NULL,
    "sent_at" TIMESTAMP(0),
    "failure_reason" TEXT,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PK_NOTIFICATION_LOGS" PRIMARY KEY ("notification_log_id")
);

-- CreateTable
CREATE TABLE "crawl_logs" (
    "crawl_log_id" BIGSERIAL NOT NULL,
    "complex_id" BIGINT,
    "status" VARCHAR(30) NOT NULL,
    "crawler_type" VARCHAR(30),
    "error_type" VARCHAR(50),
    "started_at" TIMESTAMP(0) NOT NULL,
    "finished_at" TIMESTAMP(0),
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "created_notice_count" INTEGER NOT NULL DEFAULT 0,
    "updated_notice_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PK_CRAWL_LOGS" PRIMARY KEY ("crawl_log_id")
);

-- CreateTable
CREATE TABLE "eligibility_analyses" (
    "eligibility_analysis_id" BIGSERIAL NOT NULL,
    "user_condition_profile_id" BIGINT NOT NULL,
    "notice_id" BIGINT NOT NULL,
    "unit_id" BIGINT NOT NULL,
    "result_level" VARCHAR(30) NOT NULL,
    "eligibility_score" DECIMAL(5,2) NOT NULL,
    "expected_deposit_amount" BIGINT NOT NULL,
    "expected_monthly_rent_amount" BIGINT NOT NULL,
    "maintenance_fee_amount" BIGINT NOT NULL DEFAULT 0,
    "shortage_amount" BIGINT NOT NULL,
    "rent_burden_rate" DECIMAL(5,2) NOT NULL,
    "summary_message" VARCHAR(500),
    "analyzed_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PK_ELIGIBILITY_ANALYSES" PRIMARY KEY ("eligibility_analysis_id")
);

-- CreateTable
CREATE TABLE "eligibility_condition_results" (
    "eligibility_condition_result_id" BIGSERIAL NOT NULL,
    "eligibility_analysis_id" BIGINT NOT NULL,
    "condition_id" BIGINT,
    "condition_code" VARCHAR(50) NOT NULL,
    "condition_name" VARCHAR(100) NOT NULL,
    "required_value" VARCHAR(255),
    "user_value" VARCHAR(255),
    "result_status" VARCHAR(30) NOT NULL,
    "fail_reason" VARCHAR(500),

    CONSTRAINT "PK_ELIGIBILITY_CONDITION_RESULTS" PRIMARY KEY ("eligibility_condition_result_id")
);

-- CreateTable
CREATE TABLE "loan_products" (
    "product_id" BIGSERIAL NOT NULL,
    "product_name" VARCHAR(255) NOT NULL,
    "provider_type" VARCHAR(30) NOT NULL,
    "provider_name" VARCHAR(100) NOT NULL,
    "min_rate" DECIMAL(5,2),
    "max_rate" DECIMAL(5,2),
    "max_limit_amount" BIGINT,
    "min_age" INTEGER,
    "max_age" INTEGER,
    "max_income" BIGINT,
    "max_asset" BIGINT,
    "require_no_house" BOOLEAN NOT NULL DEFAULT true,
    "official_url" VARCHAR(500) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PK_LOAN_PRODUCTS" PRIMARY KEY ("product_id")
);

-- CreateTable
CREATE TABLE "finance_terms" (
    "term_id" BIGSERIAL NOT NULL,
    "term" VARCHAR(50) NOT NULL,
    "detail_description" TEXT,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PK_FINANCE_TERMS" PRIMARY KEY ("term_id")
);

-- CreateTable
CREATE TABLE "guide_categories" (
    "category_id" BIGSERIAL NOT NULL,
    "category_name" VARCHAR(100) NOT NULL,
    "display_order" INTEGER NOT NULL,

    CONSTRAINT "PK_GUIDE_CATEGORIES" PRIMARY KEY ("category_id")
);

-- CreateTable
CREATE TABLE "guides" (
    "guide_id" BIGSERIAL NOT NULL,
    "category_id" BIGINT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "content_type" VARCHAR(20) NOT NULL,
    "content_body" TEXT NOT NULL,
    "announcement_type" VARCHAR(50) NOT NULL,
    "display_order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PK_GUIDES" PRIMARY KEY ("guide_id")
);

-- CreateTable
CREATE TABLE "required_documents" (
    "document_id" BIGSERIAL NOT NULL,
    "document_name" VARCHAR(255) NOT NULL,
    "issuer" VARCHAR(100),
    "issue_method" VARCHAR(30) NOT NULL,
    "validity_period_days" INTEGER,
    "document_type" VARCHAR(30) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PK_REQUIRED_DOCUMENTS" PRIMARY KEY ("document_id")
);

-- CreateTable
CREATE TABLE "document_mappings" (
    "mapping_id" BIGSERIAL NOT NULL,
    "notice_id" BIGINT,
    "product_id" BIGINT,
    "document_id" BIGINT NOT NULL,
    "target_type" VARCHAR(50) NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PK_DOCUMENT_MAPPINGS" PRIMARY KEY ("mapping_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UK_USERS_EMAIL" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UK_USERS_PROVIDER_PROVIDER_ID" ON "users"("provider", "provider_id");

-- CreateIndex
CREATE UNIQUE INDEX "UK_USER_PROFILES_USER_ID" ON "user_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "UK_USER_CONDITION_PROFILES_USER_ID" ON "user_condition_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "UK_ALERT_SETTINGS_USER_ID" ON "alert_settings"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "UK_NOTICES_DEDUP_HASH" ON "notices"("dedup_hash");

-- CreateIndex
CREATE UNIQUE INDEX "UK_SAVED_NOTICES_USER_NOTICE" ON "saved_notices"("user_id", "notice_id");

-- CreateIndex
CREATE UNIQUE INDEX "UK_FINANCE_TERMS_TERM" ON "finance_terms"("term");

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "FK_users_TO_user_profiles_1" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_condition_profiles" ADD CONSTRAINT "FK_users_TO_user_condition_profiles_1" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_settings" ADD CONSTRAINT "FK_users_TO_alert_settings_1" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_device" ADD CONSTRAINT "FK_users_TO_user_device_1" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notices" ADD CONSTRAINT "FK_housing_complexes_TO_notices_1" FOREIGN KEY ("complex_id") REFERENCES "housing_complexes"("complex_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notice_units" ADD CONSTRAINT "FK_notices_TO_notice_units_1" FOREIGN KEY ("notice_id") REFERENCES "notices"("notice_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notice_conditions" ADD CONSTRAINT "FK_notices_TO_notice_conditions_1" FOREIGN KEY ("notice_id") REFERENCES "notices"("notice_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notice_files" ADD CONSTRAINT "FK_notices_TO_notice_files_1" FOREIGN KEY ("notice_id") REFERENCES "notices"("notice_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_notices" ADD CONSTRAINT "FK_notices_TO_saved_notices_1" FOREIGN KEY ("notice_id") REFERENCES "notices"("notice_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_notices" ADD CONSTRAINT "FK_users_TO_saved_notices_1" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_logs" ADD CONSTRAINT "FK_notices_TO_notification_logs_1" FOREIGN KEY ("notice_id") REFERENCES "notices"("notice_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_logs" ADD CONSTRAINT "FK_users_TO_notification_logs_1" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crawl_logs" ADD CONSTRAINT "FK_housing_complexes_TO_crawl_logs_1" FOREIGN KEY ("complex_id") REFERENCES "housing_complexes"("complex_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eligibility_analyses" ADD CONSTRAINT "FK_notices_TO_eligibility_analyses_1" FOREIGN KEY ("notice_id") REFERENCES "notices"("notice_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eligibility_analyses" ADD CONSTRAINT "FK_notice_units_TO_eligibility_analyses_1" FOREIGN KEY ("unit_id") REFERENCES "notice_units"("unit_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eligibility_analyses" ADD CONSTRAINT "FK_user_condition_profiles_TO_eligibility_analyses_1" FOREIGN KEY ("user_condition_profile_id") REFERENCES "user_condition_profiles"("user_condition_profile_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eligibility_condition_results" ADD CONSTRAINT "FK_notice_conditions_TO_eligibility_condition_results_1" FOREIGN KEY ("condition_id") REFERENCES "notice_conditions"("condition_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eligibility_condition_results" ADD CONSTRAINT "FK_eligibility_analyses_TO_eligibility_condition_results_1" FOREIGN KEY ("eligibility_analysis_id") REFERENCES "eligibility_analyses"("eligibility_analysis_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guides" ADD CONSTRAINT "FK_guide_categories_TO_guides_1" FOREIGN KEY ("category_id") REFERENCES "guide_categories"("category_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_mappings" ADD CONSTRAINT "FK_required_documents_TO_document_mappings_1" FOREIGN KEY ("document_id") REFERENCES "required_documents"("document_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_mappings" ADD CONSTRAINT "FK_notices_TO_document_mappings_1" FOREIGN KEY ("notice_id") REFERENCES "notices"("notice_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_mappings" ADD CONSTRAINT "FK_loan_products_TO_document_mappings_1" FOREIGN KEY ("product_id") REFERENCES "loan_products"("product_id") ON DELETE SET NULL ON UPDATE CASCADE;
