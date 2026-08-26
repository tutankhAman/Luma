import type { LoanExceptionItem } from "@repo/types";
import { cn } from "@/lib/utils";

const SEVERITY_DOT: Record<string, string> = {
  critical: "bg-rose-500/100",
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
              ? "border-[#8B5CF6]/30 bg-[#2E1065]/20"
              : "border-[#27272A] hover:bg-[#27272A]/20"
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
              <span className="font-medium text-[13px] text-white">
                {exception.exceptionType.replaceAll("_", " ")}
              </span>
              <span className="text-[#52525B] text-[11px]">#{index + 1}</span>
              {exception.status === "open" ? null : (
                <span className="rounded-full bg-[#27272A] px-1.5 text-[#A1A1AA] text-[10px] capitalize">
                  {exception.status}
                </span>
              )}
            </span>
            <span className="block truncate text-[#A1A1AA] text-[12px]">
              {exception.field ? `${exception.field}: ` : ""}
              {exception.message}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}
