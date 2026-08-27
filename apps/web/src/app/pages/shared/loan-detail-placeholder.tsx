import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";

function ComingSoon({ label }: { label: string }) {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <h1 className="font-heading font-semibold text-2xl">{label}</h1>
      <p className="text-muted-foreground text-sm">
        Loan detail view arrives in Phase 2 — the API contract and types are
        already in place.
      </p>
      <Button onClick={() => window.history.back()} variant="outline">
        Go back
      </Button>
    </div>
  );
}

export function ReviewerLoanDetail() {
  const { id } = useParams<{ id: string }>();
  return <ComingSoon label={`Loan ${id ?? ""} (reviewer)`} />;
}

export function ConsumerVerifiedLoanDetail() {
  const { id } = useParams<{ id: string }>();
  return <ComingSoon label={`Verified loan ${id ?? ""}`} />;
}
