-- 분석 이후 사용자가 금융정보를 수정해도, 분석 당시 입력 정보를 조회할 수 있도록 보존한다.
-- 기존 이력은 원본 프로필의 과거 상태를 복원할 수 없으므로 NULL로 유지한다.
ALTER TABLE "eligibility_analyses"
  ADD COLUMN "condition_profile_snapshot" JSONB;
