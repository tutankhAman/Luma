import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import {
  AI_CONTROLS,
  ARCHITECTURE_META,
  AUDIT_EVENTS,
  DATA_MODEL_TABLES,
  STACK_LAYERS,
  TRADE_OFFS,
  VALIDATION_RULES,
} from "@/content/architecture";

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
      <span className="font-bold text-[11px] text-foreground/80 uppercase tracking-[0.12em]">
        {label}
      </span>
      <span className="rounded-full border border-border bg-background px-2.5 py-0.5 font-medium text-[10.5px] text-muted-foreground">
        {badge}
      </span>
    </div>
  );
}

/* ─── Figure 1: System Topology Image ────────────────────────────────────── */

function SystemTopologyFigure() {
  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-border bg-background p-2 shadow-xs">
        <img
          alt="Luma System Architecture Diagram showing Browser SPA, Vite Dev Proxy, Express 5 API Gateway, PostgreSQL 16, Local Disk Buffer, and Gemini AI Assistant"
          className="h-auto w-full rounded-lg object-contain"
          height="720"
          src="/assets/architecture.webp"
          width="1280"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-border border-t pt-3 text-[11.5px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <i
            aria-hidden="true"
            className="ri-shield-keyhole-line text-foreground/70"
          />
          <span>
            Auth: <strong>Better Auth (HttpOnly Cookie, SameSite=Lax)</strong>
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <i aria-hidden="true" className="ri-speed-line text-foreground/70" />
          <span>
            Streaming: <strong>5k-row chunks O(1) memory buffer</strong>
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <i
            aria-hidden="true"
            className="ri-sparkling-line text-foreground/70"
          />
          <span>
            AI: <strong>Gemini 3.5 Flash Lite + Mock offline fallback</strong>
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─── Figure 2: Entity Relationship Diagram ──────────────────────────────── */

interface ErdField {
  isFk?: boolean;
  isKey?: boolean;
  name: string;
  type: string;
}

interface ErdEntity {
  fields: ErdField[];
  label: string;
}

function ErdBullet({ isFk, isKey }: { isFk?: boolean; isKey?: boolean }) {
  if (isKey) {
    return (
      <span className="inline-block size-1.5 shrink-0 rounded-full bg-foreground" />
    );
  }
  if (isFk) {
    return (
      <span className="inline-block size-1.5 shrink-0 rounded-full bg-muted-foreground" />
    );
  }
  return (
    <span className="inline-block size-1.5 shrink-0 rounded-full bg-border" />
  );
}

function ErdFieldRow({ field }: { field: ErdField }) {
  return (
    <div className="flex items-center justify-between gap-2 border-border/40 border-t px-3 py-1.5 text-[11px]">
      <div className="flex min-w-0 items-center gap-1.5">
        <ErdBullet isFk={field.isFk} isKey={field.isKey} />
        <span className="truncate font-bold font-mono text-foreground/90">
          {field.name}
        </span>
      </div>
      <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
        {field.type}
      </span>
    </div>
  );
}

function ErdDiagram() {
  const entities: ErdEntity[] = [
    {
      fields: [
        { isKey: true, name: "id", type: "String (PK)" },
        { name: "email", type: "String (UK)" },
        { name: "name", type: "String" },
        { name: "role", type: "Enum" },
        { name: "emailVerified", type: "Boolean" },
      ],
      label: "User",
    },
    {
      fields: [
        { isKey: true, name: "id", type: "String (PK)" },
        { isFk: true, name: "uploadedById", type: "→ User.id" },
        { name: "fileName", type: "String" },
        { name: "fileType", type: "String" },
        { name: "status", type: "String" },
        { name: "recordCount", type: "Int" },
        { name: "metadata", type: "Json" },
      ],
      label: "UploadBatch",
    },
    {
      fields: [
        { isKey: true, name: "id", type: "String (PK)" },
        { isFk: true, name: "sourceBatchId", type: "→ Batch.id" },
        { name: "loanId", type: "String (BK)" },
        { name: "validationStatus", type: "String" },
        { name: "sourceRowNumber", type: "Int" },
        { name: "+21 Business Fields", type: "Decimal/Date" },
      ],
      label: "Loan",
    },
    {
      fields: [
        { isKey: true, name: "id", type: "String (PK)" },
        { isFk: true, name: "loanId", type: "→ Loan.id" },
        { name: "exceptionType", type: "String" },
        { name: "severity", type: "Enum" },
        { name: "status", type: "Enum" },
        { name: "aiRecommendation", type: "Json?" },
      ],
      label: "Exception",
    },
    {
      fields: [
        { isKey: true, name: "id", type: "String (PK)" },
        { isFk: true, name: "loanId", type: "→ Loan.id (UK)" },
        { isFk: true, name: "verifiedById", type: "→ User.id" },
        { name: "canonicalData", type: "Json" },
        { name: "recordHash", type: "SHA-256" },
        { name: "aiRecommendationUsed", type: "Boolean" },
      ],
      label: "VerifiedLoan",
    },
    {
      fields: [
        { isKey: true, name: "id", type: "String (PK)" },
        { isFk: true, name: "actorId", type: "→ User.id?" },
        { isFk: true, name: "loanId", type: "→ Loan.id?" },
        { isFk: true, name: "batchId", type: "→ Batch.id?" },
        { name: "eventType", type: "Enum (11 types)" },
        { name: "metadata", type: "Json" },
      ],
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {entities.map((e) => (
          <div
            className="overflow-hidden rounded-xl border border-border bg-card shadow-xs"
            key={e.label}
          >
            <div className="bg-muted/40 px-3 py-2 font-bold font-mono text-[12.5px] text-foreground">
              {e.label}
            </div>
            <div>
              {e.fields.map((f) => (
                <ErdFieldRow field={f} key={f.name} />
              ))}
            </div>
          </div>
        ))}
      </div>

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
              <span className="font-bold font-mono text-foreground/90">
                {r.from}
              </span>
              <span className="text-muted-foreground">{r.card}</span>
              <span className="text-[10.5px] text-muted-foreground italic">
                {r.label}
              </span>
              <span className="text-muted-foreground">{r.card}</span>
              <span className="font-bold font-mono text-foreground/90">
                {r.to}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-4 border-border border-t pt-3">
          {[
            { color: "bg-foreground", label: "Primary Key" },
            { color: "bg-muted-foreground", label: "Foreign Key" },
            { color: "bg-border", label: "Attribute" },
          ].map((l) => (
            <span
              className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground"
              key={l.label}
            >
              <span className={`inline-block size-2 rounded-full ${l.color}`} />
              {l.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Figure 3: End-to-End Flow Diagram ───────────────────────────────────── */

function EndToEndFlowFigure() {
  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-border bg-background p-2 shadow-xs">
        <img
          alt="Luma End-to-End Verification Pipeline Flowchart from CSV upload to verified export"
          className="mx-auto h-auto w-full max-w-[720px] rounded-lg object-contain"
          height="1440"
          src="/assets/e2e.webp"
          width="720"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-border border-t pt-3 text-[11.5px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <i
            aria-hidden="true"
            className="ri-git-commit-line text-foreground/70"
          />
          <span>
            Audit Trail: <strong>11 immutable append-only event types</strong>
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <i
            aria-hidden="true"
            className="ri-fingerprint-line text-foreground/70"
          />
          <span>
            Integrity: <strong>SHA-256 canonical hash per verified loan</strong>
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <i
            aria-hidden="true"
            className="ri-file-download-line text-foreground/70"
          />
          <span>
            Export: <strong>Certified CSV / JSON with audit lineage</strong>
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ───────────────────────────────────────────────────────────── */

export default function ArchitecturePage() {
  return (
    <div className="mx-auto max-w-[1020px] space-y-8 p-8">
      <PageHeader
        description={ARCHITECTURE_META.description}
        eyebrow={ARCHITECTURE_META.eyebrow}
        title={ARCHITECTURE_META.title}
      />

      {/* Top meta banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-5 py-3.5 shadow-xs">
        <div className="flex items-center gap-3">
          <i
            aria-hidden="true"
            className="ri-shield-check-line shrink-0 text-[20px] text-foreground/80"
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
              className="flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1 font-medium text-[11px] text-foreground/80"
              key={tag.label}
            >
              <i
                aria-hidden="true"
                className={`text-[12px] text-foreground/70 ${tag.icon}`}
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
            badge="Component Topology"
            label="Figure 1 · System Architecture Diagram"
          />
          <SystemTopologyFigure />
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
                  <td className="px-4 py-3 font-mono text-[11.5px] text-foreground/90">
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
                  <span className="font-bold font-mono text-[13px] text-foreground">
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
                          <td className="px-3 py-2 font-mono text-[10.5px] text-foreground/80">
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
              <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-muted">
                <i
                  aria-hidden="true"
                  className="ri-file-list-3-line text-[12px] text-foreground"
                />
              </span>
              <p className="font-bold text-[13px]">
                Phase 1 · Per-Loan Field Checks
              </p>
              <Badge className="px-1.5 font-mono text-[10px]" variant="outline">
                10 rules
              </Badge>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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
                      variant="outline"
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
              <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-muted">
                <i
                  aria-hidden="true"
                  className="ri-group-line text-[12px] text-foreground"
                />
              </span>
              <p className="font-bold text-[13px]">
                Phase 2 · Batch-Scoped Duplicate Detection
              </p>
              <Badge className="px-1.5 font-mono text-[10px]" variant="outline">
                3 rules · DB groupBy
              </Badge>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {VALIDATION_RULES.filter(
                (r) => r.category === "Batch-Scoped"
              ).map((rule) => (
                <div
                  className="flex flex-col gap-2 rounded-xl border border-border bg-muted/10 p-3.5"
                  key={rule.name}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-[12px] text-foreground">
                      {rule.name}
                    </p>
                    <Badge
                      className="font-mono text-[10px] capitalize"
                      variant="outline"
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {AI_CONTROLS.map((ctrl) => (
            <div
              className="rounded-xl border border-border bg-muted/10 p-4"
              key={ctrl.title}
            >
              <div className="mb-2.5 flex items-center gap-2.5">
                <span className="flex size-8 items-center justify-center rounded-xl bg-muted text-foreground shadow-xs">
                  <i
                    aria-hidden="true"
                    className={`text-[15px] ${ctrl.icon}`}
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
        <div className="mt-5 overflow-x-auto rounded-xl border border-border bg-muted/20 p-4">
          <p className="mb-3 font-bold text-[11px] text-foreground/80 uppercase tracking-wider">
            Human-in-the-Loop Decision Flow
          </p>
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="rounded-lg border border-border bg-background px-3 py-1.5 font-semibold text-foreground/90">
              AI generates suggestion
            </span>
            <i
              aria-hidden="true"
              className="ri-arrow-right-line text-muted-foreground"
            />
            <span className="rounded-lg border border-border bg-background px-3 py-1.5 font-semibold text-foreground/90">
              Reviewer inspects card
            </span>
            <i
              aria-hidden="true"
              className="ri-arrow-right-line text-muted-foreground"
            />
            <span className="rounded-lg border border-border bg-background px-3 py-1.5 font-semibold text-foreground/90">
              Accept · Edit Override · Reject
            </span>
            <i
              aria-hidden="true"
              className="ri-arrow-right-line text-muted-foreground"
            />
            <span className="rounded-lg border border-border bg-background px-3 py-1.5 font-semibold text-foreground/90">
              AuditLog event written
            </span>
          </div>
        </div>
      </section>

      {/* ── 5. End-to-End Verification Pipeline ───────────────────────────── */}
      <section className="rounded-2xl border border-border bg-card p-6 shadow-xs">
        <SectionHeading
          hint="From raw CSV drop to immutable SHA-256 verified loan records. Every step emits an append-only AuditLog event."
          title="5. End-to-End Verification Pipeline"
        />

        <div className="rounded-2xl border border-border/70 bg-muted/10 p-5">
          <FigureLabel
            badge="Lifecycle Pipeline"
            label="Figure 3 · End-to-End Verification Flow"
          />
          <EndToEndFlowFigure />
        </div>

        <div className="mt-6">
          <p className="mb-3 font-semibold text-[11px] text-muted-foreground uppercase tracking-wider">
            Append-Only Audit Event Reference
            <span className="ml-2 rounded-full bg-muted px-2 py-0.5 font-medium text-[10px] normal-case">
              11 types
            </span>
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {AUDIT_EVENTS.map((ev) => (
              <div
                className="flex items-start gap-3 rounded-xl border border-border/70 bg-muted/15 px-3.5 py-2.5"
                key={ev.event}
              >
                <i
                  aria-hidden="true"
                  className="ri-git-commit-line mt-0.5 shrink-0 text-[13px] text-foreground/70"
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
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-border bg-background font-bold font-mono text-[11px] text-foreground/80">
                  {i + 1}
                </span>
                <h4 className="font-bold text-[13px] text-foreground">
                  {item.decision}
                </h4>
              </div>
              <div className="grid grid-cols-1 gap-3 pl-9 sm:grid-cols-3">
                <div>
                  <p className="mb-1.5 font-bold text-[10.5px] text-muted-foreground uppercase tracking-wider">
                    Chosen
                  </p>
                  <p className="font-mono text-[11.5px] text-foreground/90 leading-relaxed">
                    {item.chosen}
                  </p>
                </div>
                <div>
                  <p className="mb-1.5 font-bold text-[10.5px] text-muted-foreground uppercase tracking-wider">
                    Alternative
                  </p>
                  <p className="text-[11.5px] text-muted-foreground leading-relaxed">
                    {item.alternative}
                  </p>
                </div>
                <div>
                  <p className="mb-1.5 font-bold text-[10.5px] text-muted-foreground uppercase tracking-wider">
                    Rationale
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
