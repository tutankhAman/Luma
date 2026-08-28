import type { AiSummarizeBatchResponse } from "@repo/types";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useSummarizeBatch } from "@/hooks/use-ai";

export function AiSummaryPanel({ batchId }: { batchId: string }) {
  const [summary, setSummary] = useState<AiSummarizeBatchResponse | null>(null);
  const [expanded, setExpanded] = useState(true);
  const summarize = useSummarizeBatch();

  const generate = async () => {
    const result = await summarize.mutateAsync(batchId);
    setSummary(result);
    setExpanded(true);
  };

  return (
    <Card className="rounded-xl border border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <i
              aria-hidden="true"
              className="ri-robot-2-line text-base text-primary"
            />
            <CardTitle className="text-sm">AI Batch Summary</CardTitle>
          </div>
          {summary ? (
            <button
              className="text-muted-foreground/60 transition-colors hover:text-muted-foreground"
              onClick={() => setExpanded(!expanded)}
              type="button"
            >
              <i
                aria-hidden="true"
                className={
                  expanded
                    ? "ri-arrow-up-s-line text-lg"
                    : "ri-arrow-down-s-line text-lg"
                }
              />
            </button>
          ) : null}
        </div>
        <CardDescription className="text-muted-foreground text-xs">
          Generate a natural-language overview of this batch's exceptions and
          validation outcomes.
        </CardDescription>
      </CardHeader>

      {summary && expanded ? (
        <CardContent className="pt-0">
          <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/[0.05] p-3">
            <p className="whitespace-pre-wrap text-[13px]">{summary.summary}</p>
            <div className="flex gap-x-3 text-[11px] text-muted-foreground/60">
              <span>{summary.model}</span>
              <span>{new Date(summary.timestamp).toLocaleString()}</span>
            </div>
          </div>
        </CardContent>
      ) : null}

      {summary ? null : (
        <CardContent className="pt-0">
          <Button
            disabled={summarize.isPending}
            onClick={() => void generate()}
            size="sm"
            variant="outline"
          >
            {summarize.isPending ? (
              <>
                <i
                  aria-hidden="true"
                  className="ri-loader-4-line animate-spin text-base"
                />
                Generating...
              </>
            ) : (
              <>
                <i
                  aria-hidden="true"
                  className="ri-sparkling-2-line text-base"
                />
                Generate AI summary
              </>
            )}
          </Button>
        </CardContent>
      )}
    </Card>
  );
}
