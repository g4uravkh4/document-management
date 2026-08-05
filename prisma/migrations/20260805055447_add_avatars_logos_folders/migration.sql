-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "logoKey" TEXT;

-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "folderId" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "avatarKey" TEXT;

-- CreateTable
CREATE TABLE "folders" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "fiscalYearId" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "folders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "folders_clientId_fiscalYearId_idx" ON "folders"("clientId", "fiscalYearId");

-- CreateIndex
CREATE UNIQUE INDEX "folders_clientId_fiscalYearId_parentId_name_key" ON "folders"("clientId", "fiscalYearId", "parentId", "name");

-- CreateIndex
CREATE INDEX "documents_folderId_idx" ON "documents"("folderId");

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "folders" ADD CONSTRAINT "folders_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "folders" ADD CONSTRAINT "folders_fiscalYearId_fkey" FOREIGN KEY ("fiscalYearId") REFERENCES "fiscal_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "folders" ADD CONSTRAINT "folders_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
