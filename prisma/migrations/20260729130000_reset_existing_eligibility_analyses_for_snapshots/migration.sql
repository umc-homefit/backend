-- 기존 분석 이력에는 분석 시점의 보유 현금·월소득이 저장되어 있지 않아 스냅샷을 정확히 복원할 수 없다.
-- 개발 단계 데이터는 유지하지 않기로 했으므로, 자식 결과를 먼저 삭제한 뒤 분석 이력을 초기화한다.
DELETE FROM "eligibility_condition_results";
DELETE FROM "eligibility_analyses";

-- 신규 분석은 서비스에서 두 스냅샷 값을 항상 명시적으로 저장하므로 0 기본값을 두지 않는다.
ALTER TABLE "eligibility_analyses"
  ALTER COLUMN "user_cash_amount" DROP DEFAULT,
  ALTER COLUMN "monthly_income_amount" DROP DEFAULT;
