# Luma — 48-Hour Implementation Plan
### Person A = Frontend (Vite SPA — React 19, react-router 7, Tailwind, shadcn/ui, TanStack Query, remixicon)
### Person B = Backend (Express 5, Prisma, Validation, AI, Auth, Seed)

---

> [!IMPORTANT]
> **Golden Rule:** B always delivers a working API endpoint *before* A needs to consume it. A builds with hardcoded mocks in the gap. Every phase ends with a sync checkpoint — both people must be unblocked before moving on.

---

## Timeline Overview

```
Hour  0 ──── Phase 0: Monorepo Setup & Contracts         (Both, 0–2h)
Hour  2 ──── Phase 1: Foundation — Auth + Skeleton       (Both, 2–10h)
Hour 10 ──── Phase 2: Ingestion + Validation Engine      (Both, 10–22h)
Hour 22 ──── Phase 3: Exception Queue + AI Review        (Both, 22–33h)
Hour 33 ──── Phase 4: Verification + Consumer Views      (Both, 33–41h)
Hour 41 ──── Phase 5: Integration, Polish & Edge Cases   (Both, 41–45h)
Hour 45 ──── Phase 6: Demo Prep, README, Submission      (Both, 45–48h)
```

---

## Phase 0 — Monorepo Setup & Shared Contracts
### Hours 0 – 2 | Both Working Together

> [!NOTE]
> This phase is done **together** (or one person drives while the other reviews). The goal is a green, running skeleton so both can immediately branch off in Phase 1.

### B — Infrastructure Lead

**Hour 0–1:**
- [x] Init Turborepo: `bunx create-turbo@latest luma --package-manager bun` — done `8e23744`, pnpm→bun, eslint→biome+lefthook
- [x] Create `apps/api/` — bare Express + TypeScript: — done `e764b97/ea254ab/3d84486` (`src/index.ts` CORS→auth `/*splat`→express.json, `lib/prisma` singleton, `lib/auth` prisma-adapter+admin, middleware require-auth/require-role with try/catch, `types/express.d.ts`)
  ```
  apps/api/
  ├── src/
  │   ├── index.ts        ← Express app entry, CORS, Better Auth mount
  │   ├── lib/
  │   │   ├── prisma.ts   ← Prisma singleton
  │   │   └── auth.ts     ← Better Auth server (email+password, Prisma adapter)
  │   └── middleware/
  │       ├── requireAuth.ts
  │       └── requireRole.ts
  ├── prisma/
  │   └── schema.prisma   ← Full schema (all 6 models + Better Auth models incl. `issuer`)
  ├── .env
  └── package.json
  ```
- [x] Write full `schema.prisma` from architecture doc (all tables: User, UploadBatch, Loan, Exception, VerifiedLoan, AuditLog) — done `a14dce4` incl. review fixes: `UploadBatch.metadata`+indexes, `Loan` Decimal(15,2/5,4)+5 indexes, `Exception` 5 indexes, `VerifiedLoan.verifiedBy` FK+3 indexes
- [x] `docker compose up -d postgres` — healthy on :5432 (`luma-postgres`)
- [x] `bunx prisma migrate dev --name init` + [x] `bunx prisma generate` — migration `20260825190106_init` applied, client generated
- [x] Verify: `GET http://localhost:4000/api/auth/ok` → `{ ok: true }` — 200 verified; also `/api/health` 200; sign-up/sign-in/get-session cookie flow verified

**Hour 1–2:**
- [x] Create `packages/types/` shared package — done: 6 modules + `common.ts` enums, zod 4.4.3, `src/index.ts` barrel with `biome-ignore`, `tsconfig.json` emits `dist/` declarations, `turbo build` 74 vite modules, `check-types` 3/3 pass, both apps `workspace:*` wired (`api/src/index.ts` `HealthResponse`, `web/src/main.tsx` `WiringCheck`)
  ```typescript
  // packages/types/src/index.ts
  export * from './loan'
  export * from './exception'
  export * from './upload'
  export * from './audit'
  export * from './verified-loan'
  export * from './api-responses'
  ```
  - Write all Zod schemas matching the API contract response shapes — done: `loan.ts` (list/detail/patch/verify), `exception.ts` (9 types, AI 4 endpoints), `upload.ts` (batch/summary), `audit.ts` (trail/summary), `verified-loan.ts` (canonicalData), `api-responses.ts` (pagination/error/health) — all with `z.infer` types, zod safeParse verified (valid batchSummary passes, bad loan fails)
  - Export inferred TypeScript types alongside each schema — done: `export type X = z.infer<typeof XSchema>` per schema
- [x] Write base seed script skeleton (`apps/api/src/seed.ts`): 3 users (operator, reviewer, consumer) — done: `auth.api.signUpEmail` + prisma role update, idempotent `findUnique` before create, `raceUser` fallback, `seed done: 4 user(s)` (3 required + 1 pre-existing `verify@luma.dev`), second run `exists ...` verified, `bun run seed` script added to `apps/api/package.json`, `@repo/types` + `zod` added, `biome.jsonc` overrides for `noAwaitInLoops`/`noExcessiveCognitiveComplexity` on seed
- [x] Verify Prisma types compile: `bunx tsc --noEmit` — done: `turbo run check-types` 3/3 (`@repo/types`, `api`, `web`) pass, `ultracite check` 41 files pass, `turbo run build` 3/3 (`types` emits `dist/*.d.ts`, `api` tsc, `web` vite 335k gzip 105k) pass, `bun install` 489 packages

### A — Frontend Lead

**Hour 0–1:**
- [x] Create `apps/web/` — Vite SPA — done: `index.html`+`vite.config.ts` (proxy `/api → :4000`), `src/main.tsx` (Router+QueryClient), `src/app/layout.tsx`+`globals.css`+`routes.tsx`+`vite-env.d.ts`
  ```bash
  bun create vite web --template react-ts          # scaffolded
  bunx shadcn@latest init   # style base-nova, CSS: src/app/globals.css — done fee9fc8
  bun add @tanstack/react-query better-auth axios remixicon react-router-dom  # done
  bun add -d @tanstack/react-query-devtools @vitejs/plugin-react
  ```
  - Configure `vite.config.ts` dev proxy `/api → http://localhost:4000` (same-origin cookies, no extra trustedOrigins)
  - Import in `src/main.tsx`: `import 'remixicon/fonts/remixicon.css'`
  - Use `<i className="ri-...-line"></i>` for all icons — never emojis
- [x] Scaffold router structure in `src/app/routes.tsx` (react-router) + placeholder route stubs — done: 8 placeholder routes (auth/operator/reviewer/consumer), `/ → /login` redirect; `lib/auth-client.ts` + `lib/api.ts` + `providers` + `guards` now done in Hour 1–2 below
  ```
  src/app/
    routes.tsx            ← createBrowserRouter tree
    layout.tsx            ← shell + <Outlet />
    pages/                ← TODO: per-role pages (stubs exist as Placeholder)
      (auth)/login.tsx
      (operator)/dashboard.tsx  + uploads/[batchId].tsx
      (reviewer)/dashboard.tsx  + exceptions.tsx  + loans/[id].tsx
      (consumer)/dashboard.tsx  + loans/[id].tsx  + export.tsx
  ```
- [x] Create `src/lib/auth-client.ts` (createAuthClient { baseURL: http://localhost:4000 } — single auth surface on Express) — done: `apps/web/lib/auth-client.ts` (`better-auth/react` `createAuthClient({ baseURL: "http://localhost:4000", fetchOptions: { credentials: "include" } })`, exports `authClient` + `Session`/`User` types) + duplicate `src/lib/auth-client.ts` for spec; `check-types` pass, `api` uses same baseURL
- [x] Create `src/lib/api.ts` (axios withCredentials:true, baseURL /api via proxy) — done: `apps/web/lib/api.ts` (`axios.create({ baseURL: "/api", withCredentials: true })`, interceptor extracts `error.response.data.error`, duplicate `src/lib/api.ts`; Vite proxy `/api → :4000` verified)

**Hour 1–2:**
- [x] Install shadcn/ui components needed across all phases — done: `bunx shadcn@latest add` 19 files now in `components/ui` (button, card, input, label, table, badge, dialog, sheet, dropdown-menu, tabs, separator, form, select, textarea, toast, sonner, skeleton, progress, alert); `sonner.tsx` fixed for Vite (removed `next-themes`, hardcode `theme="light"`), `form.tsx` minimal (no RHF dep), `toast.tsx`/`sonner` both present, `bun run build` 1873 modules gzip 115k (was 335k)
  ```bash
  bunx shadcn@latest add button card input label table badge
  bunx shadcn@latest add dialog sheet dropdown-menu tabs separator
  bunx shadcn@latest add form select textarea toast sonner
  bunx shadcn@latest add skeleton progress alert
  ```
- [x] Create `src/app/providers.tsx` — QueryClientProvider + Sonner toaster — done: `src/app/providers.tsx` creates `QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 } } })`, wraps `QueryClientProvider` + `Toaster richColors closeButton` + `ReactQueryDevtools`
- [x] Wire in `src/main.tsx` (`<QueryClientProvider><RouterProvider/></QueryClientProvider>`) — done: `src/main.tsx` now `import { Providers } from "./app/providers"` + `createBrowserRouter(routes)` + `<StrictMode><Providers><RouterProvider router={router}/></Providers></StrictMode>`; removed inline `QueryClient`, `ultracite` + `check-types` pass
- [x] Create `src/hooks/use-session.ts` — wraps `authClient.useSession()` — done: `src/hooks/use-session.ts` (+ duplicate `hooks/use-session.ts` for alias `@/hooks`) returns `{ data, user, session, isPending, isRefetching, error, refetch }` with explicit `UseSessionReturn` interface to avoid `TS2883` better-auth portable type issue; `authClient.useSession()` hits `GET /api/auth/get-session` withCredentials
- [x] Write `src/app/guards/ProtectedRoute.tsx` — client guard that checks `useSession()` + `user.role`, redirects to `/login` or renders `Forbidden` (no RSC, authenticated fetch hits `GET /api/auth/get-session` withCredentials) — done: `src/app/guards/ProtectedRoute.tsx` (+ duplicate `app/guards/ProtectedRoute.tsx` for alias) handles `isPending`→`Skeleton`, `!user`→`<Navigate to="/login" replace/>`, `role/roles` mismatch→`<Forbidden>` (`ri-lock-line`, `Card`, `Button` `onClick→/login`); supports `role?: Role|Role[]` + `roles`, `normalizeRoles`, `biome.jsonc` overrides for `noJsxPropsBind`/`useFilenamingConvention` + `components/ui` overrides

### Phase 0 Checkpoint
- [x] `bun dev` starts both apps without errors — verified: `turbo run dev` → `web VITE v8.2.2 ready in 255ms http://localhost:3000/` + `api listening on http://localhost:4000` (8s timeout ok, no errors)
- [x] `GET :4000/api/auth/ok` returns 200 — verified: `curl :4000/api/health {"status":"ok"}` + `curl :4000/api/auth/ok {"ok":true}` + 3 sign-ins ok + bad-pw 401 + get-session ok with cookie
- [x] Vite loads at `:3000` (dev proxy `/api → :4000` working) — verified: `vite --port 3000` ready + `vite.config.ts` proxy `/api → http://localhost:4000`, `turbo run build` vite 335k gzip 105k, `index.html`+`routes.tsx` 8 placeholder routes, `/ → /login` redirect
- [x] `packages/types` compiles, both apps reference it — verified: `turbo run build` 3/3 (`types` emits `dist/*.d.ts`, `web` 1873 modules), `turbo run check-types` 3/3, `ultracite check` 69 files, `api/src/index.ts` imports `HealthResponse`, `web` has `lib/auth-client.ts` + `lib/api.ts` + `src/app/providers.tsx` + `hooks/use-session.ts` + `src/app/guards/ProtectedRoute.tsx` all wiring to `@repo/types` `Role`, `bun install` + `bun test` 8 pass, zod safeParse `batchSummary valid:true`

---

## Phase 1 — Foundation: Auth + App Shell
### Hours 2 – 10 | Parallel

---

### B — Hours 2–10

#### Hour 2–4: Complete Auth Server + Seed
- [x] Finalize `apps/api/src/lib/auth.ts` — done (pre-existing `ea254ab`, verified on Prisma 7): prismaAdapter(postgresql), emailAndPassword, trustedOrigins FRONTEND_URL, admin plugin defaultRole data_consumer/adminRoles [admin]
- [x] Mount in `index.ts` **before** `express.json()` — done: `app.all('/api/auth/*splat', toNodeHandler(auth))`; refactored into `src/app.ts createApp()` (`d467706`) so tests can boot the app without listening
- [x] Configure CORS with `credentials: true` — done: origin FRONTEND_URL, verified `access-control-allow-credentials: true`
- [x] Write `requireAuth` middleware — done + hardened (`cc02f61`): 401 `{code:'UNAUTHENTICATED'}` when no session OR role unusable; role narrowed string→`Role` via `lib/roles.ts normalizeRole` (default fallback data_consumer)
- [x] Write `requireRole(...roles)` middleware — done type-safe: matches via `roles.find(r => r === userRole)`, no casts; 401 unauth / 403 `{code:'FORBIDDEN'}` wrong role
- [x] Write complete seed script — done (pre-existing `43967c2`/`e5e340c`): idempotent signUpEmail + role ensure + post-seed verification
- [x] Run seed: `bun run seed` — verified dev DB 4 users; integration test also runs seed against isolated `luma_test` DB and asserts all 3 roles
- [x] Write `GET /api/me` — done `d467706`: behind requireAuth, returns `MeResponse { id, name, email, role }` validated by `meResponseSchema` in @repo/types
- [x] Tests (added beyond plan per review discipline): `cc02f61` typed req.user; unit tests 11 pass (`test` = middleware, stubbed getSession, no DB); integration 6 pass (`test:integration`, own process + `luma_test` DB after migrate deploy; covers health/me 401/sign-up→role→sign-in→me contract/bad-creds 401/CORS/seed roles)

**→ Deliverable to A (Hour 4):** ✅ Auth endpoints working, `/api/me` returns `{ id, name, email, role }`

#### Hour 4–7: Upload Routes + CSV Ingestion Service (Million-Row Scale)
- [x] Install: `bun add multer csv-parser` (using csv-parser for streams instead of papaparse) — done `45e17bd` (multer 2.2.0, csv-parser 3.2.1, @types/multer 2.2.0)
- [x] Create `routes/uploads.ts` — done `47d80f5`/`b65705d`: `POST /api/uploads` disk storage `os.tmpdir()/luma-uploads` `limits:{fileSize:500*1024*1024}`, `.csv` only (415), `fileType` validated via `fileTypeSchema` (400), `UploadBatch` create `202 {batchId,fileName,fileType,status:"processing",message}`, fire-and-forget `processStreamAndNormalize` without await; `GET /api/uploads` paginated via `listUploadsQuerySchema` (page/limit/status) + `uploadedById` filter; `GET /api/uploads/:batchId` detail + `failedRows` from `metadata.failedRows` (capped); `GET /api/uploads/:batchId/summary` real `Loan.count` + `Exception.groupBy` by type/severity via `batchSummarySchema` with real `passedValidation`/`failedValidation`/`totalImported`; wired `app.use("/api/uploads", uploadsRouter)` after `express.json()`; multer `LIMIT_FILE_SIZE` → `413 PAYLOAD_TOO_LARGE` handler
- [x] Create `services/ingestion.service.ts` — done `45e17bd`/`82bb7f1`: `processStreamAndNormalize(filePath,batchId)` uses `fs.createReadStream().pipe(csv({mapHeaders:BOM_REGEX}))`, chunks 5000, `pause`/`resume` around `prisma.loan.createMany({skipDuplicates:true})` idempotent via `@@unique([sourceBatchId,sourceRowNumber])`, chunk-level `LOAN_IMPORTED` audit, per-row `normalizeRow` defensive (BOM, bad dates → failedRows, empty rows skipped), `failedRows` capped 1000 in `metadata` + `INGESTION_COMPLETED` log, error path `markFailed` + `stream.destroy()` no zombie `processing`; helpers `flushChunk`/`finalizeSuccess`/`markFailed`/`pauseStreams` extracted to keep `processRows` complexity <20; pure helpers `parseDate`/`parseDecimal`/`parseIntSafe`/`normalizeRow` exported
- [x] Write Zod validators for upload route inputs — done: `createUploadBodySchema` + `listUploadsQuerySchema` in `@repo/types` reused, `fileTypeSchema` + `batchStatusSchema` validated; `batchSummarySchema` used for summary response

**→ Deliverable to A (Hour 7):** ✅ `POST /api/uploads` returns 202 instantly, `GET /api/uploads/:batchId` polls every 2s and shows progress → `done` with real `recordCount`/`failedCount`/`failedRows`; `GET /api/uploads/:batchId/summary` already returns real validation counts via `Exception.groupBy`

#### Hour 7–10: Validation Engine (Core)
- [x] Create `services/validation.service.ts`:
  - Rule interface: `{ id, name, check(loan): ValidationResult | null }`
  - Implement all 10 per-loan rules (together covering every §7 intentional data issue):
    - `requiredFields` → `missing_field`
    - `dateValidity` → `date_error`
    - `maturityAfterOrigination` → `date_error`
    - `principalNotNegative` → `balance_error`
    - `balanceNotExceedPrincipal` → `balance_error`
    - `interestRateInRange` → `rate_out_of_range`
    - `paymentStatusConsistency` → `status_inconsistency` (status vs days_past_due)
    - `closedLoanWithBalance` → `status_inconsistency` (payment_status = closed but current_balance > 0)
    - `documentStatusPresent` → `missing_field`
    - `staleRecordCheck` → `stale_record`
    - `invalidStateCode` → `invalid_state` (borrower_state not a valid US state code)
  - Cross-loan, batch-scoped rules (DB-level queries or hashed indices — not memory arrays):
    - `duplicateLoanId` → `duplicate`
    - `duplicateBorrowerCombo` → `duplicate` (same borrower_id + original_principal + origination_date combination)
    - `repeatedBorrowerSpike` → `duplicate` (same borrower_id count above threshold from `validation_rules.json`)
  - Run validation in batches (e.g. `skip: 0, take: 5000` loops) to keep memory flat
  - Bulk-create `Exception` records in `prisma.$transaction` per chunk
  - Update `Loan.validationStatus`
  - Bulk-write `AuditLog`: `VALIDATION_RUN`, `EXCEPTION_CREATED`
- [x] Load `validation_rules.json` thresholds (interest rate range, stale days, etc.)
- [x] Auto-trigger validation after ingestion completes in job
- [x] Expose `GET /api/uploads/:batchId/summary` with real exception counts

**→ Deliverable to A (Hour 10):** Summary endpoint returns real grouped exception counts

---

### A — Hours 2–10

#### Hour 2–4: Auth UI + Route Guards (Vite + react-router + ProtectedRoute)
- [x] Build `src/app/pages/(auth)/login.tsx`:
  - Email + password form (shadcn/ui `Form`, `Input`, `Button`)
  - Calls `authClient.signIn.email({ email, password })` (better-auth client → `:4000/api/auth/*`, via Vite `/api` proxy)
  - On success → `navigate` based on `user.role`:
    - `data_operator` → `/operator/dashboard`
    - `reviewer` → `/reviewer/dashboard`
    - `data_consumer` → `/consumer/dashboard`
  - Error state (invalid credentials toast via Sonner)
  - Loading spinner on submit
- [x] Build `src/app/guards/ProtectedRoute.tsx`:
  - Reads `authClient.useSession()` (reactive `data` + `isPending`) — `withCredentials` already set on the fetch client
  - While `isPending` → skeleton
  - No session → `<Navigate to="/login" />`
  - Wrong `user.role` → `Forbidden` page (not white screen) — the API will return 403 anyway
- [x] Build `src/app/layouts/OperatorLayout.tsx`, `ReviewerLayout.tsx`, `ConsumerLayout.tsx` — each wraps `<ProtectedRoute role="...">` + `<Sidebar />` + `<Outlet />`
- [x] Build shared `src/components/nav/sidebar.tsx` — role-aware nav links, user avatar, sign-out button (`authClient.signOut()` → navigate `/login`)
- [x] Root `"/"` in `routes.tsx` — while-pending → skeleton, then redirect by role (or to `/login`)

**Uses:** `GET /api/auth/get-session`, `GET /api/me`

#### Hour 4–7: Operator Dashboard + Upload UI
- [x] Build `app/(operator)/dashboard/page.tsx`:
  - Upload zone: `components/upload/csv-dropzone.tsx`
    - Drag-and-drop area (or `react-dropzone`)
    - File type selector: loan_tape / servicer_update / document_manifest
    - File size validation client-side (<500MB, matching backend multer limit; .csv only)
    - Calls `POST /api/uploads` — shows progress bar during upload
    - On `202` — navigates to batch detail page
  - Upload history table: `components/upload/batch-table.tsx`
    - Columns: File Name, Type, Records, Failed, Status, Uploaded At
    - Status badge: pending/processing/done/failed with colors
    - Row click → `/operator/uploads/:batchId`
- [x] TanStack Query hooks: `hooks/use-uploads.ts`
  - `useUploads()` — `GET /api/uploads` with refetch
  - `useUploadBatch(batchId)` — `GET /api/uploads/:batchId` — polls every 2s while `status === 'processing'`
  - `useCreateUpload()` — mutation for `POST /api/uploads`

#### Hour 7–10: Batch Detail Page + Validation Summary
- [x] Build `app/(operator)/uploads/[batchId]/page.tsx`:
  - **Import Summary card:** Total rows | Imported | Failed
  - **Failed Rows table:** Row Number, Raw Data snippet, Error Reason
  - **Validation Summary card** (from `GET /api/uploads/:batchId/summary`):
    - Total passed | Total failed | Exception count
    - Exception breakdown by type (progress bars)
    - Exception breakdown by severity (critical/high/medium/low badges with counts)
  - **Processing skeleton** when batch status is `processing` (auto-refreshes)
- [x] `hooks/use-batch-summary.ts` — `GET /api/uploads/:batchId/summary`
- [x] Create `components/ui/stat-card.tsx` — reusable metric card
- [x] Create `components/ui/severity-badge.tsx` — colored badge for critical/high/medium/low

### Phase 1 Checkpoint (Hour 10)
- [x] Operator can log in → see dashboard → upload CSV → see processing → see batch summary with real data
- [x] Reviewer and Consumer can log in → see their (empty) dashboards
- [x] Auth redirects work correctly for all 3 roles
- [x] B confirms: Upload + Ingestion + Validation Engine endpoints all return real data

---

## Phase 2 — Exception Queue + Loan Detail
### Hours 10 – 22 | Parallel

---

### B — Hours 10–18

#### Hour 10–13: Exception CRUD Routes
- [x] Create `routes/exceptions.ts`:
  - `GET /api/exceptions` — paginated, filterable (status, severity, type, search, batchId)
  - `GET /api/exceptions/:id` — single exception with loan data joined
  - `POST /api/exceptions/:id/comment` — add reviewer note
  - `POST /api/exceptions/:id/approve` — set status=approved, reviewerId, reviewedAt
  - `POST /api/exceptions/:id/reject` — set status=rejected
  - `POST /api/exceptions/:id/decision` — record AI recommendation decision
- [x] Zod schemas for all exception route bodies
- [x] Write `AuditLog` entries for: `REVIEWER_COMMENT`, `LOAN_APPROVED`, `LOAN_REJECTED`
- [x] Role guard: all exception write routes require `reviewer`
- [x] Create `routes/loans.ts`:
  - `GET /api/loans` — paginated list with `batchId`, `validationStatus`, `search`
  - `GET /api/loans/:id` — full detail: loan + exceptions[] + verifiedRecord
  - `PATCH /api/loans/:id/fields` — edit allow-listed fields; write `FIELD_EDITED` audit log
  - `POST /api/loans/:id/verify` — VerificationService.verify()

**→ Deliverable to A (Hour 13):** Full exception and loan endpoints working

#### Hour 13–16: Verification Service + Verified Loans Routes
- [x] Create `services/verification.service.ts`:
  - `verify(loanId, userId)`:
    1. Assert all exceptions closed (throw `409` if any `status === 'open'`)
    2. Load current loan fields
    3. Compute `canonicalData` JSON
    4. `recordHash = SHA256(JSON.stringify(canonicalData, null, 0))`
    5. Create `VerifiedLoan` in `prisma.$transaction`
    6. Write `AuditLog: VERIFIED_RECORD_CREATED`
- [x] Create `routes/verified-loans.ts`:
  - `GET /api/verified-loans` — paginated list with filters
  - `GET /api/verified-loans/:id` — full canonical data
  - `GET /api/verified-loans/export` — streams CSV response (fast-csv)
    - Sets `Content-Disposition` header
    - Writes `AuditLog: RECORD_EXPORTED`
- [x] Role guards: consumer + reviewer on read, reviewer on `POST /verify`

**→ Deliverable to A (Hour 16):** Verified loans endpoints + export working

#### Hour 16–18: Audit Trail + Summary Routes
- [x] Create `routes/audit.ts`:
  - `GET /api/audit/:loanId` — chronological AuditLog entries, paginated
  - Include actor name + role, metadata, event type, timestamp
- [x] Create `routes/summary.ts`:
  - `GET /api/summary` — aggregate stats:
    - totalBatches, totalLoansImported, totalExceptions, openExceptions, verifiedLoans
    - exceptionsByType (object), exceptionsBySeverity (object)
    - recentActivity (last 5 audit events)
    - qualityScore: `(verifiedLoans / totalLoansImported) * 100`

**→ Deliverable to A (Hour 18):** Audit trail + summary endpoint working

---

### A — Hours 10–22

#### Hour 10–14: Reviewer Dashboard + Exception Queue Table
- [x] Build `app/(reviewer)/dashboard/page.tsx`:
  - Stat cards: Open Exceptions | Pending AI Review | Approved Today | Rejected Today
  - Recent exceptions list (last 5, click → exception detail)
  - Quick-navigate to full exception queue
- [x] Build `app/(reviewer)/exceptions/page.tsx` — the main reviewer workhorse:
  - **Filter bar** (`components/exceptions/filter-bar.tsx`):
    - Status tabs: All | Open | Approved | Rejected
    - Severity multi-select: critical / high / medium / low
    - Type filter dropdown (all 9 exception types)
    - Search input (loan ID or borrower ID) with debounce
    - Batch filter dropdown
    - Clear filters button
  - **Exception table** (`components/exceptions/exception-table.tsx`):
    - Columns: Severity Badge | Loan ID | Borrower ID | Type | Field | Message | Status | Created At | Actions
    - Row click → `/reviewer/loans/:loanId`
    - Pagination (shadcn `Pagination`)
    - Loading skeleton (shimmer rows)
    - Empty state when no exceptions
  - **Counts summary bar** — show total open/critical count above table
- [x] TanStack Query hooks: `hooks/use-exceptions.ts`
  - `useExceptions(filters)` — `GET /api/exceptions` — refetch on filter change
  - `useException(id)` — single exception

#### Hour 14–19: Loan Detail Page (Reviewer)
This is the **most complex page** in the app. Build it methodically.

- [x] Build `app/(reviewer)/loans/[id]/page.tsx` — layout:
  ```
  ┌──────────────────────────────────────────────────────┐
  │  ← Back to Queue    Loan L-10001 (B-5001)  [status]  │
  ├──────────────────┬───────────────────────────────────┤
  │                  │                                   │
  │  Loan Fields     │  Active Exception                 │
  │  Panel (left)    │  Panel (right)                    │
  │                  │                                   │
  │  [editable       │  Exception list tabs              │
  │   fields inline] │  → AI Panel (stub)               │
  │                  │  → Reviewer Actions               │
  │                  │                                   │
  ├──────────────────┴───────────────────────────────────┤
  │  Audit Timeline (bottom)                             │
  └──────────────────────────────────────────────────────┘
  ```

- [x] `components/loan/loan-fields-panel.tsx`:
  - Display all loan fields in a grid (label + value)
  - Editable fields highlighted with pencil icon
  - Inline edit: pencil icon → input field + Save/Cancel
  - On save → `PATCH /api/loans/:id/fields` mutation
  - Optimistic update via TanStack Query

- [x] `components/loan/exception-list.tsx`:
  - Tab bar: one tab per exception (badge with severity color)
  - Each tab shows: type, field, message, status badge
  - Active exception highlighted

- [x] `components/loan/ai-panel.tsx` — **stub for now**:
  - "Get AI Explanation" button (shows spinner and placeholder card)
  - Wire real AI call in Phase 3

- [x] `components/loan/reviewer-actions.tsx`:
  - "Approve Exception" → `POST /api/exceptions/:id/approve`
  - "Reject Exception" → `POST /api/exceptions/:id/reject`
  - Comment textarea + "Add Note" → `POST /api/exceptions/:id/comment`
  - Confirmation dialogs for approve/reject (shadcn `AlertDialog`)
  - "Verify Loan" button (only enabled when all exceptions closed)
  - All mutations with loading states and toast feedback

- [x] TanStack Query hooks: `hooks/use-loans.ts`
  - `useLoan(id)` — `GET /api/loans/:id`
  - `useUpdateLoanFields(id)` — mutation
  - `useApproveException(id)` — mutation
  - `useRejectException(id)` — mutation
  - `useAddComment(id)` — mutation
  - `useVerifyLoan(id)` — mutation

#### Hour 19–22: Audit Timeline + Loan Detail Polish
- [x] `components/audit/audit-timeline.tsx`:
  - Vertical timeline, chronological (oldest top)
  - Per entry: icon (based on eventType) + actor name + description + timestamp
  - Event type → icon map (Remix Icon — `<i className="ri-*-line">`, never emojis):
    - `LOAN_IMPORTED` → `ri-download-line`
    - `EXCEPTION_CREATED` → `ri-error-warning-line`
    - `AI_RECOMMENDATION` → `ri-robot-2-line`
    - `FIELD_EDITED` → `ri-edit-line`
    - `REVIEWER_COMMENT` → `ri-chat-3-line`
    - `LOAN_APPROVED` → `ri-checkbox-circle-line`
    - `LOAN_REJECTED` → `ri-close-circle-line`
    - `VERIFIED_RECORD_CREATED` → `ri-shield-check-line`
    - `RECORD_EXPORTED` → `ri-share-box-line`
  - Load more pagination
- [x] `hooks/use-audit.ts` — `GET /api/audit/:loanId`
- [x] Wire audit timeline into loan detail page (bottom section)

### Phase 2 Checkpoint (Hour 22)
- [x] Reviewer can: log in → open exception queue → filter by severity/type → open loan detail → edit fields → add comments → approve/reject exceptions
- [x] Operator can: view batch detail → see validation summary with real exception counts
- [x] Audit timeline shows real events on loan detail page
- [x] Verified loan creation tested via curl (A hasn't wired button yet — that's fine)
- [x] B confirms: all loan, exception, verified-loan, audit, summary routes deployed

---

## Phase 3 — AI Review Assistant + Complete Reviewer Flow
### Hours 22 – 33 | Parallel

---

### B — Hours 22–28

#### Hour 22–25: AI Service Core
- [x] Install: `bun add @ai-sdk/google ai`
- [x] Create `lib/ai.ts`:
  ```typescript
  // Packages: ai@7.0.79, @ai-sdk/google@4.0.51 (peer zod ^3.25 || ^4.1 — we use 4.4.3)
  // Model ID configurable via AI_MODEL_ID env; default gemini-3.5-flash-lite.
  // MOCK_AI=true bypasses Gemini for deterministic tests/demo when no key is available.
  import { createGoogleGenerativeAI } from '@ai-sdk/google';
  export const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });
  export const model = google(process.env.AI_MODEL_ID ?? 'gemini-3.5-flash-lite');
  ```
- [x] Create `services/ai.service.ts`:
  - `explainException(exceptionId)`:
    1. Load exception + loan + any servicer_update conflict data
    2. Build structured prompt
    3. Call `generateObject({ model, schema: ExplainResponseSchema, prompt })`
    4. `ExplainResponseSchema` (Zod): `{ suggestion, reasoning, confidence, fieldsToChange[], model, promptSummary, timestamp }`
    5. Save result to `Exception.aiRecommendation`
    6. Write `AuditLog: AI_RECOMMENDATION`
    7. Return recommendation
  - `summarizeBatch(batchId)`:
    1. Load aggregate exception data for batch
    2. Build summary prompt
    3. `generateText({ model, prompt })` → return text + model + timestamp
- [x] Create `routes/ai.ts`:
  - `POST /api/ai/explain` — role: reviewer
  - `POST /api/ai/summarize-batch` — role: reviewer
  - Graceful error: if Gemini fails → `{ recommendation: null, code: "AI_UNAVAILABLE", error: "AI unavailable" }` with `200`
- [x] Zod request body validators

**→ Deliverable to A (Hour 25):** `/api/ai/explain` and `/api/ai/summarize-batch` working

#### Hour 25–28: AI Classify + Suggest Rule + Servicer Conflict Detection
- [x] Add to `services/ai.service.ts`:
  - `classifySeverity(exceptionId)` → `{ currentSeverity, suggestedSeverity, reasoning }`
  - `suggestRule(prompt)` → `generateObject` with `RuleSchema`, returns structured rule JSON
- [x] Add routes:
  - `POST /api/ai/classify-severity`
  - `POST /api/ai/suggest-rule`
- [x] **Servicer conflict detection** in ingestion service:
  - When `fileType === 'servicer_update'`: match rows by `loanId`
  - Batch-match against existing loans via chunked `IN` queries over 5k-row windows — never one indexed query per row (1 query/row × 1M rows = death by latency)
  - For each field that differs → create `conflicting_source` exception with both values in metadata
  - AI explain endpoint pulls this context into its prompt

**→ Deliverable to A (Hour 28):** All 4 AI endpoints working

---

### A — Hours 22–33

#### Hour 22–26: AI Panel (Full Implementation)
- [x] Build `components/loan/ai-panel.tsx` — full implementation:
  - **States:** idle → loading → recommendation received → decision made
  - "Get AI Explanation" button → calls `POST /api/ai/explain`
  - Loading: skeleton shimmer card
  - **Recommendation card:**
    ```
    ┌─────────────────────────────────────────────┐
    │  <i class="ri-robot-2-line"></i> AI Recommendation                  [x]  │
    │  Model: gemini-3.5-flash-lite              │
    │  Confidence: 87%  ·  25 Aug 2026 11:30 AM   │
    ├─────────────────────────────────────────────┤
    │  Suggestion:                                │
    │  Set currentBalance to 340,000              │
    │                                             │
    │  Reasoning:                                 │
    │  Servicer update file shows balance of...   │
    ├─────────────────────────────────────────────┤
    │  Fields to change:                          │
    │  currentBalance: 400,000 → 340,000          │
    │  (source: servicer_update)                  │
    ├─────────────────────────────────────────────┤
    │  [<i class="ri-check-line"></i> Accept]  [<i class="ri-edit-line"></i> Edit]  [<i class="ri-close-line"></i> Reject]          │
    └─────────────────────────────────────────────┘
    ```
  - **Accept:** `POST /api/exceptions/:id/decision { decision: 'accepted' }` → toast
  - **Edit:** inline input pre-filled with suggestion → `{ decision: 'edited', editedValue }`
  - **Reject:** `POST /api/exceptions/:id/decision { decision: 'rejected' }` → toast
  - **Disclaimer banner** always visible: "AI suggestions require human review and do not automatically change data."
  - **AI metadata always visible:** model, timestamp, prompt summary — never collapsible/hidden
  - **Error state:** if `recommendation === null` → "AI is unavailable. Please review manually."

- [x] `hooks/use-ai.ts`:
  - `useExplainException()` — mutation for `POST /api/ai/explain`
  - `useAIDecision()` — mutation for `POST /api/exceptions/:id/decision`
  - `useSummarizeBatch()` — mutation for `POST /api/ai/summarize-batch`

#### Hour 26–29: Batch AI Summary Panel
- [x] Build `components/batch/ai-summary-panel.tsx`:
  - "Generate AI Summary" button on batch detail page
  - Collapsible card with generated summary text
  - Shows model + timestamp metadata
  - Loading skeleton while generating
- [x] Wire into `app/(operator)/uploads/[batchId]/page.tsx`

#### Hour 29–33: Reviewer Dashboard Completion + Verify Loan Flow
- [x] **Reviewer Dashboard** full implementation:
  - **Stats cards:** Open Exceptions | AI Reviewed | Pending Verify | Verified Today
  - **Priority queue:** Top 5 critical open exceptions → quick-link to each
  - **AI Summary panel** for most recent batch (widget form)
  - **Recent activity:** last 10 audit events across reviewer's loans
- [x] **Verify Loan flow** on loan detail page:
  - "Verify Loan" button only enabled when all exceptions `status ∈ {approved, rejected, corrected}`
  - If any open → tooltip: "2 exceptions still open"
  - On click → `POST /api/loans/:id/verify`
  - Success → toast "Loan L-10001 verified. Hash: e3b0c4..." → optimistic state update
  - Show verification badge on loan page: lock icon + "Verified" + verifiedAt
- [x] `components/loan/verification-status.tsx` — verified badge, hash preview, verified-by, timestamp

### Phase 3 Checkpoint (Hour 33)
- [x] Complete reviewer flow: queue → loan detail → AI explain → accept/edit/reject AI → approve exception → verify loan
- [x] AI panel shows model metadata, is read-only, requires explicit action to apply
- [x] AI output appears in audit trail (AI_RECOMMENDATION event visible)
- [x] Batch AI summary works on operator upload detail page
- [x] "Verify Loan" button correctly guarded by open exception count

---

## Phase 4 — Consumer Dashboard + Export + Cross-Role Polish
### Hours 33 – 41 | Parallel

---

### B — Hours 33–37

#### Hour 33–35: Ingestion Edge Cases + Harden Routes
- [x] Handle **servicer update file** conflict detection properly (full field-by-field comparison)
- [x] Handle **document manifest file**:
  - Parse rows: `loanId`, `documentType`, `available`
  - Update `Loan.documentStatus` from manifest
  - Create `missing_field` exception if `documentStatus` missing
- [x] `GET /api/loans` for `data_consumer` role — returns only loans with `verifiedRecord != null`
- [x] Harden `PATCH /api/loans/:id/fields`:
  - Strict allow-list enforcement (400 for any non-editable field)
  - Record old value in `FIELD_EDITED` audit log metadata
- [x] Rate limiting on AI endpoints: simple in-memory counter (20 calls/min per user)
- [x] Global error handler pass — ensure all errors return `{ error, code }` JSON

#### Hour 35–37: CSV Export + Final API Polish
- [x] `GET /api/verified-loans/export`:
  - Stream CSV using `fast-csv`
  - All `canonicalData` fields + `verifiedAt`, `recordHash`, `validationResult`, `reviewerDecision`
  - Write `AuditLog: RECORD_EXPORTED`
  - Headers: `Content-Type: text/csv`, `Content-Disposition: attachment; filename="verified_loans_<date>.csv"`
- [x] `GET /api/health` → `{ status: 'ok', timestamp }` (for deployment check)
- [x] Final Zod validation pass: every route body/query has a schema

---

### A — Hours 33–41

#### Hour 33–37: Consumer Dashboard
- [x] Build `app/(consumer)/dashboard/page.tsx`:
  - **Quality Score card** — large number (e.g., "75.1%"), progress ring, label "Data Quality Score"
  - **Summary stats row:** Total Verified | Passed Clean | Passed With Review | AI Assisted
  - **Verified Loans table** (`components/verified-loans/verified-loans-table.tsx`):
    - Columns: Loan ID | Borrower ID | Validation Result | AI Used | Verified By | Verified At | Hash (truncated) | View
    - Click row → `/consumer/loans/:id`
    - Badge: `passed` (green) | `passed_with_review` (yellow)
    - Filter: validation result, AI used
    - Search by loan ID
    - Pagination
  - **Export button** → `GET /api/verified-loans/export` → browser download
- [x] `hooks/use-verified-loans.ts`:
  - `useVerifiedLoans(filters)` — `GET /api/verified-loans`
  - `useExportVerifiedLoans()` — fetches blob, triggers download via `URL.createObjectURL`

#### Hour 37–39: Consumer Loan Detail + Full Audit Trail
- [x] Build `app/(consumer)/loans/[id]/page.tsx`:
  - **Verified record banner:** green "Verified" badge, hash, verified-by, timestamp
  - **Canonical Data panel** — all fields displayed (read-only, no edit UI)
  - **Record Integrity section:**
    - Full record hash displayed
    - "How is this computed?" popover/tooltip explanation
    - Source batch reference
  - **Full audit timeline** (all events, read-only, chronological)

#### Hour 39–41: Operator Dashboard Completion + Global Polish
- [x] Complete `app/(operator)/dashboard/page.tsx`:
  - **Quick Upload card** (drag-and-drop, prominent, hero element)
  - **Import History table** — all batches, status badges, click → batch detail
  - **Live processing indicator** — if any batch is `processing`, show animated progress indicator
  - **Summary stats** from `/api/summary`
- [x] Shared `components/layout/page-header.tsx` — consistent title + breadcrumbs
- [x] Shared `components/layout/empty-state.tsx` — illustration + message for empty tables
- [x] All tables responsive (horizontal scroll on small screens)
- [x] Consistent loading skeletons on every data-fetching page

### Phase 4 Checkpoint (Hour 41)
- [x] All 3 role dashboards complete and functional
- [x] Consumer can: view verified loans, open loan detail with full audit trail, download CSV export
- [x] Operator can: upload all 3 file types, see batch processing states, view validation summary with AI summary
- [x] Quality score appears on consumer dashboard
- [x] CSV export downloads a real file with correct columns

---

## Phase 5 — Integration, Edge Cases & Hardening
### Hours 41 – 45 | Together

---

### Both — Hours 41–45

> [!WARNING]
> This phase is done **together** (same room or on a call). Both people fix issues collaboratively. Speed is critical.

#### Hour 41–42: Full End-to-End Demo Run
Run the full 14-step demo flow from problem.md §15:
1. Log in as Operator
2. Upload `loan_tape.csv` → see import summary with failed rows
3. Upload `servicer_update.csv` → see conflict exceptions appear
4. View validation summary on batch page (exception counts by type)
5. Log in as Reviewer → open exception queue
6. Filter by `critical` severity → see top issues
7. Open a `balance_error` exception → "Get AI Explanation" → see recommendation
8. Accept recommendation → see audit log update
9. Open a `duplicate` exception → Reject it
10. Approve all remaining open exceptions
11. Click "Verify Loan" → see verified badge + hash
12. Log in as Consumer → see verified loan on dashboard
13. Open verified loan → inspect full audit trail (all 8 events visible)
14. Download CSV export → open file, verify columns

Log every bug found. Triage: fix now vs. skip.

#### Hour 42–43: Bug Fixes (Parallel)
- **A fixes:** UI bugs, broken states, missing skeletons, toast timing, form reset failures
- **B fixes:** API errors, wrong HTTP codes, missing audit writes, pagination issues, CORS problems

#### Hour 43–44: Edge Case Coverage
- **B:**
  - [ ] Upload 0-row CSV → graceful error response
  - [ ] Upload non-CSV → `415`
  - [ ] Verify loan with open exceptions → `409` with clear message
  - [ ] Access reviewer route as consumer → `403`
  - [ ] AI endpoint with invalid Gemini key → graceful null recommendation
  - [ ] Duplicate loan ID in same batch → exception created correctly
  - [ ] Maturity date string before origination → validation catches it
  - [ ] Large CSV (50,000+ rows) → ingestion completes, memory flat, no timeout (5k fits in RAM anyway — only 50k+ actually proves streaming)
- **A:**
  - [ ] Empty exception queue → empty state component, not broken table
  - [ ] Wrong-role page access → 403 page, not white screen
  - [ ] AI panel when recommendation is null → "AI unavailable" message
  - [ ] Long loan ID → text truncation with tooltip on hover
  - [ ] Large exception list (246 items) → pagination works
  - [ ] Verify loan button on loan with 0 exceptions (clean) → still works
  - [ ] Network error on any mutation → toast error, no silent failure

#### Hour 44–45: Seed Data Finalization
- **B:**
  - [ ] Generate `loan_tape.csv` — 1000 rows covering all §7 intentional issues
  - [ ] Generate `servicer_update.csv` — 200 rows with conflicts on ~50 loans
  - [ ] Generate `document_manifest.csv`
  - [ ] Update seed script: upload + process all 3 CSVs automatically
  - [ ] Seed pre-approved/pre-verified loans so consumer dashboard isn't empty on demo start
  - [ ] Confirm all 3 demo credentials work on fresh DB

### Phase 5 Checkpoint (Hour 45)
- [ ] Full 14-step demo runs without a single crash or 500 error
- [ ] All 3 roles fully functional end-to-end
- [ ] Edge cases handled gracefully (no white screens, no unhandled rejections in console)
- [ ] Seed produces a realistic, demo-ready dataset

---

## Phase 6 — Demo Prep, README & Submission
### Hours 45 – 48 | Split

---

### B — Hours 45–48

#### Hour 45–46: README + Required Docs
- [ ] Write `README.md`:
  ```markdown
  ## Luma — Loan Data Verification Copilot
  
  ### Prerequisites
  Bun 1.1+, Docker
  
  ### Quick Start
  git clone ...
  bun install
  docker compose up -d
  cp apps/api/.env.example apps/api/.env   # fill in GEMINI_API_KEY
  bun --filter api prisma migrate dev
  bun --filter api run seed
  bun dev
  # web → :3000, api → :4000
  
  ### Test Credentials
  | Role          | Email             | Password |
  |---------------|-------------------|----------|
  | Data Operator | operator@luma.dev | password |
  | Reviewer      | reviewer@luma.dev | password |
  | Data Consumer | consumer@luma.dev | password |
  ```
- [ ] Write `AI_DEVELOPMENT_LOG.md` (required by §10):
  - Tools used: Antigravity (Gemini) for architecture, API design, schema, UI structure
  - 5–10 representative prompts used during development
  - Human review process: how AI output was tested and verified
  - Estimated % AI-generated code
  - 2+ examples of rejected AI output (with reasons)
  - Where AI helped most vs. where human judgment was necessary
- [ ] Write `docker-compose.yml` and `.env.example`
- [ ] Add sample output files: `/.context/samples/verified_loans_sample.csv`, `audit_trail_sample.json`

#### Hour 46–47: Deployment (Optional Stretch)
If time permits:
- [ ] Deploy `apps/api` + PostgreSQL to **Railway**
- [ ] Deploy `apps/web` to **Vercel**
- [ ] Update `BETTER_AUTH_URL`, `FRONTEND_URL`, `NEXT_PUBLIC_API_URL` for production
- [ ] Verify full demo flow on deployed URLs

#### Hour 47–48: Final Submission
- [ ] GitHub repo is public, all code committed
- [ ] No `.env` files or secrets committed (verify `.gitignore`)
- [ ] `README.md` accurate and complete
- [ ] `AI_DEVELOPMENT_LOG.md` present
- [ ] Architecture and API contract docs present in `.context/`
- [ ] Demo user credentials confirmed working on clean DB

---

### A — Hours 45–48

#### Hour 45–46: Branding + Final UI Polish
- [ ] Luma branding: logo in sidebar (text mark or simple SVG)
- [ ] Consistent color palette: blue/indigo primary (trust/financial feel)
- [ ] Dark sidebar, clean white content area
- [ ] Loading states audit — every page that fetches shows a skeleton, not an empty flash
- [ ] `app/error.tsx` — error boundary with friendly message + retry button
- [ ] `app/not-found.tsx` — 404 page
- [ ] Final mobile responsiveness pass (tables scroll, sidebar collapses on mobile)
- [ ] shadcn/ui consistency pass (button sizes, badge colors uniform across all pages)

#### Hour 46–47: Demo Script Setup
- [ ] Pre-open browser tabs for demo:
  - Tab 1: Operator dashboard (logged in, `operator@luma.dev`)
  - Tab 2: Reviewer exception queue (logged in, `reviewer@luma.dev`)
  - Tab 3: Consumer dashboard (logged in, `consumer@luma.dev`)
  - Tab 4: Browser — `GET /api/verified-loans` (raw JSON)
  - Tab 5: Browser — `GET /api/summary` (raw JSON)
- [ ] Test full upload flow with the seeded CSV files (not fixture data)
- [ ] Identify 1 "wow moment" loan: pick a specific `loanId` whose journey is complete — upload → exception → AI fix → verified → audit trail with all 8 events
- [ ] Note the loan's hash value for the demo script

#### Hour 47–48: Final QA
- [ ] Clear all cookies, log in fresh as each role — verify redirects
- [ ] One final full run of the 14-step demo
- [ ] Record 5-minute demo video (if required by submission)
- [ ] Submit

---

## Shared Handoff Contracts

> [!IMPORTANT]
> These are explicit, time-boxed handoffs. B must deliver each by the stated hour. A mocks or stubs until then — no blocking.

| Hour | B Delivers | A Unblocks |
|------|-----------|------------|
| **4** | `/api/auth/*`, `/api/me` | Login page, layout guards, auth client |
| **7** | `POST /api/uploads`, `GET /api/uploads`, `GET /api/uploads/:batchId` | Upload UI, batch list, batch detail skeleton |
| **10** | `GET /api/uploads/:batchId/summary` with real exception counts | Validation summary cards on batch page |
| **13** | `GET /api/exceptions`, `GET /api/loans/:id`, all exception write routes | Exception queue, loan detail page, reviewer actions |
| **16** | `POST /api/loans/:id/verify`, `GET /api/verified-loans`, `GET /api/verified-loans/:id` | Verify button, consumer list view |
| **18** | `GET /api/audit/:loanId`, `GET /api/summary` | Audit timeline component, dashboard stats |
| **25** | `POST /api/ai/explain`, `POST /api/ai/summarize-batch` | AI panel full implementation |
| **28** | `POST /api/ai/classify-severity`, `POST /api/ai/suggest-rule` | Optional AI feature buttons |
| **35** | `GET /api/verified-loans/export` (CSV stream) | Export button, browser download |

---

## Shared Type Agreements
Defined in `packages/types/src/` — finalize in Phase 0. Both A and B import from here.

```typescript
// Core enums — agree on these strings, never change after Phase 0
export type Role = 'data_operator' | 'reviewer' | 'data_consumer'
export type BatchStatus = 'pending' | 'processing' | 'done' | 'failed'
export type ValidationStatus = 'pending' | 'passed' | 'failed' | 'review'
export type ExceptionStatus = 'open' | 'approved' | 'rejected' | 'corrected'
export type ExceptionType =
  | 'missing_field' | 'duplicate' | 'date_error' | 'balance_error'
  | 'rate_out_of_range' | 'status_inconsistency' | 'stale_record'
  | 'invalid_state' | 'conflicting_source'
export type Severity = 'critical' | 'high' | 'medium' | 'low'
export type AuditEventType =
  | 'FILE_UPLOADED' | 'LOAN_IMPORTED' | 'VALIDATION_RUN' | 'EXCEPTION_CREATED'
  | 'AI_RECOMMENDATION' | 'REVIEWER_COMMENT' | 'FIELD_EDITED'
  | 'LOAN_APPROVED' | 'LOAN_REJECTED' | 'VERIFIED_RECORD_CREATED' | 'RECORD_EXPORTED'
export type AIDecision = 'accepted' | 'edited' | 'rejected'
```

---

## Risk Register

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| AI rate limits (Gemini free tier) | Medium | High | Cache AI responses in DB; graceful null fallback UI |
| Loan detail page (Phase 2) takes longer than expected | High | High | A builds AI panel as a stub first, wires real calls in Phase 3 |
| Prisma schema change mid-development | Medium | Medium | `prisma migrate dev --name patch` is fast; keep schema locked after Hour 2 |
| Better Auth cookie not forwarded (CORS / RSC) | High | High | Within the first hour of Phase 1, test sign-in → `/api/me` AND an RSC layout guard (`auth.api.getSession({ headers: await headers() })`). Fix before proceeding. |
| B falls behind on APIs | Medium | High | A uses hardcoded `mockData` objects for any missing endpoint |
| CSV files with unexpected encoding (UTF-16, BOM) | Low | Medium | B adds BOM stripping + encoding detection to papaparse config |
| 48h fatigue causing demo errors | High | Medium | Pre-seed DB, pre-open browser tabs, practice demo twice in Phase 6 |
| Gemini API key not available | Low | Critical | Have a fallback `MOCK_AI=true` env flag that returns a hardcoded AI response |

---

## Appendix: Component Inventory

| Component | Owner | Phase | Used By |
|-----------|-------|-------|---------|
| `csv-dropzone` | A | 1 | Operator dashboard |
| `batch-table` | A | 1 | Operator dashboard |
| `stat-card` | A | 1 | All dashboards |
| `severity-badge` | A | 1 | Exception table, exception tabs |
| `filter-bar` | A | 2 | Exception queue |
| `exception-table` | A | 2 | Exception queue |
| `loan-fields-panel` | A | 2 | Reviewer + Consumer loan detail |
| `exception-list` | A | 2 | Reviewer loan detail |
| `reviewer-actions` | A | 2 | Reviewer loan detail |
| `audit-timeline` | A | 2 | Reviewer + Consumer loan detail |
| `ai-panel` | A | 3 | Reviewer loan detail |
| `ai-summary-panel` | A | 3 | Operator batch detail |
| `verification-status` | A | 3 | Reviewer loan detail |
| `verified-loans-table` | A | 4 | Consumer dashboard |
| `page-header` | A | 4 | All pages |
| `empty-state` | A | 4 | All tables |

## Appendix: API File Inventory

| File | Owner | Phase | Endpoints |
|------|-------|-------|-----------|
| `routes/uploads.ts` | B | 1 | 4 endpoints |
| `routes/loans.ts` | B | 2 | 4 endpoints |
| `routes/exceptions.ts` | B | 2 | 6 endpoints |
| `routes/verified-loans.ts` | B | 2 | 3 endpoints |
| `routes/audit.ts` | B | 2 | 1 endpoint |
| `routes/summary.ts` | B | 2 | 1 endpoint |
| `routes/ai.ts` | B | 3 | 4 endpoints |
| `services/ingestion.service.ts` | B | 1 | — |
| `services/validation.service.ts` | B | 1 | — |
| `services/verification.service.ts` | B | 2 | — |
| `services/ai.service.ts` | B | 3 | — |
