import type {
  ExceptionListItem,
  Severity,
  Severity as SeverityType,
} from "@repo/types";
import { useNavigate } from "react-router-dom";
import { exceptionTypeLabel, SeverityBadge } from "@/components/ui/badges";
import { Skeleton } from "@/components/ui/skeleton";

/* Spec §5.1 — Exception Queue preview (top 5 by severity) with severity
   ordering, mono loan IDs, row click-through to the review workspace. */

const SEVERITY_ORDER: Record<SeverityType, number> = {
  critical: 0,
  high: 1,
  low: 3,
  medium: 2,
};

export function ExceptionQueuePreview({
  items,
  loading,
  titleHref,
}: {
  items?: ExceptionListItem[];
  loading?: boolean;
  titleHref?: string;
}) {
  const navigate = useNavigate();
  const sorted = [...(items ?? [])].sort(
    (a, b) =>
      SEVERITY_ORDER[a.severity as SeverityType] -
      SEVERITY_ORDER[b.severity as SeverityType]
  );

  if (loading) {
    return (
      <div className="space-y-2.5 p-1">
        {[0, 1, 2, 3].map((row) => (
          <Skeleton className="h-11 w-full" key={row} />
        ))}
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10">
        <i
          aria-hidden="true"
          className="ri-checkbox-circle-line text-2xl text-success"
        />
        <p className="text-[13px] text-muted-foreground">
          Queue is clear — no open exceptions.
        </p>
        {titleHref ? (
          <button
            className="text-[12.5px] text-primary underline-offset-4 hover:underline"
            onClick={() => navigate(titleHref)}
            type="button"
          >
            Open full queue
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {sorted.slice(0, 5).map((item) => (
        <li key={item.id}>
          <button
            className="group flex w-full items-center gap-3 px-1 py-2.5 text-left transition-colors hover:bg-accent/50"
            onClick={() => navigate(`/reviewer/loans/${item.loan.id}`)}
            type="button"
          >
            <SeverityBadge
              className="w-[76px] shrink-0 justify-center"
              severity={item.severity as Severity}
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium text-[13px]">
                <span className="font-mono">
                  {item.loan.loanId ?? item.loan.id}
                </span>
                <span className="mx-1.5 text-muted-foreground">·</span>
                <span className="text-muted-foreground">
                  {exceptionTypeLabel(item.exceptionType)}
                </span>
              </span>
              <span className="mt-0.5 block truncate text-[12px] text-muted-foreground">
                {item.field ? `${item.field} — ` : ""}
                {item.message}
              </span>
            </span>
            <i
              aria-hidden="true"
              className="ri-arrow-right-s-line text-muted-foreground/60 transition-transform group-hover:translate-x-0.5"
            />
          </button>
        </li>
      ))}
    </ul>
  );
}
