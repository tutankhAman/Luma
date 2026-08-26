import type { BatchStatus, PipelineProgressMetadata } from "@repo/types";
import type React from "react";
import { cn } from "@/lib/utils";

interface PipelineStep {
  description: string;
  icon: string;
  id: number;
  title: string;
}

const PIPELINE_STEPS: readonly PipelineStep[] = [
  {
    description: "File received & staged",
    icon: "ri-upload-cloud-2-line",
    id: 1,
    title: "Upload & Staging",
  },
  {
    description: "Headers & schema checked",
    icon: "ri-file-search-line",
    id: 2,
    title: "Schema Verification",
  },
  {
    description: "Streaming 5k-row chunks",
    icon: "ri-database-2-line",
    id: 3,
    title: "Ingestion & Normalization",
  },
  {
    description: "10 rules & duplicate engine",
    icon: "ri-shield-check-line",
    id: 4,
    title: "Automated Validation",
  },
] as const;

type StepState = "completed" | "current" | "pending" | "failed";

interface PipelineTrackerProps {
  className?: string;
  failedCount?: number;
  metadata?: unknown;
  processedCount?: number;
  recordCount?: number;
  status?: BatchStatus;
}

function computeStepState(
  stepId: number,
  currentStep: number,
  isDone: boolean,
  isFailed: boolean
): StepState {
  if (isFailed) {
    if (stepId === currentStep) {
      return "failed";
    }
    if (stepId < currentStep) {
      return "completed";
    }
    return "pending";
  }

  if (isDone || stepId < currentStep) {
    return "completed";
  }

  if (stepId === currentStep) {
    return "current";
  }

  return "pending";
}

function computeProgress(
  currentStep: number,
  isDone: boolean,
  isFailed: boolean
): number {
  if (isDone) {
    return 100;
  }
  if (isFailed) {
    return Math.max(15, (currentStep - 1) * 25);
  }
  const map: Record<number, number> = { 1: 20, 2: 40, 3: 65, 4: 85, 5: 100 };
  return map[currentStep] ?? 20;
}

function formatActiveMessage(
  meta: PipelineProgressMetadata,
  currentStep: number,
  isDone: boolean,
  isFailed: boolean,
  processedCount: number,
  failedCount: number,
  recordCount: number
): string {
  if (meta.stageMessage) {
    return meta.stageMessage;
  }
  if (isDone) {
    return `Pipeline completed successfully (${processedCount} loans normalized, ${failedCount} malformed rows isolated).`;
  }
  if (isFailed) {
    return (
      meta.error ?? "Pipeline failed during processing. Check logs for details."
    );
  }
  if (currentStep === 1) {
    return "Staging uploaded file...";
  }
  if (currentStep === 2) {
    return "Validating CSV headers against canonical loan schema...";
  }
  if (currentStep === 3) {
    return `Streaming rows into database (${processedCount} of ${recordCount || "..."} processed)...`;
  }
  if (currentStep === 4) {
    return "Running 10 validation rules and cross-loan duplicate analysis...";
  }
  return "Processing pipeline...";
}

function renderStepIcon(state: StepState, stepId: number): React.ReactNode {
  if (state === "completed") {
    return <i className="ri-check-line text-sm" />;
  }
  if (state === "failed") {
    return <i className="ri-close-line text-sm" />;
  }
  if (state === "current") {
    return <i className="ri-loader-4-line animate-spin text-sm" />;
  }
  return stepId;
}

function getStepSubtitle(state: StepState, defaultDesc: string): string {
  if (state === "completed") {
    return "Completed";
  }
  if (state === "failed") {
    return "Failed here";
  }
  if (state === "current") {
    return "In progress...";
  }
  return defaultDesc;
}

function PipelineStepCard({
  step,
  state,
}: {
  step: PipelineStep;
  state: StepState;
}) {
  return (
    <div
      className={cn(
        "relative flex items-start gap-3 rounded-lg border p-3 transition-colors",
        state === "completed" &&
          "border-emerald-500/20 bg-emerald-500/100/[0.04] text-foreground",
        state === "current" && "border-primary/40 bg-primary/[0.05] shadow-xs",
        state === "failed" &&
          "border-destructive/40 bg-destructive/10 text-rose-400",
        state === "pending" &&
          "border-muted bg-muted/20 text-[#A1A1AA] opacity-60"
      )}
    >
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-semibold text-xs",
          state === "completed" &&
            "bg-emerald-500/100 text-white dark:bg-emerald-600",
          state === "current" &&
            "animate-pulse bg-primary text-primary-foreground",
          state === "failed" && "bg-destructive text-white",
          state === "pending" && "bg-muted text-[#A1A1AA]"
        )}
      >
        {renderStepIcon(state, step.id)}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-xs">{step.title}</p>
        <p className="mt-0.5 truncate text-[#A1A1AA] text-[11px]">
          {getStepSubtitle(state, step.description)}
        </p>
      </div>
    </div>
  );
}

function HeaderStatusIcon({
  isDone,
  isFailed,
}: {
  isDone: boolean;
  isFailed: boolean;
}) {
  if (isDone) {
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/100/10 font-semibold text-emerald-400 text-xs dark:text-emerald-400">
        <i className="ri-checkbox-circle-line text-lg" />
      </div>
    );
  }
  if (isFailed) {
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10 font-semibold text-rose-400 text-xs">
        <i className="ri-error-warning-line text-lg" />
      </div>
    );
  }
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 font-semibold text-primary text-xs">
      <i className="ri-loader-4-line animate-spin text-lg" />
    </div>
  );
}

function HeaderBadge({
  isDone,
  isFailed,
  currentStep,
}: {
  isDone: boolean;
  isFailed: boolean;
  currentStep: number;
}) {
  let text = `Phase ${Math.min(currentStep, 4)} of 4`;
  if (isDone) {
    text = "All Stages Complete";
  } else if (isFailed) {
    text = "Pipeline Failed";
  }

  const isRunning = !(isDone || isFailed);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-medium text-xs",
        isDone &&
          "border border-emerald-500/30 bg-emerald-500/100/10 text-emerald-400 dark:text-emerald-300",
        isFailed &&
          "border border-destructive/30 bg-destructive/10 text-rose-400",
        isRunning && "border border-primary/30 bg-primary/10 text-primary"
      )}
    >
      {isRunning ? (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
        </span>
      ) : null}
      {text}
    </span>
  );
}

export function PipelineTracker({
  status = "processing",
  metadata,
  recordCount = 0,
  processedCount = 0,
  failedCount = 0,
  className,
}: PipelineTrackerProps) {
  const meta = (metadata as PipelineProgressMetadata | null) ?? {};
  const currentStep = meta.pipelineStep ?? (status === "done" ? 5 : 1);
  const isFailed = status === "failed" || meta.pipelineStage === "failed";
  const isDone = status === "done" || meta.pipelineStage === "completed";

  const progressPercentage = computeProgress(currentStep, isDone, isFailed);
  const message = formatActiveMessage(
    meta,
    currentStep,
    isDone,
    isFailed,
    processedCount,
    failedCount,
    recordCount
  );

  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-5 text-card-foreground transition-all",
        isFailed && "border-destructive/30 bg-destructive/5",
        isDone && "border-emerald-500/20 bg-emerald-500/100/[0.02]",
        className
      )}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <HeaderStatusIcon isDone={isDone} isFailed={isFailed} />
          <div>
            <h3 className="font-semibold text-sm">Ingestion Pipeline Status</h3>
            <p
              className={cn(
                "text-xs",
                isFailed ? "font-medium text-rose-400" : "text-[#A1A1AA]"
              )}
            >
              {message}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <HeaderBadge
            currentStep={currentStep}
            isDone={isDone}
            isFailed={isFailed}
          />
        </div>
      </div>

      {/* Linear progress bar */}
      <div className="mb-6 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full transition-all duration-500 ease-out",
            isDone && "bg-emerald-500/100",
            isFailed && "bg-destructive",
            !(isDone || isFailed) && "bg-primary"
          )}
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* 4 Step Timeline */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {PIPELINE_STEPS.map((step) => {
          const state = computeStepState(
            step.id,
            currentStep,
            isDone,
            isFailed
          );
          return <PipelineStepCard key={step.id} state={state} step={step} />;
        })}
      </div>
    </div>
  );
}
