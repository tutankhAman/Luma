import type { LoanExceptionItem } from "@repo/types";
import { cn } from "@/lib/utils";

const SEVERITY_DOT: Record<string, string> = {
  critical: "bg-rose-500",
  high: "bg-orange-500",
  low: "bg-blue-500",
  medium: "bg-amber-500",
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
              ? "border-indigo-200 bg-indigo-50/50"
              : "border-slate-100 hover:bg-slate-50"
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
              <span className="font-medium text-[13px] text-slate-900">
                {exception.exceptionType.replaceAll("_", " ")}
              </span>
              <span className="text-[11px] text-slate-400">#{index + 1}</span>
              {exception.status === "open" ? null : (
                <span className="rounded-full bg-slate-100 px-1.5 text-[10px] text-slate-500 capitalize">
                  {exception.status}
                </span>
              )}
            </span>
            <span className="block truncate text-[12px] text-slate-500">
              {exception.field ? `${exception.field}: ` : ""}
              {exception.message}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}
