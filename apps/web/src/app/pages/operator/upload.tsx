import { PageHeader } from "@/components/dashboard/page-header";
import { CsvDropzone } from "@/components/upload/csv-dropzone";

/* Spec §4.2 — Upload Data (Module A ingestion flow entry point). */

const ACCEPTED = [
  {
    description:
      "Primary loan tape export containing borrower and credit profile data",
    name: "loan_tape.csv",
    type: "Loan tape",
  },
  {
    description: "Servicer balance, delinquency status, and payment updates",
    name: "servicer_update.csv",
    type: "Servicer update",
  },
  {
    description: "Collateral document index and verification manifests",
    name: "document_manifest.csv",
    type: "Document manifest",
  },
  {
    description:
      "Fannie Mae Single-Family Loan Performance — pipe-delimited, 108 cols, registration-gated (sample at capitalmarkets.fanniemae.com). Folded per loanId (first-wins immutable, latest-wins balance/rate/delinquency).",
    name: "fannie_mae.csv",
    type: "Fannie Mae",
  },
  {
    description:
      "Freddie Mac Single-Family Loan-Level — pipe-delimited, 108 cols, free non-commercial via Clarity. Same fold and tolerant ≥40-col gate.",
    name: "freddie_mac.csv",
    type: "Freddie Mac",
  },
];

export default function UploadPage() {
  return (
    <div className="mx-auto max-w-[880px] space-y-6 p-8">
      <PageHeader
        description="Drop a file to parse, validate, and import it. Headers are auto-detected."
        eyebrow="Data Operator"
        title="Upload Data"
      />

      <CsvDropzone />

      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <header className="border-border border-b px-6 py-4">
          <h3 className="font-semibold text-[14px] tracking-tight">
            Accepted file formats
          </h3>
          <p className="text-[12px] text-muted-foreground">
            Standard CSV schemas supported by the ingestion pipeline
          </p>
        </header>
        <ul className="divide-y divide-border">
          {ACCEPTED.map((file) => (
            <li
              className="flex items-center justify-between gap-4 px-6 py-3.5"
              key={file.name}
            >
              <div className="flex items-center gap-3.5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/60 text-muted-foreground shadow-xs">
                  <i
                    aria-hidden="true"
                    className="ri-file-excel-2-line text-[16px]"
                  />
                </span>
                <div>
                  <p className="font-medium font-mono text-[13px] text-foreground">
                    {file.name}
                  </p>
                  <p className="text-[12px] text-muted-foreground">
                    {file.description}
                  </p>
                </div>
              </div>
              <span className="rounded-md border border-border bg-muted/60 px-2.5 py-0.5 font-medium text-[11px] text-muted-foreground">
                {file.type}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
