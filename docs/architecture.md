# Architecture Note - Luma Loan Data Verification Copilot

This note covers system design, data model, API design, validation engine, AI feature, audit trail, and trade-offs. Detailed specs are in `.context/architecture-flow.md` and `.context/api-contract.md`.

## 1. System Design

Luma is a Turborepo monorepo with two apps and shared types.

*   **apps/web** - Vite SPA. React 19, React Router 7, Tailwind CSS, shadcn/ui, TanStack Query. Client-side role routing via `ProtectedRoute`. Dev server on `3000`, proxies `/api` to `4000`. Auth client `better-auth/react` with `withCredentials`.
*   **apps/api** - Express 5, TypeScript, Zod. REST API on `4000`. Owns CSV ingestion, validation, AI, and Better Auth server. CORS `credentials: true`, origin `FRONTEND_URL`.
*   **Database** - PostgreSQL 16 via Prisma 7. Single database for app and auth tables. Migrations in `apps/api/prisma`.
*   **Auth** - Better Auth on Express with Prisma adapter and `admin` plugin. Cookie session (`HttpOnly`, `SameSite=Lax`). Frontend session via `authClient.useSession()`. Backend via `requireAuth` which calls `auth.api.getSession`. Roles stored as string on `User.role`, narrowed by `normalizeRole`.
*   **File ingestion** - Multer to `os.tmpdir()/luma-uploads` (500 MB limit, `.csv` only), then `fs.createReadStream().pipe(csv-parser)` in `ingestion.service.ts`. Async, returns `202 Accepted` immediately. Frontend polls `GET /api/uploads/:batchId`.

Separation keeps long-lived streaming on Express and avoids SSR timeouts on the frontend.

## 2. Data Model

Six tables. Prisma `cuid` ids. No soft deletes.

*   **User** - `id`, `email` unique, `role` (`data_operator`, `reviewer`, `data_consumer`), `name`, `emailVerified`, relations to `UploadBatch` and `AuditLog`.
*   **UploadBatch** - `id`, `fileName`, `filePath`, `fileType` (`loan_tape`, `servicer_update`, `document_manifest`), `recordCount`, `processedCount` (resume cursor), `failedCount`, `status` (`pending`, `processing`, `done`, `failed`), `metadata` (pipeline stage, failedRows capped at 1000, error), `uploadedById`, `createdAt`. Indexed on `uploadedById` and `status`.
*   **Loan** - `id`, `loanId` nullable, `borrowerId` nullable, `sourceBatchId`, `sourceRowNumber`, 21 business fields nullable (`loanType`, `originationDate`, `maturityDate`, `originalPrincipal`/`currentBalance`/`interestRate` as Decimal, `termMonths`, `borrowerState`, etc.), `validationStatus` (`pending`, `passed`, `failed`, `review`), `importStatus` (`imported`, `failed`). Unique `@@unique([sourceBatchId, sourceRowNumber])` for idempotent `createMany(skipDuplicates:true)` replay. Indexes on `sourceBatchId`, `validationStatus`, `loanId`.
*   **Exception** - `id`, `loanId` FK, `exceptionType` (9 values), `severity` (`critical`, `high`, `medium`, `low`), `field` nullable, `message`, `status` (`open`, `approved`, `rejected`, `corrected`), `reviewerId`, `reviewedAt`, `reviewerNote`, `correctedValue`, `aiRecommendation` JSON, `metadata` JSON, `createdAt`. Indexes on `loanId`, `status`, `severity`, `exceptionType`.
*   **VerifiedLoan** - `id`, `loanId` unique FK, `canonicalData` JSON snapshot, `sourceBatchRef`, `validationResult` (`passed`, `passed_with_review`), `reviewerDecision`, `aiRecommendationUsed` boolean, `verifiedById`, `verifiedAt`, `recordHash` SHA256. Indexed on `verifiedById`.
*   **AuditLog** - `id`, `eventType` (11 values), `actorId` nullable, `loanId`, `batchId`, `exceptionId`, `verifiedLoanId` nullable FKs, `metadata` JSON, `createdAt`. Indexes on `loanId`, `actorId`, `eventType`, `createdAt`. Append-only, no updates or deletes.

## 3. API Design

Base URL `/api`. JSON except uploads (`multipart/form-data`). Auth by cookie. Errors are `{ code, error, fields? }` where `fields` appears on 400 Zod failures.

All bodies and queries are validated with Zod schemas shared in `packages/types`.

| Group | Method and Path | Role |
|---|---|---|
| Auth | `POST /api/auth/sign-in/email`, `POST /api/auth/sign-out`, `GET /api/auth/get-session` | public or auth |
| Uploads | `POST /api/uploads`, `GET /api/uploads`, `GET /api/uploads/:batchId`, `GET /api/uploads/:batchId/summary` | `data_operator` |
| Loans | `GET /api/loans`, `GET /api/loans/:id` | `data_operator`, `reviewer`, `data_consumer` (consumer sees verified only) |
| Loans | `PATCH /api/loans/:id/fields`, `POST /api/loans/:id/verify` | `reviewer` |
| Exceptions | `GET /api/exceptions`, `GET /api/exceptions/:id`, `POST /api/exceptions/:id/comment`, `POST /api/exceptions/:id/approve`, `POST /api/exceptions/:id/reject`, `POST /api/exceptions/:id/decision` | `reviewer` |
| AI | `POST /api/ai/explain`, `POST /api/ai/classify-severity`, `POST /api/ai/draft-note` | `reviewer` |
| AI | `POST /api/ai/summarize-batch`, `POST /api/ai/suggest-rule` | `reviewer` and `data_operator` |
| Verified | `GET /api/verified-loans`, `GET /api/verified-loans/:id` | `reviewer`, `data_consumer` |
| Verified | `GET /api/verified-loans/export` | `data_consumer` |
| Audit | `GET /api/audit/:loanId` | all authenticated |
| Summary | `GET /api/summary` | all authenticated |
| Health | `GET /api/health`, `GET /api/me` | public or auth |

`requireRole` returns `401` when unauthenticated and `403` when role mismatches. Pagination uses `page`/`limit` (max 100). `GET /api/loans` and `GET /api/exceptions` support `search` on `loanId`/`borrowerId`.

## 4. Validation Engine

Implemented in `apps/api/src/services/validation.service.ts`. Triggered automatically after ingestion finishes.

Per-loan rules (each returns an `Exception` with type, severity, field, message):

*   `requiredFields` -> `missing_field` (null `loanId`, `borrowerId`, `documentStatus`).
*   `dateValidity` and `maturityOrder` -> `date_error` (unparseable dates, `maturity < origination`).
*   `principalNotNegative` and `balanceNotExceed` -> `balance_error` (negative, `current > original`).
*   `interestRateInRange` (0 to 40) -> `rate_out_of_range`.
*   `paymentConsistency` and `closedLoanWithBalance` -> `status_inconsistency`.
*   `staleRecord` (`lastUpdatedAt` >90 days) -> `stale_record`.
*   `invalidState` (US state code) -> `invalid_state`.

Batch-scoped rules (DB queries, not memory):

*   `duplicateLoanId`, `duplicateBorrowerCombo` (borrower + principal + origination), `repeatedBorrowerSpike` (threshold from `validation_rules.json`) -> `duplicate` with `critical` severity.

Execution is chunked: loans are loaded in 5000-row pages, exceptions bulk-created per chunk in a transaction, `Loan.validationStatus` set to `failed` when at least one exception exists else `passed`. Summary uses `groupBy` on `exceptionType` and `severity` and a distinct count `loan.count({ exceptions: { some: {} } })` to avoid counting exception rows. Failed row detection during ingestion (missing ids, header mismatch, bad dates) goes to `UploadBatch.metadata.failedRows` and does not create loans.

## 5. AI Feature

Provider is Google Gemini via Vercel AI SDK. Model `gemini-3.5-flash-lite` (configurable by `AI_MODEL_ID`). `MOCK_AI=true` bypasses the network with deterministic mocks.

Endpoints:

*   `explain` - loads exception, loan fields, and `metadata.conflictBatchId` context, builds a prompt, calls `generateObject` with a Zod schema (`confidence`, `fieldsToChange`, `reasoning`, `suggestion`), stores result on `Exception.aiRecommendation`, writes `AuditLog` `AI_RECOMMENDATION`.
*   `classify-severity` - re-evaluates severity with `generateObject`.
*   `draft-note` - drafts a reviewer note with `generateObject`.
*   `summarize-batch` - aggregates `totalImported`, `passed`, `failed`, `exceptionsByType`/`BySeverity` for a batch, calls `generateText`, returns plain prose. Used on operator batch detail and reviewer dashboard.
*   `suggest-rule` - takes natural language, calls `generateObject` with rule schema, returns `name`, `description`, `condition`, `severity`, `exceptionType`.

All AI routes are rate-limited (20 per minute per user) and return `200` with `{ code: "AI_UNAVAILABLE", error, summary: null }` when unconfigured, never 500. Frontend shows model, prompt summary, timestamp, and confidence. The decision (`accepted`, `edited`, `rejected`) is recorded separately via `POST /api/exceptions/:id/decision` and never silently mutates the loan.

## 6. Audit Trail

`AuditLog` is append-only. Every state change writes in the same `prisma.$transaction` as the mutation.

Event types: `FILE_UPLOADED`, `LOAN_IMPORTED` (one per chunk, not per row), `VALIDATION_RUN`, `EXCEPTION_CREATED`, `AI_RECOMMENDATION`, `REVIEWER_COMMENT`, `FIELD_EDITED` (with `oldValue`/`newValue`/`reason`), `LOAN_APPROVED`, `LOAN_REJECTED`, `VERIFIED_RECORD_CREATED`, `RECORD_EXPORTED`.

*   `POST /api/loans/:id/verify` checks that all exceptions are closed, builds `canonicalData` from current loan fields, computes `recordHash = SHA256(JSON.stringify(canonicalData))`, creates `VerifiedLoan`, and logs `VERIFIED_RECORD_CREATED`.
*   `GET /api/verified-loans/export` streams CSV with `Content-Disposition` and logs `RECORD_EXPORTED`.
*   `GET /api/audit/:loanId` returns chronological timeline with actor name and metadata.

Verification metadata (hash, `verifiedBy`, `timestamp`, `sourceBatchRef`, `validationResult`) is exposed on `GET /api/verified-loans/:id` for consumers.

## 7. Trade-offs

| Decision | Chosen | Alternative | Rationale |
|---|---|---|---|
| CSV storage | Local disk `os.tmpdir()/luma-uploads` | DB blob or S3 | Avoids DB bloat on 1M rows and S3 setup for hackathon. Disk allows streaming reads. |
| Job processing | Streaming `createReadStream` + DB cursor `processedCount` | BullMQ + Redis | No extra service. `@@unique([sourceBatchId, sourceRowNumber])` plus `skipDuplicates` makes replay idempotent after crash. |
| Duplicate detection | DB `groupBy` and batched `IN` queries in 5k windows | In-memory hash map | Keeps memory flat for large batches. |
| AI output | `generateObject` with Zod | Free-form string | Parsable, storable, auditable, and validated. |
| AI provider | Gemini free tier | OpenAI | No cost for structured output. Mock fallback removes key dependency for CI. |
| Session | Cookie `HttpOnly` | JWT header | Better Auth default, no refresh logic, single origin via Vite proxy. |
| Monorepo | Turborepo | Nx | Lighter config, shared `packages/types` without extra overhead. |
| Hashing | SHA256 of `canonicalData` JSON | Merkle tree | Sufficient tamper evidence at this scale. |
| Transactions | `prisma.$transaction` | Manual SQL | Automatic rollback and clear error handling. |
| Frontend data | TanStack Query with `withCredentials` | RSC fetch | Simple polling for `processing` batches (1.5s), optimistic updates for field edits. |
