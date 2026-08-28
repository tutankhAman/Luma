import type { LoanExceptionItem } from "@repo/types";
import { cn } from "@/lib/utils";

const SEVERITY_DOT: Record<string, string> = {
  critical: "bg-destructive",
  high: "bg-destructive",
  low: "bg-success",
  medium: "bg-warning",
};

export function ExceptionList({
  activeId,
  exceptions,
  onSelect,
}: {
  activeId: string | null;
  exceptions: LoanExceptionItem[];
  onSelect: (id: string) => void;
}) {
  return (
    <div
      aria-label="Exceptions for this loan"
      className="space-y-1.5"
      role="tablist"
    >
      {exceptions.map((exception, index) => {
        const isApproved = exception.status === "approved";
        const isRejected = exception.status === "rejected";
        return (
          <button
            aria-selected={activeId === exception.id}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-lg border p-2.5 text-left transition-colors",
              activeId === exception.id
                ? "border-primary/30 bg-primary/8"
                : "border-border hover:bg-accent/50",
              isApproved && "bg-success/[0.02]"
            )}
            key={exception.id}
            onClick={() => onSelect(exception.id)}
            role="tab"
            type="button"
          >
            <span
              aria-hidden="true"
              className={cn(
                "size-2 shrink-0 rounded-full",
                isApproved ? "bg-success" : SEVERITY_DOT[exception.severity]
              )}
            />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5">
                <span className="font-medium text-[13px]">
                  {exception.exceptionType.replaceAll("_", " ")}
                </span>
                <span className="text-[11px] text-muted-foreground/60">
                  #{index + 1}
                </span>
                {isApproved ? (
                  <span className="rounded-full border border-success/30 bg-success/10 px-2 py-0.2 font-medium text-[10px] text-success">
                    ✓ Approved
                  </span>
                ) : null}
                {isRejected ? (
                  <span className="rounded-full border border-destructive/30 bg-destructive/10 px-2 py-0.2 font-medium text-[10px] text-destructive">
                    ✕ Rejected
                  </span>
                ) : null}
              </span>
              <span className="block truncate text-[12px] text-muted-foreground">
                {exception.field ? `${exception.field}: ` : ""}
                {exception.message}
              </span>
              {exception.correctedValue ? (
                <span className="mt-0.5 flex items-center gap-1 font-mono text-[11px] text-success">
                  <i aria-hidden="true" className="ri-check-line text-xs" />
                  Corrected: {exception.correctedValue}
                </span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
