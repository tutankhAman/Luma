# Loan Data Verification Copilot — UI & Flow Spec

Intain Campus FinTech Challenge 2026 · Full Stack Track

This spec defines every screen, its components, and how they map back to the problem
statement's modules and judging criteria. Layout is a persistent left sidebar + topbar shell,
with three role-scoped page sets (Data Operator, Reviewer, Data Consumer) plus a few shared
screens.

---

## 1. Design Tokens

- **Palette base:** #3AA5F0 (primary accent — active nav, buttons, links), near-black (text,
  headers), paper (background). Keep everything else on this palette.
- **Semantic exceptions:** severity/status needs its own signal color that #3AA5F0 can't carry —
  use a desaturated red (high severity / rejected), amber (medium severity / pending), green
  (low severity / approved / verified), layered only on badges, pills, and status dots. Never
  used as a page background or primary UI color.
- **Typography:** DM Sans for all UI text and body copy. JetBrains Mono for loan IDs, borrower
  IDs, record hashes, timestamps, and anything inside the API Explorer / JSON viewer.

---

## 2. Global Shell

### Sidebar (persistent, left, collapsible to icon-only)
- Wordmark: "Intain Verify" + small tagline "Loan Data Verification Copilot"
- **Role switcher** — dropdown/pill showing current role (Data Operator / Reviewer / Data
  Consumer). Switching re-scopes the nav below without a full logout. This exists specifically
  so the 5-minute demo can move between roles fast (see §9 Demo Flow).
- Role-scoped nav items (see §8 matrix)
- Pinned shared link: **AI Development Log** (visible to all roles)
- Bottom: avatar, user name, role badge, "Test Credentials" link, Logout

### Topbar (per page)
- Breadcrumb / page title
- Global search — searches by `loan_id` or `borrower_id`, jumps straight to that loan's detail
  view for the current role
- Notification bell — badge count (new exceptions, stale records flagged); opens a slide-over
  Notifications Panel
- Context CTA button (e.g. "Upload File" on Operator pages, "New Rule" on Reviewer rules page)

### Login / Role Select (`/login`)
- Three role cards: Data Operator, Reviewer, Data Consumer, each with a mock username shown
- Click a card to enter as that role (no real auth needed for a hackathon demo)
- "View test credentials" expandable — satisfies the required deliverable of test credentials
  for all three roles, and doubles as an on-screen judge reference

---

## 3. Shared Components (used across pages)

| Component | Purpose |
|---|---|
| `DataTable` | Sortable, filterable, paginated, row-click-through, supports badge cells |
| `KPICard` | Big number + label + optional delta, used in dashboards |
| `Badge/Pill` | Status (Pending/Approved/Rejected), severity (Low/Med/High), exception type tags |
| `FileDropzone` | Drag-drop CSV upload with progress bar and post-upload summary |
| `Drawer` | Right-side slide-over for quick record detail without leaving a list page |
| `Modal` | Confirmations (approve/reject/export) |
| `Timeline` | Chronological event list for audit trails and reviewer action history |
| `DiffViewer` | Side-by-side field comparison, highlights conflicts between two sources |
| `AISuggestionCard` | AI output block: recommendation, confidence/severity tag, Accept / Edit / Reject actions, and a metadata footer (model, prompt, timestamp) — this shape is reused everywhere the AI Review Assistant appears |
| `QualityScoreGauge` | Radial/donut gauge for the data-quality score |
| `TrendChart` | Simple line/bar chart for import volume and exception trends |
| `JSONViewer` | Syntax-highlighted, monospace response viewer |
| `Toast` | Transient confirmations (upload complete, action saved) |
| `EmptyState` | No-data placeholder for tables/panels |

---

## 4. Data Operator Pages

### 4.1 Dashboard — `/operator/dashboard`
*(Module G — Data Operator dashboard)*
- KPI row: Total records ingested, Files uploaded, Rows failed import, Corrections needed
- Recent Uploads table (last 5) with status pill, links to Import History
- Validation Summary `TrendChart` — count of issues by type across all imports
- "Corrections Needed" list — failed-import rows still requiring operator action, with quick
  links into the failing row
- Primary CTA: **Upload New File**

### 4.2 Upload Data — `/operator/upload`
*(Module A — full ingestion flow)*
- `FileDropzone` — accepts `loan_tape.csv`, `servicer_update.csv`, `document_manifest.csv`;
  auto-detects type from headers or lets the operator pick
- Live parse progress bar
- Post-upload **Summary Card**: rows parsed, rows imported, rows failed, duplicates found,
  source filename, upload timestamp, uploaded-by (this is the lineage record)
- **Failed Rows Table**: row #, raw values, failure reason, "Download failed rows" button
- Link: "View in Import History"

### 4.3 Import History — `/operator/imports`
- `DataTable`: filename, file type, uploaded by, timestamp, rows total/imported/failed, status
- Row click → **Import Detail Drawer**: same summary + failed-rows breakdown scoped to that
  single upload, showing source lineage

### 4.4 Loan Records — `/operator/loans`
- `DataTable` of all normalized records: `loan_id`, `borrower_id`, `source_system`,
  `last_updated_at`, validation status badge (Valid / Exception / Pending)
- Filters: source file, status, date range; search by loan/borrower ID
- Row click → read-only **Loan Detail Drawer** (raw vs. normalized fields side by side) —
  operators can inspect but not review/approve, that's the Reviewer's job

---

## 5. Reviewer Pages

### 5.1 Dashboard — `/reviewer/dashboard`
*(Module G — Reviewer dashboard)*
- KPI row: Open exceptions, High-severity count, Pending my review, Reviewed today
- Exception Queue preview (top 5 by severity) → "View All"
- **AI Batch Summary** widget — AI-generated summary of the current exception batch (Module D:
  "Summarize a batch of exceptions"), with a refresh button
- Recent Decisions activity feed (approve/reject/correction, who, when)

### 5.2 Exception Queue — `/reviewer/exceptions`
*(Module C — queue, filter, search)*
- Filter bar: exception type (multi-select), severity, status (Open / In Review / Resolved)
- Search by loan ID / borrower ID
- `DataTable`: loan_id, borrower_id, exception type tags, severity badge, date detected, status
- Row click → Loan Review Workspace

### 5.3 Loan Review Workspace — `/reviewer/exceptions/:loanId`
*(Module C detail actions + Module D AI assistant + Required AI Controls — the core screen of the app)*

**Left panel — Loan Record**
- Editable form for allowed fields only, clearly marked vs. locked fields
- Validation Results list — each failed rule in plain language (rule, field, expected vs.
  actual)
- `DiffViewer` when `loan_tape.csv` and `servicer_update.csv` conflict, with the AI's
  recommended reliable value highlighted

**Right panel — AI Review Assistant**
- "Explain this exception" — plain-English `AISuggestionCard`
- "Suggested Correction" — `AISuggestionCard` with proposed values, Accept / Edit / Reject
  buttons (recommendation always shown separate from the final human decision)
- Every AI card's metadata footer: model, prompt (expandable), timestamp — satisfies the
  required AI controls
- "Compare conflicting records" → triggers the `DiffViewer` + AI recommendation
- Severity Classification badge (AI-assigned, reviewer can override)
- "Generate reviewer note" → drafts editable comment text

**Footer bar**
- Comment box (required on Reject / Request Correction)
- Reviewer Action History `Timeline` for this record
- Action buttons: **Approve**, **Reject**, **Request Correction** — each opens a confirm
  `Modal` and writes an audit-trail entry

### 5.4 Rule Builder — `/reviewer/rules` *(stretch)*
*(Module D — "generate validation rules or tests from natural language")*
- Plain-English rule input → AI-generated JSON preview (matches `validation_rules.json` shape)
- "Accept & Add to Ruleset" button
- List of currently active rules

---

## 6. Data Consumer Pages

### 6.1 Dashboard — `/consumer/dashboard`
*(Module G — Data Consumer dashboard)*
- KPI row: Total verified records, `QualityScoreGauge`, Records exported, Last export date
- Verification History `TrendChart`
- Quick links: Verified Records, Audit Trail, Export

### 6.2 Verified Records — `/consumer/verified`
*(Module E list view)*
- `DataTable`: loan_id, verified-by, verification timestamp, record hash (mono, truncated +
  copy button), quality flag
- Filters: date range, verified-by; search bar
- **Export** button (CSV/JSON) with confirm modal — logs a "Verified record exported" audit
  event (Module F)
- Row click → Verified Loan Detail

### 6.3 Verified Loan Detail — `/consumer/verified/:loanId`
*(Module E — full record)*
- Canonical Loan Data card (all normalized fields)
- Source File Reference (which upload, which row — lineage)
- Validation Result summary
- Reviewer Decision card (who, when, action, comment)
- AI Recommendation Used card — original suggestion + whether accepted/edited/rejected
- Verification metadata: timestamp, verified-by, Record Hash (mono, copy button)
- "View Full Audit Trail" → scoped Audit Trail Viewer

### 6.4 Audit Trail Viewer — `/consumer/audit` (or scoped `/consumer/audit/:loanId`)
*(Module F — full event list)*
- Loan selector/search if unscoped
- `Timeline` of every event type: file uploaded, record imported, validation executed,
  exception created, AI recommendation generated, comment added, field edited, approved/
  rejected, verified record created, verified record exported — each entry expandable (e.g.
  field-edit shows before/after)
- Filter by event type; export trail (CSV/JSON)

### 6.5 API Explorer — `/consumer/api`
*(Module H — Verified Records API, and directly covers Demo Flow step "show API response for verified records")*
- Endpoint tabs: `GET /loans`, `/loans/:id`, `/exceptions`, `/verified-loans`,
  `/verified-loans/:id`, `/audit/:loanId`, `/summary`
- Parameter inputs where applicable (e.g. loan ID)
- "Send" → live call, response shown in `JSONViewer`
- Auto-generated cURL snippet with copy button — cheap, high polish for judges

---

## 7. Shared / Cross-Role Screens

### 7.1 AI Development Log — `/ai-log`
*(Directly satisfies the required "AI Development Log" deliverable and the Agentic Coding
Demonstration judging category — rendering it in-app means you can just click to it during
the demo instead of switching to a separate doc.)*
- Tools-used badges (Cursor, Claude Code, etc.)
- Prompt Log table: 5–10 representative prompts, use case, outcome
- Human Review Process write-up (rendered markdown)
- AI-generated code % estimate (single stat)
- "What Was Rejected" — at least 2 case cards: what AI produced, why it was rejected, what was
  done instead
- Lessons Learned section

### 7.2 Notifications Panel (slide-over)
- Recent events relevant to the logged-in role: new exceptions, stale records flagged, upload
  completed, verification completed

---

## 8. Sidebar Nav by Role

| Nav item | Data Operator | Reviewer | Data Consumer |
|---|:---:|:---:|:---:|
| Dashboard | ✅ | ✅ | ✅ |
| Upload Data | ✅ | | |
| Import History | ✅ | | |
| Loan Records | ✅ | | |
| Exception Queue | | ✅ | |
| Rule Builder (stretch) | | ✅ | |
| Verified Records | | | ✅ |
| Audit Trail | | | ✅ |
| API Explorer | | | ✅ |
| AI Development Log | ✅ | ✅ | ✅ |

---

## 9. Traceability — Problem Statement → Screens

| Problem statement item | Screen(s) |
|---|---|
| Module A: Data Ingestion | Upload Data, Import History |
| Module B: Validation Engine | Upload summary, Loan Records status, Loan Review Workspace validation list |
| Module C: Exception Queue | Exception Queue, Loan Review Workspace |
| Module D: AI Review Assistant | Loan Review Workspace (AI panel), Reviewer Dashboard batch summary, Rule Builder |
| Module E: Verified Loan Record | Verified Records, Verified Loan Detail |
| Module F: Audit Trail | Audit Trail Viewer, every action modal that writes an entry |
| Module G: Dashboards | Operator/Reviewer/Consumer dashboards |
| Module H: Verified Records API | API Explorer |
| Required AI Controls | `AISuggestionCard` metadata footer + Accept/Edit/Reject, used everywhere AI output appears |
| Agentic Coding Requirement | AI Development Log |
| 5-Minute Demo Flow (§15 of problem statement) | Role switcher + the exact page sequence above supports it end to end without leaving the app |

---

## 10. Suggested Build Priority

**P0 — must exist for the demo flow to work:**
Login/role select, Operator Upload + Dashboard, Exception Queue, Loan Review Workspace (AI
panel + approve/reject/correct), Consumer Verified Records + Loan Detail, Audit Trail Viewer,
AI Development Log.

**P1 — strengthens judging scores, do next:**
Import History, Loan Records browser, API Explorer, Notifications panel.

**P2 — stretch, only if time remains:**
Rule Builder, cURL snippets in API Explorer, gauge/chart polish, dark mode.