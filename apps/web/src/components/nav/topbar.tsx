import type { Role } from "@repo/types";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardSummary } from "@/hooks/use-exceptions";
import { useSession } from "@/hooks/use-session";
import { loansApi } from "@/lib/api";
import { cn } from "@/lib/utils";

/* Spec §2 — topbar: page title/breadcrumb, global search by loan_id or
   borrower_id, notification bell with slide-over panel, context CTA. */

export interface TopbarAction {
  href: string;
  label: string;
}

const ROLE_CTA: Record<Role, TopbarAction> = {
  data_consumer: { href: "/consumer/verified", label: "Verified Records" },
  data_operator: { href: "/operator/upload", label: "Upload File" },
  reviewer: { href: "/reviewer/exceptions", label: "Review Queue" },
};

interface SearchHit {
  borrowerId: string | null;
  id: string;
  loanId: string | null;
}

function SearchResultsContent({
  searching,
  hits,
  onSelect,
}: {
  searching: boolean;
  hits: SearchHit[];
  onSelect: (hit: SearchHit) => void;
}) {
  if (searching) {
    return (
      <div className="space-y-2 p-2.5">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    );
  }

  if (hits.length === 0) {
    return (
      <div className="px-3.5 py-3 text-center text-[12.5px] text-muted-foreground">
        No matching loans found
      </div>
    );
  }

  return (
    <>
      {hits.map((hit) => (
        <button
          className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-accent"
          key={hit.id}
          onClick={() => onSelect(hit)}
          type="button"
        >
          <div className="flex items-center gap-2">
            <i
              aria-hidden="true"
              className="ri-file-list-3-line text-[13px] text-muted-foreground"
            />
            <span className="font-medium font-mono text-[12.5px]">
              {hit.loanId ?? hit.id}
            </span>
          </div>
          {hit.borrowerId ? (
            <span className="font-mono text-[11px] text-muted-foreground">
              {hit.borrowerId}
            </span>
          ) : null}
        </button>
      ))}
    </>
  );
}

function GlobalSearch({ role }: { role: Role }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setHits([]);
      setOpen(false);
      return;
    }
    setOpen(true);
    const timer = setTimeout(() => {
      setSearching(true);
      loansApi
        .list({ limit: 6, page: 1, search: trimmed })
        .then((res) => {
          setHits(
            res.data.map((item) => ({
              borrowerId: item.borrowerId,
              id: item.id,
              loanId: item.loanId,
            }))
          );
        })
        .catch(() => {
          setHits([]);
        })
        .finally(() => {
          setSearching(false);
        });
    }, 200);
    return () => {
      clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (
        event.target instanceof Node &&
        boxRef.current?.contains(event.target)
      ) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("mousedown", onClick);
    };
  }, []);

  const SEARCH_ROUTES: Record<Role, string> = {
    data_consumer: "/consumer/loans",
    data_operator: "/operator/loans",
    reviewer: "/reviewer/loans",
  };

  const go = (hit: SearchHit) => {
    setOpen(false);
    setQuery("");
    navigate(`${SEARCH_ROUTES[role]}/${hit.id}`);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && hits.length > 0 && hits[0]) {
      event.preventDefault();
      go(hits[0]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="relative w-full max-w-md" ref={boxRef}>
      <i
        aria-hidden="true"
        className="ri-search-line pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-foreground text-sm"
      />
      <input
        aria-label="Search loans"
        className="h-8 w-full rounded-full border border-input bg-card pr-3.5 pl-9 text-[13px] outline-none transition-colors placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => {
          if (query.trim()) {
            setOpen(true);
          }
        }}
        onKeyDown={handleKeyDown}
        placeholder="Search loan ID or borrower ID…"
        type="search"
        value={query}
      />
      {open && query.trim() ? (
        <div className="absolute top-9.5 z-50 w-full overflow-hidden rounded-2xl border border-border bg-popover shadow-black/5 shadow-lg">
          <SearchResultsContent
            hits={hits}
            onSelect={go}
            searching={searching}
          />
        </div>
      ) : null}
    </div>
  );
}

const EVENT_LABELS: Record<string, string> = {
  AI_RECOMMENDATION: "AI recommendation generated",
  EXCEPTION_CREATED: "New exception detected",
  FIELD_EDITED: "Record field edited",
  FILE_UPLOADED: "File upload completed",
  INGESTION_COMPLETED: "Ingestion completed",
  LOAN_APPROVED: "Record approved",
  LOAN_IMPORTED: "Record imported",
  LOAN_REJECTED: "Record rejected",
  RECORD_EXPORTED: "Verified record exported",
  REVIEWER_COMMENT: "Reviewer note added",
  VALIDATION_RUN: "Validation executed",
  VERIFIED_RECORD_CREATED: "Verification completed",
};

function NotificationsPanel({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: summary } = useDashboardSummary();
  const events = summary?.recentActivity ?? [];

  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent className="w-[380px] gap-0 sm:max-w-[380px]">
        <SheetHeader className="border-b">
          <SheetTitle>Notifications</SheetTitle>
          <SheetDescription>
            Latest events across ingested batches
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto">
          {events.length === 0 ? (
            <p className="p-6 text-center text-muted-foreground text-sm">
              No recent events.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {events.map((event) => (
                <li className="flex gap-3 px-5 py-3.5" key={event.timestamp}>
                  <span
                    aria-hidden="true"
                    className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground"
                  >
                    <i className="ri-pulse-line text-[13px]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] leading-snug">
                      {EVENT_LABELS[event.eventType] ?? event.eventType}
                      {event.loanId ? (
                        <span className="ml-1.5 font-mono text-[11px] text-muted-foreground">
                          {event.loanId}
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {new Date(event.timestamp).toLocaleString(undefined, {
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                        month: "short",
                      })}
                      {event.actor ? ` · ${event.actor}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function Topbar({ title }: { title: string }) {
  const { user } = useSession();
  const navigate = useNavigate();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { data: summary } = useDashboardSummary();

  const role = user?.role as Role | undefined;
  const cta = role ? ROLE_CTA[role] : null;
  const badgeCount = summary?.overview.openExceptions ?? 0;

  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between gap-4 border-border border-b bg-background/85 px-6 backdrop-blur">
      <div className="flex min-w-[140px] items-center">
        <h1 className="font-semibold text-[15px] tracking-tight">{title}</h1>
      </div>
      <div className="flex flex-1 items-center justify-center px-4">
        <GlobalSearch role={role ?? "data_operator"} />
      </div>
      <div className="flex min-w-[140px] items-center justify-end gap-2">
        <button
          aria-label={`Notifications${badgeCount ? `, ${badgeCount} unread` : ""}`}
          className={cn(
            "relative flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground active:translate-y-[0.5px]"
          )}
          onClick={() => setNotificationsOpen(true)}
          type="button"
        >
          <i aria-hidden="true" className="ri-notification-3-line text-base" />
          {badgeCount > 0 ? (
            <span className="absolute top-1 right-1 flex size-2 items-center justify-center rounded-full bg-destructive font-semibold text-[8px] text-white" />
          ) : null}
        </button>
        {cta ? (
          <button
            className="flex h-8 items-center gap-1.5 rounded-full border border-primary/30 bg-gradient-to-b from-primary via-primary to-primary/85 px-3.5 font-medium text-[13px] text-primary-foreground shadow-[inset_0_1px_0_0_rgba(255,255,255,0.25),0_1px_2px_0_rgba(15,23,42,0.12)] transition-all hover:brightness-105 active:translate-y-[0.5px] active:shadow-[inset_0_1.5px_2px_rgba(0,0,0,0.18)]"
            onClick={() => navigate(cta.href)}
            type="button"
          >
            <i aria-hidden="true" className="ri-add-line text-[15px]" />
            {cta.label}
          </button>
        ) : null}
      </div>
      <NotificationsPanel
        onOpenChange={setNotificationsOpen}
        open={notificationsOpen}
      />
    </header>
  );
}
