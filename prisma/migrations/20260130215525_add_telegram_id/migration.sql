/*
  Warnings:

  - A unique constraint covering the columns `[telegramId]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "TransactionType" ADD VALUE 'ADVANCE';

-- AlterTable
ALTER TABLE "money_sources" ADD COLUMN     "isAdvance" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "telegramId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_telegramId_key" ON "users"("telegramId");
