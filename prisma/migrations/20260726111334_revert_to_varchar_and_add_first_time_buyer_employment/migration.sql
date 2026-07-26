/*
  Warnings:

  - The `household_head_status` column on the `user_condition_profiles` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `marital_status` column on the `user_condition_profiles` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "user_condition_profiles" ADD COLUMN     "employment_status" VARCHAR(30),
ADD COLUMN     "is_first_time_buyer" BOOLEAN,
DROP COLUMN "household_head_status",
ADD COLUMN     "household_head_status" VARCHAR(30) NOT NULL DEFAULT 'UNKNOWN',
DROP COLUMN "marital_status",
ADD COLUMN     "marital_status" VARCHAR(30) NOT NULL DEFAULT 'UNKNOWN';

-- DropEnum
DROP TYPE "household_head_status_type";

-- DropEnum
DROP TYPE "marital_status_type";
