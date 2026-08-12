-- AlterTable
ALTER TABLE "loan_products" ADD COLUMN     "loan_ratio_percent" DECIMAL(5,2),
ADD COLUMN     "max_area_m2" DECIMAL(6,2),
ADD COLUMN     "max_deposit_amount" BIGINT,
ADD COLUMN     "min_asset" BIGINT,
ADD COLUMN     "min_income" BIGINT;

-- CreateTable
CREATE TABLE "external_api_call_logs" (
    "external_api_log_id" BIGSERIAL NOT NULL,
    "api_name" VARCHAR(50) NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'FAILED',
    "error_type" VARCHAR(50),
    "http_status_code" INTEGER,
    "request_url" VARCHAR(500),
    "error_message" TEXT,
    "started_at" TIMESTAMP(0) NOT NULL,
    "failed_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PK_EXTERNAL_API_CALL_LOGS" PRIMARY KEY ("external_api_log_id")
);
