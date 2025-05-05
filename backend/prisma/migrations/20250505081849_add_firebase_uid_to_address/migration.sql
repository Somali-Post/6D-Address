/*
  Warnings:

  - A unique constraint covering the columns `[firebaseUid]` on the table `Address` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Address" ADD COLUMN     "firebaseUid" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Address_firebaseUid_key" ON "Address"("firebaseUid");
