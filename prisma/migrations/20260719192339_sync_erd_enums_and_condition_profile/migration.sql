-- CreateEnum
CREATE TYPE "user_provider" AS ENUM ('LOCAL', 'KAKAO', 'GOOGLE');

-- CreateEnum
CREATE TYPE "user_status" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "notification_status" AS ENUM ('PENDING', 'SENT', 'FAILED', 'RETRYING');

-- CreateEnum
CREATE TYPE "notice_file_type" AS ENUM ('PDF', 'IMAGE', 'LINK', 'DOC', 'OTHER');

-- CreateEnum
CREATE TYPE "external_api_error_type" AS ENUM ('HTTP_ERROR', 'RESULT_CODE_ERROR', 'INVALID_RESPONSE', 'NETWORK_ERROR');

-- CreateEnum
CREATE TYPE "loan_provider_type" AS ENUM ('POLICY', 'BANK');

-- CreateEnum
CREATE TYPE "loan_product_category" AS ENUM ('MORTGAGE_LOAN', 'JEONSE_LOAN', 'SUBSCRIPTION_SAVINGS');

-- CreateEnum
CREATE TYPE "crawl_status" AS ENUM ('SUCCESS', 'FAILED', 'PARTIAL');

-- CreateEnum
CREATE TYPE "crawler_type" AS ENUM ('PLAYWRIGHT', 'CHEERIO', 'MANUAL');

-- CreateEnum
CREATE TYPE "notice_condition_target_type" AS ENUM ('YOUTH', 'NEWLYWED', 'COMMON', 'OTHER');

-- CreateEnum
CREATE TYPE "eligibility_result_level" AS ENUM ('HIGH', 'MEDIUM', 'LOW', 'NOT_ELIGIBLE', 'NEED_CHECK');

-- CreateEnum
CREATE TYPE "guide_content_type" AS ENUM ('TEXT', 'IMAGE', 'CHECKLIST');

-- CreateEnum
CREATE TYPE "guide_announcement_type" AS ENUM ('YOUTH_SAFE_HOUSE', 'ADDITIONAL_RECRUIT', 'COMMON');

-- CreateEnum
CREATE TYPE "device_type" AS ENUM ('ANDROID', 'IOS');

-- CreateEnum
CREATE TYPE "document_target_type" AS ENUM ('ANNOUNCEMENT', 'PRODUCT');

-- CreateEnum
CREATE TYPE "eligibility_condition_code" AS ENUM ('INCOME', 'ASSET', 'CASH', 'HOMELESS', 'RENT_BURDEN', 'DEBT', 'REGION');

-- CreateEnum
CREATE TYPE "eligibility_condition_result_status" AS ENUM ('PASS', 'FAIL', 'NEED_CHECK');

-- CreateEnum
CREATE TYPE "document_issue_method" AS ENUM ('ONLINE', 'OFFLINE', 'BOTH');

-- CreateEnum
CREATE TYPE "required_document_type" AS ENUM ('COMMON', 'PRODUCT', 'ANNOUNCEMENT');

-- Add future condition-profile fields without breaking existing rows.
ALTER TABLE "user_condition_profiles"
ADD COLUMN "household_head_status" VARCHAR(30),
ADD COLUMN "marital_status" VARCHAR(30),
ADD COLUMN "marriage_date" DATE,
ADD COLUMN "minor_children_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "has_recent_newborn" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "newborn_birth_date" DATE,
ADD COLUMN "has_existing_housing_loan" BOOLEAN NOT NULL DEFAULT false;

UPDATE "user_condition_profiles"
SET
  "household_head_status" = 'UNKNOWN',
  "marital_status" = 'UNKNOWN'
WHERE "household_head_status" IS NULL
   OR "marital_status" IS NULL;

ALTER TABLE "user_condition_profiles"
ALTER COLUMN "household_head_status" SET NOT NULL,
ALTER COLUMN "marital_status" SET NOT NULL;

-- Convert constrained text columns to PostgreSQL named enums.
ALTER TABLE "users"
ALTER COLUMN "provider" TYPE "user_provider" USING ("provider"::text::"user_provider"),
ALTER COLUMN "status" DROP DEFAULT,
ALTER COLUMN "status" TYPE "user_status" USING ("status"::text::"user_status"),
ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

ALTER TABLE "notification_logs"
ALTER COLUMN "status" TYPE "notification_status" USING ("status"::text::"notification_status"),
ALTER COLUMN "status" SET DEFAULT 'PENDING';

ALTER TABLE "notice_files"
ALTER COLUMN "file_type" TYPE "notice_file_type" USING ("file_type"::text::"notice_file_type");

ALTER TABLE "external_api_call_logs"
ALTER COLUMN "error_type" TYPE "external_api_error_type" USING ("error_type"::text::"external_api_error_type");

ALTER TABLE "loan_products"
ALTER COLUMN "provider_type" TYPE "loan_provider_type" USING ("provider_type"::text::"loan_provider_type"),
ALTER COLUMN "product_category" TYPE "loan_product_category" USING ("product_category"::text::"loan_product_category"),
ALTER COLUMN "require_no_house" SET DEFAULT true;

ALTER TABLE "crawl_logs"
ALTER COLUMN "status" TYPE "crawl_status" USING ("status"::text::"crawl_status"),
ALTER COLUMN "crawler_type" TYPE "crawler_type" USING ("crawler_type"::text::"crawler_type");

UPDATE "notice_conditions"
SET "target_type" = 'OTHER'
WHERE "target_type" IS NULL;

ALTER TABLE "notice_conditions"
ALTER COLUMN "target_type" TYPE "notice_condition_target_type" USING ("target_type"::text::"notice_condition_target_type"),
ALTER COLUMN "target_type" SET DEFAULT 'OTHER',
ALTER COLUMN "target_type" SET NOT NULL;

ALTER TABLE "eligibility_analyses"
ALTER COLUMN "result_level" TYPE "eligibility_result_level" USING ("result_level"::text::"eligibility_result_level");

ALTER TABLE "eligibility_condition_results"
ALTER COLUMN "condition_code" TYPE "eligibility_condition_code" USING ("condition_code"::text::"eligibility_condition_code"),
ALTER COLUMN "result_status" TYPE "eligibility_condition_result_status" USING ("result_status"::text::"eligibility_condition_result_status");

ALTER TABLE "guides"
ALTER COLUMN "content_type" TYPE "guide_content_type" USING ("content_type"::text::"guide_content_type"),
ALTER COLUMN "announcement_type" TYPE "guide_announcement_type" USING ("announcement_type"::text::"guide_announcement_type");

ALTER TABLE "user_device"
ALTER COLUMN "device_type" TYPE "device_type" USING ("device_type"::text::"device_type");

ALTER TABLE "document_mappings"
ALTER COLUMN "target_type" TYPE "document_target_type" USING ("target_type"::text::"document_target_type");

ALTER TABLE "required_documents"
ALTER COLUMN "issue_method" TYPE "document_issue_method" USING ("issue_method"::text::"document_issue_method"),
ALTER COLUMN "document_type" TYPE "required_document_type" USING ("document_type"::text::"required_document_type");

-- These status columns were removed from the finalized ERD.
ALTER TABLE "notices" DROP COLUMN "status";
ALTER TABLE "external_api_call_logs" DROP COLUMN "status";
