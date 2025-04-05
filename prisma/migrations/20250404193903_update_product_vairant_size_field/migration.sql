/*
  Warnings:

  - The `size` column on the `ProductVariant` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "ProductVariant" DROP COLUMN "size",
ADD COLUMN     "size" TEXT[];
