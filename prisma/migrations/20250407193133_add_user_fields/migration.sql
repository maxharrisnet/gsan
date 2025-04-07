-- AlterTable
ALTER TABLE "User" ADD COLUMN     "companyName" TEXT,
ADD COLUMN     "kits" TEXT[] DEFAULT ARRAY[]::TEXT[];
