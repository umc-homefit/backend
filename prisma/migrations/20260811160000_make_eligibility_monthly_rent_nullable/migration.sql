-- 기존 분석은 월세 미수집을 0원·0%로 저장해 새 nullable 계약과 구분할 수 없다.
-- 분석 결과는 재생성 가능한 파생 데이터이므로, 자식 조건 결과를 먼저 삭제한 뒤 이력을 초기화한다.
DELETE FROM "eligibility_condition_results";
DELETE FROM "eligibility_analyses";

-- 월세 미수집(NULL)과 실제 월세 0원을 구분해 분석 결과에 보존한다.
ALTER TABLE "eligibility_analyses"
  ALTER COLUMN "expected_monthly_rent_amount" DROP NOT NULL,
  ALTER COLUMN "rent_burden_rate" DROP NOT NULL;
