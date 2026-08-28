import { useMemo, useState } from "react";
import { toast } from "sonner";
import { KpiCard, KpiStrip } from "@/components/dashboard/kpi-card";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { useVerifiedLoans } from "@/hooks/use-verified-loans";
import { cn } from "@/lib/utils";

/* Spec §6.5 — API Explorer (Module H). Live calls against the Verified
   Records API with a monospace JSON viewer and auto-generated cURL snippet. */

type ParamKind = "id" | "none";

interface Endpoint {
  category: "verified" | "loans" | "audit" | "analytics";
  description: string;
  method: "GET";
  paramKind: ParamKind;
  paramLabel?: string;
  path: string;
}

const ENDPOINTS: Endpoint[] = [
  {
    category: "verified",
    description: "Paginated verified loans with quality score",
    method: "GET",
    paramKind: "none",
    path: "/api/verified-loans",
  },
  {
    category: "verified",
    description: "Full canonical record, lineage, and record hash",
    method: "GET",
    paramKind: "id",
    paramLabel: "Verified loan ID",
    path: "/api/verified-loans/:id",
  },
  {
    category: "verified",
    description: "Download verified records as streamed CSV",
    method: "GET",
    paramKind: "none",
    path: "/api/verified-loans/export",
  },
  {
    category: "loans",
    description: "All normalized loan records",
    method: "GET",
    paramKind: "none",
    path: "/api/loans",
  },
  {
    category: "loans",
    description: "Single loan record by internal ID",
    method: "GET",
    paramKind: "id",
    paramLabel: "Loan ID",
    path: "/api/loans/:id",
  },
  {
    category: "audit",
    description: "Append-only audit trail for a loan",
    method: "GET",
    paramKind: "id",
    paramLabel: "Loan ID",
    path: "/api/audit/:id",
  },
  {
    category: "analytics",
    description: "Aggregate counts, quality score, and recent activity",
    method: "GET",
    paramKind: "none",
    path: "/api/summary",
  },
];

/* Token-tinted spans for the JSON viewer. */
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
        ? `<span class="text-primary font-medium">"${raw}"</span>${colon}`
        : `<span class="text-foreground">"${raw}"</span>`
    )
    .replace(HL_BOOL, '<span class="text-warning font-semibold">$1</span>')
    .replace(HL_NULL, '<span class="text-muted-foreground/60">null</span>')
    .replace(HL_NUMBER, '<span class="text-success font-mono">$1</span>');
}

function JsonViewer({
  body,
  isError,
  responseTime,
  status,
}: {
  body: unknown;
  isError: boolean;
  responseTime: number | null;
  status: number;
}) {
  const formatted = useMemo(() => {
    if (typeof body === "string") {
      return body;
    }
    return JSON.stringify(body, null, 2);
  }, [body]);

  const sizeKb = (new Blob([formatted]).size / 1024).toFixed(1);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <header className="flex items-center justify-between border-border border-b bg-muted/30 px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono font-semibold text-[11.5px]",
              isError
                ? "border-destructive/30 bg-destructive/10 text-destructive"
                : "border-success/30 bg-success/10 text-success"
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "size-1.5 rounded-full",
                isError ? "bg-destructive" : "bg-success"
              )}
            />
            {status || "ERR"} {status === 200 ? "OK" : ""}
          </span>
          {responseTime === null ? null : (
            <span className="font-mono text-[11.5px] text-muted-foreground">
              {responseTime} ms
            </span>
          )}
          <span className="font-mono text-[11.5px] text-muted-foreground">
            {sizeKb} KB
          </span>
        </div>
        <Button
          className="h-7 text-[11.5px]"
          onClick={() => {
            void navigator.clipboard.writeText(formatted);
            toast.success("JSON response copied to clipboard");
          }}
          size="sm"
          variant="ghost"
        >
          <i aria-hidden="true" className="ri-file-copy-line mr-1" />
          Copy JSON
        </Button>
      </header>

      {formatted.length > 60_000 ? (
        <div className="custom-scrollbar-hide overflow-auto p-4">
          <p className="font-mono text-[12px] text-muted-foreground">
            Response too large to render ({(formatted.length / 1000).toFixed(0)}
            k chars). Showing first 60k.
          </p>
          <pre
            className="mt-3 font-mono text-[12px] leading-relaxed"
            dangerouslySetInnerHTML={{
              __html: syntaxHighlight(formatted.slice(0, 60_000)),
            }}
          />
        </div>
      ) : (
        <div className="custom-scrollbar-hide max-h-[460px] overflow-auto p-4">
          <pre
            className="font-mono text-[12px] leading-relaxed"
            dangerouslySetInnerHTML={{ __html: syntaxHighlight(formatted) }}
          />
        </div>
      )}
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
    isError: boolean;
    responseTime: number;
    status: number;
  } | null>(null);
  const [sending, setSending] = useState(false);

  const endpoint: Endpoint = ENDPOINTS.find(
    (item) => item.path === activePath
  ) as Endpoint;
  const { data: verified } = useVerifiedLoans(1, "");
  const sampleId = verified?.data?.[0]?.id ?? "";
  const sampleLoanId = verified?.data?.[0]?.loanId ?? "";

  const send = async () => {
    setSending(true);
    const start = performance.now();
    const targetId =
      paramValue.trim() ||
      (endpoint.path.includes("audit") || endpoint.path === "/api/loans/:id"
        ? sampleLoanId
        : sampleId);
    const url = endpoint.path.replace(":id", targetId);

    try {
      const res = await fetch(url, { credentials: "include" });
      const duration = Math.round(performance.now() - start);
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
        isError: !res.ok,
        responseTime: duration,
        status: res.status,
      });
    } catch {
      const duration = Math.round(performance.now() - start);
      setResponse({
        body: { error: "Request failed — is the API server running?" },
        isError: true,
        responseTime: duration,
        status: 0,
      });
    } finally {
      setSending(false);
    }
  };

  const defaultIdParam =
    endpoint.path.includes("audit") || endpoint.path === "/api/loans/:id"
      ? sampleLoanId
      : sampleId;
  const resolvedUrl = endpoint.path.replace(
    ":id",
    paramValue.trim() || defaultIdParam || ":id"
  );
  const curl = `curl -s -H "Cookie: session=<active-token>" \\
  http://localhost:4000${resolvedUrl}`;

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 p-8">
      <PageHeader
        description="Interactive developer sandbox for live testing against Luma's REST endpoints."
        eyebrow="Data Consumer"
        title="API Explorer"
      />

      <KpiStrip>
        <KpiCard
          delta="Port 4000"
          deltaTone="neutral"
          icon="ri-server-line"
          label="Target environment"
          loading={false}
          trend="neutral"
          trendLabel="host"
          trendValue="Local API"
          value="http://localhost:4000"
        />
        <KpiCard
          icon="ri-route-line"
          label="Available REST endpoints"
          loading={false}
          trend="up"
          trendLabel="routes"
          trendValue="7 Active"
          value={`${ENDPOINTS.length} Routes`}
        />
        <KpiCard
          delta="Session authenticated"
          deltaTone="positive"
          icon="ri-key-2-line"
          label="RBAC Auth Mode"
          loading={false}
          trend="up"
          trendLabel="security"
          trendValue="Consumer"
          value="Session Cookie"
        />
        <KpiCard
          delta="Standard REST"
          deltaTone="positive"
          icon="ri-code-box-line"
          label="Data payload"
          loading={false}
          trend="up"
          trendLabel="format"
          trendValue="JSON / CSV"
          value="application/json"
        />
      </KpiStrip>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <aside className="space-y-2">
          <p className="px-1 font-semibold text-[13px] text-muted-foreground uppercase tracking-wider">
            Endpoints
          </p>
          <div className="space-y-1.5 rounded-2xl border border-border bg-card p-3 shadow-sm">
            {ENDPOINTS.map((item) => {
              const isActive = activePath === item.path;
              return (
                <button
                  className={cn(
                    "flex w-full flex-col items-start gap-1 rounded-xl border px-3 py-2.5 text-left transition-all",
                    isActive
                      ? "border-primary/40 bg-primary/8 shadow-2xs"
                      : "border-transparent hover:border-border hover:bg-accent/40"
                  )}
                  key={item.path}
                  onClick={() => {
                    setActivePath(item.path);
                    setResponse(null);
                  }}
                  type="button"
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="rounded bg-primary/10 px-1.5 py-0.5 font-bold font-mono text-[10px] text-primary">
                      {item.method}
                    </span>
                    <span
                      className={cn(
                        "max-w-[190px] truncate font-medium font-mono text-[12px]",
                        isActive ? "text-primary" : "text-foreground"
                      )}
                    >
                      {item.path}
                    </span>
                  </div>
                  <span className="text-[11.5px] text-muted-foreground">
                    {item.description}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="space-y-5">
          <div className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex flex-col gap-3 border-border border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-emerald-500/10 px-2.5 py-1 font-bold font-mono text-[12px] text-emerald-600 dark:text-emerald-400">
                  {endpoint.method}
                </span>
                <span className="font-mono font-semibold text-[14px] text-foreground">
                  {endpoint.path}
                </span>
              </div>
              <p className="text-[12.5px] text-muted-foreground">
                {endpoint.description}
              </p>
            </div>

            {endpoint.paramKind === "id" ? (
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-end">
                <label className="flex-1 space-y-1.5">
                  <span className="block font-medium text-[11px] text-muted-foreground uppercase tracking-wider">
                    {endpoint.paramLabel}
                  </span>
                  <input
                    className="h-10 w-full rounded-lg border border-input bg-background px-3 font-mono text-[13px] outline-none placeholder:text-muted-foreground/60 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
                    onChange={(event) => setParamValue(event.target.value)}
                    placeholder={defaultIdParam || "cuid…"}
                    type="text"
                    value={paramValue}
                  />
                </label>
                {defaultIdParam ? (
                  <Button
                    className="h-10 text-[12px]"
                    onClick={() => setParamValue(defaultIdParam)}
                    size="sm"
                    variant="outline"
                  >
                    Use Sample ID
                  </Button>
                ) : null}
              </div>
            ) : null}

            <div className="flex items-center gap-3 pt-1">
              <Button
                className="rounded-full px-5"
                disabled={sending}
                onClick={() => void send()}
              >
                {sending ? (
                  <>
                    <i
                      aria-hidden="true"
                      className="ri-loader-4-line mr-1.5 animate-spin"
                    />
                    Executing…
                  </>
                ) : (
                  <>
                    <i
                      aria-hidden="true"
                      className="ri-play-fill mr-1.5 text-primary-foreground"
                    />
                    Send Request
                  </>
                )}
              </Button>
              <span className="text-[12px] text-muted-foreground">
                Target:{" "}
                <code className="font-mono text-foreground">{resolvedUrl}</code>
              </span>
            </div>
          </div>

          {response ? (
            <JsonViewer
              body={response.body}
              isError={response.isError}
              responseTime={response.responseTime}
              status={response.status}
            />
          ) : (
            <div className="flex flex-col items-center gap-2.5 rounded-2xl border border-border border-dashed bg-muted/20 py-14 text-center">
              <div className="flex size-11 items-center justify-center rounded-xl border border-border bg-card shadow-xs">
                <i
                  aria-hidden="true"
                  className="ri-terminal-box-line text-2xl text-muted-foreground/60"
                />
              </div>
              <p className="font-semibold text-[14px]">Sandbox Ready</p>
              <p className="max-w-sm text-[12.5px] text-muted-foreground">
                Click <strong>Send Request</strong> above to trigger live
                execution and view the formatted response.
              </p>
            </div>
          )}

          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <header className="flex items-center justify-between border-border border-b bg-muted/30 px-4 py-2.5">
              <div className="flex items-center gap-2 font-medium text-[12.5px]">
                <div className="mr-2 flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-red-400/80" />
                  <span className="size-2.5 rounded-full bg-amber-400/80" />
                  <span className="size-2.5 rounded-full bg-emerald-400/80" />
                </div>
                <i
                  aria-hidden="true"
                  className="ri-terminal-line text-muted-foreground"
                />
                cURL Snippet
              </div>
              <Button
                className="h-7 text-[11.5px]"
                onClick={() => {
                  void navigator.clipboard.writeText(curl);
                  toast.success("cURL command copied to clipboard");
                }}
                size="sm"
                variant="ghost"
              >
                <i aria-hidden="true" className="ri-file-copy-line mr-1" />
                Copy
              </Button>
            </header>
            <pre className="custom-scrollbar-hide overflow-x-auto bg-muted/10 p-4 font-mono text-[12px] text-muted-foreground leading-relaxed">
              {curl}
            </pre>
          </div>
        </section>
      </div>
    </div>
  );
}
