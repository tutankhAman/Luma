# AI Development Log

This log documents our use of AI and agentic coding tools during the development of Luma (Loan Data Verification Copilot), as required by the hackathon prompt.

> [!IMPORTANT]
> This is a **live document** — append prompts, decisions, and rejected outputs as they happen during Phases 0–5. Do not backfill at hour 45. §10 requires 5–10 representative prompts and ≥2 rejected-output examples; judges score authenticity.

## 1. Tools Used
*   **Antigravity (Powered by Gemini 3.1 Pro / Claude Sonnet 4.6):** Used as our primary agentic architect and pair programmer. It helped design the system architecture, write the API contracts, generate the 48-hour implementation plan, and research library integrations (Better Auth).
*   *(Add other tools here, e.g., Cursor, GitHub Copilot, ChatGPT)*

## 2. Use Cases
We leveraged AI across the full stack lifecycle:
*   **Architecture & Planning:** Processing the 300-line hackathon prompt to generate a 6-phase implementation plan split between Frontend (Person A) and Backend (Person B).
*   **API & Schema Design:** Generating the full Prisma schema and Zod API contracts.
*   **Library Research:** Using Context7 via MCP (Model Context Protocol) to pull live documentation for `better-auth` integration with a decoupled Express backend.
*   *(Add UI generation, test generation, debugging examples here as you build)*

## 3. Representative Prompts (5-10 required)
Here are some of the key prompts we used to drive the development:

1.  **System Architecture Design:**
    > *"based on the problem.md, I want you to design an architecture and flow.md as well as an api-contract.md . I want you to choose best possible arhcitecture setup for the same, you can grill me if you need more info. Frontend: Next.js, TypeScript, Tailwind, shadcn/ui, TanStack Query. Backend: Node.js, Express, TypeScript, Zod, Prisma. Database: PostgreSQL. auth: better auth."*
2.  **Implementation Planning:**
    > *"the development of this would be divided between two people A and B, A will be dealing mainly with the frontend part of the development, B will deal with everything else. Create a very thorough and detailed phase wise plan of implementation, showing clear segragation between the roles, we have 48 hrs. Ensure you take every feature, every guidelines into account."*
3.  **Enterprise Scalability Check:**
    > *"would we need a monorepo in the first place? wouldnt next.js by default work for it? ... what if the sheet is much more than 1000 rows, what if its a million"*
4.  **Dataset Reality Check (problem.md §4-6 vs ingestion):**
    > *"just downloaded one in /Downloads. check if thats the valid csv" — then realizing the public Freddie Mac sample at `problem.md:4` is pipe-delimited (`|`) with 108 columns while our ingestion at `ingestion.service.ts` expects comma `,` + 21-column header (`problem.md:6`). We asked whether the pipeline was "worthless" if it only handled one file type.*
5.  **Fault-Tolerance Audit (hackathon graceful handling):**
    > *"how fault tolerant and graceful handling is in our current ingestion pipeline in terms of the context of hackathon" — asking to evaluate stream vs in-memory, BOM, empty rows, failedRows cap, chunked `createMany(skipDuplicates)`, `markFailed` vs `processing` zombie.*
6.  **Synthetic Fixture Generation (problem.md §5 & §7):**
    > *"create me a csv for testing, we'll go with option A" — generating `loan_tape.csv` (137 rows + header, seed 42) covering all 15 intentional data issues at `problem.md:7` to land in either `failedRows` (ingestion) or validation exceptions.*

## 4. Human Review Process
*   **AI-Generated Code Percentage Estimate:** ~65% architecture/contracts/scaffolding by AI; ~35% human hardening (reviews, edge cases, logging, overwrite control, failedRows UX).
*   **Review Process:** We treated the AI as a junior developer proposing PRs. All AI-generated architectures were manually reviewed against the hackathon constraints (`problem.md` §1-16). We established explicit "Handoff Contracts" between Person A and Person B so that AI-generated frontend code could be tested against AI-generated backend endpoints independently. Every PR required `bun x ultracite check` + `turbo check-types` + `turbo build` via `lefthook` pre-commit.

### 4.1 What we faced per problem.md and how we verified
*   **§4 vs §5 dataset ambiguity (public pipe vs synthetic comma):** The organizer package (`loan_tape.csv` 1k-5k, 21 columns at §6) is comma-delimited with a header; the public Fannie/Freddie samples (§4) are registration-gated, large, and—critically—pipe-delimited (`|` with 108 columns) with no header (sample at `~/Downloads/sf-loan-performance-data-sample.csv`, 757 lines, `|100023020488|082009|R|Other|...|55000.00|...`). Our ingestion `ingestion.service.ts:540-551` expects `csv-parser` + `BOM_REGEX` + comma + `loan_id,borrower_id,...source_system`. Uploading the raw public file would normalize every row to `failedRows: missing loan_id and borrower_id`. Per `problem.md:52` we standardized on the synthetic packet (Recommendation: *"Use synthetic organizer-provided dataset for judging"*). For visibility we added `ingestion.service.ts:589-610,623-633` header validation: logs `[Ingestion] Detected CSV headers`, checks `KNOWN_COLUMNS`, fails gracefully with `CSV header mismatch` and later `All N rows failed normalization` / `empty or contains no valid data rows` instead of silent `done` with 0 rows.
*   **§6 strict 21-column schema vs tolerance:** At `problem.md:6` the 21 fields are normative. We made `cleanString`/`parseDecimal`/`parseIntSafe` tolerant (trim, BOM, commas, empty→null, garbage numbers→null) but `parseDateField` (`ingestion.service.ts:159-169`) throws on `invalid date format <field>: <value>` so bad dates surface in `failedRows` with row number + rawData + reason, capped at 1,000 (`MAX_FAILED_ROWS_STORED`).
*   **§7 intentional issues split (ingestion vs validation):** 2 issues (missing ids, invalid date format) fail at ingestion (`failedRows`); the remaining 13 (`maturity before origination`, `negative principal`, `balance > principal`, `rate out of range`, `status vs dpd`, `missing document_status`, `stale`, `invalid state`, `closed+balance`, 3 duplicate variants) pass ingestion as `null`-tolerant data and are caught by `validation.service.ts` (10 per-loan rules + 3 batch-scoped duplicate checks). Verified by generating `loan_tape.csv` (137 rows, seed 42) and asserting `failedCount` 8 vs validation `exceptionCount` distribution per type/severity.
*   **§8 Module A ingestion at scale (1k→1M rows):** `problem.md:8 Module A` requires streaming. AI first proposed in-memory `papaparse`; we rejected it (OOM) and kept `fs.createReadStream.pipe(csv-parser)` + chunk `5000` + `pause/resume` + `prisma.loan.createMany({ skipDuplicates: true })` + `UploadBatch.processedCount` checkpoint (`ingestion.service.ts:351-385`). Verified with 50k-row synthetic load; memory flat.
*   **§8 Module F audit trail / §10 AI controls (§9):** Every state transition writes `AuditLog` (`FILE_UPLOADED`, chunk `LOAN_IMPORTED`, `INGESTION_COMPLETED`, `VALIDATION_RUN`, `EXCEPTION_CREATED`) and operator polling is every 2s (`use-uploads.ts`). AI recommendations are stored on `Exception.aiRecommendation` but never silently applied (§9: *"AI output must not silently change data"*)—reviewer must `accept/edited/rejected` via `POST /exceptions/:id/decision`.

## 5. What Was Rejected (Required)
We actively challenged and rejected AI output when it didn't meet enterprise standards.

*   **Rejected Output 1: In-Memory CSV Parsing (OOM Risk)**
    *   **What AI proposed:** Initially, the AI proposed using Next.js API routes or `papaparse` in Express to read the uploaded CSV files directly into memory before bulk-inserting them into PostgreSQL.
    *   **Why we rejected it:** We challenged the AI by asking how it would handle a 1-million-row CSV. The AI admitted that the initial in-memory design would cause an Out-Of-Memory (OOM) crash and Vercel serverless timeouts.
    *   **How we fixed it:** We forced a redesign to use a **Stream + Batch** architecture. We switched to `csv-parser` with `fs.createReadStream`, accumulating rows into chunks of 5,000, and pausing the stream to run `prisma.createMany`. We also added a `processedCount` cursor to the database to ensure the job could resume if the Express server crashed mid-stream.
*   **Rejected Output 2: Pipe-Delimited Public Data Without Header Validation (Silent Wrong Data)**
    *   **What AI proposed:** When we pointed the model at the public Freddie Mac sample (`sf-loan-performance-data-sample.csv`), it initially suggested widening `ingestion.service.ts` to accept any delimiter/header and inserting whatever parsed into `Loan`.
    *   **Why we rejected it:** That would ingest 757 pipe-rows as 757 loans with all-null fields (every row sharing empty `loan_id`), poisoning validation/verification and violating `problem.md:6`. `problem.md:52` says to use the synthetic packet for judging; public data is optional stretch.
    *   **How we fixed it:** We kept the strict 21-column `KNOWN_COLUMNS` contract but added explicit header validation (`ingestion.service.ts:589-633`): log detected headers, check `KNOWN_COLUMNS`, emit `CSV header mismatch: ... Expected loan_id, borrower_id...`, and fail the batch (`lastSuccessfulRowEnd`, `deleteMany` rollback, `status: failed`) instead of `done` with 0/758 valid. Plus a synthetic `loan_tape.csv` (137 rows, seed 42) was generated for the happy-path demo.
*   **Rejected Output 3: Validation `failedValidation = totalExceptions` (Inflated Counts)**
    *   **What AI proposed:** Early `routes/uploads.ts:338 summary` set `failedValidation = exception.count` (exception rows), so a loan with 3 exceptions counted as 3 failures; `passedValidation = totalImported - totalExceptions` could go negative.
    *   **Why we rejected it:** `problem.md:8 Module B` semantics are per-loan (a loan either passes or fails); a reviewer counts distinct loans needing attention, not exception rows.
    *   **How we fixed it:** Changed to `prisma.loan.count({ where: { sourceBatchId, exceptions: { some: {} } } })` so `failedValidation` = distinct loans with ≥1 exception and `passedValidation = max(0, totalImported - failedValidation)`. 

## 6. Lessons Learned
*   **Where AI helped most:** System design and boilerplate generation. The AI was exceptionally fast at translating a raw markdown problem statement into a structured set of database tables and REST endpoints. It also quickly scaffolds validation rules covering `problem.md:7`’s 15 intentional issues once the 21-column contract is pinned.
*   **Where human engineering judgment was necessary:** Scalability, fault tolerance, and data-contract fidelity. The AI tends to choose the "easiest" path first (loading a whole file into memory; accepting any delimiter/header; counting exceptions instead of loans). It requires strong human prompting to design for edge cases, crashes, and to keep the ingestion/validation boundary clean per `problem.md:7-8` (what fails at ingestion vs what fails at validation).
