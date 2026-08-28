import type {
  BatchStatus,
  ExceptionStatus,
  ExceptionType,
  Severity,
  ValidationResult,
  ValidationStatus,
} from "@repo/types";
import { cn } from "@/lib/utils";

/* Spec §1 — semantic signal colors live only on badges/pills/dots.
   High severity = desaturated red, medium = amber, low/verified = green. */

const SEVERITY_STYLES: Record<Severity, string> = {
  critical: "border-destructive/25 bg-destructive/8 text-destructive",
  high: "border-destructive/25 bg-destructive/8 text-destructive",
  low: "border-success/30 bg-success/8 text-success",
  medium: "border-warning/30 bg-warning/10 text-warning",
};

const SEVERITY_DOT: Record<Severity, string> = {
  critical: "bg-destructive",
  high: "bg-destructive",
  low: "bg-success",
  medium: "bg-warning",
};

const SEVERITY_LABELS: Record<Severity, string> = {
  critical: "Critical",
  high: "High",
  low: "Low",
  medium: "Medium",
};

export function SeverityBadge({
  severity,
  className,
}: {
  severity: Severity;
  className?: string;
}) {
  const label = SEVERITY_LABELS[severity];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-medium text-[11px] tracking-wide",
        SEVERITY_STYLES[severity],
        className
      )}
    >
      <span
        aria-hidden="true"
        className={cn("size-1.5 rounded-full", SEVERITY_DOT[severity])}
      />
      {label}
    </span>
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
  return (
    <span className="inline-flex items-center rounded-md border border-border bg-muted px-2 py-0.5 text-muted-foreground text-xs">
      {EXCEPTION_TYPE_LABELS[type]}
    </span>
  );
}

export function exceptionTypeLabel(type: ExceptionType): string {
  return EXCEPTION_TYPE_LABELS[type] ?? type;
}

const EXCEPTION_STATUS_STYLES: Record<ExceptionStatus, string> = {
  approved: "border-success/30 bg-success/8 text-success",
  corrected: "border-primary/30 bg-primary/8 text-primary",
  open: "border-warning/30 bg-warning/10 text-warning",
  rejected: "border-destructive/25 bg-destructive/8 text-destructive",
};

export function ExceptionStatusBadge({ status }: { status: ExceptionStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 font-medium text-[11px] capitalize tracking-wide",
        EXCEPTION_STATUS_STYLES[status]
      )}
    >
      {status}
    </span>
  );
}

const BATCH_STATUS_STYLES: Record<BatchStatus, string> = {
  done: "border-success/30 bg-success/8 text-success",
  failed: "border-destructive/25 bg-destructive/8 text-destructive",
  pending: "border-border bg-muted text-muted-foreground",
  processing: "border-primary/30 bg-primary/8 text-primary",
};

export function BatchStatusBadge({ status }: { status: BatchStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 font-medium text-[11px] capitalize tracking-wide",
        BATCH_STATUS_STYLES[status]
      )}
    >
      {status}
    </span>
  );
}

const VALIDATION_STATUS_STYLES: Record<ValidationStatus, string> = {
  failed: "border-destructive/25 bg-destructive/8 text-destructive",
  passed: "border-success/30 bg-success/8 text-success",
  pending: "border-border bg-muted text-muted-foreground",
  review: "border-warning/30 bg-warning/10 text-warning",
};

const VALIDATION_LABELS: Record<ValidationStatus, string> = {
  failed: "Exception",
  passed: "Valid",
  pending: "Pending",
  review: "In review",
};

export function ValidationStatusBadge({
  status,
}: {
  status: ValidationStatus;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-medium text-[11px] tracking-wide",
        VALIDATION_STATUS_STYLES[status]
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-1.5 rounded-full",
          status === "failed" && "bg-destructive",
          status === "passed" && "bg-success",
          status === "pending" && "bg-muted-foreground/50",
          status === "review" && "bg-warning"
        )}
      />
      {VALIDATION_LABELS[status]}
    </span>
  );
}

const VALIDATION_RESULT_STYLES: Record<ValidationResult, string> = {
  passed: "border-success/30 bg-success/8 text-success",
  passed_with_review: "border-primary/30 bg-primary/8 text-primary",
};

const VALIDATION_RESULT_LABELS: Record<ValidationResult, string> = {
  passed: "Passed",
  passed_with_review: "Reviewed & passed",
};

export function ValidationResultBadge({
  result,
}: {
  result: ValidationResult;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-medium text-[11px] tracking-wide",
        VALIDATION_RESULT_STYLES[result]
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-1.5 rounded-full",
          result === "passed" ? "bg-success" : "bg-primary"
        )}
      />
      {VALIDATION_RESULT_LABELS[result]}
    </span>
  );
}
