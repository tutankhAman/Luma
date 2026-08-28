import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { useVerifiedLoans } from "@/hooks/use-verified-loans";
import { cn } from "@/lib/utils";

/* Spec §6.5 — API Explorer (Module H). */

type ParamKind = "id" | "none";

interface Endpoint {
  description: string;
  method: "GET";
  paramKind: ParamKind;
  paramLabel?: string;
  path: string;
}

const ENDPOINTS: Endpoint[] = [
  {
    description: "Paginated verified loans with quality score",
    method: "GET",
    paramKind: "none",
    path: "/api/verified-loans",
  },
  {
    description: "Full canonical record, lineage, and record hash",
    method: "GET",
    paramKind: "id",
    paramLabel: "Verified loan ID",
    path: "/api/verified-loans/:id",
  },
  {
    description: "All normalized loan records",
    method: "GET",
    paramKind: "none",
    path: "/api/loans",
  },
  {
    description: "Single loan record by internal ID",
    method: "GET",
    paramKind: "id",
    paramLabel: "Loan ID",
    path: "/api/loans/:id",
  },
  {
    description: "Append-only audit trail for a loan",
    method: "GET",
    paramKind: "id",
    paramLabel: "Loan ID",
    path: "/api/audit/:id",
  },
  {
    description: "Aggregate counts, quality score, and recent activity",
    method: "GET",
    paramKind: "none",
    path: "/api/summary",
  },
  {
    description: "Download verified records as CSV",
    method: "GET",
    paramKind: "none",
    path: "/api/verified-loans/export",
  },
];

const HL_STRING_KEY = /"("(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*")(\s*:)?/g;
const HL_BOOL = /\b(true|false)\b/g;
const HL_NULL = /\bnull\b/g;
const HL_NUMBER = /(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function syntaxHighlight(json: string): string {
  return escapeHtml(json)
    .replace(HL_STRING_KEY, (_match, raw: string, colon?: string) =>
      colon
        ? `<span class="text-primary">"${raw}"</span>${colon}`
        : `<span class="text-foreground">"${raw}"</span>`
    )
    .replace(HL_BOOL, '<span class="text-warning">$1</span>')
    .replace(HL_NULL, '<span class="text-muted-foreground/60">null</span>')
    .replace(HL_NUMBER, '<span class="text-success">$1</span>');
}

function JsonViewer({
  body,
  isError,
  onCopy,
}: {
  body: unknown;
  isError: boolean;
  onCopy: () => void;
}) {
  const formatted = useMemo(() => {
    if (typeof body === "string") {
      return body;
    }
    return JSON.stringify(body, null, 2);
  }, [body]);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border shadow-xs",
        isError ? "border-destructive/30 bg-card" : "border-border bg-card"
      )}
    >
      <header className="flex items-center justify-between border-border border-b bg-muted/30 px-3.5 py-2">
        <span className="flex items-center gap-1.5 font-medium text-[12px] text-foreground">
          <i
            aria-hidden="true"
            className="ri-code-s-slash-line text-muted-foreground"
          />
          Response Payload
        </span>
        <button
          className="flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          onClick={onCopy}
          type="button"
        >
          <i aria-hidden="true" className="ri-file-copy-line text-xs" />
          Copy JSON
        </button>
      </header>
      <div className="custom-scrollbar-hide max-h-[380px] overflow-auto p-3.5">
        <pre
          className="font-mono text-[11.5px] leading-relaxed"
          dangerouslySetInnerHTML={{
            __html: syntaxHighlight(
              formatted.length > 60_000 ? formatted.slice(0, 60_000) : formatted
            ),
          }}
        />
      </div>
    </div>
  );
}

export default function ApiExplorerPage() {
  const [activePath, setActivePath] = useState<string>(
    ENDPOINTS[0]?.path ?? ""
  );
  const [paramValue, setParamValue] = useState("");
  const [response, setResponse] = useState<{
    body: unknown;
    durationMs: number;
    isError: boolean;
    status: number;
  } | null>(null);
  const [sending, setSending] = useState(false);

  const endpoint: Endpoint = ENDPOINTS.find(
    (item) => item.path === activePath
  ) as Endpoint;
  const { data: verified } = useVerifiedLoans(1, "");
  const sampleId = verified?.data?.[0]?.id ?? "";

  const send = async () => {
    setSending(true);
    const startTime = performance.now();
    const url = endpoint.path.replace(":id", paramValue.trim() || sampleId);
    try {
      const res = await fetch(url, { credentials: "include" });
      const durationMs = Math.round(performance.now() - startTime);
      let body: unknown;
      const contentType = res.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        body = await res.json();
      } else {
        const text = await res.text();
        body = text.slice(0, 4000);
      }
      setResponse({
        body,
        durationMs,
        isError: !res.ok,
        status: res.status,
      });
    } catch {
      setResponse({
        body: { error: "Request failed — is the API server running?" },
        durationMs: 0,
        isError: true,
        status: 0,
      });
    } finally {
      setSending(false);
    }
  };

  const resolvedUrl = endpoint.path.replace(
    ":id",
    paramValue.trim() || (sampleId ? sampleId : ":id")
  );
  const curl = `curl -s -H "Cookie: <session>" \\\n  http://localhost:4000${resolvedUrl}`;

  return (
    <div className="mx-auto max-w-[1200px] space-y-4 p-6">
      <PageHeader
        description="Live interactive test sandbox for the Verified Records REST API."
        eyebrow="Data Consumer"
        title="API Explorer"
      />

      <div className="grid gap-4 lg:grid-cols-[290px_1fr]">
        {/* Endpoint Selector Sidebar */}
        <aside className="space-y-1.5 rounded-xl border border-border bg-card p-2.5 shadow-xs">
          <p className="px-2 pt-1 pb-1.5 font-semibold text-[11px] text-muted-foreground uppercase tracking-wider">
            Endpoints ({ENDPOINTS.length})
          </p>
          {ENDPOINTS.map((item) => (
            <button
              className={cn(
                "flex w-full flex-col items-start gap-0.5 rounded-lg border px-2.5 py-2 text-left transition-colors",
                activePath === item.path
                  ? "border-primary/30 bg-primary/10"
                  : "border-transparent hover:bg-accent/50"
              )}
              key={item.path}
              onClick={() => {
                setActivePath(item.path);
                setResponse(null);
              }}
              type="button"
            >
              <div className="flex w-full items-center gap-1.5">
                <span className="rounded bg-success/15 px-1 py-0.2 font-mono font-semibold text-[9.5px] text-success">
                  {item.method}
                </span>
                <span
                  className={cn(
                    "truncate font-mono text-[11.5px]",
                    activePath === item.path
                      ? "font-semibold text-primary"
                      : "text-foreground"
                  )}
                >
                  {item.path}
                </span>
              </div>
              <span className="truncate text-[10.5px] text-muted-foreground">
                {item.description}
              </span>
            </button>
          ))}
        </aside>

        {/* Sandbox Content */}
        <section className="space-y-3.5">
          <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-border border-b pb-2.5">
              <div className="flex items-center gap-2 font-mono">
                <span className="rounded bg-success/15 px-2 py-0.5 font-bold text-[11px] text-success">
                  {endpoint.method}
                </span>
                <span className="font-semibold text-[13px] text-foreground">
                  {resolvedUrl}
                </span>
              </div>
              {response ? (
                <div className="flex items-center gap-1.5 font-mono text-[11px]">
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.2 font-medium",
                      response.isError
                        ? "border-destructive/30 bg-destructive/10 text-destructive"
                        : "border-success/30 bg-success/10 text-success"
                    )}
                  >
                    {response.status || "ERR"}{" "}
                    {response.isError ? "Error" : "OK"}
                  </span>
                  <span className="text-muted-foreground">
                    {response.durationMs}ms
                  </span>
                </div>
              ) : null}
            </div>

            {endpoint.paramKind === "id" ? (
              <div className="mb-3 flex flex-wrap items-end gap-2">
                <label className="min-w-64 flex-1 space-y-1">
                  <span className="block font-medium text-[11px] text-muted-foreground uppercase tracking-wider">
                    {endpoint.paramLabel}
                  </span>
                  <input
                    className="h-8 w-full rounded-lg border border-input bg-background px-3 font-mono text-[12px] outline-none placeholder:text-muted-foreground/60 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20"
                    onChange={(event) => setParamValue(event.target.value)}
                    placeholder={sampleId || "cuid…"}
                    type="text"
                    value={paramValue}
                  />
                </label>
                {sampleId ? (
                  <Button
                    className="h-8 text-xs"
                    onClick={() => setParamValue(sampleId)}
                    size="sm"
                    variant="ghost"
                  >
                    Use sample ID
                  </Button>
                ) : null}
              </div>
            ) : null}

            <Button
              className="h-8.5 text-xs"
              disabled={sending}
              onClick={() => void send()}
            >
              {sending ? (
                <>
                  <i
                    aria-hidden="true"
                    className="ri-loader-4-line animate-spin"
                  />
                  Sending…
                </>
              ) : (
                <>
                  <i aria-hidden="true" className="ri-play-line" />
                  Send Request
                </>
              )}
            </Button>
          </div>

          {/* Response Box */}
          {response ? (
            <JsonViewer
              body={response.body}
              isError={response.isError}
              onCopy={() => {
                void navigator.clipboard.writeText(
                  JSON.stringify(response.body, null, 2)
                );
                toast.success("Response JSON copied");
              }}
            />
          ) : (
            <div className="flex flex-col items-center gap-1.5 rounded-xl border border-border border-dashed bg-muted/20 py-10 text-center">
              <i
                aria-hidden="true"
                className="ri-code-s-slash-line text-2xl text-muted-foreground/40"
              />
              <p className="font-medium text-[12.5px] text-foreground">
                No Request Sent
              </p>
              <p className="text-[11.5px] text-muted-foreground">
                Click "Send Request" to execute live against the API.
              </p>
            </div>
          )}

          {/* cURL Snippet Terminal */}
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
            <header className="flex items-center justify-between border-border border-b bg-muted/30 px-3.5 py-2">
              <span className="flex items-center gap-1.5 font-medium text-[12px] text-foreground">
                <i
                  aria-hidden="true"
                  className="ri-terminal-line text-muted-foreground"
                />
                cURL Command
              </span>
              <button
                className="flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                onClick={() => {
                  void navigator.clipboard.writeText(curl);
                  toast.success("cURL command copied");
                }}
                type="button"
              >
                <i aria-hidden="true" className="ri-file-copy-line text-xs" />
                Copy
              </button>
            </header>
            <pre className="custom-scrollbar-hide overflow-x-auto p-3.5 font-mono text-[11.5px] text-foreground/80 leading-relaxed">
              {curl}
            </pre>
          </div>
        </section>
      </div>
    </div>
  );
}
