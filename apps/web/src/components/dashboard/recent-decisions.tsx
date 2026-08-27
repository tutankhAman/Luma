import type { AuditEventType } from "@repo/types";
import { cn } from "@/lib/utils";

/* Spec §5.1 — Recent Decisions activity feed with event-type iconography. */

interface ActivityItem {
  actor: string | null;
  eventType: string;
  loanId?: string | null;
  timestamp: string;
}

const EVENT_META: Record<AuditEventType, { icon: string; tone: string }> = {
  AI_RECOMMENDATION: { icon: "ri-sparkling-2-line", tone: "text-primary" },
  EXCEPTION_CREATED: {
    icon: "ri-error-warning-line",
    tone: "text-destructive",
  },
  FIELD_EDITED: { icon: "ri-edit-line", tone: "text-muted-foreground" },
  FILE_UPLOADED: {
    icon: "ri-upload-cloud-2-line",
    tone: "text-muted-foreground",
  },
  INGESTION_COMPLETED: {
    icon: "ri-inbox-archive-line",
    tone: "text-muted-foreground",
  },
  LOAN_APPROVED: { icon: "ri-checkbox-circle-line", tone: "text-success" },
  LOAN_IMPORTED: {
    icon: "ri-download-cloud-2-line",
    tone: "text-muted-foreground",
  },
  LOAN_REJECTED: { icon: "ri-close-circle-line", tone: "text-destructive" },
  RECORD_EXPORTED: { icon: "ri-share-box-line", tone: "text-muted-foreground" },
  REVIEWER_COMMENT: { icon: "ri-chat-3-line", tone: "text-muted-foreground" },
  VALIDATION_RUN: { icon: "ri-filter-3-line", tone: "text-muted-foreground" },
  VERIFIED_RECORD_CREATED: {
    icon: "ri-shield-check-line",
    tone: "text-success",
  },
};

const DECISION_EVENTS = new Set<AuditEventType>([
  "LOAN_APPROVED",
  "LOAN_REJECTED",
  "REVIEWER_COMMENT",
  "FIELD_EDITED",
  "VERIFIED_RECORD_CREATED",
]);

const FIRST_WORD_REGEX = /^\w/;

function humanizeEventType(eventType: string): string {
  const words = eventType.replaceAll("_", " ").toLowerCase();
  return words.replace(FIRST_WORD_REGEX, (c) => c.toUpperCase());
}

export function RecentDecisions({
  events,
  decisionsOnly = true,
}: {
  decisionsOnly?: boolean;
  events?: ActivityItem[];
}) {
  const filtered = (events ?? []).filter((event) =>
    decisionsOnly
      ? DECISION_EVENTS.has(event.eventType as AuditEventType)
      : true
  );

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10">
        <i
          aria-hidden="true"
          className="ri-time-line text-2xl text-muted-foreground/50"
        />
        <p className="text-[13px] text-muted-foreground">
          No decisions yet today.
        </p>
      </div>
    );
  }

  return (
    <ol className="relative space-y-4 pl-1">
      {filtered.map((event) => {
        const meta =
          EVENT_META[event.eventType as AuditEventType] ??
          ({
            icon: "ri-record-circle-line",
            tone: "text-muted-foreground",
          } as const);
        return (
          <li
            className="flex items-start gap-3"
            key={`${event.eventType}-${event.timestamp}`}
          >
            <span
              aria-hidden="true"
              className={cn(
                "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border border-border bg-card",
                meta.tone
              )}
            >
              <i className={cn(meta.icon, "text-[12px]")} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] leading-snug">
                <span className="font-medium">
                  {humanizeEventType(event.eventType)}
                </span>
                {event.loanId ? (
                  <span className="ml-1.5 font-mono text-[11.5px] text-muted-foreground">
                    {event.loanId}
                  </span>
                ) : null}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {event.actor ?? "System"}
                {" · "}
                {new Date(event.timestamp).toLocaleTimeString(undefined, {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
