import type {
  ExceptionListItem,
  ExceptionStatus,
  ExceptionType,
  Severity,
} from "@repo/types";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AiResolutionPanel } from "@/components/exceptions/ai-resolution-panel";
import { ExceptionQueueTable } from "@/components/exceptions/exception-table";
import { FilterBar } from "@/components/exceptions/filter-bar";
import { useExceptions } from "@/hooks/use-exceptions";
import {
  EMPTY_EXCEPTION_FILTERS,
  type ExceptionListFilters,
} from "@/hooks/use-exceptions-filters";

export default function ExceptionQueuePage() {
  const [searchParams] = useSearchParams();
  const initialSeverity = (searchParams.get("severity") ?? "") as Severity | "";
  const initialStatus = (searchParams.get("status") ?? "open") as
    | ExceptionStatus
    | "";
  const initialType = (searchParams.get("type") ?? "") as ExceptionType | "";
  const initialBatchId = searchParams.get("batchId") ?? "";
  const initialSearch = searchParams.get("search") ?? "";

  const [filters, setFilters] = useState<ExceptionListFilters>(() => ({
    ...EMPTY_EXCEPTION_FILTERS,
    batchId: initialBatchId,
    search: initialSearch,
    severity: initialSeverity,
    status: initialStatus,
    type: initialType,
  }));
  const [selected, setSelected] = useState<ExceptionListItem | null>(null);
  const { data, isLoading, isFetching } = useExceptions(filters);

  const patch = (partial: Partial<ExceptionListFilters>) =>
    setFilters((prev) => ({ ...prev, page: 1, ...partial }));

  useEffect(() => {
    if (selected && !data?.data.some((item) => item.id === selected.id)) {
      setSelected(null);
    }
  }, [data, selected]);

  return (
    <div className="flex min-h-screen">
      <div className="custom-scrollbar-hide flex-1 overflow-y-auto bg-background p-10">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="mb-2 font-semibold text-[28px] tracking-tight">
              Exception Queue
            </h1>
            <p className="text-[14px] text-muted-foreground">
              Review validation failures and apply AI-suggested corrections.
            </p>
          </div>
          {isFetching ? (
            <i
              aria-hidden="true"
              className="ri-loader-4-line animate-spin text-muted-foreground"
            />
          ) : null}
        </div>

        <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-card">
          <div className="border-border border-b bg-muted/40 p-4">
            <FilterBar filters={filters} onChange={patch} />
          </div>
          <ExceptionQueueTable
            data={data?.data}
            isLoading={isLoading}
            onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
            onSelect={setSelected}
            pagination={data?.pagination}
            selectedId={selected?.id ?? null}
          />
        </div>
      </div>

      <AiResolutionPanel exception={selected} />
    </div>
  );
}
