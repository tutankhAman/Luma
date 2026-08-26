-- Partial expression index backing the servicer-conflict cleanup + lookup
-- (Exception.metadata->>'conflictBatchId'). Cannot be expressed in the Prisma
-- schema (expression index on a JSONB column), so it ships as raw SQL.
CREATE INDEX "Exception_conflicting_source_conflictBatchId_idx"
  ON "Exception" (("metadata"->>'conflictBatchId'))
  WHERE "exceptionType" = 'conflicting_source';
