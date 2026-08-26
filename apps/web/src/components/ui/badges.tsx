import type {
  BatchStatus,
  ExceptionStatus,
  ExceptionType,
  Severity,
  ValidationStatus,
} from "@repo/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const SEVERITY_STYLES: Record<Severity, string> = {
  critical: "bg-destructive/10 text-destructive dark:bg-destructive/20",
  high: "bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400",
  low: "bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400",
  medium:
    "bg-yellow-500/10 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-400",
};

export function SeverityBadge({
  severity,
  className,
}: {
  severity: Severity;
  className?: string;
}) {
  return (
    <Badge
      className={cn(SEVERITY_STYLES[severity], "capitalize", className)}
      variant="ghost"
    >
      {severity}
    </Badge>
  );
}

const EXCEPTION_TYPE_LABELS: Record<ExceptionType, string> = {
  balance_error: "Balance error",
  conflicting_source: "Conflicting source",
  date_error: "Date error",
  duplicate: "Duplicate",
  invalid_state: "Invalid state",
  missing_field: "Missing field",
  rate_out_of_range: "Rate out of range",
  stale_record: "Stale record",
  status_inconsistency: "Status inconsistency",
};

export function ExceptionTypeBadge({ type }: { type: ExceptionType }) {
  return <Badge variant="outline">{EXCEPTION_TYPE_LABELS[type]}</Badge>;
}

const EXCEPTION_STATUS_STYLES: Record<ExceptionStatus, string> = {
  approved:
    "bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400",
  corrected:
    "bg-violet-500/10 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400",
  open: "bg-primary/10 text-primary dark:bg-primary/20",
  rejected: "bg-destructive/10 text-destructive dark:bg-destructive/20",
};

export function ExceptionStatusBadge({ status }: { status: ExceptionStatus }) {
  return (
    <Badge
      className={cn(EXCEPTION_STATUS_STYLES[status], "capitalize")}
      variant="ghost"
    >
      {status}
    </Badge>
  );
}

const BATCH_STATUS_STYLES: Record<BatchStatus, string> = {
  done: "border-emerald-200 bg-emerald-50 text-emerald-700",
  failed: "bg-rose-50 text-rose-700",
  pending: "bg-muted text-muted-foreground",
  processing: "bg-indigo-50 text-indigo-700",
};

export function BatchStatusBadge({ status }: { status: BatchStatus }) {
  return (
    <Badge
      className={cn(BATCH_STATUS_STYLES[status], "capitalize")}
      variant="ghost"
    >
      {status}
    </Badge>
  );
}

const VALIDATION_STATUS_STYLES: Record<ValidationStatus, string> = {
  failed: "bg-destructive/10 text-destructive dark:bg-destructive/20",
  passed:
    "bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400",
  pending: "bg-muted text-muted-foreground",
  review:
    "bg-yellow-500/10 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-400",
};

export function ValidationStatusBadge({
  status,
}: {
  status: ValidationStatus;
}) {
  return (
    <Badge
      className={cn(VALIDATION_STATUS_STYLES[status], "capitalize")}
      variant="ghost"
    >
      {status}
    </Badge>
  );
}
