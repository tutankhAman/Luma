import type { LoanDetail, LoanEditableField } from "@repo/types";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useUpdateLoanFields } from "@/hooks/use-loans";
import { cn } from "@/lib/utils";

const EDITABLE_FIELDS: LoanEditableField[] = [
  "currentBalance",
  "interestRate",
  "paymentStatus",
  "documentStatus",
  "borrowerState",
  "servicerName",
  "creditGrade",
];

const FIELD_LABELS: Record<
  string,
  { label: string; format?: "date" | "money" }
> = {
  borrowerId: { label: "Borrower ID" },
  borrowerState: { label: "State" },
  creditGrade: { label: "Credit grade" },
  currentBalance: { format: "money", label: "Current balance" },
  daysPastDue: { label: "Days past due" },
  documentStatus: { label: "Document status" },
  employmentLength: { label: "Employment" },
  incomeBand: { label: "Income band" },
  interestRate: { label: "Interest rate" },
  lastPaymentDate: { format: "date", label: "Last payment" },
  lastUpdatedAt: { format: "date", label: "Last updated" },
  loanId: { label: "Loan ID" },
  loanPurpose: { label: "Purpose" },
  loanType: { label: "Type" },
  maturityDate: { format: "date", label: "Maturity" },
  originalPrincipal: { format: "money", label: "Original principal" },
  originationDate: { format: "date", label: "Origination" },
  paymentStatus: { label: "Payment status" },
  servicerName: { label: "Servicer" },
  sourceSystem: { label: "Source system" },
  termMonths: { label: "Term (months)" },
};

const DISPLAY_ORDER = [
  "loanId",
  "borrowerId",
  "loanType",
  "originationDate",
  "maturityDate",
  "originalPrincipal",
  "currentBalance",
  "interestRate",
  "termMonths",
  "paymentStatus",
  "daysPastDue",
  "borrowerState",
  "loanPurpose",
  "creditGrade",
  "employmentLength",
  "incomeBand",
  "servicerName",
  "lastPaymentDate",
  "lastUpdatedAt",
  "documentStatus",
  "sourceSystem",
] as const;

function formatValue(
  value: string | number | null,
  format?: "date" | "money"
): string {
  if (value === null || value === "") {
    return "—";
  }
  if (format === "date") {
    return new Date(value).toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }
  if (format === "money") {
    const amount = Number(value);
    return Number.isNaN(amount)
      ? String(value)
      : amount.toLocaleString(undefined, {
          maximumFractionDigits: 2,
          minimumFractionDigits: 2,
        });
  }
  return String(value);
}

interface EditingState {
  field: LoanEditableField;
  reason: string;
  value: string;
}

export function LoanFieldsPanel({ loan }: { loan: LoanDetail }) {
  const [editing, setEditing] = useState<EditingState | null>(null);
  const updateFields = useUpdateLoanFields(loan.id);

  const startEdit = (field: LoanEditableField, current: string | null) => {
    setEditing({ field, reason: "", value: current ?? "" });
  };

  const save = () => {
    if (!editing?.reason.trim()) {
      return;
    }
    const fields = {
      [editing.field]: editing.value,
    } as Record<LoanEditableField, string>;
    updateFields.mutate(
      { fields, reason: editing.reason.trim() },
      {
        onSettled: () => setEditing(null),
      }
    );
  };

  return (
    <Card className="rounded-2xl border-slate-100 bg-white shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)]">
      <CardHeader>
        <CardTitle className="text-slate-900">Loan fields</CardTitle>
        <CardDescription className="text-slate-500">
          Pencil marks reviewer-editable fields. Every edit is audit logged with
          a reason.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
          {DISPLAY_ORDER.map((key) => {
            const meta = FIELD_LABELS[key] ?? { label: key };
            const value = loan[key] as string | number | null;
            const editable = EDITABLE_FIELDS.includes(key as LoanEditableField);
            const isEditing = editing?.field === key;

            if (isEditing && editing) {
              return (
                <div
                  className="col-span-1 space-y-2 rounded-lg border border-indigo-200 bg-indigo-50/40 p-3 sm:col-span-2"
                  key={key}
                >
                  <p className="font-medium text-indigo-700 text-xs">
                    Editing {meta.label}
                  </p>
                  <Input
                    aria-label={`New value for ${meta.label}`}
                    onChange={(event) =>
                      setEditing({ ...editing, value: event.target.value })
                    }
                    value={editing.value}
                  />
                  <Input
                    aria-label="Reason for edit"
                    onChange={(event) =>
                      setEditing({ ...editing, reason: event.target.value })
                    }
                    placeholder="Reason (required, audit logged)"
                    value={editing.reason}
                  />
                  <div className="flex gap-2">
                    <Button
                      disabled={
                        !editing.reason.trim() || updateFields.isPending
                      }
                      onClick={save}
                      size="sm"
                    >
                      {updateFields.isPending ? "Saving..." : "Save"}
                    </Button>
                    <Button
                      onClick={() => setEditing(null)}
                      size="sm"
                      variant="ghost"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              );
            }

            return (
              <div
                className="flex items-center justify-between gap-2 border-slate-50 border-b py-2"
                key={key}
              >
                <dt className="text-slate-500 text-xs">{meta.label}</dt>
                <dd
                  className={cn(
                    "flex items-center gap-1.5 text-right text-slate-900 text-sm",
                    editable && "font-medium"
                  )}
                >
                  {formatValue(value, meta.format)}
                  {editable ? (
                    <button
                      aria-label={`Edit ${meta.label}`}
                      className="text-slate-400 transition-colors hover:text-indigo-600"
                      onClick={() =>
                        startEdit(
                          key as LoanEditableField,
                          value === null ? null : String(value)
                        )
                      }
                      type="button"
                    >
                      <i
                        aria-hidden="true"
                        className="ri-pencil-line text-sm"
                      />
                    </button>
                  ) : null}
                </dd>
              </div>
            );
          })}
        </dl>
      </CardContent>
    </Card>
  );
}
