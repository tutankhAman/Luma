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
    <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
      <i
        aria-hidden="true"
        className="ri-shield-check-line text-emerald-400 text-sm"
      />
      <span className="font-medium text-emerald-400 text-xs">Verified</span>
      <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[11px] text-emerald-400/70">
        {verifiedRecord.recordHash.slice(0, 12)}…
      </span>
      <span className="text-[#52525B] text-[11px]">
        {new Date(verifiedRecord.verifiedAt).toLocaleDateString()}
      </span>
    </div>
  );
}
