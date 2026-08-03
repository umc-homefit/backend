-- 공고에 저장되는 나이·세대·청약·원문 조건을 분석 결과에서 구분해 저장한다.
ALTER TYPE "eligibility_condition_code" ADD VALUE IF NOT EXISTS 'AGE';
ALTER TYPE "eligibility_condition_code" ADD VALUE IF NOT EXISTS 'HOUSEHOLD';
ALTER TYPE "eligibility_condition_code" ADD VALUE IF NOT EXISTS 'SUBSCRIPTION';
ALTER TYPE "eligibility_condition_code" ADD VALUE IF NOT EXISTS 'OTHER';
