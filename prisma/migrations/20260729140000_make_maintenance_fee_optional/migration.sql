-- 현재 크롤링 데이터에는 관리비 원본이 없으므로, 분석 스냅샷에는 NULL을 저장한다.
-- NULL은 관리비 미수집을 의미하며 0원과 구분한다.
ALTER TABLE "eligibility_analyses"
  ALTER COLUMN "maintenance_fee_amount" DROP NOT NULL,
  ALTER COLUMN "maintenance_fee_amount" DROP DEFAULT;
