import { useMemo, useState } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { useVerifiedLoans } from "@/hooks/use-verified-loans";
import { cn } from "@/lib/utils";

/* Spec §6.5 — API Explorer (Module H). Live calls against the Verified
   Records API with a monospace JSON viewer and auto-generated cURL snippet
   (P2 polish kept in from day one — cheap and high-value for judges). */

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

/* Token-tinted spans for the JSON viewer. The highlighted text comes from
   JSON.stringify output — quotes and control chars are pre-escaped below, so
   dangerouslySetInnerHTML is safe here. */
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

function JsonViewer({ body, isError }: { body: unknown; isError: boolean }) {
  const formatted = useMemo(() => {
    if (typeof body === "string") {
      return body;
    }
    return JSON.stringify(body, null, 2);
  }, [body]);

  if (formatted.length > 60_000) {
    return (
      <div className="custom-scrollbar-hide overflow-auto rounded-lg border border-border bg-muted/40 p-4">
        <p className="font-mono text-[12px] text-muted-foreground">
          Response too large to render ({(formatted.length / 1000).toFixed(0)}k
          chars). Showing first 60k.
        </p>
        <pre
          className="mt-3 font-mono text-[12px] leading-relaxed"
          dangerouslySetInnerHTML={{
            __html: syntaxHighlight(formatted.slice(0, 60_000)),
          }}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "custom-scrollbar-hide max-h-[440px] overflow-auto rounded-lg border p-4",
        isError
          ? "border-destructive/30 bg-destructive/5"
          : "border-border bg-muted/40"
      )}
    >
      <pre
        className="font-mono text-[12px] leading-relaxed"
        dangerouslySetInnerHTML={{ __html: syntaxHighlight(formatted) }}
      />
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
    const url = endpoint.path.replace(":id", paramValue.trim() || sampleId);
    try {
      const res = await fetch(url, { credentials: "include" });
      let body: unknown;
      const contentType = res.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        body = await res.json();
      } else {
        const text = await res.text();
        body = text.slice(0, 4000);
      }
      setResponse({ body, isError: !res.ok, status: res.status });
    } catch {
      setResponse({
        body: { error: "Request failed — is the API server running?" },
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
  const curl = `curl -s -H "Cookie: <session>" \\
  http://localhost:4000${resolvedUrl}`;

  return (
    <div className="mx-auto max-w-[1100px] space-y-6 p-8">
      <PageHeader
        description="Live calls against the Verified Records API — the same endpoints your integrations use."
        eyebrow="Data Consumer"
        title="API Explorer"
      />

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-1.5">
          {ENDPOINTS.map((item) => (
            <button
              className={cn(
                "flex w-full flex-col items-start gap-0.5 rounded-lg border px-3 py-2.5 text-left transition-colors",
                activePath === item.path
                  ? "border-primary/30 bg-primary/8"
                  : "border-transparent hover:bg-accent/50"
              )}
              key={item.path}
              onClick={() => {
                setActivePath(item.path);
                setResponse(null);
              }}
              type="button"
            >
              <span
                className={cn(
                  "font-medium font-mono text-[12px]",
                  activePath === item.path && "text-primary"
                )}
              >
                {item.path}
              </span>
              <span className="text-[11.5px] text-muted-foreground">
                {item.description}
              </span>
            </button>
          ))}
        </aside>

        <section className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center gap-2.5">
              <span className="rounded-md bg-success/10 px-2 py-0.5 font-mono font-semibold text-[11px] text-success">
                {endpoint.method}
              </span>
              <span className="truncate font-mono text-[13px]">
                {endpoint.path}
              </span>
            </div>

            {endpoint.paramKind === "id" ? (
              <div className="mb-4 flex items-end gap-2">
                <label className="flex-1 space-y-1.5">
                  <span className="block font-medium text-[11px] text-muted-foreground uppercase tracking-wider">
                    {endpoint.paramLabel}
                  </span>
                  <input
                    className="h-9 w-full rounded-lg border border-input bg-background px-3 font-mono text-[12.5px] outline-none placeholder:text-muted-foreground/60 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
                    onChange={(event) => setParamValue(event.target.value)}
                    placeholder={sampleId || "cuid…"}
                    type="text"
                    value={paramValue}
                  />
                </label>
                {sampleId ? (
                  <Button
                    onClick={() => setParamValue(sampleId)}
                    size="sm"
                    variant="ghost"
                  >
                    Use first record
                  </Button>
                ) : null}
              </div>
            ) : null}

            <div className="flex items-center gap-2">
              <Button disabled={sending} onClick={() => void send()}>
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
                    Send
                  </>
                )}
              </Button>
              {response ? (
                <span
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 font-mono text-[11.5px]",
                    response.isError
                      ? "border-destructive/25 bg-destructive/8 text-destructive"
                      : "border-success/30 bg-success/8 text-success"
                  )}
                >
                  {response.status || "ERR"}
                </span>
              ) : null}
            </div>
          </div>

          {response ? (
            <JsonViewer body={response.body} isError={response.isError} />
          ) : (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-border border-dashed bg-muted/30 py-12">
              <i
                aria-hidden="true"
                className="ri-code-s-slash-line text-2xl text-muted-foreground/40"
              />
              <p className="text-[12.5px] text-muted-foreground">
                Send a request to inspect the live JSON response.
              </p>
            </div>
          )}

          <div className="rounded-xl border border-border bg-card">
            <header className="flex items-center justify-between border-border border-b px-4 py-2.5">
              <span className="flex items-center gap-2 font-medium text-[12.5px]">
                <i
                  aria-hidden="true"
                  className="ri-terminal-line text-muted-foreground"
                />
                cURL
              </span>
              <button
                className="flex items-center gap-1 rounded-md px-2 py-1 text-[11.5px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                onClick={() => {
                  void navigator.clipboard.writeText(curl);
                }}
                type="button"
              >
                <i aria-hidden="true" className="ri-file-copy-line" />
                Copy
              </button>
            </header>
            <pre className="custom-scrollbar-hide overflow-x-auto px-4 py-3 font-mono text-[11.5px] text-muted-foreground leading-relaxed">
              {curl}
            </pre>
          </div>
        </section>
      </div>
    </div>
  );
}
