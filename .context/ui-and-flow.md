# Luma — Loan Data Verification Copilot
## UI & Flow

> Companion to `architecture-flow.md` (system design) and `api-contract.md` (API shapes). This doc covers **what the user sees and does** — screens, navigation, and the three role-based journeys from messy CSV to verified, auditable loan record.

---

## 1. Why the UI is shaped this way

Per `problem.md`, the product exists to turn a messy loan tape into a **validated, traceable, trusted** dataset, and the judged demo flow (§15) is a straight line through three roles:

```
Data Operator  →  upload tape  →  see import/validation summary
Reviewer       →  triage exception queue  →  consult AI  →  decide  →  verify loan
Data Consumer  →  browse verified records  →  inspect audit trail  →  export CSV
```

The frontend is a single Vite SPA with **one shell, three role-scoped sections**, gated by `ProtectedRoute` + Better Auth session, not three separate apps. Nobody sees another role's nav items or routes.

---

## 2. Navigation Map

```
/                          → RoleRedirect (session-aware: sends user to their role home, or /login)
/login                     → LoginPage

/operator                  [role: data_operator]
  /operator/dashboard        (index → redirect here)
  /operator/uploads/:batchId

/reviewer                  [role: reviewer]
  /reviewer/dashboard         (index → redirect to /reviewer/exceptions)
  /reviewer/exceptions
  /reviewer/loans/:id         (placeholder — see §7)

/consumer                  [role: data_consumer]
  /consumer/dashboard         (index → redirect here)
  /consumer/loans/:id          (placeholder — see §7)
  /consumer/export
```

Each `/operator`, `/reviewer`, `/consumer` subtree is wrapped by a `RoleShell`:
`ProtectedRoute(requiredRole)` → `<Sidebar/>` + `<Outlet/>`. A user hitting a route outside their role gets bounced by the guard rather than a white screen.

---

## 3. Global Shell

**Sidebar** (`components/nav/sidebar.tsx`) — persistent left rail, ~240px, dark-on-light card background:
- Luma wordmark + "Copilot" pill at top
- Nav links filtered to the signed-in user's role (Remix Icons, never emojis):
  - Operator: Dashboard
  - Reviewer: Dashboard, Exception Queue
  - Consumer: Verified Records, Export
- Footer: avatar initials, name, role label, **Sign out** button

**Layout** — flex row, `h-screen overflow-hidden`, sidebar fixed, main content `overflow-y-auto`. Every page content area is `mx-auto max-w-5xl` (or `max-w-6xl` for wide tables) with `p-6` padding, so screens stay centered and readable at desktop widths.

**Auth guard flow:**
```
mount → useSession() (Better Auth) → isPending? show skeleton
                                    → no user? → redirect /login
                                    → role mismatch? → Forbidden card (not a blank screen)
                                    → render page
```

---

## 4. Screen-by-Screen

### 4.1 Login (`/login`)
Centered card, email + password, shadcn `Form`/`Input`/`Button`. On submit → `authClient.signIn.email()` → fetch session → route by role (`ROLE_HOME` map). Invalid creds and unreachable-API both surface as Sonner toasts, never a raw error. Footer hint lists the three demo accounts (`operator / reviewer / consumer @luma.dev`, password `password`) — intentional for hackathon judging speed.

### 4.2 Operator Dashboard (`/operator/dashboard`)
**Data Operator's home.** Top to bottom:
1. **Stat row** (4 cards, from `GET /api/summary`): Loans imported · Open exceptions · Quality score · Verified loans
2. **Upload dropzone** (`csv-dropzone.tsx`) — drag/drop or browse, file-type selector (loan_tape / servicer_update / document_manifest), client-side size/type guard, posts to `POST /api/uploads`, shows an upload progress bar, and on `202 Accepted` routes straight into the batch detail page
3. **Upload history table** (`batch-table.tsx`) — File name, type, record count, failed count, status badge (pending/processing/done/failed, color-coded), uploaded-at; row click → `/operator/uploads/:batchId`

### 4.3 Batch Detail (`/operator/uploads/:batchId`)
Title = file name + status badge. Body branches on batch state:
- **`processing`** → spinner card ("Processing ingestion... auto-refreshes every 2 seconds") — the page polls until the batch resolves, so the operator never has to manually refresh
- **`done`/`failed`** → **Import Summary card** (total / imported / failed) → **Failed Rows table** (row number, truncated raw data, reason — capped at first 1,000 per the ingestion service) → **Validation Summary card** (pass/fail counts, exception breakdown by type and by severity)
- Loading state → skeleton blocks instead of a blank page

This screen is the operator's proof that ingestion + validation actually ran on their file — it's the "see import and validation summary" step of the demo script.

### 4.4 Reviewer Dashboard (`/reviewer/dashboard`)
Triage cockpit, not a worklist — the actual queue work happens on the Exception Queue page.
1. **Stat row:** Open exceptions · Quality score · Verified loans · Total loans
2. **By severity** — clickable rows (critical → low) that jump straight into `/reviewer/exceptions`, so a reviewer can go "show me the critical ones" in one click
3. **Recent activity** — last audit events with type-specific icon (verified-record → shield, exception-created → warning, else → history), relative time

### 4.5 Exception Queue (`/reviewer/exceptions`)
The main reviewer workhorse, and the busiest screen in the app.
- **Filter/search bar** built into the table header: status, severity, exception type, free-text search (loan/borrower ID) — all controlled, all reset pagination to page 1 on change
- **Exception table** — severity badge, loan/borrower ID, type badge, field, message, status badge; row action opens the review panel
- **AI Assistant panel** opens as a right-hand **Sheet** (not a full page navigation) when a row is selected — see §5 for the review flow inside it

> **Note on architecture:** the implementation review pattern differs from the original phased plan (which routed to a dedicated `/reviewer/loans/:id` page). Instead, exception review happens **in-context via a slide-over Sheet** launched from the queue row — the reviewer never loses their place in the filtered list. `/reviewer/loans/:id` still exists as a route (see §7) for a future full loan-detail deep-dive (all fields + full audit history for one loan), but is not required for the core review loop.

### 4.6 Consumer Dashboard (`/consumer/dashboard`)
1. **Stat row:** Data quality score · Verified loans (total) · With AI assistance (count where an AI recommendation was used)
2. **Progress bar** restating quality score as "% of imported loans passed verification on first pass"
3. **Verified loan records table** — Loan, Borrower, Source batch, Result badge (passed / passed with review), AI used (yes/no), Record hash (truncated, monospace), Verified at

### 4.7 Export (`/consumer/export`)
Single card, one action: **Export verified loans (CSV)** — a plain anchor to `GET /api/verified-loans/export` opened in a new tab (so the browser handles the download and Content-Disposition natively; no custom blob/download JS needed). Copy under the button explains what's in the file and that the export itself is audit-logged.

---

## 5. The AI Review Flow (inside the Exception Queue Sheet)

This is the section judged directly against §9 "Required AI Controls" — every element in the panel exists to keep the AI **advisory, visible, and reversible**.

```
Reviewer clicks a row in the queue
        │
        ▼
Sheet opens → exception summary (type/severity/status badges + message)
        │
        ▼
[Explain] button  ──POST /api/ai/explain──▶  AI recommendation card:
                                                 • suggestion + reasoning (plain text)
                                                 • model · confidence % · prompt summary · generated-at
                                                 • fields-to-change diff (old → new, with source)
                                                 • disclaimer: "AI output is advisory only and never
                                                   changes data until a human records a decision"
        │
        ▼
Reviewer chooses one:  Accept │ Record edit (typed value) │ Reject
                                     │
                                     ▼
                        POST /api/exceptions/:id/decision   (AI_RECOMMENDATION decision logged)
        │
        ▼
Separate "Human decision" section (always present, independent of whether AI was consulted):
   • Reviewer note (free text — required to reject)
   • Corrected value (optional, applied on approve)
   • [Approve]  or  [Reject loan]
        │
        ▼
POST /api/exceptions/:id/approve  or  /reject   →  audit log entry  →  toast  →  sheet resets
```

Key UI guarantees this enforces:
- The AI's recommendation and the reviewer's decision are **visually and functionally separate blocks** — accepting an AI suggestion is not the same action as approving the exception.
- AI metadata (model, confidence, prompt summary, timestamp) is **always shown, never collapsed**.
- Rejecting requires a note (button disabled until `note` is non-empty) — no silent rejections.
- If `POST /api/ai/explain` fails, the panel shows "AI unavailable" via toast and the human-decision section still works — AI is never a blocker to reviewing.

---

## 6. End-to-End Journey (maps to the 14-step demo script)

```
OPERATOR                    REVIEWER                        CONSUMER
────────                    ────────                        ────────
Log in                      Log in                          Log in
Upload loan_tape.csv        Open Exception Queue             View Verified Records
  → batch detail (polling)  Filter severity=critical          → quality score, table
  → import summary            → open row → AI Explain        Open export page
  → validation summary       → Accept / Edit / Reject AI      → download CSV
                              → note + Approve/Reject
                             (repeat until queue for a loan
                              is clear)
                             Verify happens once every
                              exception on a loan is closed
                              (server-side gate on
                              POST /loans/:id/verify)
```

The operator and reviewer legs are fully wired against the live API today. The "Verify Loan" trigger and a dedicated per-loan detail view (fields + full audit timeline for one `loanId`) are the remaining pieces to close the loop end-to-end in the UI — see §7.

---

## 7. Implementation Status

| Screen / Flow | Status | Notes |
|---|---|---|
| Login + role redirect | ✅ Live | Better Auth email/password, role-based `ROLE_HOME` routing |
| Route guards (`ProtectedRoute`) | ✅ Live | Skeleton → redirect → Forbidden → render |
| Operator dashboard | ✅ Live | Stats, dropzone, upload history all wired to real hooks |
| Batch detail (import + validation summary) | ✅ Live | Polls while `processing`; failed-rows table capped at 1,000 |
| Reviewer dashboard | ✅ Live | Stats, severity breakdown, recent activity |
| Exception queue (filter/search/table) | ✅ Live | `useExceptions(filters)`, pagination-safe filter patches |
| AI assistant sheet (explain / accept / edit / reject / approve / reject-loan) | ✅ Live | `use-exceptions.ts` mutations + `aiApi.explain`; mock fallback via `lib/mocks.ts` when `USE_MOCKS` |
| Consumer dashboard (verified records table + quality score) | ✅ Live | |
| Export page | ✅ Live | Direct link to streaming CSV endpoint |
| `/reviewer/loans/:id` — full loan detail (all fields, editable, full audit timeline) | 🚧 Placeholder | Currently renders "Loan detail view arrives in Phase 2 — the API contract and types are already in place." Route + types exist; page body doesn't. |
| `/consumer/loans/:id` — verified record detail (canonical data + hash explanation + audit trail) | 🚧 Placeholder | Same placeholder component (`ComingSoon`), consumer-flavored. |
| Explicit "Verify Loan" action + verification badge | 🚧 Not yet wired in UI | `POST /api/loans/:id/verify` exists per API contract; no button/UI trigger yet — needed to close the reviewer→consumer loop visibly. |
| Batch AI summary panel (operator side) | 🚧 Not yet built | Planned as a collapsible card on batch detail using `POST /api/ai/summarize-batch`. |
| Audit timeline component (`components/audit/`) | 🚧 Not yet built | No standalone timeline component in the current tree; needed for both loan-detail placeholders above. |

---

## 8. Component Inventory (current tree)

| Component | Used by |
|---|---|
| `components/nav/sidebar.tsx` | Global shell, all roles |
| `components/upload/csv-dropzone.tsx` | Operator dashboard |
| `components/upload/batch-table.tsx` | Operator dashboard |
| `components/upload/validation-summary.tsx` (`ImportSummaryCard`, `ValidationSummaryCard`) | Batch detail |
| `components/exceptions/exception-table.tsx` (`ExceptionQueueTable`) | Exception queue |
| `components/ai/ai-assistant-panel.tsx` | Exception queue (Sheet) |
| `components/ui/stat-card.tsx` | All three dashboards |
| `components/ui/badges.tsx` (`SeverityBadge`, `ExceptionTypeBadge`, `ExceptionStatusBadge`, `BatchStatusBadge`) | Exception table, AI panel, batch detail |
| `components/ui/*` (shadcn primitives) | Card, Table, Sheet, Dialog, Tabs, Select, Textarea, Progress, Skeleton, Toast/Sonner, etc. — used throughout |

Hooks: `use-session`, `use-uploads`, `use-exceptions` (+ `use-exceptions-filters`), `use-verified-loans` — each a thin TanStack Query wrapper around `lib/api.ts`. `lib/mocks.ts` provides a `USE_MOCKS` escape hatch so frontend work isn't blocked on the AI endpoint being live.

---

## 9. Design Notes

- **Remix Icons only, never emojis** (`<i className="ri-*-line">`) — applies to nav, buttons, status indicators, timeline events.
- **Every mutating action gets a toast** (success or failure) — no silent failures, per the plan's edge-case checklist.
- **Every data-fetching screen has a skeleton state** — no blank-flash on load.
- **Status is always a colored badge**, never plain text — batch status, exception severity/type/status, validation result.
- Blue/indigo primary palette, dark sidebar, white content area — "trust/financial" feel called out in the implementation plan's branding pass.
