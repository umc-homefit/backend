-- AlterTable
ALTER TABLE "loan_products" ADD COLUMN     "max_marriage_years" INTEGER,
ADD COLUMN     "newborn_within_years" INTEGER,
ADD COLUMN     "require_married" BOOLEAN,
ADD COLUMN     "require_recent_newborn" BOOLEAN;
