// Seeded PRNG for deterministic, reproducible generation
class PRNG {
  private s: number;
  constructor(seed = 123_456_789) {
    this.s = seed % 2_147_483_647;
    if (this.s <= 0) {
      this.s += 2_147_483_646;
    }
  }
  next(): number {
    this.s = (this.s * 16_807) % 2_147_483_647;
    return (this.s - 1) / 2_147_483_646;
  }
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
  pick<T>(arr: readonly T[]): T {
    const item = arr[this.nextInt(0, arr.length - 1)];
    if (item === undefined) {
      throw new Error("Cannot pick from empty array");
    }
    return item;
  }
  randomFloat(min: number, max: number, decimals = 2): number {
    const val = this.next() * (max - min) + min;
    return Number(val.toFixed(decimals));
  }
}

const prng = new PRNG(42);

const US_STATES = [
  "CA",
  "TX",
  "NY",
  "FL",
  "IL",
  "PA",
  "OH",
  "MI",
  "WA",
  "AZ",
  "GA",
  "NC",
  "VA",
  "CO",
  "NJ",
  "MA",
  "TN",
  "IN",
  "MO",
  "MD",
  "WI",
  "MN",
  "SC",
  "AL",
  "LA",
  "KY",
  "OR",
  "OK",
  "CT",
  "UT",
] as const;

const LOAN_TYPES = [
  "mortgage",
  "mortgage",
  "mortgage",
  "mortgage",
  "auto",
  "personal",
  "student",
  "commercial",
] as const;

const LOAN_PURPOSES = [
  "purchase",
  "refinance",
  "debt_consolidation",
  "home_improvement",
  "cash_out_refinance",
] as const;

const CREDIT_GRADES = ["A", "B", "C", "D", "E"] as const;

const EMPLOYMENT_LENGTHS = [
  "< 1 year",
  "1-3 years",
  "3-5 years",
  "5-10 years",
  "10+ years",
] as const;

const INCOME_BANDS = [
  "<30k",
  "30k-50k",
  "50k-75k",
  "75k-100k",
  "100k-150k",
  "150k+",
] as const;

const SERVICERS = [
  "First National",
  "Rocket Servicing",
  "Pennymac",
  "Chase Home Lending",
  "Freedom Mortgage",
  "Wells Fargo Servicing",
  "Mr. Cooper",
  "LoanCare",
] as const;

const SOURCE_SYSTEMS = [
  "origination",
  "servicing_core",
  "legacy_crm",
  "portal_upload",
] as const;

const formatDate = (date: Date): string => {
  const [datePart] = date.toISOString().split("T");
  return datePart ?? "";
};

const determinePaymentFields = (currentBalance: number) => {
  const roll = prng.nextInt(1, 100);
  if (roll <= 92) {
    return {
      daysPastDue: 0,
      finalBalance: currentBalance,
      paymentStatus: "current",
    };
  }
  if (roll <= 97) {
    return {
      daysPastDue: prng.pick([30, 60, 90, 120]),
      finalBalance: currentBalance,
      paymentStatus: "delinquent",
    };
  }
  if (roll <= 99) {
    return {
      daysPastDue: prng.pick([15, 25]),
      finalBalance: currentBalance,
      paymentStatus: "late",
    };
  }
  return { daysPastDue: 0, finalBalance: 0.0, paymentStatus: "closed" };
};

const generateCleanLoan = (index: number): Record<string, string> => {
  const loanId = `L-${(100_000 + index).toString()}`;
  const borrowerId = `B-${(500_000 + index).toString()}`;
  const loanType = prng.pick(LOAN_TYPES);
  const termMonths =
    loanType === "mortgage"
      ? prng.pick([180, 240, 360])
      : prng.pick([36, 60, 84, 120]);

  const origYear = prng.nextInt(2018, 2024);
  const origMonth = prng.nextInt(1, 12);
  const origDay = prng.nextInt(1, 28);
  const origDate = new Date(Date.UTC(origYear, origMonth - 1, origDay));
  const matDate = new Date(
    Date.UTC(origYear, origMonth - 1 + termMonths, origDay)
  );

  const originalPrincipal = prng.randomFloat(50_000, 650_000, 2);
  const currentBalance = prng.randomFloat(
    originalPrincipal * 0.15,
    originalPrincipal * 0.95,
    2
  );
  const interestRate = prng.randomFloat(3.25, 8.75, 2);

  const { paymentStatus, daysPastDue, finalBalance } =
    determinePaymentFields(currentBalance);

  const lastPayMonth = prng.nextInt(6, 8);
  const lastPayDay = prng.nextInt(1, 28);
  const lastPaymentDate = `2026-0${lastPayMonth}-${lastPayDay < 10 ? `0${lastPayDay}` : lastPayDay}`;

  const lastUpdDay = prng.nextInt(1, 25);
  const lastUpdatedAt = `2026-08-${lastUpdDay < 10 ? `0${lastUpdDay}` : lastUpdDay}`;

  return {
    borrower_id: borrowerId,
    borrower_state: prng.pick(US_STATES),
    credit_grade: prng.pick(CREDIT_GRADES),
    current_balance: finalBalance.toFixed(2),
    days_past_due: daysPastDue.toString(),
    document_status: prng.pick([
      "complete",
      "complete",
      "complete",
      "verified",
    ]),
    employment_length: prng.pick(EMPLOYMENT_LENGTHS),
    income_band: prng.pick(INCOME_BANDS),
    interest_rate: interestRate.toFixed(2),
    last_payment_date: lastPaymentDate,
    last_updated_at: lastUpdatedAt,
    loan_id: loanId,
    loan_purpose: prng.pick(LOAN_PURPOSES),
    loan_type: loanType,
    maturity_date: formatDate(matDate),
    original_principal: originalPrincipal.toFixed(2),
    origination_date: formatDate(origDate),
    payment_status: paymentStatus,
    servicer_name: prng.pick(SERVICERS),
    source_system: prng.pick(SOURCE_SYSTEMS),
    term_months: termMonths.toString(),
  };
};

const mutateRow = (
  rows: Record<string, string>[],
  idx: number,
  field: string,
  val: string
) => {
  const row = rows[idx];
  if (row) {
    row[field] = val;
  }
};

const applyNormalizationAnomalies = (rows: Record<string, string>[]) => {
  for (let i = 0; i < 10; i += 1) {
    const idx = 10 + i * 10;
    mutateRow(rows, idx, "loan_id", "");
    mutateRow(rows, idx, "borrower_id", "");
  }
  for (let i = 0; i < 10; i += 1) {
    const idx = 110 + i * 10;
    mutateRow(rows, idx, "origination_date", "not-a-date");
  }
  for (let i = 0; i < 10; i += 1) {
    const idx = 210 + i * 10;
    mutateRow(rows, idx, "maturity_date", "2030-99-99");
  }
};

const applyValidationAnomalies = (rows: Record<string, string>[]) => {
  for (let i = 0; i < 20; i += 1) {
    mutateRow(rows, 310 + i * 10, "loan_id", "");
  }
  for (let i = 0; i < 25; i += 1) {
    mutateRow(rows, 510 + i * 10, "document_status", "");
  }
  for (let i = 0; i < 25; i += 1) {
    const idx = 760 + i * 10;
    mutateRow(rows, idx, "origination_date", "2023-05-15");
    mutateRow(rows, idx, "maturity_date", "2020-01-01");
  }
  for (let i = 0; i < 20; i += 1) {
    const idx = 1010 + i * 10;
    mutateRow(
      rows,
      idx,
      "original_principal",
      `-${prng.randomFloat(20_000, 100_000).toFixed(2)}`
    );
  }
  for (let i = 0; i < 25; i += 1) {
    const idx = 1210 + i * 10;
    const orig = 250_000.0;
    mutateRow(rows, idx, "original_principal", orig.toFixed(2));
    mutateRow(rows, idx, "current_balance", (orig + 50_000.0).toFixed(2));
  }
  for (let i = 0; i < 15; i += 1) {
    mutateRow(
      rows,
      1460 + i * 10,
      "interest_rate",
      `-${prng.randomFloat(1.0, 5.0).toFixed(2)}`
    );
  }
  for (let i = 0; i < 15; i += 1) {
    mutateRow(
      rows,
      1610 + i * 10,
      "interest_rate",
      prng.randomFloat(45.0, 68.0).toFixed(2)
    );
  }
  for (let i = 0; i < 25; i += 1) {
    const idx = 1760 + i * 10;
    mutateRow(rows, idx, "payment_status", "current");
    mutateRow(
      rows,
      idx,
      "days_past_due",
      prng.pick([30, 45, 60, 90]).toString()
    );
  }
  for (let i = 0; i < 25; i += 1) {
    const idx = 2010 + i * 10;
    mutateRow(rows, idx, "payment_status", prng.pick(["delinquent", "late"]));
    mutateRow(rows, idx, "days_past_due", "0");
  }
  for (let i = 0; i < 25; i += 1) {
    const idx = 2260 + i * 10;
    mutateRow(rows, idx, "payment_status", "closed");
    mutateRow(
      rows,
      idx,
      "current_balance",
      prng.randomFloat(10_000, 75_000).toFixed(2)
    );
  }
  for (let i = 0; i < 25; i += 1) {
    mutateRow(
      rows,
      2510 + i * 10,
      "borrower_state",
      prng.pick(["XX", "ZZ", "99", "AA", "QQ"])
    );
  }
  for (let i = 0; i < 25; i += 1) {
    const idx = 2760 + i * 10;
    const oldYear = prng.pick([2024, 2025]);
    const oldMonth = prng.nextInt(1, 12);
    const oldDay = prng.nextInt(1, 28);
    mutateRow(
      rows,
      idx,
      "last_updated_at",
      `${oldYear}-${oldMonth < 10 ? `0${oldMonth}` : oldMonth}-${oldDay < 10 ? `0${oldDay}` : oldDay}`
    );
  }
};

const applyDuplicateAnomalies = (rows: Record<string, string>[]) => {
  for (let i = 0; i < 20; i += 1) {
    const baseIdx = 3010 + i * 10;
    const dupeIdx = 5010 + i * 10;
    const dupId = `L-DUP-${1000 + i}`;
    mutateRow(rows, baseIdx, "loan_id", dupId);
    mutateRow(rows, dupeIdx, "loan_id", dupId);
  }

  for (let i = 0; i < 15; i += 1) {
    const baseIdx = 3210 + i * 10;
    const dupeIdx = 5210 + i * 10;
    const comboBorrower = `B-COMBO-${2000 + i}`;
    const comboPrincipal = "385000.00";
    const comboDate = "2021-09-15";
    mutateRow(rows, baseIdx, "borrower_id", comboBorrower);
    mutateRow(rows, baseIdx, "original_principal", comboPrincipal);
    mutateRow(rows, baseIdx, "origination_date", comboDate);
    mutateRow(rows, dupeIdx, "borrower_id", comboBorrower);
    mutateRow(rows, dupeIdx, "original_principal", comboPrincipal);
    mutateRow(rows, dupeIdx, "origination_date", comboDate);
  }

  const spiked1 = "B-SPIKED-HIGH-01";
  const spiked2 = "B-SPIKED-HIGH-02";
  const spiked1Indices = [3400, 3500, 3600, 3700, 3800, 3900, 5410, 5510];
  const spiked2Indices = [4000, 4100, 4200, 4300, 4400, 4500, 5610, 5710];

  for (let i = 0; i < 8; i += 1) {
    const idx1 = spiked1Indices[i];
    if (idx1 !== undefined) {
      mutateRow(rows, idx1, "borrower_id", spiked1);
      mutateRow(
        rows,
        idx1,
        "origination_date",
        `202${i % 4}-0${(i % 8) + 1}-10`
      );
      mutateRow(
        rows,
        idx1,
        "original_principal",
        (200_000 + i * 15_000).toFixed(2)
      );
    }

    const idx2 = spiked2Indices[i];
    if (idx2 !== undefined) {
      mutateRow(rows, idx2, "borrower_id", spiked2);
      mutateRow(
        rows,
        idx2,
        "origination_date",
        `202${(i + 1) % 4}-0${(i % 8) + 1}-12`
      );
      mutateRow(
        rows,
        idx2,
        "original_principal",
        (300_000 + i * 12_000).toFixed(2)
      );
    }
  }
};

export const generate6kDataset = (): Record<string, string>[] => {
  const TOTAL_ROWS = 6000;
  const rows: Record<string, string>[] = [];

  for (let i = 0; i < TOTAL_ROWS; i += 1) {
    rows.push(generateCleanLoan(i));
  }

  applyNormalizationAnomalies(rows);
  applyValidationAnomalies(rows);
  applyDuplicateAnomalies(rows);

  return rows;
};

const HEADERS = [
  "loan_id",
  "borrower_id",
  "loan_type",
  "origination_date",
  "maturity_date",
  "original_principal",
  "current_balance",
  "interest_rate",
  "term_months",
  "borrower_state",
  "loan_purpose",
  "credit_grade",
  "employment_length",
  "income_band",
  "payment_status",
  "days_past_due",
  "servicer_name",
  "last_payment_date",
  "last_updated_at",
  "document_status",
  "source_system",
] as const;

export const toCsv = (rows: Record<string, string>[]): string => {
  const headerLine = HEADERS.join(",");
  const dataLines = rows.map((row) =>
    HEADERS.map((h) => row[h] ?? "").join(",")
  );
  return [headerLine, ...dataLines].join("\n");
};
