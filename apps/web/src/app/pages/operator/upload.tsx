import { PageHeader } from "@/components/dashboard/page-header";
import { CsvDropzone } from "@/components/upload/csv-dropzone";

/* Spec §4.2 — Upload Data (Module A ingestion flow entry point). */

const ACCEPTED = [
  {
    description: "Primary loan tape export from the source system",
    name: "loan_tape.csv",
  },
  {
    description: "Servicer balance and status refresh",
    name: "servicer_update.csv",
  },
  {
    description: "Collateral document index",
    name: "document_manifest.csv",
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
      <div className="rounded-xl border border-border bg-card p-6">
        <CsvDropzone />
      </div>
      <section className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-3 font-semibold text-[14px] tracking-tight">
          Accepted files
        </h3>
        <ul className="space-y-2.5">
          {ACCEPTED.map((file) => (
            <li className="flex items-start gap-3" key={file.name}>
              <i
                aria-hidden="true"
                className="ri-file-excel-2-line mt-0.5 text-muted-foreground"
              />
              <div>
                <p className="font-mono text-[12.5px]">{file.name}</p>
                <p className="text-[12px] text-muted-foreground">
                  {file.description}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
