/*
  Warnings:

  - A unique constraint covering the columns `[provider_name,product_name,guarantee_ratio]` on the table `loan_products` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "loan_products" ADD COLUMN     "guarantee_ratio" INTEGER,
ALTER COLUMN "require_no_house" DROP NOT NULL,
ALTER COLUMN "require_no_house" DROP DEFAULT,
ALTER COLUMN "official_url" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "UK_LOAN_PRODUCTS_PROVIDER_PRODUCT_GUARANTEE" ON "loan_products"("provider_name", "product_name", "guarantee_ratio");
