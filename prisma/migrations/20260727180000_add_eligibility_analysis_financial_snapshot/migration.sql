-- 분석 결과는 실행 시점의 재정 상태를 보여줘야 한다.
-- 사용자 조건 프로필은 이후 수정될 수 있으므로, 현금·월소득을 분석 레코드에 스냅샷으로 저장한다.
ALTER TABLE "eligibility_analyses"
  ADD COLUMN "user_cash_amount" BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN "monthly_income_amount" BIGINT NOT NULL DEFAULT 0;
