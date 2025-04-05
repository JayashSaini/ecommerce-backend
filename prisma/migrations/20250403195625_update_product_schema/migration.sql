/*
  Warnings:

  - You are about to drop the column `image` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `image` on the `ProductVariant` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Product" DROP COLUMN "image",
ADD COLUMN     "images" JSONB[];

-- AlterTable
ALTER TABLE "ProductVariant" DROP COLUMN "image",
ADD COLUMN     "images" JSONB[];
