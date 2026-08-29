import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AI_CONTROLS,
  ARCHITECTURE_META,
  AUDIT_EVENTS,
  DATA_MODEL_TABLES,
  STACK_LAYERS,
  TRADE_OFFS,
  VALIDATION_RULES,
} from "@/content/architecture";
import { cn } from "@/lib/utils";

/* ─── helpers ─────────────────────────────────────────────────────────────── */

function SectionHeading({ hint, title }: { hint?: string; title: string }) {
  return (
    <div className="mb-5">
      <h3 className="font-bold text-[16px] tracking-tight">{title}</h3>
      {hint ? (
        <p className="mt-1 text-[13px] text-muted-foreground leading-relaxed">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function FigureLabel({ badge, label }: { badge: string; label: string }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <span className="font-bold text-[11px] text-primary uppercase tracking-[0.12em]">
        {label}
      </span>
      <span className="rounded-full border border-border bg-background px-2.5 py-0.5 font-medium text-[10.5px] text-muted-foreground">
        {badge}
      </span>
    </div>
  );
}

function getSeverityVariant(severity: string) {
  if (severity === "critical") {
    return "destructive";
  }
  if (severity === "high") {
    return "default";
  }
  return "secondary";
}

/* ─── Figure 1: System Topology ──────────────────────────────────────────── */

function ArrowRight({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-0.5 self-start pt-6">
      {label ? (
        <span className="whitespace-nowrap font-mono text-[9px] text-primary">
          {label}
        </span>
      ) : null}
      <svg
        aria-hidden="true"
        className="text-border"
        fill="none"
        height="12"
        viewBox="0 0 44 12"
        width="44"
      >
        <line
          stroke="currentColor"
          strokeWidth="1.5"
          x1="2"
          x2="36"
          y1="6"
          y2="6"
        />
        <polygon fill="currentColor" points="30,2 42,6 30,10" />
      </svg>
    </div>
  );
}

function ArrowDown({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 py-1">
      {label ? (
        <span className="font-mono text-[9px] text-muted-foreground">
          {label}
        </span>
      ) : null}
      <svg
        aria-hidden="true"
        className="text-border"
        fill="none"
        height="28"
        viewBox="0 0 12 28"
        width="12"
      >
        <line
          stroke="currentColor"
          strokeWidth="1.5"
          x1="6"
          x2="6"
          y1="2"
          y2="22"
        />
        <polygon fill="currentColor" points="2,17 6,26 10,17" />
      </svg>
    </div>
  );
}

function TopologyNode({
  accent,
  children,
  icon,
  mono,
  title,
}: {
  accent?: string;
  children?: React.ReactNode;
  icon: string;
  mono: string;
  title: string;
}) {
  return (
    <div
      className={cn(
        "flex min-w-[140px] flex-col rounded-xl border-2 p-3.5 shadow-sm",
        accent ?? "border-border bg-card"
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        <i aria-hidden="true" className={cn(icon, "text-[18px]")} />
        <div>
          <p className="font-bold text-[12px] text-foreground leading-tight">
            {title}
          </p>
          <p className="font-mono text-[9.5px] text-muted-foreground">{mono}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function SystemTopologyDiagram() {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[700px] space-y-0">
        {/* Row 1: Browser → Proxy → API */}
        <div className="flex items-start gap-0">
          {/* Browser */}
          <TopologyNode
            accent="border-primary/50 bg-primary/[0.04]"
            icon="ri-window-line text-primary"
            mono="React 19 · :3000"
            title="Browser SPA"
          >
            <ul className="space-y-1">
              {[
                "React Router 7 (role routing)",
                "TanStack Query (1.5s poll)",
                "Tailwind + shadcn/ui",
              ].map((t) => (
                <li
                  className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground"
                  key={t}
                >
                  <i
                    aria-hidden="true"
                    className="ri-checkbox-blank-circle-line text-[8px] text-primary"
                  />
                  {t}
                </li>
              ))}
            </ul>
            <div className="mt-3 space-y-1 border-border/60 border-t pt-2">
              {[
                {
                  color: "text-primary",
                  icon: "ri-upload-2-line",
                  label: "data_operator",
                },
                {
                  color: "text-amber-500",
                  icon: "ri-eye-line",
                  label: "reviewer",
                },
                {
                  color: "text-emerald-500",
                  icon: "ri-bar-chart-line",
                  label: "data_consumer",
                },
              ].map((r) => (
                <span
                  className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-2 py-0.5 font-medium text-[10px] text-foreground/80"
                  key={r.label}
                >
                  <i
                    aria-hidden="true"
                    className={cn(r.icon, r.color, "text-[11px]")}
                  />
                  {r.label}
                </span>
              ))}
            </div>
          </TopologyNode>

          <ArrowRight label="HTTPS + withCredentials" />

          {/* Vite Proxy */}
          <TopologyNode
            accent="border-border bg-muted/40"
            icon="ri-route-line text-muted-foreground"
            mono="/api → http://localhost:4000"
            title="Vite Dev Proxy"
          >
            <p className="text-[10.5px] text-muted-foreground leading-snug">
              Transparent proxy strips{" "}
              <code className="font-mono text-[10px]">/api</code> prefix.
              Enables same-origin cookies in dev.
            </p>
          </TopologyNode>

          <ArrowRight />

          {/* API */}
          <TopologyNode
            accent="border-border bg-card"
            icon="ri-server-line text-foreground/60"
            mono="Express 5 · :4000"
            title="API Gateway"
          >
            <ul className="space-y-1">
              {[
                "Zod request validation",
                "Better Auth sessions",
                "requireAuth middleware",
                "requireRole RBAC",
                "Multer file staging",
                "Streaming ingestion",
              ].map((t) => (
                <li
                  className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground"
                  key={t}
                >
                  <i
                    aria-hidden="true"
                    className="ri-checkbox-blank-circle-line text-[8px] text-foreground/40"
                  />
                  {t}
                </li>
              ))}
            </ul>
          </TopologyNode>
        </div>

        {/* Arrow down from API (right-aligned) */}
        <div className="flex justify-end" style={{ paddingRight: "calc(0px)" }}>
          <div className="flex w-full items-center">
            <div className="flex-1" />
            {/* The API box is ~220px wide. We center the arrow under it */}
            <div className="flex flex-col items-center" style={{ width: 220 }}>
              <ArrowDown label="Internal service calls" />
            </div>
          </div>
        </div>

        {/* Row 2: 3 backend services */}
        <div className="flex items-stretch justify-end gap-3">
          {[
            {
              badge: "PostgreSQL 16",
              color: "text-sky-500",
              icon: "ri-database-2-line",
              items: [
                "ACID transactions",
                "Prisma 7 ORM",
                "prisma.$transaction",
                "@@unique constraints",
              ],
              label: "Primary Database",
              mono: "prisma/schema.prisma",
              nodeAccent: "border-sky-400/30 bg-sky-50/[0.03]",
            },
            {
              badge: "os.tmpdir()/luma-uploads",
              color: "text-orange-400",
              icon: "ri-hard-drive-2-line",
              items: [
                "Multer disk storage",
                "5k-row streaming chunks",
                "500 MB file limit",
                ".csv only",
              ],
              label: "File Buffer",
              mono: "Local disk staging",
              nodeAccent: "border-orange-400/30 bg-orange-50/[0.03]",
            },
            {
              badge: "Vercel AI SDK",
              color: "text-violet-500",
              icon: "ri-sparkling-line",
              items: [
                "Gemini 3.5 Flash Lite",
                "generateObject + Zod",
                "20 req/min rate limit",
                "MOCK_AI=true fallback",
              ],
              label: "AI Review",
              mono: "Gemini + Mock fallback",
              nodeAccent: "border-violet-400/30 bg-violet-50/[0.03]",
            },
          ].map((svc) => (
            <div
              className={cn(
                "flex flex-1 flex-col rounded-xl border-2 p-3.5 shadow-xs",
                svc.nodeAccent
              )}
              key={svc.label}
            >
              <div className="mb-2 flex items-center gap-2">
                <i
                  aria-hidden="true"
                  className={cn(svc.icon, "text-[18px]", svc.color)}
                />
                <div>
                  <p className="font-bold text-[12px] text-foreground">
                    {svc.label}
                  </p>
                  <p className="font-mono text-[9.5px] text-muted-foreground">
                    {svc.badge}
                  </p>
                </div>
              </div>
              <ul className="space-y-1">
                {svc.items.map((item) => (
                  <li
                    className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground"
                    key={item}
                  >
                    <i
                      aria-hidden="true"
                      className={cn(
                        "ri-arrow-right-s-line text-[11px]",
                        svc.color
                      )}
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Auth note footer */}
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/[0.03] px-4 py-2.5">
          <i
            aria-hidden="true"
            className="ri-lock-line shrink-0 text-[14px] text-primary"
          />
          <p className="text-[11px] text-muted-foreground">
            <span className="font-semibold text-foreground/80">Auth:</span>{" "}
            Better Auth · HttpOnly SameSite=Lax cookie sessions via Prisma
            adapter · <code className="font-mono text-[10px]">requireAuth</code>{" "}
            + <code className="font-mono text-[10px]">requireRole</code>{" "}
            middleware on every protected route · Session resolved server-side
            via{" "}
            <code className="font-mono text-[10px]">auth.api.getSession</code>
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── Figure 2: ERD ──────────────────────────────────────────────────────── */

function getErdRowClass(isKey: boolean | undefined, isFk: boolean | undefined) {
  if (isKey) {
    return "border-border/40 border-t text-[10.5px] bg-primary/[0.03]";
  }
  if (isFk) {
    return "border-border/40 border-t text-[10.5px] bg-amber-50/[0.03]";
  }
  return "border-border/40 border-t text-[10.5px]";
}

function ErdFieldDot({ isKey, isFk }: { isKey?: boolean; isFk?: boolean }) {
  if (isKey) {
    return (
      <span className="inline-block size-1.5 shrink-0 rounded-full bg-primary" />
    );
  }
  if (isFk) {
    return (
      <span className="inline-block size-1.5 shrink-0 rounded-full bg-amber-400" />
    );
  }
  return (
    <span className="inline-block size-1.5 shrink-0 rounded-full bg-border" />
  );
}

function ErdDiagram() {
  const entities = [
    {
      border: "border-primary/40",
      fields: [
        { key: true, name: "id", type: "String (cuid)" },
        { name: "email", type: "String (UK)" },
        { name: "name", type: "String" },
        { name: "role", type: "operator|reviewer|consumer" },
        { name: "emailVerified", type: "Boolean" },
      ],
      header: "bg-primary/10 text-primary",
      label: "User",
    },
    {
      border: "border-sky-400/40",
      fields: [
        { key: true, name: "id", type: "String (cuid)" },
        { fk: true, name: "uploadedById", type: "→ User.id" },
        { name: "fileName", type: "String" },
        { name: "fileType", type: "loan_tape|servicer…" },
        { name: "status", type: "pending|processing|done|failed" },
        { name: "recordCount / processedCount", type: "Int" },
        { name: "metadata", type: "Json (failedRows…)" },
      ],
      header: "bg-sky-500/10 text-sky-600",
      label: "UploadBatch",
    },
    {
      border: "border-amber-400/40",
      fields: [
        { key: true, name: "id", type: "String (cuid)" },
        { fk: true, name: "sourceBatchId", type: "→ UploadBatch.id" },
        { name: "loanId", type: "String? (business key)" },
        { name: "validationStatus", type: "pending|passed|failed|review" },
        { name: "sourceRowNumber", type: "Int (lineage)" },
        { name: "21 business fields", type: "Decimal / String / Date" },
      ],
      header: "bg-amber-500/10 text-amber-600",
      label: "Loan",
    },
    {
      border: "border-red-400/40",
      fields: [
        { key: true, name: "id", type: "String (cuid)" },
        { fk: true, name: "loanId", type: "→ Loan.id" },
        { name: "exceptionType", type: "9 categories" },
        { name: "severity", type: "critical|high|medium|low" },
        { name: "status", type: "open|approved|rejected|corrected" },
        { name: "aiRecommendation", type: "Json? (suggestion, confidence)" },
      ],
      header: "bg-red-500/10 text-red-600",
      label: "Exception",
    },
    {
      border: "border-emerald-400/40",
      fields: [
        { key: true, name: "id", type: "String (cuid)" },
        { fk: true, name: "loanId", type: "→ Loan.id (unique)" },
        { fk: true, name: "verifiedById", type: "→ User.id" },
        { name: "canonicalData", type: "Json (21-field snapshot)" },
        { name: "recordHash", type: "SHA-256 fingerprint" },
        { name: "aiRecommendationUsed", type: "Boolean" },
      ],
      header: "bg-emerald-500/10 text-emerald-600",
      label: "VerifiedLoan",
    },
    {
      border: "border-violet-400/40",
      fields: [
        { key: true, name: "id", type: "String (cuid)" },
        { fk: true, name: "actorId", type: "→ User.id?" },
        { fk: true, name: "loanId", type: "→ Loan.id?" },
        { fk: true, name: "batchId", type: "→ UploadBatch.id?" },
        { fk: true, name: "exceptionId", type: "→ Exception.id?" },
        { name: "eventType", type: "11 immutable types" },
        { name: "metadata", type: "Json (before/after diffs…)" },
      ],
      header: "bg-violet-500/10 text-violet-600",
      label: "AuditLog",
    },
  ];

  const relations = [
    { card: "1 ‥‥ N", from: "User", label: "uploads", to: "UploadBatch" },
    { card: "1 ‥‥ N", from: "UploadBatch", label: "contains", to: "Loan" },
    { card: "1 ‥‥ N", from: "Loan", label: "generates", to: "Exception" },
    {
      card: "1 ‥‥ 0|1",
      from: "Loan",
      label: "verified as",
      to: "VerifiedLoan",
    },
    { card: "1 ‥‥ N", from: "User", label: "verifies", to: "VerifiedLoan" },
    {
      card: "N ‥‥ 1",
      from: "AuditLog",
      label: "references",
      to: "all entities",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {entities.map((e) => (
          <div
            className={cn(
              "overflow-hidden rounded-xl border-2 bg-card shadow-xs",
              e.border
            )}
            key={e.label}
          >
            <div
              className={cn(
                "px-3 py-2 font-bold font-mono text-[12.5px]",
                e.header
              )}
            >
              {e.label}
            </div>
            <table className="w-full">
              <tbody>
                {e.fields.map((f) => (
                  <tr className={getErdRowClass(f.key, f.fk)} key={f.name}>
                    <td className="flex items-center gap-1.5 py-1.5 pr-2 pl-3 font-mono font-semibold text-foreground/85">
                      <ErdFieldDot isFk={f.fk} isKey={f.key} />
                      {f.name}
                    </td>
                    <td className="py-1.5 pr-3 text-right font-mono text-[9.5px] text-muted-foreground">
                      {f.type}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {/* Relationship row */}
      <div className="rounded-xl border border-border bg-muted/20 p-4">
        <p className="mb-3 font-semibold text-[11px] text-muted-foreground uppercase tracking-wider">
          Relationships &amp; Cardinality
        </p>
        <div className="flex flex-wrap gap-2">
          {relations.map((r) => (
            <div
              className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-[11px] shadow-xs"
              key={r.from + r.to}
            >
              <span className="font-bold font-mono text-foreground/80">
                {r.from}
              </span>
              <span className="text-muted-foreground">{r.card}</span>
              <span className="text-[10.5px] text-muted-foreground italic">
                {r.label}
              </span>
              <span className="text-muted-foreground">{r.card}</span>
              <span className="font-bold font-mono text-foreground/80">
                {r.to}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-4 border-border border-t pt-3">
          {[
            { color: "bg-primary", label: "Primary Key" },
            { color: "bg-amber-400", label: "Foreign Key" },
            { color: "bg-border", label: "Regular field" },
          ].map((l) => (
            <span
              className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground"
              key={l.label}
            >
              <span
                className={cn("inline-block size-2 rounded-full", l.color)}
              />
              {l.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Figure 3: Flowchart ─────────────────────────────────────────────────── */

function VerificationFlowchart() {
  const steps = [
    {
      accent: "border-primary/40 bg-primary/[0.04]",
      audit: "FILE_UPLOADED",
      desc: "Operator uploads CSV (loan tape, servicer update, or manifest). Multer stages file to os.tmpdir()/luma-uploads (500 MB limit). UploadBatch record created with status=pending. API returns 202 Accepted immediately — no blocking.",
      icon: "ri-upload-cloud-line",
      iconColor: "text-primary",
      num: "01",
      numBg: "bg-primary/10 text-primary border-primary/30",
      role: "Data Operator",
      title: "File Upload & Staging",
    },
    {
      accent: "border-sky-400/40 bg-sky-50/[0.03]",
      audit: "LOAN_IMPORTED",
      desc: "fs.createReadStream → csv-parser streams rows in 5,000-row chunks with constant O(1) memory. Synthetic loan tapes: 21-col comma-delimited. Public Fannie/Freddie: pipe-delimited 108-col with tolerant ≥40 col gate. @@unique([sourceBatchId, sourceRowNumber]) + skipDuplicates = idempotent crash-safe replay.",
      icon: "ri-flow-chart",
      iconColor: "text-sky-500",
      num: "02",
      numBg: "bg-sky-500/10 text-sky-600 border-sky-400/30",
      role: "Ingestion Engine",
      title: "Schema Normalization & Chunk Ingestion",
    },
    {
      accent: "border-amber-400/40 bg-amber-50/[0.03]",
      audit: "VALIDATION_RUN · EXCEPTION_CREATED",
      desc: "Phase 1: 10 per-loan field rules (missing fields, balance logic, date ordering, rate bounds, payment status, closed-loan balance, state codes, stale detection, source conflicts). Phase 2: 3 batch-scoped DB groupBy duplicate checks. Each failure creates an Exception row linked to Loan.",
      icon: "ri-shield-check-line",
      iconColor: "text-amber-500",
      num: "03",
      numBg: "bg-amber-500/10 text-amber-600 border-amber-400/30",
      role: "Validation Engine",
      title: "Automated Validation (13 Rules)",
    },
    {
      accent: "border-violet-400/40 bg-violet-50/[0.03]",
      audit: "AI_RECOMMENDATION",
      desc: "Gemini 3.5 Flash Lite via Vercel AI SDK generateObject. Structured Zod schema output guarantees { suggestion, confidence, reasoning, proposedValue } — hallucinated JSON rejected at runtime. Every call appends AI_RECOMMENDATION to AuditLog with model ID, timestamp, prompt summary. 20 req/min rate limit; MOCK_AI=true for offline/CI runs.",
      icon: "ri-sparkling-line",
      iconColor: "text-violet-500",
      num: "04",
      numBg: "bg-violet-500/10 text-violet-600 border-violet-400/30",
      role: "AI Review Assistant",
      title: "AI Triage & Structured Explanation",
    },
    {
      accent: "border-orange-400/40 bg-orange-50/[0.03]",
      audit: "FIELD_EDITED · LOAN_APPROVED · LOAN_REJECTED",
      desc: "CRITICAL CONTROL: AI never silently mutates data. Reviewer must explicitly click Accept, Edit (with override value), or Reject on each recommendation card. Every decision writes FIELD_EDITED, LOAN_APPROVED, or LOAN_REJECTED audit event with full before/after diff metadata stored in JSON.",
      icon: "ri-user-star-line",
      iconColor: "text-orange-500",
      num: "05",
      numBg: "bg-orange-500/10 text-orange-600 border-orange-400/30",
      role: "Human Reviewer (HITL)",
      title: "Human Review Decision",
    },
    {
      accent: "border-emerald-400/40 bg-emerald-50/[0.03]",
      audit: "VERIFIED_RECORD_CREATED",
      desc: "All 21 validated loan fields serialized to deterministic key-sorted JSON canonical snapshot. SHA-256(canonicalData) computed as recordHash — tamper-evident without blockchain. VerifiedLoan record + AuditLog inserted inside a single prisma.$transaction — both commit or both rollback atomically.",
      icon: "ri-fingerprint-line",
      iconColor: "text-emerald-500",
      num: "06",
      numBg: "bg-emerald-500/10 text-emerald-600 border-emerald-400/30",
      role: "System Verifier",
      title: "SHA-256 Canonical Hashing",
    },
    {
      accent: "border-blue-400/40 bg-blue-50/[0.03]",
      audit: "RECORD_EXPORTED",
      desc: "Data consumer accesses immutable verified portfolio with per-loan audit trail inspection. CSV/JSON export includes canonicalData + recordHash. The hash allows offline integrity verification of exported records without requiring the Luma backend.",
      icon: "ri-bar-chart-box-line",
      iconColor: "text-blue-500",
      num: "07",
      numBg: "bg-blue-500/10 text-blue-600 border-blue-400/30",
      role: "Data Consumer",
      title: "Consumer Access & Certified Export",
    },
  ];

  return (
    <div className="relative pl-2">
      {/* Vertical spine */}
      <div
        aria-hidden="true"
        className="absolute top-[52px] left-[26px] w-0.5 bg-border"
        style={{ height: "calc(100% - 80px)", zIndex: 0 }}
      />

      <div className="relative space-y-0" style={{ zIndex: 1 }}>
        {steps.map((st, idx) => (
          <div key={st.num}>
            <div
              className={cn(
                "flex gap-4 rounded-2xl border-2 bg-card p-4 shadow-xs",
                st.accent
              )}
            >
              {/* Step bubble */}
              <div className="shrink-0 pt-0.5">
                <div
                  className={cn(
                    "flex size-11 items-center justify-center rounded-full border-2 bg-background font-bold font-mono text-[13px] shadow-sm",
                    st.numBg
                  )}
                >
                  {st.num}
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <i
                      aria-hidden="true"
                      className={cn(st.icon, "text-[15px]", st.iconColor)}
                    />
                    <h5 className="font-bold text-[13.5px] text-foreground">
                      {st.title}
                    </h5>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full border px-2.5 py-0.5 font-semibold text-[10.5px]",
                      st.numBg
                    )}
                  >
                    {st.role}
                  </span>
                </div>

                <p className="text-[12px] text-muted-foreground leading-relaxed">
                  {st.desc}
                </p>

                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  <span className="font-semibold text-[9.5px] text-muted-foreground uppercase tracking-wider">
                    Audit:
                  </span>
                  {st.audit.split(" · ").map((ev) => (
                    <code
                      className="rounded-md border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-foreground/80"
                      key={ev}
                    >
                      {ev}
                    </code>
                  ))}
                </div>
              </div>
            </div>

            {idx < steps.length - 1 ? (
              <div
                aria-hidden="true"
                className="flex items-center py-1 pl-[23px]"
              >
                <svg
                  aria-hidden="true"
                  className="text-border"
                  fill="none"
                  height="20"
                  viewBox="0 0 12 20"
                  width="12"
                >
                  <line
                    stroke="currentColor"
                    strokeWidth="1.5"
                    x1="6"
                    x2="6"
                    y1="0"
                    y2="14"
                  />
                  <polygon fill="currentColor" points="2,10 6,18 10,10" />
                </svg>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main Page ───────────────────────────────────────────────────────────── */

export default function ArchitecturePage() {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-[1020px] space-y-8 p-8">
      <PageHeader
        action={
          <Button
            className="gap-1.5 rounded-full px-3.5 shadow-xs"
            onClick={() => navigate(-1)}
            size="sm"
            variant="outline"
          >
            <i aria-hidden="true" className="ri-arrow-left-line" />
            Back
          </Button>
        }
        description={ARCHITECTURE_META.description}
        eyebrow={ARCHITECTURE_META.eyebrow}
        title={ARCHITECTURE_META.title}
      />

      {/* Top meta banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/25 bg-primary/[0.04] px-5 py-3.5">
        <div className="flex items-center gap-3">
          <i
            aria-hidden="true"
            className="ri-shield-check-fill shrink-0 text-[20px] text-primary"
          />
          <div>
            <p className="font-bold text-[13px] text-foreground">
              Luma Loan Data Verification Copilot
            </p>
            <p className="text-[11.5px] text-muted-foreground">
              Intain Campus FinTech Challenge 2026 · Architecture Note v1.0
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { icon: "ri-database-2-line", label: "6 Entities" },
            { icon: "ri-shield-check-line", label: "13 Validation Rules" },
            { icon: "ri-git-commit-line", label: "11 Audit Events" },
            { icon: "ri-sparkling-line", label: "AI + HITL" },
            { icon: "ri-fingerprint-line", label: "SHA-256 Tamper-Proof" },
          ].map((tag) => (
            <span
              className="flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 font-medium text-[11px] text-foreground/80 shadow-xs"
              key={tag.label}
            >
              <i
                aria-hidden="true"
                className={cn(tag.icon, "text-[12px] text-primary")}
              />
              {tag.label}
            </span>
          ))}
        </div>
      </div>

      {/* ── 1. System Topology ────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-border bg-card p-6 shadow-xs">
        <SectionHeading
          hint="Turborepo monorepo. Long-lived streaming kept on Express to avoid frontend timeout and memory pressure. Auth resolves server-side on every request."
          title="1. System Architecture & Topology"
        />
        <div className="rounded-2xl border border-border/70 bg-muted/10 p-5">
          <FigureLabel
            badge="Turborepo Monorepo"
            label="Figure 1 · High-Level Component Topology"
          />
          <SystemTopologyDiagram />
        </div>

        <div className="mt-6 overflow-hidden rounded-xl border border-border">
          <table className="w-full text-left text-[12.5px]">
            <thead className="border-border border-b bg-muted/40">
              <tr>
                {["Layer", "Technology", "Rationale"].map((h) => (
                  <th
                    className="px-4 py-2.5 font-semibold text-[10.5px] text-muted-foreground uppercase tracking-wider"
                    key={h}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {STACK_LAYERS.map((row) => (
                <tr className="hover:bg-muted/20" key={row.layer}>
                  <td className="whitespace-nowrap px-4 py-3 font-bold text-foreground">
                    {row.layer}
                  </td>
                  <td className="px-4 py-3 font-mono text-[11.5px] text-primary">
                    {row.choice}
                  </td>
                  <td className="px-4 py-3 text-[12px] text-muted-foreground">
                    {row.reason}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── 2. Data Model ─────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-border bg-card p-6 shadow-xs">
        <SectionHeading
          hint="Six relational entities. All IDs are cuid. No soft deletes. AuditLog is append-only and references every entity via nullable FKs."
          title="2. Data Model & Entity Relationships"
        />
        <div className="rounded-2xl border border-border/70 bg-muted/10 p-5">
          <FigureLabel
            badge="PostgreSQL 16 · Prisma 7"
            label="Figure 2 · Entity Relationship Diagram"
          />
          <ErdDiagram />
        </div>

        <div className="mt-6 space-y-2">
          <p className="mb-3 font-semibold text-[11px] text-muted-foreground uppercase tracking-wider">
            Table Schema Details (expand each)
          </p>
          {DATA_MODEL_TABLES.map((table) => (
            <details
              className="group overflow-hidden rounded-xl border border-border"
              key={table.name}
            >
              <summary className="flex cursor-pointer select-none list-none items-center justify-between px-4 py-3 hover:bg-muted/20">
                <div className="flex items-center gap-3">
                  <span className="font-bold font-mono text-[13px] text-primary">
                    {table.name}
                  </span>
                  <Badge
                    className="px-1.5 py-0 font-mono text-[10px]"
                    variant="outline"
                  >
                    {table.columns.length} cols
                  </Badge>
                </div>
                <div className="flex items-center gap-3">
                  <span className="hidden text-[11.5px] text-muted-foreground sm:block">
                    {table.description}
                  </span>
                  <i
                    aria-hidden="true"
                    className="ri-arrow-down-s-line text-[16px] text-muted-foreground transition-transform group-open:rotate-180"
                  />
                </div>
              </summary>
              <div className="border-border border-t bg-muted/10 px-4 py-3">
                <div className="overflow-hidden rounded-lg border border-border">
                  <table className="w-full text-[11.5px]">
                    <thead className="bg-muted/40">
                      <tr>
                        {["Column", "Type", "Notes"].map((h) => (
                          <th
                            className="px-3 py-2 text-left font-semibold text-[10px] text-muted-foreground uppercase tracking-wider"
                            key={h}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {table.columns.map((col) => (
                        <tr className="hover:bg-muted/10" key={col.name}>
                          <td className="px-3 py-2 font-bold font-mono text-foreground/90">
                            {col.name}
                          </td>
                          <td className="px-3 py-2 font-mono text-[10.5px] text-primary">
                            {col.type}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {col.notes ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {table.indexes.length > 0 ? (
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    <span className="font-semibold text-foreground/70">
                      Indexes:
                    </span>{" "}
                    {table.indexes.join(", ")}
                  </p>
                ) : null}
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* ── 3. Validation Engine ──────────────────────────────────────────── */}
      <section className="rounded-2xl border border-border bg-card p-6 shadow-xs">
        <SectionHeading
          hint="Two-phase execution: per-loan field validation followed by batch-scoped DB duplicate detection. Each failure creates an Exception record."
          title="3. Validation Engine & Anomaly Detection"
        />
        <div className="space-y-5">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <i
                  aria-hidden="true"
                  className="ri-file-list-3-line text-[12px] text-primary"
                />
              </span>
              <p className="font-bold text-[13px]">
                Phase 1 · Per-Loan Field Checks
              </p>
              <Badge className="px-1.5 font-mono text-[10px]" variant="outline">
                10 rules
              </Badge>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {VALIDATION_RULES.filter((r) => r.category === "Per-Loan").map(
                (rule) => (
                  <div
                    className="flex items-start justify-between gap-3 rounded-xl border border-border bg-muted/10 p-3.5"
                    key={rule.name}
                  >
                    <div className="min-w-0">
                      <div className="mb-1 flex items-center gap-2">
                        <p className="font-bold text-[12.5px] text-foreground">
                          {rule.name}
                        </p>
                        <code className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[9.5px] text-muted-foreground">
                          {rule.code}
                        </code>
                      </div>
                      <p className="text-[11.5px] text-muted-foreground leading-relaxed">
                        {rule.description}
                      </p>
                    </div>
                    <Badge
                      className="mt-0.5 shrink-0 font-mono text-[10px] capitalize"
                      variant={getSeverityVariant(rule.severity)}
                    >
                      {rule.severity}
                    </Badge>
                  </div>
                )
              )}
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                <i
                  aria-hidden="true"
                  className="ri-group-line text-[12px] text-amber-500"
                />
              </span>
              <p className="font-bold text-[13px]">
                Phase 2 · Batch-Scoped Duplicate Detection
              </p>
              <Badge className="px-1.5 font-mono text-[10px]" variant="outline">
                3 rules · DB groupBy
              </Badge>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {VALIDATION_RULES.filter(
                (r) => r.category === "Batch-Scoped"
              ).map((rule) => (
                <div
                  className="flex flex-col gap-2 rounded-xl border border-amber-400/30 bg-amber-50/[0.03] p-3.5"
                  key={rule.name}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-[12px] text-foreground">
                      {rule.name}
                    </p>
                    <Badge
                      className="font-mono text-[10px] capitalize"
                      variant={getSeverityVariant(rule.severity)}
                    >
                      {rule.severity}
                    </Badge>
                  </div>
                  <p className="text-[11.5px] text-muted-foreground leading-relaxed">
                    {rule.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. AI Safety Architecture ─────────────────────────────────────── */}
      <section className="rounded-2xl border border-border bg-card p-6 shadow-xs">
        <SectionHeading
          hint="AI is advisory only. No silent mutations. Every invocation is audited and rate-limited."
          title="4. AI Review Assistant & Safety Architecture"
        />

        <div className="grid gap-4 sm:grid-cols-2">
          {AI_CONTROLS.map((ctrl) => (
            <div
              className="rounded-xl border border-border bg-muted/10 p-4"
              key={ctrl.title}
            >
              <div className="mb-2.5 flex items-center gap-2.5">
                <span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-xs">
                  <i
                    aria-hidden="true"
                    className={cn(ctrl.icon, "text-[15px]")}
                  />
                </span>
                <h4 className="font-bold text-[13px]">{ctrl.title}</h4>
              </div>
              <p className="text-[12px] text-muted-foreground leading-relaxed">
                {ctrl.text}
              </p>
            </div>
          ))}
        </div>

        {/* HITL flow */}
        <div className="mt-5 overflow-x-auto rounded-xl border border-primary/20 bg-primary/[0.03] p-4">
          <p className="mb-3 font-bold text-[11px] text-primary uppercase tracking-wider">
            Human-in-the-Loop Decision Flow
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-lg border border-violet-400/30 bg-violet-500/10 px-3 py-1.5 font-bold text-[11px] text-violet-600">
              AI generates suggestion
            </span>
            <svg
              aria-hidden="true"
              className="shrink-0 text-muted-foreground"
              fill="none"
              height="10"
              viewBox="0 0 24 10"
              width="24"
            >
              <line
                stroke="currentColor"
                strokeWidth="1.5"
                x1="2"
                x2="18"
                y1="5"
                y2="5"
              />
              <polygon fill="currentColor" points="13,2 21,5 13,8" />
            </svg>
            <span className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-1.5 font-bold text-[11px] text-amber-600">
              Reviewer reads card
            </span>
            <svg
              aria-hidden="true"
              className="shrink-0 text-muted-foreground"
              fill="none"
              height="10"
              viewBox="0 0 24 10"
              width="24"
            >
              <line
                stroke="currentColor"
                strokeWidth="1.5"
                x1="2"
                x2="18"
                y1="5"
                y2="5"
              />
              <polygon fill="currentColor" points="13,2 21,5 13,8" />
            </svg>
            <span className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 font-bold text-[11px] text-emerald-600">
              ✓ Accept
            </span>
            <span className="rounded-lg border border-blue-400/30 bg-blue-500/10 px-3 py-1.5 font-bold text-[11px] text-blue-600">
              ✎ Edit + override
            </span>
            <span className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-1.5 font-bold text-[11px] text-red-600">
              ✗ Reject
            </span>
            <svg
              aria-hidden="true"
              className="shrink-0 text-muted-foreground"
              fill="none"
              height="10"
              viewBox="0 0 24 10"
              width="24"
            >
              <line
                stroke="currentColor"
                strokeWidth="1.5"
                x1="2"
                x2="18"
                y1="5"
                y2="5"
              />
              <polygon fill="currentColor" points="13,2 21,5 13,8" />
            </svg>
            <span className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 font-bold text-[11px] text-primary">
              AuditLog event written
            </span>
          </div>
        </div>
      </section>

      {/* ── 5. Verification Pipeline ──────────────────────────────────────── */}
      <section className="rounded-2xl border border-border bg-card p-6 shadow-xs">
        <SectionHeading
          hint="From raw CSV drop to immutable SHA-256 verified loan records. Every step emits an append-only AuditLog event."
          title="5. End-to-End Verification Pipeline"
        />

        <div className="rounded-2xl border border-border/70 bg-muted/10 p-5">
          <FigureLabel
            badge="7-Step Lifecycle"
            label="Figure 3 · Verification & Audit Trail Flow"
          />
          <VerificationFlowchart />
        </div>

        <div className="mt-6">
          <p className="mb-3 font-semibold text-[11px] text-muted-foreground uppercase tracking-wider">
            Append-Only Audit Event Reference
            <span className="ml-2 rounded-full bg-muted px-2 py-0.5 font-medium text-[10px] normal-case">
              11 types
            </span>
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {AUDIT_EVENTS.map((ev) => (
              <div
                className="flex items-start gap-3 rounded-xl border border-border/70 bg-muted/15 px-3.5 py-2.5"
                key={ev.event}
              >
                <i
                  aria-hidden="true"
                  className="ri-git-commit-line mt-0.5 shrink-0 text-[13px] text-primary"
                />
                <div>
                  <code className="font-bold font-mono text-[11px] text-foreground">
                    {ev.event}
                  </code>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {ev.summary}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 6. Trade-offs ─────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-border bg-card p-6 shadow-xs">
        <SectionHeading
          hint="13 explicit architectural decisions with alternatives considered and engineering rationale."
          title="6. Engineering Trade-offs"
        />

        <div className="space-y-3">
          {TRADE_OFFS.map((item, i) => (
            <div
              className="rounded-xl border border-border bg-muted/10 p-4"
              key={item.decision}
            >
              <div className="mb-3 flex flex-wrap items-start gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10 font-bold font-mono text-[11px] text-primary">
                  {i + 1}
                </span>
                <h4 className="font-bold text-[13px] text-foreground">
                  {item.decision}
                </h4>
              </div>
              <div className="grid gap-3 pl-9 sm:grid-cols-3">
                <div>
                  <p className="mb-1.5 font-bold text-[10.5px] text-emerald-500 uppercase tracking-wider">
                    ✓ Chosen
                  </p>
                  <p className="font-mono text-[11.5px] text-foreground/85 leading-relaxed">
                    {item.chosen}
                  </p>
                </div>
                <div>
                  <p className="mb-1.5 font-bold text-[10.5px] text-muted-foreground uppercase tracking-wider">
                    ⊘ Alternative
                  </p>
                  <p className="text-[11.5px] text-muted-foreground leading-relaxed">
                    {item.alternative}
                  </p>
                </div>
                <div>
                  <p className="mb-1.5 font-bold text-[10.5px] text-primary uppercase tracking-wider">
                    → Rationale
                  </p>
                  <p className="text-[11.5px] text-muted-foreground leading-relaxed">
                    {item.rationale}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
