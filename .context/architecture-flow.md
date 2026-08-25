# Luma — Loan Data Verification Copilot
## Architecture & Flow

---

## 1. System Overview

Luma is a **monorepo** with a clear separation between:
- **Frontend** – Next.js 14 App Router (client-facing UI, role-based views)
- **Backend** – Express + TypeScript REST API (business logic, validation, AI)
- **Database** – PostgreSQL via Prisma ORM
- **Auth** – Better Auth (Prisma adapter, RBAC plugin, shared session cookies)

```
┌─────────────────────────────────────────────────────────────┐
│                        Monorepo                             │
│                                                             │
│  ┌──────────────────┐        ┌───────────────────────────┐  │
│  │   apps/web        │        │   apps/api                │  │
│  │   Next.js 14      │◄──────►│   Express + TypeScript    │  │
│  │   TypeScript      │  HTTP  │   Zod · Prisma · AI SDK   │  │
│  │   Tailwind CSS    │  REST  │                           │  │
│  │   shadcn/ui       │        │   Better Auth (server)    │  │
│  │   TanStack Query  │        │                           │  │
│  │   Better Auth     │        └───────────┬───────────────┘  │
│  │   (client)        │                    │ Prisma Client     │
│  └──────────────────┘                    ▼                   │
│                                ┌──────────────────┐          │
│                                │   PostgreSQL      │          │
│                                │   (single DB)     │          │
│                                └──────────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Monorepo Structure

```
luma/
├── apps/
│   ├── web/                    # Next.js 14 frontend
│   │   ├── app/                # App Router pages
│   │   │   ├── (auth)/         # Login, register pages
│   │   │   ├── (operator)/     # Data Operator views
│   │   │   ├── (reviewer)/     # Reviewer views
│   │   │   └── (consumer)/     # Data Consumer views
│   │   ├── components/         # shadcn/ui + custom components
│   │   ├── lib/
│   │   │   ├── auth-client.ts  # Better Auth client
│   │   │   └── api.ts          # Typed API client (fetch wrapper)
│   │   └── hooks/              # TanStack Query hooks
│   │
│   └── api/                    # Express backend
│       ├── src/
│       │   ├── routes/         # Express routers (per domain)
│       │   ├── services/       # Business logic layer
│       │   ├── validators/     # Zod schemas
│       │   ├── middleware/     # Auth, role guards, error handler
│       │   ├── lib/
│       │   │   ├── auth.ts     # Better Auth server instance
│       │   │   ├── prisma.ts   # Prisma client singleton
│       │   │   ├── ai.ts       # AI SDK setup (Google Gemini)
│       │   │   └── hash.ts     # SHA-256 record hashing
│       │   ├── jobs/           # Async processing (CSV parsing)
│       │   └── index.ts        # Express app entry
│       └── prisma/
│           ├── schema.prisma
│           └── migrations/
│
├── packages/
│   └── types/                  # Shared TypeScript types (zod schemas)
│
├── package.json                # Turborepo workspaces
└── turbo.json
```

---

## 3. Tech Stack Decisions & Rationale

| Layer | Choice | Why |
|---|---|---|
| **Monorepo** | Turborepo | Zero-config caching, shared `packages/types` |
| **Frontend** | Next.js 14 App Router | SSR for auth-protected pages, route groups for roles |
| **State / Fetching** | TanStack Query v5 | Optimistic updates, background refetch for live queues |
| **Auth** | Better Auth + RBAC plugin | Prisma adapter, built-in roles, works across Express + Next.js |
| **Backend** | Express + TypeScript | Lightweight, explicit, well-understood in FinTech contexts |
| **Validation** | Zod | Runtime + compile-time safety, reuse in `packages/types` |
| **ORM** | Prisma | Type-safe queries, migrations, works natively with Better Auth |
| **Database** | PostgreSQL | ACID compliance critical for financial audit trails |
| **AI** | Google Gemini via Vercel AI SDK | `generateObject` for structured output, streaming support |
| **File Uploads** | Multer (Express) → stored in DB as metadata | No S3 needed for hackathon; raw CSV stored as text blob |
| **Hashing** | Node.js `crypto` SHA-256 | Deterministic fingerprint for verified loan records |

---

## 4. Authentication & Authorization

### Better Auth Setup

Better Auth runs **on the Express server** (`apps/api`). The Next.js frontend uses the Better Auth **client** to communicate with the auth endpoints via `/api/auth/*`.

```
Next.js client
  └─ betterAuthClient → fetch POST /api/auth/sign-in
                              ↓
                        Express app
                          └─ auth.handler (Better Auth server)
                              └─ Prisma → PostgreSQL (user/session tables)
```

**Session strategy:** Cookie-based sessions (HTTP-only, SameSite=Lax). The Express API reads session cookies on every protected request via Better Auth's `auth.api.getSession()`.

### Roles (RBAC Plugin)

| Role | Access |
|---|---|
| `data_operator` | Upload CSVs, view import history, see validation summary |
| `reviewer` | Exception queue, AI panel, approve/reject/edit loans |
| `data_consumer` | Verified records only, audit trail viewer, export |

Role is stored in the `user` table and checked via middleware:

```typescript
// middleware/requireRole.ts
export const requireRole = (...roles: Role[]) =>
  async (req, res, next) => {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session || !roles.includes(session.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    req.user = session.user;
    next();
  };
```

---

## 5. Database Schema

### Core Tables

```prisma
// Better Auth managed tables (auto-generated)
model User {
  id            String   @id @default(cuid())
  name          String
  email         String   @unique
  role          String   @default("data_consumer")
  emailVerified Boolean  @default(false)
  image         String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  sessions      Session[]
  accounts      Account[]
  uploadBatches UploadBatch[]
  auditLogs     AuditLog[]
}

// App tables
model UploadBatch {
  id            String   @id @default(cuid())
  fileName      String
  filePath      String   // path on local disk for streaming
  fileType      String   // loan_tape | servicer_update | document_manifest
  recordCount   Int      // total estimated rows (if known) or final row count
  processedCount Int     @default(0) // cursor: how many rows inserted so far
  failedCount   Int      @default(0)
  status        String   @default("pending") // pending | processing | done | failed
  uploadedById  String
  uploadedBy    User     @relation(fields: [uploadedById], references: [id])
  createdAt     DateTime @default(now())
  loans         Loan[]
  auditLogs     AuditLog[]
}

model Loan {
  id                String   @id @default(cuid())
  loanId            String?  // raw CSV value (may be null/duplicate)
  borrowerId        String?
  sourceBatchId     String
  sourceBatch       UploadBatch @relation(fields: [sourceBatchId], references: [id])
  sourceRowNumber   Int      // which CSV row (for lineage)
  // Loan fields (all nullable — normalization may fail)
  loanType          String?
  originationDate   DateTime?
  maturityDate      DateTime?
  originalPrincipal Decimal?
  currentBalance    Decimal?
  interestRate      Decimal?
  termMonths        Int?
  borrowerState     String?
  loanPurpose       String?
  creditGrade       String?
  employmentLength  String?
  incomeBand        String?
  paymentStatus     String?
  daysPastDue       Int?
  servicerName      String?
  lastPaymentDate   DateTime?
  lastUpdatedAt     DateTime?
  documentStatus    String?
  sourceSystem      String?
  // Status
  validationStatus  String   @default("pending") // pending | passed | failed | review
  importStatus      String   @default("imported") // imported | failed
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  exceptions        Exception[]
  verifiedRecord    VerifiedLoan?
  auditLogs         AuditLog[]

  @@unique([sourceBatchId, sourceRowNumber]) // idempotent resume after mid-stream crash
}

model Exception {
  id              String   @id @default(cuid())
  loanId          String
  loan            Loan     @relation(fields: [loanId], references: [id])
  exceptionType   String   // missing_field | duplicate | date_error | balance_error |
                           // rate_out_of_range | status_inconsistency | stale_record |
                           // invalid_state | conflicting_source
  severity        String   // critical | high | medium | low
  field           String?  // which field triggered it
  message         String
  status          String   @default("open") // open | approved | rejected | corrected
  reviewerId      String?
  reviewedAt      DateTime?
  reviewerNote    String?
  aiRecommendation Json?   // { suggestion, reasoning, confidence, fieldsToChange, model, promptSummary, timestamp }
  correctedValue  String?  // final value set by reviewer
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  auditLogs       AuditLog[]
}

model VerifiedLoan {
  id                   String   @id @default(cuid())
  loanId               String   @unique
  loan                 Loan     @relation(fields: [loanId], references: [id])
  canonicalData        Json     // full verified loan fields snapshot
  sourceBatchRef       String   // batch file name for traceability
  validationResult     String   // passed | passed_with_review
  reviewerDecision     String?  // approved | approved_with_edits
  aiRecommendationUsed Boolean  @default(false)
  verifiedById         String
  verifiedAt           DateTime @default(now())
  recordHash           String   // SHA-256(JSON.stringify(canonicalData))
  auditLogs            AuditLog[]
}

model AuditLog {
  id              String   @id @default(cuid())
  eventType       String   // FILE_UPLOADED | LOAN_IMPORTED | VALIDATION_RUN |
                           // EXCEPTION_CREATED | AI_RECOMMENDATION | REVIEWER_COMMENT |
                           // FIELD_EDITED | LOAN_APPROVED | LOAN_REJECTED |
                           // VERIFIED_RECORD_CREATED | RECORD_EXPORTED
  actorId         String?
  actor           User?         @relation(fields: [actorId], references: [id])
  loanId          String?
  loan            Loan?         @relation(fields: [loanId], references: [id])
  batchId         String?
  batch           UploadBatch?  @relation(fields: [batchId], references: [id])
  exceptionId     String?
  exception       Exception?    @relation(fields: [exceptionId], references: [id])
  verifiedLoanId  String?
  verifiedLoan    VerifiedLoan? @relation(fields: [verifiedLoanId], references: [id])
  metadata        Json?         // event-specific payload
  createdAt       DateTime      @default(now())

  @@index([loanId])
  @@index([actorId])
  @@index([eventType])
  @@index([createdAt])
}
```

---

## 6. Application Modules & Flow

### Module A — Data Ingestion

```
[Operator] → Upload CSV via drag-and-drop
     ↓
POST /api/uploads  (multipart/form-data)
  └─ Multer saves file to permanent disk (/uploads)
  └─ Creates UploadBatch record
  └─ Returns 202 Accepted instantly
  └─ Dispatches background job (async loop)
     ↓
processStreamAndNormalize(batch):
  ├─ fs.createReadStream().pipe(csv())
  ├─ Accumulate chunks of 5,000 rows (defensive normalize — a bad row never throws)
  ├─ On chunk full: Pause stream, `Loan.createMany(chunk, { skipDuplicates: true })`
  │   └─ ONE chunk-level `AuditLog: LOAN_IMPORTED` (count + row range in metadata, not per-row)
  ├─ Update `UploadBatch.processedCount += 5000` (Fault Tolerance Cursor)
  ├─ Resume stream
  ├─ Crash-safe replay: `@@unique([sourceBatchId, sourceRowNumber])` + `skipDuplicates` → no double-inserts
  ├─ Pipeline error → batch.status = "failed", persist reason to metadata, `stream.destroy()`
  └─ Collect failed rows (capped at 1,000 to prevent metadata bloat)
     ↓
UploadBatch.status → "done"
     ↓
Frontend polls GET /api/uploads/:batchId until done
Shows: totalRows, importedCount, failedCount, failed row details
```

**Servicer update file:** parsed the same way, conflicts detected by matching `loanId` and stored as `conflicting_source` exceptions.

### Module B — Validation Engine

```
[Auto-triggered after ingestion]
     ↓
ValidationEngine.run(batchId):
  ├─ Load validation_rules.json (configurable thresholds)
  ├─ Per loan, run rule chain:
  │   ├─ requiredFields       → missing_field
  │   ├─ dateValidity         → date_error
  │   ├─ maturityOrder        → date_error
  │   ├─ principalPositive    → balance_error
  │   ├─ balanceNotExceed     → balance_error
  │   ├─ interestRateRange    → rate_out_of_range
  │   ├─ paymentConsistency   → status_inconsistency
  │   ├─ documentPresence     → missing_field
  │   └─ staleRecord          → stale_record
  ├─ Cross-loan: duplicateDetection → duplicate
  └─ Update Loan.validationStatus
     ↓
AuditLog: VALIDATION_RUN (batch-level), EXCEPTION_CREATED (per exception)
     ↓
GET /api/uploads/:batchId/summary → { passed, failed, exceptions by type }
```

### Module C — Exception Queue

```
[Reviewer] → Exception Queue view
GET /api/exceptions?status=open&severity=critical&type=duplicate&search=L001&page=1
     ↓
Paginated list with loan data
     ↓
[Reviewer] → Open loan detail
GET /api/loans/:id  →  { loan, exceptions[], auditLog[] }
     ↓
Actions:
  ├─ POST /api/exceptions/:id/comment     → REVIEWER_COMMENT
  ├─ PATCH /api/loans/:id/fields          → FIELD_EDITED (editable fields only)
  ├─ POST /api/exceptions/:id/approve     → LOAN_APPROVED
  └─ POST /api/exceptions/:id/reject      → LOAN_REJECTED
```

### Module D — AI Review Assistant

```
[Reviewer] → "Explain this exception" button
POST /api/ai/explain  { exceptionId }
     ↓
AI Service:
  1. Load exception + loan + conflicts from DB
  2. Build structured prompt:
     "You are a loan data quality analyst. Loan {loanId} has exception:
      {exceptionType}: {message}. Field: {field}. Current value: {value}.
      Servicer update shows: {conflictValue}. Suggest the correct value
      and explain your reasoning. Return JSON."
  3. Gemini generateObject(schema: ExplainResponseSchema)
  4. Store in Exception.aiRecommendation
     ↓
AuditLog: AI_RECOMMENDATION { model, promptSummary, timestamp, confidence }
     ↓
Frontend: AI panel shows recommendation (read-only)
Reviewer: Accept / Edit / Reject
POST /api/ai/decision { exceptionId, accepted, editedValue? }
     ↓
AuditLog: REVIEWER_COMMENT { aiDecision: "accepted" | "edited" | "rejected" }
```

**Additional AI endpoints:**
- `POST /api/ai/summarize-batch` — batch exception summary
- `POST /api/ai/classify-severity` — re-classify exception severity
- `POST /api/ai/suggest-rule` — generate validation rule from natural language

### Module E — Verified Loan Record

```
[Reviewer] → All exceptions closed → "Verify Loan" button
POST /api/loans/:id/verify
     ↓
VerificationService.verify(loanId, userId):
  1. Assert: all exceptions status ∈ {approved, rejected, corrected}
  2. Build canonicalData from current Loan fields
  3. recordHash = SHA256(JSON.stringify(canonicalData, null, 0))
  4. Create VerifiedLoan
     ↓
AuditLog: VERIFIED_RECORD_CREATED { hash, verifiedBy, timestamp }
     ↓
[Consumer] GET /api/verified-loans/:id
Returns: { verifiedLoan, canonicalData, auditTrail }
```

### Module F — Audit Trail

- Append-only `AuditLog` table — no updates or deletes ever
- Written **synchronously** within the same DB transaction as the triggering action
- Queried via `GET /api/audit/:loanId` (paginated, chronological)
- Consumer dashboard shows full lifecycle: upload → import → validate → exception → review → AI → verify

---

## 7. Frontend Route Groups

```
app/
├── (auth)/
│   └── login/page.tsx
│
├── (operator)/
│   ├── layout.tsx               ← Server Component: redirect if not data_operator
│   ├── dashboard/page.tsx       ← Upload history, batch stats, quick upload
│   └── uploads/
│       └── [batchId]/page.tsx   ← Batch detail: import results, validation summary
│
├── (reviewer)/
│   ├── layout.tsx               ← Server Component: redirect if not reviewer
│   ├── dashboard/page.tsx       ← Queue stats, pending count
│   ├── exceptions/page.tsx      ← Filterable exception queue table
│   └── loans/
│       └── [id]/page.tsx        ← Loan detail + AI panel + action buttons
│
└── (consumer)/
    ├── layout.tsx               ← Server Component: redirect if not data_consumer
    ├── dashboard/page.tsx       ← Verified records grid, quality score
    ├── loans/
    │   └── [id]/page.tsx        ← Verified loan + full audit timeline
    └── export/page.tsx          ← Download verified CSV
```

---

## 8. Key Data Flow Diagram

```
CSV Upload
    │
    ▼
UploadBatch ────────────────────────► AuditLog: FILE_UPLOADED
    │
    ▼ (async normalize)
Loan[] ─────────────────────────────► AuditLog: LOAN_IMPORTED (one event per chunk)
    │
    ▼ (validation engine)
Exception[] ────────────────────────► AuditLog: EXCEPTION_CREATED × M
    │                    │
    │                    ▼
    │              AI Review ─────► AuditLog: AI_RECOMMENDATION
    │                    │
    ▼                    ▼
Reviewer Decision ──────────────────► AuditLog: LOAN_APPROVED | FIELD_EDITED
    │
    ▼ (all exceptions closed)
VerifiedLoan ───────────────────────► AuditLog: VERIFIED_RECORD_CREATED
    │
    ▼
GET /api/verified-loans   (Consumer)
    │
    ▼
Export CSV ─────────────────────────► AuditLog: RECORD_EXPORTED
```

---

## 9. Error Handling

| Layer | Strategy |
|---|---|
| API inputs | Zod `validateBody` / `validateQuery` middleware → 400 with field errors |
| Business errors | Custom `AppError(message, statusCode)` → global error handler |
| CSV parse errors | Per-row error collection, stored in batch metadata |
| AI failures | Graceful fallback → return null recommendation, log failure |
| DB errors | Prisma error codes mapped to human-readable messages |
| Frontend | TanStack Query `onError` → shadcn/ui Sonner toasts |

---

## 10. Local Development

```bash
# Prerequisites: Node 20+, pnpm, Docker

# 1. Clone and install
pnpm install

# 2. Start Postgres
docker compose up -d postgres

# 3. Migrate and seed
pnpm --filter api prisma migrate dev
pnpm --filter api run seed

# 4. Dev servers (runs web:3000 + api:4000 in parallel)
pnpm dev
```

### Seed users

| Email | Password | Role |
|---|---|---|
| operator@luma.dev | password | data_operator |
| reviewer@luma.dev | password | reviewer |
| consumer@luma.dev | password | data_consumer |

---

## 11. Trade-offs

| Decision | Chosen | Alternative | Reason |
|---|---|---|---|
| CSV storage | Local disk (`/uploads`) | DB Text Blob / S3 | DB bloats fast on 1M rows; S3 adds config overhead; local disk allows direct streaming. |
| Job processing | Async Stream + DB Cursor | BullMQ + Redis | Avoids Redis dependency. DB `processedCount` allows resuming; `@@unique([sourceBatchId, sourceRowNumber])` + `skipDuplicates` make replays idempotent. |
| AI provider | Gemini (free tier) | OpenAI GPT-4o | Cost-free, structured output via `generateObject` |
| AI output | `generateObject` (Zod schema) | Free-form string | Predictable, parseable, storable, auditable |
| Session | Cookie (HTTP-only) | JWT in header | More secure; Better Auth default; no token refresh logic |
| Monorepo | Turborepo | Nx | Lighter config, better pnpm workspace support |
| Hashing | SHA-256 of JSON | Merkle tree | Sufficient tamper-evidence at this scale |
| DB transactions | Prisma `$transaction` | Manual BEGIN/COMMIT | Cleaner code, automatic rollback on error |
