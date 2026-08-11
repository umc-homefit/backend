-- 월세 미수집(NULL)과 실제 월세 0원을 구분해 분석 결과에 보존한다.
ALTER TABLE "eligibility_analyses"
  ALTER COLUMN "expected_monthly_rent_amount" DROP NOT NULL,
  ALTER COLUMN "rent_burden_rate" DROP NOT NULL;
