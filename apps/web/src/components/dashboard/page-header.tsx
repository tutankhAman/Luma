import { cn } from "@/lib/utils";

export function PageHeader({
  action,
  description,
  eyebrow,
  title,
}: {
  action?: React.ReactNode;
  description?: string;
  eyebrow?: string;
  title: string;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-1 font-medium text-[11px] text-primary uppercase tracking-[0.1em]">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="font-semibold text-[24px] leading-tight tracking-tight">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-[13.5px] text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className={cn("shrink-0")}>{action}</div> : null}
    </div>
  );
}
