-- AlterTable
ALTER TABLE "loan_products" ADD COLUMN     "dti_ratio" INTEGER,
ADD COLUMN     "first_time_buyer_only" BOOLEAN,
ADD COLUMN     "loan_term_max_years" INTEGER,
ADD COLUMN     "loan_term_min_years" INTEGER,
ADD COLUMN     "ltv_ratio" INTEGER,
ADD COLUMN     "max_monthly_deposit" BIGINT,
ADD COLUMN     "min_monthly_deposit" BIGINT,
ADD COLUMN     "preferential_rate_discount" DECIMAL(4,2),
ADD COLUMN     "product_category" VARCHAR(30);
