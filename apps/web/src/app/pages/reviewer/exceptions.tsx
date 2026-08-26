import type { ExceptionListItem } from "@repo/types";
import { useMemo, useState } from "react";
import { AiAssistantPanel } from "@/components/ai/ai-assistant-panel";
import { ExceptionQueueTable } from "@/components/exceptions/exception-table";
import { FilterBar } from "@/components/exceptions/filter-bar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useExceptions } from "@/hooks/use-exceptions";
import {
  EMPTY_EXCEPTION_FILTERS,
  type ExceptionListFilters,
} from "@/hooks/use-exceptions-filters";

export default function ExceptionQueuePage() {
  const [filters, setFilters] = useState<ExceptionListFilters>(
    EMPTY_EXCEPTION_FILTERS
  );
  const [selected, setSelected] = useState<ExceptionListItem | null>(null);
  const { data, isLoading, isFetching } = useExceptions(filters);

  const patch = (partial: Partial<ExceptionListFilters>) =>
    setFilters((prev) => ({ ...prev, page: 1, ...partial }));

  const counts = useMemo(() => {
    const rows = data?.data ?? [];
    return {
      critical: rows.filter(
        (item) => item.severity === "critical" && item.status === "open"
      ).length,
      total: data?.pagination?.total ?? 0,
    };
  }, [data]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex items-center gap-3">
        <h1 className="font-heading font-semibold text-2xl">Exception Queue</h1>
        {isFetching ? (
          <i
            aria-hidden="true"
            className="ri-loader-4-line animate-spin text-[#A1A1AA]"
          />
        ) : null}
      </div>

      <div className="flex items-center gap-3">
        <span className="rounded-lg bg-[#2E1065]/30 px-3 py-1.5 font-medium text-[#8B5CF6] text-sm tabular-nums">
          {counts.total} exceptions
        </span>
        <span className="rounded-lg bg-rose-500/10 px-3 py-1.5 font-medium text-rose-400 text-sm tabular-nums">
          {counts.critical} critical open
        </span>
      </div>

      <Card className="rounded-[24px] border border-[#27272A] bg-[#18181B] shadow-2xl">
        <CardHeader>
          <CardTitle className="text-white">
            Validation failures awaiting review
          </CardTitle>
          <CardDescription className="text-[#A1A1AA]">
            Click a row to open the loan, consult the AI assistant, then record
            your decision — every action is audit logged.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FilterBar filters={filters} onChange={patch} />
          <ExceptionQueueTable
            data={data?.data}
            isLoading={isLoading}
            onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
            onReview={setSelected}
            pagination={data?.pagination}
          />
        </CardContent>
      </Card>

      <AiAssistantPanel
        exception={selected}
        onOpenChange={(open) => {
          if (!open) {
            setSelected(null);
          }
        }}
      />
    </div>
  );
}
