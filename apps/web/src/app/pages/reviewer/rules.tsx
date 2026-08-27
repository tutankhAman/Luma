import type { AiSuggestRuleResponse } from "@repo/types";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { aiApi } from "@/lib/api";

/* Spec §5.4 — Rule Builder (stretch, Module D). Plain-English rule input →
   AI-generated JSON preview matching the validation rule shape, with
   Accept & Add to Ruleset and a list of active rules. */

interface ActiveRule {
  addedAt: string;
  rule: NonNullable<AiSuggestRuleResponse["rule"]>;
}

const EXAMPLE_PROMPTS = [
  "Flag loans where days past due exceeds 90",
  "Reject any loan missing a servicer name",
  "Flag loans whose current balance grew by more than 10% since origination",
];

export default function RuleBuilderPage() {
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState<AiSuggestRuleResponse | null>(null);
  const [rules, setRules] = useState<ActiveRule[]>([]);

  const generate = useMutation({
    mutationFn: () => aiApi.suggestRule(prompt.trim()),
    onError: (error: Error) => {
      toast.error("Rule generation failed", { description: error.message });
    },
    onSuccess: (data) => {
      if (data.rule) {
        setResult(data);
      } else {
        toast.error("No rule produced", {
          description: data.error ?? data.note ?? "Try a more specific prompt.",
        });
      }
    },
  });

  const accept = () => {
    if (!result?.rule) {
      return;
    }
    setRules((previous) => [
      {
        addedAt: new Date().toISOString(),
        rule: result.rule as NonNullable<AiSuggestRuleResponse["rule"]>,
      },
      ...previous,
    ]);
    toast.success("Rule added to ruleset", {
      description: "It will apply to the next validation run.",
    });
    setResult(null);
    setPrompt("");
  };

  return (
    <div className="mx-auto max-w-[1000px] space-y-6 p-8">
      <PageHeader
        description="Describe a validation rule in plain English — the AI drafts the JSON rule and you decide what ships."
        eyebrow="Reviewer"
        title="Rule Builder"
      />

      <section className="rounded-xl border border-border bg-card p-5">
        <label className="block space-y-2" htmlFor="rule-prompt">
          <span className="block font-medium text-[11px] text-muted-foreground uppercase tracking-wider">
            Rule in plain English
          </span>
          <Textarea
            id="rule-prompt"
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="e.g. Flag loans where the current balance exceeds the original principal"
            rows={3}
            value={prompt}
          />
        </label>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {EXAMPLE_PROMPTS.map((example) => (
            <button
              className="rounded-full border border-border px-2.5 py-1 text-[11.5px] text-muted-foreground transition-colors hover:bg-accent/50"
              key={example}
              onClick={() => setPrompt(example)}
              type="button"
            >
              {example}
            </button>
          ))}
          <Button
            className="ml-auto"
            disabled={prompt.trim().length < 8 || generate.isPending}
            onClick={() => generate.mutate()}
            size="sm"
          >
            {generate.isPending ? (
              <>
                <i
                  aria-hidden="true"
                  className="ri-loader-4-line animate-spin"
                />
                Drafting…
              </>
            ) : (
              <>
                <i aria-hidden="true" className="ri-sparkling-2-line" />
                Generate rule
              </>
            )}
          </Button>
        </div>
      </section>

      {result ? (
        <section className="overflow-hidden rounded-xl border border-primary/25 bg-primary/[0.04]">
          <header className="flex flex-wrap items-center justify-between gap-2 border-primary/15 border-b px-5 py-3">
            <span className="flex items-center gap-2 font-semibold text-[13.5px]">
              <i aria-hidden="true" className="ri-braces-line text-primary" />
              {result.rule?.name ?? "Generated rule"}
            </span>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {result.rule?.severity ?? "medium"}
              </Badge>
              <Badge variant="outline">
                {result.rule?.exceptionType?.replaceAll("_", " ") ?? "rule"}
              </Badge>
            </div>
          </header>
          <div className="space-y-4 p-5">
            <p className="text-[13.5px] text-foreground/90">
              {result.rule?.description}
            </p>
            <pre className="custom-scrollbar-hide overflow-x-auto rounded-lg border border-border bg-muted/40 p-4 font-mono text-[12px] leading-relaxed">
              {JSON.stringify(result.rule, null, 2)}
            </pre>
            <div className="flex flex-wrap items-center justify-between gap-3 border-primary/15 border-t pt-3">
              <p className="font-mono text-[11px] text-muted-foreground">
                {result.model} ·{" "}
                {new Date(result.timestamp).toLocaleTimeString(undefined, {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {" · "}
                prompt: {result.promptSummary.slice(0, 60)}
                {(result.promptSummary.length ?? 0) > 60 ? "…" : ""}
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={() => setResult(null)}
                  size="sm"
                  variant="ghost"
                >
                  Discard
                </Button>
                <Button onClick={accept} size="sm">
                  <i aria-hidden="true" className="ri-check-line" />
                  Accept & Add to Ruleset
                </Button>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="rounded-xl border border-border bg-card">
        <header className="flex items-center justify-between border-border border-b px-5 py-3.5">
          <div>
            <h3 className="font-semibold text-[14px] tracking-tight">
              Active ruleset
            </h3>
            <p className="text-[12px] text-muted-foreground">
              {rules.length} rule{rules.length === 1 ? "" : "s"} added this
              session · engine defaults still apply
            </p>
          </div>
        </header>
        {rules.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10">
            <i
              aria-hidden="true"
              className="ri-shield-keyhole-line text-2xl text-muted-foreground/40"
            />
            <p className="text-[13px] text-muted-foreground">
              No custom rules yet — generate one above.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {rules.map(({ addedAt, rule }) => (
              <li
                className="flex items-start justify-between gap-4 px-5 py-3"
                key={`${rule.id}-${addedAt}`}
              >
                <div className="min-w-0">
                  <p className="font-medium text-[13px]">{rule.name}</p>
                  <p className="truncate text-[12px] text-muted-foreground">
                    {rule.description}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant="outline">
                    {rule.exceptionType.replaceAll("_", " ")}
                  </Badge>
                  <Badge variant="outline">{rule.severity}</Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
