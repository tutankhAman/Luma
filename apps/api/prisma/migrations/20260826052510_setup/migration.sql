/*
  Warnings:

  - You are about to alter the column `originalPrincipal` on the `Loan` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(15,2)`.
  - You are about to alter the column `currentBalance` on the `Loan` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(15,2)`.
  - You are about to alter the column `interestRate` on the `Loan` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(5,4)`.
  - Added the required column `updatedAt` to the `UploadBatch` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Loan" ALTER COLUMN "originalPrincipal" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "currentBalance" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "interestRate" SET DATA TYPE DECIMAL(5,4);

-- AlterTable
ALTER TABLE "UploadBatch" ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "Exception_loanId_idx" ON "Exception"("loanId");

-- CreateIndex
CREATE INDEX "Exception_status_idx" ON "Exception"("status");

-- CreateIndex
CREATE INDEX "Exception_severity_idx" ON "Exception"("severity");

-- CreateIndex
CREATE INDEX "Exception_exceptionType_idx" ON "Exception"("exceptionType");

-- CreateIndex
CREATE INDEX "Exception_createdAt_idx" ON "Exception"("createdAt");

-- CreateIndex
CREATE INDEX "Loan_loanId_idx" ON "Loan"("loanId");

-- CreateIndex
CREATE INDEX "Loan_borrowerId_idx" ON "Loan"("borrowerId");

-- CreateIndex
CREATE INDEX "Loan_validationStatus_idx" ON "Loan"("validationStatus");

-- CreateIndex
CREATE INDEX "Loan_sourceBatchId_idx" ON "Loan"("sourceBatchId");

-- CreateIndex
CREATE INDEX "Loan_createdAt_idx" ON "Loan"("createdAt");

-- CreateIndex
CREATE INDEX "UploadBatch_status_idx" ON "UploadBatch"("status");

-- CreateIndex
CREATE INDEX "UploadBatch_createdAt_idx" ON "UploadBatch"("createdAt");

-- CreateIndex
CREATE INDEX "UploadBatch_uploadedById_idx" ON "UploadBatch"("uploadedById");

-- CreateIndex
CREATE INDEX "VerifiedLoan_validationResult_idx" ON "VerifiedLoan"("validationResult");

-- CreateIndex
CREATE INDEX "VerifiedLoan_verifiedById_idx" ON "VerifiedLoan"("verifiedById");

-- CreateIndex
CREATE INDEX "VerifiedLoan_verifiedAt_idx" ON "VerifiedLoan"("verifiedAt");

-- AddForeignKey
ALTER TABLE "VerifiedLoan" ADD CONSTRAINT "VerifiedLoan_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
