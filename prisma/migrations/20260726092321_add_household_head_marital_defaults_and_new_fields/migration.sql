-- AlterTable: loan_products에 세대주 조건 컬럼 추가
ALTER TABLE "loan_products" ADD COLUMN     "require_household_head" BOOLEAN;

-- AlterTable: 기존 household_head_status/marital_status는 컬럼을 삭제/재생성하지 않고
-- DEFAULT만 추가한다 (기존 데이터 보존). 신규 컬럼 2개는 ADD COLUMN으로만 추가한다.
ALTER TABLE "user_condition_profiles" ALTER COLUMN "household_head_status" SET DEFAULT 'UNKNOWN';
ALTER TABLE "user_condition_profiles" ALTER COLUMN "marital_status" SET DEFAULT 'UNKNOWN';
ALTER TABLE "user_condition_profiles" ADD COLUMN     "is_first_time_buyer" BOOLEAN;
ALTER TABLE "user_condition_profiles" ADD COLUMN     "employment_status" VARCHAR(30);
