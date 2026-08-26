import type { ExceptionListItem } from "@repo/types";
import { useState } from "react";
import { AiAssistantPanel } from "@/components/ai/ai-assistant-panel";
import { ExceptionQueueTable } from "@/components/exceptions/exception-table";
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

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-center gap-3">
        <h1 className="font-heading font-semibold text-2xl">Exception Queue</h1>
        {isFetching ? (
          <i
            aria-hidden="true"
            className="ri-loader-4-line animate-spin text-muted-foreground"
          />
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Validation failures awaiting review</CardTitle>
          <CardDescription>
            Sorted by severity. Open a row to consult the AI assistant, then
            record your own decision — both are audit logged.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ExceptionQueueTable
            data={data?.data}
            isLoading={isLoading}
            onReview={setSelected}
            onSearchChange={(search) => patch({ search })}
            onSeverityChange={(severity) => patch({ severity })}
            onStatusChange={(status) => patch({ status })}
            onTypeChange={(type) => patch({ type })}
            search={filters.search}
            severity={filters.severity}
            status={filters.status}
            type={filters.type}
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
