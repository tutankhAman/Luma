import type {
  BatchStatus,
  ExceptionStatus,
  ExceptionType,
  Severity,
  ValidationStatus,
} from "@repo/types";
import { cn } from "@/lib/utils";

const SEVERITY_STYLES: Record<Severity, string> = {
  critical: "border border-rose-500/20 bg-rose-500/10 text-rose-400",
  high: "border border-orange-500/20 bg-orange-500/10 text-orange-400",
  low: "border border-sky-500/20 bg-sky-500/10 text-sky-400",
  medium: "border border-amber-500/20 bg-amber-500/10 text-amber-400",
};

export function SeverityBadge({
  severity,
  className,
}: {
  severity: Severity;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-1 text-xs capitalize",
        SEVERITY_STYLES[severity],
        className
      )}
    >
      {severity}
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
    <span className="inline-flex items-center rounded-md border border-[#27272A] bg-[#09090B] px-2 py-1 text-[#A1A1AA] text-xs">
      {EXCEPTION_TYPE_LABELS[type]}
    </span>
  );
}

const EXCEPTION_STATUS_STYLES: Record<ExceptionStatus, string> = {
  approved: "border border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
  corrected: "border border-[#8B5CF6]/30 bg-[#2E1065]/30 text-[#8B5CF6]",
  open: "border border-amber-500/20 bg-amber-500/10 text-amber-400",
  rejected: "border border-rose-500/20 bg-rose-500/10 text-rose-400",
};

export function ExceptionStatusBadge({ status }: { status: ExceptionStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-1 text-xs capitalize",
        EXCEPTION_STATUS_STYLES[status]
      )}
    >
      {status}
    </span>
  );
}

const BATCH_STATUS_STYLES: Record<BatchStatus, string> = {
  done: "border border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
  failed: "border border-rose-500/20 bg-rose-500/10 text-rose-400",
  pending: "border border-[#27272A] bg-[#09090B] text-[#A1A1AA]",
  processing: "border border-[#8B5CF6]/30 bg-[#2E1065]/30 text-[#8B5CF6]",
};

export function BatchStatusBadge({ status }: { status: BatchStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-1 text-xs capitalize",
        BATCH_STATUS_STYLES[status]
      )}
    >
      {status}
    </span>
  );
}

const VALIDATION_STATUS_STYLES: Record<ValidationStatus, string> = {
  failed: "border border-rose-500/20 bg-rose-500/10 text-rose-400",
  passed: "border border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
  pending: "border border-[#27272A] bg-[#09090B] text-[#A1A1AA]",
  review: "border border-amber-500/20 bg-amber-500/10 text-amber-400",
};

export function ValidationStatusBadge({
  status,
}: {
  status: ValidationStatus;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-1 text-xs capitalize",
        VALIDATION_STATUS_STYLES[status]
      )}
    >
      {status}
    </span>
  );
}
