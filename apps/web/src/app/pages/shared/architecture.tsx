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

function SectionHeading({ hint, title }: { hint?: string; title: string }) {
  return (
    <div className="mb-4">
      <h3 className="font-semibold text-[15px] tracking-tight">{title}</h3>
      {hint ? (
        <p className="mt-0.5 text-[12.5px] text-muted-foreground">{hint}</p>
      ) : null}
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

export default function ArchitecturePage() {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-[1000px] space-y-6 p-8">
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

      <p className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/[0.05] px-4 py-3 text-[12.5px] text-muted-foreground">
        <i
          aria-hidden="true"
          className="ri-shield-check-line mt-0.5 text-primary"
        />
        <span>
          <strong className="font-medium text-foreground">
            Architectural Blueprint:
          </strong>{" "}
          This document describes the end-to-end technical design of Luma,
          covering high-scale streaming ingestion, modular validation, strict AI
          human controls, and cryptographic audit hashing.
        </span>
      </p>

      {/* SECTION 1: System Design */}
      <section className="rounded-xl border border-border bg-card p-5">
        <SectionHeading
          hint="Decoupled client-server monorepo with streaming ingestion, session auth, and AI review."
          title="1. System Design & Topology"
        />

        {/* Figure 1: System Topology Visual Diagram */}
        <div className="my-5 rounded-2xl border border-border/80 bg-muted/20 p-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-semibold text-[11px] text-primary uppercase tracking-wider">
              Figure 1. High-Level System Architecture
            </span>
            <span className="rounded-md border border-border bg-background px-2 py-0.5 text-[11px] text-muted-foreground">
              Turborepo Monorepo
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {/* Frontend Block */}
            <div className="flex flex-col justify-between rounded-xl border border-primary/30 bg-primary/[0.03] p-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
                    <i
                      aria-hidden="true"
                      className="ri-window-line text-[14px]"
                    />
                  </span>
                  <div>
                    <h4 className="font-semibold text-[13px]">
                      Client Application
                    </h4>
                    <p className="font-mono text-[11px] text-muted-foreground">
                      apps/web (:3000)
                    </p>
                  </div>
                </div>
                <ul className="mt-3 space-y-1.5 text-[12px] text-muted-foreground">
                  <li className="flex items-center gap-1.5">
                    <i
                      aria-hidden="true"
                      className="ri-check-line text-primary"
                    />{" "}
                    React 19 &amp; Vite SPA
                  </li>
                  <li className="flex items-center gap-1.5">
                    <i
                      aria-hidden="true"
                      className="ri-check-line text-primary"
                    />{" "}
                    React Router 7 Role Scoping
                  </li>
                  <li className="flex items-center gap-1.5">
                    <i
                      aria-hidden="true"
                      className="ri-check-line text-primary"
                    />{" "}
                    TanStack Query (1.5s Polling)
                  </li>
                  <li className="flex items-center gap-1.5">
                    <i
                      aria-hidden="true"
                      className="ri-check-line text-primary"
                    />{" "}
                    Tailwind CSS &amp; shadcn/ui
                  </li>
                </ul>
              </div>
              <div className="mt-4 border-border/60 border-t pt-2.5">
                <span className="text-[11px] text-muted-foreground">
                  Vite Proxy:{" "}
                  <code className="font-mono text-[10.5px]">
                    /api &rarr; :4000
                  </code>
                </span>
              </div>
            </div>

            {/* API / Backend Block */}
            <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-4 shadow-xs">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                    <i
                      aria-hidden="true"
                      className="ri-server-line text-[14px]"
                    />
                  </span>
                  <div>
                    <h4 className="font-semibold text-[13px]">API Gateway</h4>
                    <p className="font-mono text-[11px] text-muted-foreground">
                      apps/api (:4000)
                    </p>
                  </div>
                </div>
                <ul className="mt-3 space-y-1.5 text-[12px] text-muted-foreground">
                  <li className="flex items-center gap-1.5">
                    <i
                      aria-hidden="true"
                      className="ri-check-line text-foreground/80"
                    />{" "}
                    Express 5 &amp; TypeScript
                  </li>
                  <li className="flex items-center gap-1.5">
                    <i
                      aria-hidden="true"
                      className="ri-check-line text-foreground/80"
                    />{" "}
                    Zod Contract Validation
                  </li>
                  <li className="flex items-center gap-1.5">
                    <i
                      aria-hidden="true"
                      className="ri-check-line text-foreground/80"
                    />{" "}
                    Better Auth (HttpOnly Cookie)
                  </li>
                  <li className="flex items-center gap-1.5">
                    <i
                      aria-hidden="true"
                      className="ri-check-line text-foreground/80"
                    />{" "}
                    Streaming Multer (5k Chunks)
                  </li>
                </ul>
              </div>
              <div className="mt-4 border-border/60 border-t pt-2.5">
                <span className="text-[11px] text-muted-foreground">
                  Shared:{" "}
                  <code className="font-mono text-[10.5px]">
                    packages/types
                  </code>
                </span>
              </div>
            </div>

            {/* Storage & AI Services */}
            <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-4 shadow-xs">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                    <i
                      aria-hidden="true"
                      className="ri-database-2-line text-[14px]"
                    />
                  </span>
                  <div>
                    <h4 className="font-semibold text-[13px]">
                      Storage &amp; AI
                    </h4>
                    <p className="font-mono text-[11px] text-muted-foreground">
                      Persistence &amp; LLM
                    </p>
                  </div>
                </div>
                <ul className="mt-3 space-y-1.5 text-[12px] text-muted-foreground">
                  <li className="flex items-center gap-1.5">
                    <i
                      aria-hidden="true"
                      className="ri-check-line text-foreground/80"
                    />{" "}
                    PostgreSQL 16 via Prisma 7
                  </li>
                  <li className="flex items-center gap-1.5">
                    <i
                      aria-hidden="true"
                      className="ri-check-line text-foreground/80"
                    />{" "}
                    Local Disk (luma-uploads buffer)
                  </li>
                  <li className="flex items-center gap-1.5">
                    <i
                      aria-hidden="true"
                      className="ri-check-line text-foreground/80"
                    />{" "}
                    Gemini 3.5 Flash / Mock AI
                  </li>
                  <li className="flex items-center gap-1.5">
                    <i
                      aria-hidden="true"
                      className="ri-check-line text-foreground/80"
                    />{" "}
                    Append-only Audit Trail
                  </li>
                </ul>
              </div>
              <div className="mt-4 border-border/60 border-t pt-2.5">
                <span className="text-[11px] text-muted-foreground">
                  Security:{" "}
                  <code className="font-mono text-[10.5px]">
                    SHA-256 Record Hash
                  </code>
                </span>
              </div>
            </div>
          </div>

          {/* User Role Personas */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-border border-t pt-3">
            <span className="font-medium text-[11px] text-muted-foreground uppercase tracking-wider">
              Role Access Boundaries:
            </span>
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-muted text-foreground/80" variant="outline">
                <i
                  aria-hidden="true"
                  className="ri-user-line mr-1 text-primary"
                />
                Data Operator (Upload &amp; Lineage)
              </Badge>
              <Badge className="bg-muted text-foreground/80" variant="outline">
                <i
                  aria-hidden="true"
                  className="ri-user-star-line mr-1 text-amber-500"
                />
                Reviewer (Queue, AI Triage &amp; Verify)
              </Badge>
              <Badge className="bg-muted text-foreground/80" variant="outline">
                <i
                  aria-hidden="true"
                  className="ri-shield-user-line mr-1 text-emerald-500"
                />
                Data Consumer (Verified Records &amp; Export)
              </Badge>
            </div>
          </div>
        </div>

        {/* Stack Table */}
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-left text-[12.5px]">
            <thead className="border-border border-b bg-muted/40 font-medium text-[11px] text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="px-4 py-2.5">Layer</th>
                <th className="px-4 py-2.5">Technology Choice</th>
                <th className="px-4 py-2.5">Engineering Rationale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {STACK_LAYERS.map((row) => (
                <tr className="hover:bg-muted/20" key={row.layer}>
                  <td className="px-4 py-2.5 font-medium text-foreground">
                    {row.layer}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-[12px] text-primary">
                    {row.choice}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {row.reason}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* SECTION 2: Data Model */}
      <section className="rounded-xl border border-border bg-card p-5">
        <SectionHeading
          hint="6 relational entities with strict foreign keys, cuid identifiers, and append-only audit persistence."
          title="2. Data Model & Entity Specifications"
        />

        {/* Figure 2: ERD Diagram */}
        <div className="my-5 rounded-2xl border border-border/80 bg-muted/20 p-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-semibold text-[11px] text-primary uppercase tracking-wider">
              Figure 2. Entity Relationships &amp; Cardinality
            </span>
            <span className="rounded-md border border-border bg-background px-2 py-0.5 text-[11px] text-muted-foreground">
              PostgreSQL 16 (Prisma 7)
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {DATA_MODEL_TABLES.map((table) => (
              <div
                className="rounded-xl border border-border bg-card p-4 shadow-xs"
                key={table.name}
              >
                <div className="flex items-center justify-between border-border border-b pb-2">
                  <h4 className="font-bold font-mono text-[13px] text-primary">
                    {table.name}
                  </h4>
                  <span className="text-[10px] text-muted-foreground">
                    {table.columns.length} columns
                  </span>
                </div>
                <p className="mt-2 text-[11.5px] text-muted-foreground leading-snug">
                  {table.description}
                </p>
                <ul className="mt-3 space-y-1 font-mono text-[11px]">
                  {table.columns.slice(0, 4).map((col) => (
                    <li
                      className="flex items-center justify-between text-muted-foreground"
                      key={col.name}
                    >
                      <span className="text-foreground/85">{col.name}</span>
                      <span className="text-[10px] opacity-70">{col.type}</span>
                    </li>
                  ))}
                  {table.columns.length > 4 ? (
                    <li className="text-[10px] text-muted-foreground italic">
                      + {table.columns.length - 4} more attributes...
                    </li>
                  ) : null}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 3: Validation Engine */}
      <section className="rounded-xl border border-border bg-card p-5">
        <SectionHeading
          hint="10 per-loan verification rules and 3 batch-scoped duplicate checks executed in 5,000-row chunks."
          title="3. Validation Engine & Anomaly Detection"
        />

        <div className="grid gap-2.5 sm:grid-cols-2">
          {VALIDATION_RULES.map((rule) => (
            <div
              className="flex items-start justify-between gap-3 rounded-xl border border-border/80 bg-muted/20 p-3.5 text-[12px]"
              key={rule.name}
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-[12.5px] text-foreground">
                    {rule.name}
                  </p>
                  <code className="rounded-sm bg-muted px-1.5 py-0.2 font-mono text-[10px] text-muted-foreground">
                    {rule.code}
                  </code>
                </div>
                <p className="mt-1 text-[11.5px] text-muted-foreground leading-relaxed">
                  {rule.description}
                </p>
              </div>
              <Badge
                className="shrink-0 font-mono text-[10px] capitalize"
                variant={getSeverityVariant(rule.severity)}
              >
                {rule.severity}
              </Badge>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 4: AI Feature & Controls */}
      <section className="rounded-xl border border-border bg-card p-5">
        <SectionHeading
          hint="Strict human-in-the-loop safeguards. AI never silently updates loan or exception data."
          title="4. AI Review Assistant & Safety Architecture"
        />

        <div className="grid gap-3 sm:grid-cols-2">
          {AI_CONTROLS.map((ctrl) => (
            <div
              className="rounded-xl border border-border bg-muted/15 p-4 shadow-xs"
              key={ctrl.title}
            >
              <div className="flex items-center gap-2.5">
                <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <i aria-hidden="true" className={cn(ctrl.icon, "text-sm")} />
                </span>
                <h4 className="font-semibold text-[13px]">{ctrl.title}</h4>
              </div>
              <p className="mt-2 text-[12px] text-muted-foreground leading-relaxed">
                {ctrl.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 5: End-to-End Verification Pipeline */}
      <section className="rounded-xl border border-border bg-card p-5">
        <SectionHeading
          hint="From raw ingestion to immutable SHA-256 verified loan records and append-only audit trail."
          title="5. Verification Flow & Tamper-Evidence"
        />

        {/* Figure 3: Flowchart */}
        <div className="my-5 rounded-2xl border border-border/80 bg-muted/20 p-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-semibold text-[11px] text-primary uppercase tracking-wider">
              Figure 3. End-to-End Verification &amp; Audit Lifecycle
            </span>
            <span className="rounded-md border border-border bg-background px-2 py-0.5 text-[11px] text-muted-foreground">
              Lifecycle Pipeline
            </span>
          </div>

          <div className="space-y-3">
            {[
              {
                desc: "Operator uploads loan tape, servicer update, or manifest. Multer stages file to disk.",
                event: "FILE_UPLOADED",
                role: "Data Operator",
                step: "1. Staging & Chunk Ingestion",
              },
              {
                desc: "Parser streams rows in 5k chunks. Ingestion time errors saved to metadata.failedRows.",
                event: "LOAN_IMPORTED",
                role: "Ingestion Engine",
                step: "2. Schema Normalization",
              },
              {
                desc: "10 per-loan rules & batch duplicate checks execute. Flagged records produce Exceptions.",
                event: "VALIDATION_RUN · EXCEPTION_CREATED",
                role: "Validation Engine",
                step: "3. Automated Validation",
              },
              {
                desc: "AI explains anomalies, compares conflicting sources, and drafts reviewer notes.",
                event: "AI_RECOMMENDATION",
                role: "AI Review Assistant",
                step: "4. AI Triage & Explanation",
              },
              {
                desc: "Reviewer explicitly Accepts, Edits, or Rejects AI recommendation and closes exceptions.",
                event: "FIELD_EDITED · LOAN_APPROVED",
                role: "Reviewer",
                step: "5. Human Review Decision",
              },
              {
                desc: "Canonical snapshot captured and SHA-256 hash computed. VerifiedLoan record created.",
                event: "VERIFIED_RECORD_CREATED",
                role: "System Verifier",
                step: "6. Hashing & Verification",
              },
              {
                desc: "Consumer accesses verified portfolio, inspects audit trail, and exports CSV.",
                event: "RECORD_EXPORTED",
                role: "Data Consumer",
                step: "7. Consumer Access & Export",
              },
            ].map((st, i) => (
              <div
                className="flex items-start gap-3 rounded-xl border border-border bg-card p-3.5 shadow-xs"
                key={st.step}
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 font-bold font-mono text-[12px] text-primary">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h5 className="font-semibold text-[13px] text-foreground">
                      {st.step}
                    </h5>
                    <span className="rounded-md border border-border bg-muted/60 px-2 py-0.5 font-medium text-[10.5px] text-muted-foreground">
                      {st.role}
                    </span>
                  </div>
                  <p className="mt-1 text-[12px] text-muted-foreground">
                    {st.desc}
                  </p>
                  <div className="mt-2 flex items-center gap-1.5 font-mono text-[10.5px] text-primary">
                    <i
                      aria-hidden="true"
                      className="ri-git-commit-line text-muted-foreground"
                    />
                    <span>Audit Event: {st.event}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Audit Events Summary */}
        <div className="mt-4 border-border border-t pt-4">
          <h4 className="mb-3 font-semibold text-[13px] tracking-tight">
            Append-Only Audit Events (11 Event Types)
          </h4>
          <div className="grid gap-2 sm:grid-cols-2">
            {AUDIT_EVENTS.map((ev) => (
              <div
                className="flex items-center justify-between gap-2 rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-[11.5px]"
                key={ev.event}
              >
                <span className="font-medium font-mono text-[11px] text-foreground">
                  {ev.event}
                </span>
                <span className="truncate text-[11px] text-muted-foreground">
                  {ev.summary}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 6: Trade-offs Table */}
      <section className="rounded-xl border border-border bg-card p-5">
        <SectionHeading
          hint="13 architectural decisions, alternatives considered, and rationale."
          title="6. Engineering Trade-offs"
        />

        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-left text-[12.5px]">
            <thead className="border-border border-b bg-muted/40 font-medium text-[11px] text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="px-4 py-2.5">Decision</th>
                <th className="px-4 py-2.5">Chosen Approach</th>
                <th className="px-4 py-2.5">Alternative Considered</th>
                <th className="px-4 py-2.5">Rationale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {TRADE_OFFS.map((item) => (
                <tr className="hover:bg-muted/20" key={item.decision}>
                  <td className="px-4 py-3 font-medium text-foreground">
                    {item.decision}
                  </td>
                  <td className="px-4 py-3 font-medium text-primary">
                    {item.chosen}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {item.alternative}
                  </td>
                  <td className="px-4 py-3 text-[12px] text-muted-foreground leading-relaxed">
                    {item.rationale}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
