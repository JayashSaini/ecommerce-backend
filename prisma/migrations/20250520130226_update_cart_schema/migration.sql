/*
  Warnings:

  - You are about to drop the column `customerId` on the `Cart` table. All the data in the column will be lost.
  - You are about to drop the column `user` on the `Cart` table. All the data in the column will be lost.
  - Added the required column `userId` to the `Cart` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Cart" DROP COLUMN "customerId",
DROP COLUMN "user",
ADD COLUMN     "userId" INTEGER NOT NULL;
