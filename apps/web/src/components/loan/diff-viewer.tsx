import type { AiRecommendation, LoanExceptionItem } from "@repo/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/* Spec §5.3 — DiffViewer: side-by-side comparison of conflicting sources
   (loan_tape.csv vs servicer_update.csv) with the AI's recommended value
   highlighted. Conflict values come from exception metadata written by the
   conflict-detection service. */

interface ConflictField {
  aiRecommended?: string | null;
  field: string;
  servicerValue: string;
  tapeValue: string;
}

function buildConflicts(
  exception: LoanExceptionItem,
  recommendation: AiRecommendation | null | undefined
): ConflictField[] {
  const meta = (exception.metadata ?? {}) as Record<string, unknown>;
  const conflicts: ConflictField[] = [];

  // Single-field conflict entries carry source/target directly.
  if (meta.sourceValue !== undefined || meta.targetValue !== undefined) {
    const field = String(meta.conflictField ?? exception.field ?? "field");
    conflicts.push({
      aiRecommended:
        recommendation?.fieldsToChange.find((change) => change.field === field)
          ?.suggestedValue ?? null,
      field,
      servicerValue: formatRaw(meta.sourceValue),
      tapeValue: formatRaw(meta.targetValue),
    });
  }

  // Multi-field conflicts were grouped into one exception message.
  if (conflicts.length === 0 && recommendation) {
    for (const change of recommendation.fieldsToChange) {
      conflicts.push({
        aiRecommended: change.suggestedValue,
        field: change.field,
        servicerValue: change.currentValue ?? "—",
        tapeValue: "—",
      });
    }
  }

  return conflicts;
}

function formatRaw(value: unknown): string {
  if (value === null || value === undefined) {
    return "—";
  }
  return String(value);
}

export function DiffViewer({
  className,
  exception,
  recommendation,
}: {
  className?: string;
  exception: LoanExceptionItem;
  recommendation?: AiRecommendation | null;
}) {
  const conflicts = buildConflicts(exception, recommendation);

  if (conflicts.length === 0) {
    return (
      <p
        className={cn(
          "rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-[12.5px] text-muted-foreground",
          className
        )}
      >
        No structured conflict values available for this exception.
      </p>
    );
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-border",
        className
      )}
    >
      <div className="grid grid-cols-[1fr_1fr_1fr] border-border border-b bg-muted/40">
        <div className="px-3 py-2">
          <p className="font-medium text-[10.5px] text-muted-foreground uppercase tracking-wider">
            loan_tape.csv
          </p>
          <p className="text-[10px] text-muted-foreground/60">
            origination source
          </p>
        </div>
        <div className="border-border border-x px-3 py-2">
          <p className="font-medium text-[10.5px] text-muted-foreground uppercase tracking-wider">
            servicer_update.csv
          </p>
          <p className="text-[10px] text-muted-foreground/60">
            operational source
          </p>
        </div>
        <div className="px-3 py-2">
          <p className="flex items-center gap-1 font-medium text-[10.5px] text-primary uppercase tracking-wider">
            <i aria-hidden="true" className="ri-sparkling-2-line text-[11px]" />
            AI recommends
          </p>
          <p className="text-[10px] text-muted-foreground/60">
            reviewer decides
          </p>
        </div>
      </div>
      {conflicts.map((conflict) => (
        <div
          className="grid grid-cols-[1fr_1fr_1fr] border-border border-b last:border-b-0"
          key={conflict.field}
        >
          <div className="px-3 py-2.5">
            <p className="font-mono text-[10px] text-muted-foreground/70">
              {conflict.field}
            </p>
            <p className="mt-0.5 font-mono text-[12.5px]">
              {conflict.tapeValue}
            </p>
          </div>
          <div className="border-border border-x px-3 py-2.5">
            <p className="font-mono text-[10px] text-transparent">·</p>
            <p className="mt-0.5 font-mono text-[12.5px]">
              {conflict.servicerValue}
            </p>
          </div>
          <div className="bg-primary/[0.06] px-3 py-2.5">
            <p className="font-mono text-[10px] text-transparent">·</p>
            {conflict.aiRecommended ? (
              <p className="mt-0.5 font-medium font-mono text-[12.5px] text-primary">
                {conflict.aiRecommended}
              </p>
            ) : (
              <p className="mt-0.5 text-[11px] text-muted-foreground/60 italic">
                pending AI analysis
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export function CompareConflictsButton({
  exceptionCount,
  onClick,
}: {
  exceptionCount: number;
  onClick: () => void;
}) {
  return (
    <button
      className="flex w-full items-center justify-between rounded-lg border border-primary/30 bg-primary/[0.05] px-3.5 py-2.5 text-left transition-colors hover:bg-primary/10"
      onClick={onClick}
      type="button"
    >
      <span className="flex items-center gap-2">
        <i
          aria-hidden="true"
          className="ri-split-cells-vertical text-[15px] text-primary"
        />
        <span className="font-medium text-[13px]">
          Compare conflicting records
        </span>
      </span>
      <Badge variant="outline">{exceptionCount}</Badge>
    </button>
  );
}
