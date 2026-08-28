import { useState } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { verifiedLoansApi } from "@/lib/api";
import { cn } from "@/lib/utils";

/* Spec §6.2 — Export with format choice behind a confirm modal. Every export
   is audit-logged server-side (RECORD_EXPORTED with format metadata). */

type ExportFormat = "csv" | "json";

const FORMAT_OPTIONS: {
  description: string;
  extension: string;
  value: ExportFormat;
}[] = [
  {
    description: "Canonical columns + verification metadata, spreadsheet-ready",
    extension: "csv",
    value: "csv",
  },
  {
    description: "Full structured records incl. nested canonical data",
    extension: "json",
    value: "json",
  },
];

export default function ExportPage() {
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const target = verifiedLoansApi.exportUrl({ format });

  return (
    <div className="mx-auto max-w-[900px] space-y-6 p-8">
      <PageHeader
        description="Download verified records. Every export is written to the audit trail."
        eyebrow="Data Consumer"
        title="Export"
      />

      <section className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-3 font-semibold text-[14px] tracking-tight">
          Choose a format
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {FORMAT_OPTIONS.map((option) => (
            <button
              className={cn(
                "flex flex-col items-start gap-1 rounded-xl border p-4 text-left transition-colors",
                format === option.value
                  ? "border-primary/40 bg-primary/[0.05]"
                  : "border-border hover:bg-accent/40"
              )}
              key={option.value}
              onClick={() => setFormat(option.value)}
              type="button"
            >
              <span className="flex items-center gap-2">
                <i
                  aria-hidden="true"
                  className={
                    option.value === "csv"
                      ? "ri-file-excel-2-line text-[15px] text-primary"
                      : "ri-braces-line text-[15px] text-primary"
                  }
                />
                <span className="font-medium font-mono text-[13px] uppercase">
                  {option.extension}
                </span>
                {format === option.value ? (
                  <i
                    aria-hidden="true"
                    className="ri-checkbox-circle-fill ml-auto text-[14px] text-primary"
                  />
                ) : null}
              </span>
              <span className="text-[12px] text-muted-foreground leading-relaxed">
                {option.description}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between border-border border-t pt-4">
          <p className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <i
              aria-hidden="true"
              className="ri-shield-check-line text-success"
            />
            Exports are tamper-evident: logged with actor, count, and format.
          </p>
          <Button onClick={() => setConfirmOpen(true)}>
            <i aria-hidden="true" className="ri-download-2-line" />
            Export verified loans
          </Button>
        </div>
      </section>

      <Dialog onOpenChange={setConfirmOpen} open={confirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm export</DialogTitle>
            <DialogDescription>
              You are about to download all verified loan records as{" "}
              <span className="font-mono text-foreground">
                {format.toUpperCase()}
              </span>
              . This action writes a &quot;Verified record exported&quot; entry
              to the audit trail.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => setConfirmOpen(false)}
              size="sm"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                setConfirmOpen(false);
                window.open(target, "_blank", "noopener");
              }}
              size="sm"
            >
              <i aria-hidden="true" className="ri-download-2-line" />
              Download {format.toUpperCase()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
