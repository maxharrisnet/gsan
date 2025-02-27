/*
  Warnings:

  - You are about to drop the column `updatedAt` on the `ModemGPS` table. All the data in the column will be lost.
  - Made the column `latitude` on table `ModemGPS` required. This step will fail if there are existing NULL values in that column.
  - Made the column `longitude` on table `ModemGPS` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "ModemGPS" DROP COLUMN "updatedAt",
ALTER COLUMN "latitude" SET NOT NULL,
ALTER COLUMN "longitude" SET NOT NULL;

-- CreateIndex
CREATE INDEX "ModemGPS_timestamp_idx" ON "ModemGPS"("timestamp");
