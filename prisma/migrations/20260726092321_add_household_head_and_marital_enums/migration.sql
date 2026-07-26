/*
  Warnings:

  - The `household_head_status` column on the `user_condition_profiles` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `marital_status` column on the `user_condition_profiles` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "marital_status_type" AS ENUM ('UNKNOWN', 'SINGLE', 'MARRIED', 'PLANNING_MARRIAGE');

-- CreateEnum
CREATE TYPE "household_head_status_type" AS ENUM ('UNKNOWN', 'HEAD', 'PROSPECTIVE_HEAD', 'MEMBER');

-- AlterTable
ALTER TABLE "loan_products" ADD COLUMN     "require_household_head" BOOLEAN;

-- AlterTable
ALTER TABLE "user_condition_profiles" DROP COLUMN "household_head_status",
ADD COLUMN     "household_head_status" "household_head_status_type" NOT NULL DEFAULT 'UNKNOWN',
DROP COLUMN "marital_status",
ADD COLUMN     "marital_status" "marital_status_type" NOT NULL DEFAULT 'UNKNOWN';
