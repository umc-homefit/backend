-- targetType과 실제로 채워진 FK(product_id/notice_id)가 항상 일치하도록 DB 레벨에서 강제한다.
-- (PRODUCT면 product_id만 있고 notice_id는 반드시 NULL, ANNOUNCEMENT면 그 반대)
-- 유니크 제약(UK_DOCUMENT_MAPPINGS_*)만으로는 이 불일치를 막지 못해서 추가함 — PR 리뷰 코멘트 반영.
ALTER TABLE "document_mappings" ADD CONSTRAINT "CK_DOCUMENT_MAPPINGS_TARGET_TYPE_CONSISTENCY" CHECK (
  (target_type = 'PRODUCT' AND product_id IS NOT NULL AND notice_id IS NULL) OR
  (target_type = 'ANNOUNCEMENT' AND notice_id IS NOT NULL AND product_id IS NULL)
);