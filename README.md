# Luma - Loan Data Verification Copilot
<img width="2560" height="1600" alt="image" src="https://github.com/user-attachments/assets/c8abcf93-d0de-4aab-8781-87764be0cc7a" />

Loan Data Verification Copilot for Intain Campus FinTech Challenge 2026. Ingests messy loan CSVs, validates records, manages exceptions with AI assistance, and produces traceable verified records with audit trail and hash-based integrity.

Built from the problem statement Modules A to H. This document covers setup, environment variables, run commands, credentials, and pointers to required deliverables.

## Stack

| Layer | Choice | Reason |
|---|---|---|
| Monorepo | Turborepo + Bun workspaces | Shared `packages/types` |
| Frontend | Vite, React 19, React Router 7, Tailwind CSS, shadcn/ui, TanStack Query | Role-based SPA with client routing |
| Backend | Node.js, Express 5, TypeScript, Zod, Better Auth | REST API with cookie sessions |
| Database | PostgreSQL 16, Prisma 7 | ACID audit trail, migrations |
| AI | Google Gemini via Vercel AI SDK, `MOCK_AI=true` fallback | Structured `generateObject`/`generateText` |
| Auth | Better Auth (Prisma adapter, RBAC) | Cookie-based, `requireAuth`/`requireRole` |
| File handling | Multer + csv-parser, streaming by 5000-row chunks | Constant memory, resumable |

## Prerequisites

- Bun 1.4.0 (`bun --version`)
- Node >=24 (`node --version`)
- Docker and Docker Compose
- Git
- OpenSSL (for generating `BETTER_AUTH_SECRET`)

## Environment Variables

Copy `apps/api/.env.example` to `apps/api/.env`:

```
cp apps/api/.env.example apps/api/.env
```

`apps/api/.env.example`:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/luma"
BETTER_AUTH_SECRET="replace-with-openssl-rand-base64-32"
BETTER_AUTH_URL="http://localhost:4000"
FRONTEND_URL="http://localhost:3000"
VITE_API_URL="http://localhost:4000"
PORT=4000
GEMINI_API_KEY=""
MOCK_AI="true"
AI_MODEL_ID="gemini-3.5-flash-lite"
```

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection string |
| `BETTER_AUTH_SECRET` | yes | At least 32 characters. Generate: `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | yes | Backend URL for Better Auth |
| `FRONTEND_URL` | yes | Frontend URL for CORS and trusted origins |
| `VITE_API_URL` | no | Frontend API base, defaults to `http://localhost:4000` |
| `PORT` | no | API port, defaults to `4000` |
| `GEMINI_API_KEY` | no | Gemini API key. Leave empty with `MOCK_AI=true` for local development |
| `MOCK_AI` | no | `true` uses deterministic mock responses, `false` calls Gemini |
| `AI_MODEL_ID` | no | Model id, defaults to `gemini-3.5-flash-lite` |

`.env` is gitignored. `.env.example` is the template.

## Quick Start (Local)

```sh
# 1. Clone and install
git clone https://github.com/tutankhAman/Luma.git
cd Luma
bun install

# 2. Environment
cp apps/api/.env.example apps/api/.env
# edit BETTER_AUTH_SECRET: openssl rand -base64 32

# 3. Database
docker compose up -d
# verify: docker compose ps
# health: pg_isready -h localhost -p 5432 -U postgres

# 4. Prisma
bun --filter api exec prisma generate
bun --filter api exec prisma migrate dev
# alternative deploy: bunx prisma migrate deploy --schema apps/api/prisma/schema.prisma

# 5. Seed users (password: password)
bun --filter api run seed

# 6. Run
bun run dev
# api  -> http://localhost:4000  health: GET /api/health
# web  -> http://localhost:3000  proxies /api to :4000
```

Single service:

```sh
bun --filter api run dev
bun --filter web run dev
```

Seeded and synthetic datasets: `loan_tape.csv` (137 rows, seed 42) and `loan_tape_6k.csv` (6000 rows) at repository root cover all 15 intentional data issues. Upload via Operator role. Optional stretch: `fannie_mae`/`freddie_mac` pipe upload (public Single-Family, 108 cols, tolerant ≥40-col gate, contiguous-run fold → one Loan per loanId, same validation lineage; see `docs/architecture.md` §8 and `problem.md` §4).

## Test Credentials

All passwords are `password`:

| Role | Email | Access |
|---|---|---|
| Data Operator | `operator@luma.dev` | Upload CSVs, view import history, validation summary, failed import rows |
| Reviewer | `reviewer@luma.dev` | Exception queue, AI review, approve/reject/edit, verify loans |
| Data Consumer | `consumer@luma.dev` | Verified records, audit trail, CSV export, data quality score |

`users.json` equivalent is seeded in `apps/api/src/seed.ts`.

## Roles and Modules

| Module | Implementation |
|---|---|
| A: Data Ingestion | `POST /api/uploads` (multipart, 500MB limit, .csv only; fileType `loan_tape`/`servicer_update`/`document_manifest`/`fannie_mae`/`freddie_mac`), streaming `csv-parser` 5000-row chunks, `skipDuplicates`, `UploadBatch.processedCount` resume, `FailedRows` capped at 1000 in `metadata` — public-data is pipe `\|` headerless 108-col with tolerant gate and incremental fold |
| B: Validation Engine | 10 per-loan rules + 3 batch-scoped duplicate checks (`validation.service.ts`), `stale_record` >90 days, `invalid_state`, `conflicting_source` from servicer updates, writes `Exception` and `AuditLog` |
| C: Exception Queue | `GET /api/exceptions` (filter by status/severity/type/search/batchId, paginated), `GET /api/exceptions/:id`, `POST /comment`, `POST /approve`, `POST /reject`, `PATCH /api/loans/:id/fields` |
| D: AI Review Assistant | `POST /api/ai/explain`, `classify-severity`, `draft-note`, `summarize-batch`, `suggest-rule` (Gemini + mock fallback, rate-limited 20/min), all prompts/models logged |
| E: Verified Loan Record | `POST /api/loans/:id/verify` after all exceptions closed, `canonicalData` snapshot, `recordHash` SHA256, `VerifiedLoan` table |
| F: Audit Trail | Append-only `AuditLog` in same transaction as mutation, 11 event types, `GET /api/audit/:loanId` |
| G: Dashboards | Operator (upload, import history, validation summary, corrections needed = failed imports), Reviewer (queue stats, AI panel), Consumer (quality score, verified records) |
| H: Verified Records API | `GET /loans`, `GET /loans/:id`, `GET /exceptions`, `GET /verified-loans`, `GET /verified-loans/:id`, `GET /audit/:loanId`, `GET /summary` |

Roles enforced by `requireAuth` + `requireRole` middleware. `GET /api/exceptions` is reviewer-only; operator uses `GET /api/uploads` and `GET /api/loans?validationStatus=failed`. `POST /api/ai/summarize-batch` allows `reviewer` and `data_operator`; `suggest-rule` allows both; other AI routes are reviewer-only.

## API Reference

Base URL: `http://localhost:4000` (dev). Auth: cookie session. Error format: `{ code, error, fields? }`.

| Method | Path | Role |
|---|---|---|
| POST | `/api/auth/sign-in/email` | public |
| POST | `/api/auth/sign-out` | auth |
| GET | `/api/auth/get-session` | auth |
| POST | `/api/uploads` | `data_operator` |
| GET | `/api/uploads` | `data_operator` (own batches), `reviewer`/`data_consumer` (all batches) |
| GET | `/api/uploads/:batchId` | `data_operator` |
| GET | `/api/uploads/:batchId/summary` | `data_operator` |
| GET | `/api/loans` | `data_operator`, `reviewer`, `data_consumer` (verified only) |
| GET | `/api/loans/:id` | `data_operator`, `reviewer`, `data_consumer` (verified only) |
| PATCH | `/api/loans/:id/fields` | `reviewer` |
| POST | `/api/loans/:id/verify` | `reviewer` |
| GET | `/api/exceptions` | `reviewer` |
| GET | `/api/exceptions/:id` | `reviewer` |
| POST | `/api/exceptions/:id/comment` | `reviewer` |
| POST | `/api/exceptions/:id/approve` | `reviewer` |
| POST | `/api/exceptions/:id/reject` | `reviewer` |
| POST | `/api/exceptions/:id/decision` | `reviewer` |
| POST | `/api/ai/explain` | `reviewer` |
| POST | `/api/ai/summarize-batch` | `reviewer`, `data_operator` |
| POST | `/api/ai/classify-severity` | `reviewer` |
| POST | `/api/ai/suggest-rule` | `reviewer`, `data_operator` |
| POST | `/api/ai/draft-note` | `reviewer` |
| GET | `/api/verified-loans` | `reviewer`, `data_consumer` |
| GET | `/api/verified-loans/:id` | `reviewer`, `data_consumer` |
| GET | `/api/verified-loans/export` | `data_consumer` |
| GET | `/api/audit/:loanId` | all roles |
| GET | `/api/summary` | all roles |
| GET | `/api/health` | public |
| GET | `/api/me` | auth |

Full contract: `.context/api-contract.md`.

## Validation

Per-loan rules: `missing_field`, `date_error` (invalid format, `maturity < origination`), `balance_error` (negative principal, `current > original`), `rate_out_of_range` (0-40%), `status_inconsistency` (payment status vs `daysPastDue`, closed with balance), `stale_record` (>90 days `last_updated_at`), `invalid_state`. Batch-scoped: `duplicate` (loanId, borrower+amount+origination, repeated borrower spike). Duplicate detection uses DB-level `groupBy` and batched `IN` queries (5k windows), not in-memory arrays.

Upload `loan_tape.csv` yields 137 rows, 8 failedRows (missing ids, bad date), 129 imported, 60 loans with exceptions (28 critical, 15 high, 15 medium, 5 low). `servicer_update.csv` produces `conflicting_source`. `document_manifest.csv` updates `documentStatus` and creates `missing_field` for incomplete docs. Public-data pipe sample (757 raw pipe rows → 8 folded loans) uses `unknown` documentStatus and 2009 `MMYYYY` dates that surface as `stale_record` through the same engine.

## AI Controls

- Recommendations rendered in separate `AISuggestionCard` with model, prompt summary, timestamp, confidence.
- Human must `Accept`/`Edit`/`Reject` via `POST /api/exceptions/:id/decision` before any data change.
- Every AI output and decision writes `AuditLog` `AI_RECOMMENDATION`.
- Fallback: `MOCK_AI=true` returns deterministic mock; when `GEMINI_API_KEY` missing and not mocked, API returns `200` with `{ summary: null, code: "AI_UNAVAILABLE" }`, not 500.

## Audit Trail and Hashing

Events: `FILE_UPLOADED`, `LOAN_IMPORTED` (per chunk), `VALIDATION_RUN`, `EXCEPTION_CREATED`, `AI_RECOMMENDATION`, `REVIEWER_COMMENT`, `FIELD_EDITED`, `LOAN_APPROVED`, `LOAN_REJECTED`, `VERIFIED_RECORD_CREATED`, `RECORD_EXPORTED`. All writes are inside the same `prisma.$transaction` as the trigger. `recordHash` is `SHA256(JSON.stringify(canonicalData))`. `GET /api/audit/:loanId` returns chronological timeline.

## Demo Flow (5 Minutes)

1. Log in as Data Operator `operator@luma.dev`.
2. Upload `loan_tape.csv` (`/operator/upload`, fileType `loan_tape`). Poll `GET /api/uploads/:batchId` until `done`.
3. Open batch detail `/operator/uploads/:batchId`: check import summary, failed rows, validation summary, generate AI batch summary.
4. Open `/operator/loans` filtered by `validationStatus=failed` (read-only inspection).
5. Log in as Reviewer `reviewer@luma.dev`.
6. Open `/reviewer/exceptions`, filter by severity, open a `balance_error` loan.
7. Click Explain, review recommendation (model, reasoning, confidence), Accept/Edit/Reject.
8. Add comment, approve or reject exceptions.
9. Verify loan (`POST /api/loans/:id/verify`) once all exceptions closed.
10. Log in as Data Consumer `consumer@luma.dev`.
11. View `/consumer/dashboard` verified records and quality score, open a verified loan.
12. Inspect audit trail, show hash and lineage.
13. `GET /api/verified-loans` and `GET /api/verified-loans/export` (CSV).
14. Open `/ai-log` in-app.

## Project Structure

```
Luma/
├── apps/
│   ├── api/                # Express API, Prisma schema and migrations, services
│   │   ├── prisma/schema.prisma
│   │   ├── src/routes/     # uploads, loans, exceptions, verified-loans, audit, summary, ai
│   │   ├── src/services/   # ingestion.service.ts, validation.service.ts, ai.service.ts, etc.
│   │   └── src/middleware/ # require-auth, require-role, rate-limit
│   └── web/                # Vite React SPA, role layouts, dashboards
│       ├── src/app/pages/  # operator, reviewer, consumer, auth
│       ├── src/components/ # ui, batch, loan, audit
│       └── src/hooks/      # TanStack Query hooks
├── packages/
│   ├── types/              # Shared Zod schemas and types
│   └── typescript-config/
├── docker-compose.yml      # postgres:16-alpine
├── turbo.json
├── biome.jsonc             # Ultracite (Biome)
├── lefthook.yml            # pre-commit: lint + typecheck + build
├── docs/                   # architecture.md, AI_DEVELOPMENT_LOG.md
└── .context/               # problem.md, api-contract.md, architecture-flow.md, ui-and-flow.md
```

## Scripts

| Command | Description |
|---|---|
| `bun install` | Install dependencies |
| `bun run dev` | Run api (4000) + web (3000) via Turbo |
| `bun --filter api run dev` | API only |
| `bun --filter web run dev` | Web only |
| `bun run build` | `turbo run build` |
| `bun run check-types` | `turbo run check-types` |
| `bun x ultracite check` | Lint |
| `bun x ultracite fix` | Fix lint |
| `bun --filter api run seed` | Seed users |
| `bun --filter api test` | Unit tests |
| `bun --filter api test:integration` | Integration tests (requires DB) |
| `docker compose up -d` | Start Postgres |
| `docker compose down` | Stop Postgres |

CI (`.github/workflows/ci.yml`) runs `lint`, `typecheck`, `build` on push/PR to `main`. Branch protection requires all three checks green and branch up-to-date before merge. Same checks run locally on pre-commit via lefthook (`prisma generate` + `check-types` + `build`).

## Architecture Note

System design, data model, API design, validation engine, AI feature, audit trail, and trade-offs are documented in `docs/architecture.md` (1-2 pages). Detailed specs are in `.context/architecture-flow.md`, `.context/api-contract.md`, and `.context/implementation-plan.md`. UI flow in `.context/ui-and-flow.md`.

## AI Development Log

Required deliverable is tracked in `docs/AI_DEVELOPMENT_LOG.md` and rendered in-app at `/ai-log`. It lists tools, prompts (8 representative), human review process, estimated AI-generated code percentage, 5 rejected-output examples, and lessons learned. See also `AGENTS.md` for code standards.

## Sample Outputs

Synthetic datasets at repository root: `loan_tape.csv` (137 rows) and `loan_tape_6k.csv` (6000 rows). After verification, export verified records via `GET /api/verified-loans/export` (CSV) and audit trail via `GET /api/audit/:loanId` (JSON). Example responses are in `.context/api-contract.md` Appendix.

## Test Data

`users.json` equivalent: seeded users above. `validation_rules.json` logic is inline in `validation.service.ts` with thresholds (interest 0-40, stale 90 days). `expected_exception_sample` corresponds to `loan_tape.csv` expectations noted in Validation section.

## Deployment

Local runnable setup is primary. For hosted deployment, set `BETTER_AUTH_URL` and `FRONTEND_URL` to production URLs, configure `DATABASE_URL` to managed Postgres, and deploy `apps/api` (Node 24) and `apps/web` (static build from `dist/`). Current CI builds both packages; no secrets are committed.

## License

Private for challenge submission.
