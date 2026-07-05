/*
  Warnings:

  - A unique constraint covering the columns `[provider_name,product_name,guarantee_ratio]` on the table `loan_products` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "UK_LOAN_PRODUCTS_PROVIDER_GUARANTEE";

-- CreateIndex
CREATE UNIQUE INDEX "UK_LOAN_PRODUCTS_PROVIDER_PRODUCT_GUARANTEE" ON "loan_products"("provider_name", "product_name", "guarantee_ratio");
