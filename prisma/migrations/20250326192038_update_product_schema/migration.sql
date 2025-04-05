/*
  Warnings:

  - You are about to drop the column `lastUpdated` on the `CartItem` table. All the data in the column will be lost.
  - You are about to drop the column `lastUpdated` on the `Product` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "CartItem" DROP COLUMN "lastUpdated",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "lastUpdated",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
