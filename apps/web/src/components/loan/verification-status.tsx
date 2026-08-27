export function VerificationStatus({
  verifiedRecord,
}: {
  verifiedRecord: {
    recordHash: string;
    verifiedAt: string;
  } | null;
}) {
  if (!verifiedRecord) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border border-success/25 bg-success/10 px-3 py-2">
      <i
        aria-hidden="true"
        className="ri-shield-check-line text-sm text-success"
      />
      <span className="font-medium text-success text-xs">Verified</span>
      <span className="rounded border border-success/25 bg-success/10 px-1.5 py-0.5 font-mono text-[11px] text-success/80">
        {verifiedRecord.recordHash.slice(0, 12)}…
      </span>
      <span className="text-[11px] text-muted-foreground/60">
        {new Date(verifiedRecord.verifiedAt).toLocaleDateString()}
      </span>
    </div>
  );
}
