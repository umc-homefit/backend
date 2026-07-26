/*
  Warnings:

  - A unique constraint covering the columns `[product_id,document_id]` on the table `document_mappings` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[notice_id,document_id]` on the table `document_mappings` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "UK_DOCUMENT_MAPPINGS_PRODUCT_DOCUMENT" ON "document_mappings"("product_id", "document_id");

-- CreateIndex
CREATE UNIQUE INDEX "UK_DOCUMENT_MAPPINGS_NOTICE_DOCUMENT" ON "document_mappings"("notice_id", "document_id");
