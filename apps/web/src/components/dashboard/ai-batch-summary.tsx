import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { aiApi } from "@/lib/api";
import { cn } from "@/lib/utils";

/* Spec §5.1 — AI Batch Summary widget (Module D). Renders AI output in the
   AISuggestionCard shape: recommendation body, model/timestamp metadata
   footer, and a refresh action. */

interface SummaryData {
  model: string;
  summary: string | null;
  timestamp: string;
}

function SummaryBody({ data }: { data: SummaryData }) {
  return (
    <>
      <p className="text-[13.5px] text-foreground/90 leading-relaxed">
        {data.summary ?? "No summary generated for this batch yet."}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-primary/15 border-t pt-2.5 text-[11px] text-muted-foreground">
        <span className="font-mono">{data.model}</span>
        <span aria-hidden="true">·</span>
        <span>
          {new Date(data.timestamp).toLocaleTimeString(undefined, {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
    </>
  );
}

export function AiBatchSummary({ batchId }: { batchId: string }) {
  const [nonce, setNonce] = useState(0);
  const { data, error, isFetching, refetch } = useQuery({
    queryFn: () => aiApi.summarizeBatch(batchId),
    queryKey: ["ai-batch-summary", batchId, nonce],
    staleTime: 60_000,
  });

  function renderBody() {
    if (error) {
      return (
        <p className="text-[13px] text-muted-foreground">
          AI summary unavailable right now. Click refresh to try again.
        </p>
      );
    }
    if (data) {
      return <SummaryBody data={data} />;
    }
    return (
      <div className="space-y-2">
        <div className="h-3.5 w-full animate-pulse rounded bg-muted" />
        <div className="h-3.5 w-4/5 animate-pulse rounded bg-muted" />
        <div className="h-3.5 w-2/3 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-primary/25 bg-primary/[0.03] p-5 shadow-xs"
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary">
            <i aria-hidden="true" className="ri-sparkling-2-line text-[14px]" />
          </span>
          <div>
            <h3 className="font-semibold text-[14px] tracking-tight">
              AI batch summary
            </h3>
            <p className="text-[11.5px] text-muted-foreground">
              Automated anomaly & validation insight
            </p>
          </div>
        </div>
        <button
          className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          disabled={isFetching}
          onClick={() => {
            setNonce((n) => n + 1);
            void refetch();
          }}
          type="button"
        >
          <i
            aria-hidden="true"
            className={cn(
              "ri-refresh-line text-sm",
              isFetching && "animate-spin"
            )}
          />
        </button>
      </div>

      {renderBody()}
    </div>
  );
}
