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
      {exceptions.map((exception, index) => (
        <button
          aria-selected={activeId === exception.id}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-lg border p-2.5 text-left transition-colors",
            activeId === exception.id
              ? "border-primary/30 bg-primary/8"
              : "border-border hover:bg-accent/50"
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
              SEVERITY_DOT[exception.severity]
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
              {exception.status === "open" ? null : (
                <span className="rounded-full bg-muted px-1.5 text-[10px] text-muted-foreground capitalize">
                  {exception.status}
                </span>
              )}
            </span>
            <span className="block truncate text-[12px] text-muted-foreground">
              {exception.field ? `${exception.field}: ` : ""}
              {exception.message}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}
