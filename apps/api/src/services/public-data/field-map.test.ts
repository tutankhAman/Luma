import { describe, expect, it } from "bun:test";
import {
  deriveDelinquency,
  gatePublicRow,
  mapLoanType,
  mapPublicRowToLoanPart,
  mapPurpose,
  PUBLIC_DATA_FORMAT_REGISTRY,
  PUBLIC_DATA_MIN_FIELDS,
  parsePublicDate,
} from "./field-map.js";

const buildPipeFields = (
  overrides: Partial<Record<number, string>> = {}
): string[] => {
  const arr: string[] = Array.from({ length: 108 }, () => "");
  arr[0] = "";
  arr[1] = overrides[1] ?? "100023020488";
  arr[2] = overrides[2] ?? "082009";
  arr[3] = overrides[3] ?? "R";
  arr[4] = overrides[4] ?? "Other";
  arr[5] = overrides[5] ?? "Other";
  arr[7] = overrides[7] ?? "5.375";
  arr[8] = overrides[8] ?? "5.375";
  arr[9] = overrides[9] ?? "55000.00";
  arr[11] = overrides[11] ?? "0.00";
  arr[12] = overrides[12] ?? "240";
  arr[13] = overrides[13] ?? "082009";
  arr[14] = overrides[14] ?? "102009";
  arr[15] = overrides[15] ?? "0";
  arr[16] = overrides[16] ?? "240";
  arr[17] = overrides[17] ?? "240";
  arr[18] = overrides[18] ?? "092029";
  arr[19] = overrides[19] ?? "55";
  arr[20] = overrides[20] ?? "55";
  arr[21] = overrides[21] ?? "1";
  arr[22] = overrides[22] ?? "36";
  arr[23] = overrides[23] ?? "714";
  arr[25] = overrides[25] ?? "N";
  arr[26] = overrides[26] ?? "C";
  arr[27] = overrides[27] ?? "SF";
  arr[28] = overrides[28] ?? "1";
  arr[29] = overrides[29] ?? "P";
  arr[30] = overrides[30] ?? "OH";
  arr[31] = overrides[31] ?? "17140";
  arr[32] = overrides[32] ?? "452";
  arr[34] = overrides[34] ?? "FRM";
  arr[35] = overrides[35] ?? "N";
  arr[39] = overrides[39] ?? "00";
  arr[41] = overrides[41] ?? "N";
  for (const [k, v] of Object.entries(overrides)) {
    arr[Number(k)] = v as string;
  }
  return arr;
};

describe("parsePublicDate", () => {
  it("parses MMYYYY 082009 -> 2009-08-01", () => {
    const d = parsePublicDate("082009");
    expect(d).toBeInstanceOf(Date);
    expect(d?.getUTCFullYear()).toBe(2009);
    expect(d?.getUTCMonth()).toBe(7);
    expect(d?.getUTCDate()).toBe(1);
  });

  it("parses MMYYYY 122015 -> 2015-12-01", () => {
    const d = parsePublicDate("122015");
    expect(d?.getUTCFullYear()).toBe(2015);
    expect(d?.getUTCMonth()).toBe(11);
  });

  it("parses YYYYMM 200908 fallback via swapped heuristic", () => {
    const d = parsePublicDate("200908");
    expect(d?.getUTCFullYear()).toBe(2009);
    expect(d?.getUTCMonth()).toBe(7);
  });

  it("parses ISO string", () => {
    const d = parsePublicDate("2022-03-15");
    expect(d?.toISOString().startsWith("2022-03-15")).toBe(true);
  });

  it("returns null for empty", () => {
    expect(parsePublicDate("")).toBeNull();
    expect(parsePublicDate("   ")).toBeNull();
    expect(parsePublicDate(null)).toBeNull();
  });

  it("returns null for garbage", () => {
    expect(parsePublicDate("not-a-date")).toBeNull();
    expect(parsePublicDate("999999")).toBeNull();
  });
});

describe("deriveDelinquency", () => {
  it("-1 -> current 0", () => {
    expect(deriveDelinquency("-1")).toEqual({
      daysPastDue: 0,
      paymentStatus: "current",
    });
  });

  it("0 -> current 0", () => {
    expect(deriveDelinquency("0")).toEqual({
      daysPastDue: 0,
      paymentStatus: "current",
    });
  });

  it("1 -> delinquent 30", () => {
    expect(deriveDelinquency("1")).toEqual({
      daysPastDue: 30,
      paymentStatus: "delinquent",
    });
  });

  it("3 -> delinquent 90", () => {
    expect(deriveDelinquency("3")).toEqual({
      daysPastDue: 90,
      paymentStatus: "delinquent",
    });
  });

  it("empty -> current 0", () => {
    expect(deriveDelinquency("")).toEqual({
      daysPastDue: 0,
      paymentStatus: "current",
    });
  });

  it("non-numeric keeps raw as status", () => {
    const r = deriveDelinquency("R");
    expect(r.paymentStatus).toBe("R");
  });
});

describe("mapPurpose", () => {
  it("maps P/R/C/U", () => {
    expect(mapPurpose("P")).toBe("purchase");
    expect(mapPurpose("R")).toBe("refinance");
    expect(mapPurpose("C")).toBe("cash-out refinance");
    expect(mapPurpose("U")).toBeNull();
    expect(mapPurpose("p")).toBe("purchase");
  });

  it("returns raw for unknown", () => {
    expect(mapPurpose("X")).toBe("X");
  });

  it("null -> null", () => {
    expect(mapPurpose(null)).toBeNull();
    expect(mapPurpose("")).toBeNull();
  });
});

describe("mapLoanType", () => {
  it("SF -> single_family", () => {
    expect(mapLoanType("SF")).toBe("single_family");
    expect(mapLoanType("CO")).toBe("condo");
  });

  it("unknown kept raw", () => {
    expect(mapLoanType("XYZ")).toBe("XYZ");
  });
});

describe("gatePublicRow", () => {
  it("rejects < MIN_FIELDS", () => {
    const short = Array.from({ length: 10 }, () => "");
    short[1] = "L1";
    short[2] = "082009";
    const r = gatePublicRow(short, "freddie_mac");
    expect(r.valid).toBe(false);
    expect(r.reason).toContain("expected");
  });

  it("rejects missing loan_id", () => {
    const arr = buildPipeFields({ 1: "" });
    const r = gatePublicRow(arr, "fannie_mae");
    expect(r.valid).toBe(false);
    expect(r.reason).toContain("loan_id");
  });

  it("rejects invalid period", () => {
    const arr = buildPipeFields({ 2: "notadate" });
    const r = gatePublicRow(arr, "freddie_mac");
    expect(r.valid).toBe(false);
    expect(r.reason).toContain("reporting period");
  });

  it("passes valid row and counts unmapped", () => {
    const arr = buildPipeFields();
    const before = gatePublicRow(arr, "freddie_mac");
    expect(before.valid).toBe(true);
    expect(before.unmappedNonEmpty).toBeGreaterThanOrEqual(0);
    arr[50] = "unexpected";
    const after = gatePublicRow(arr, "freddie_mac");
    expect(after.valid).toBe(true);
    expect(after.unmappedNonEmpty).toBe((before.unmappedNonEmpty ?? 0) + 1);
  });

  it("passes with no extra injection and reports a number", () => {
    const arr = buildPipeFields();
    const r = gatePublicRow(arr, "fannie_mae");
    expect(r.valid).toBe(true);
    expect(typeof r.unmappedNonEmpty).toBe("number");
  });
});

describe("mapPublicRowToLoanPart", () => {
  const batchId = "batch_pub_001";
  it("happy path -> loan fields mapped correctly", () => {
    const arr = buildPipeFields();
    const res = mapPublicRowToLoanPart(arr, batchId, 2, "freddie_mac");
    expect(res.success).toBe(true);
    if (!res.success) {
      throw new Error("expected success");
    }
    const d = res.data;
    expect(d.loanId).toBe("100023020488");
    expect(d.borrowerId).toBeNull();
    expect(d.sourceBatchId).toBe(batchId);
    expect(d.sourceRowNumber).toBe(2);
    expect(d.sourceSystem).toBe("freddie_mac");
    expect(d.documentStatus).toBe("unknown");
    expect(d.borrowerState).toBe("OH");
    expect(d.loanPurpose).toBe("purchase");
    expect(d.loanType).toBe("single_family");
    expect(d.termMonths).toBe(240);
    expect(d.creditGrade).toBe("714");
    expect(d.servicerName).toBe("Other");
    expect(d.originalPrincipal).toBe(55_000);
    expect(d.currentBalance).toBe(55_000);
    expect(d.interestRate).toBe(5.375);
    expect(d.originationDate?.getUTCFullYear()).toBe(2009);
    expect(d.maturityDate?.getUTCFullYear()).toBe(2029);
    expect(d.lastUpdatedAt?.getUTCMonth()).toBe(7);
    expect(d.paymentStatus).toBe("current");
    expect(d.daysPastDue).toBe(0);
  });

  it("curr UPB non-zero uses that value", () => {
    const arr = buildPipeFields({ 11: "54350.98" });
    const res = mapPublicRowToLoanPart(arr, batchId, 2, "fannie_mae");
    expect(res.success).toBe(true);
    if (!res.success) {
      throw new Error("expected success");
    }
    expect(res.data.currentBalance).toBe(54_350.98);
  });

  it("delinquency 3 -> delinquent 90", () => {
    const arr = buildPipeFields({ 15: "3" });
    const res = mapPublicRowToLoanPart(arr, batchId, 2, "freddie_mac");
    expect(res.success).toBe(true);
    if (!res.success) {
      throw new Error("expected success");
    }
    expect(res.data.paymentStatus).toBe("delinquent");
    expect(res.data.daysPastDue).toBe(90);
  });

  it("missing loan_id -> failedRow with reason", () => {
    const arr = buildPipeFields({ 1: "" });
    const res = mapPublicRowToLoanPart(arr, batchId, 5, "fannie_mae");
    expect(res.success).toBe(false);
    if (res.success) {
      throw new Error("expected failure");
    }
    expect(res.failedRow.rowNumber).toBe(5);
    expect(res.failedRow.reason.toLowerCase()).toContain("loan_id");
  });

  it("invalid origination date -> failedRow", () => {
    const arr = buildPipeFields({ 13: "not-a-date" });
    const res = mapPublicRowToLoanPart(arr, batchId, 2, "freddie_mac");
    expect(res.success).toBe(false);
    if (res.success) {
      throw new Error("expected failure");
    }
    expect(res.failedRow.reason.toLowerCase()).toContain("origination_date");
  });

  it("invalid maturity date -> failedRow", () => {
    const arr = buildPipeFields({ 18: "bad" });
    const res = mapPublicRowToLoanPart(arr, batchId, 2, "fannie_mae");
    expect(res.success).toBe(false);
    if (res.success) {
      throw new Error("expected failure");
    }
    expect(res.failedRow.reason.toLowerCase()).toContain("maturity_date");
  });

  it("too few fields -> gate failedRow", () => {
    const short = ["", "L1", "082009"];
    const res = mapPublicRowToLoanPart(short, batchId, 2, "freddie_mac");
    expect(res.success).toBe(false);
    if (res.success) {
      throw new Error("expected failure");
    }
    expect(res.failedRow.reason).toContain("expected");
  });
});

describe("PUBLIC_DATA_FORMAT_REGISTRY", () => {
  it("contains both formats with minFields >= MIN_FIELDS", () => {
    expect(PUBLIC_DATA_FORMAT_REGISTRY.fannie_mae.minFields).toBe(
      PUBLIC_DATA_MIN_FIELDS
    );
    expect(PUBLIC_DATA_FORMAT_REGISTRY.freddie_mac.minFields).toBe(
      PUBLIC_DATA_MIN_FIELDS
    );
  });

  it("layout versions are strings", () => {
    expect(typeof PUBLIC_DATA_FORMAT_REGISTRY.fannie_mae.layoutVersion).toBe(
      "string"
    );
    expect(typeof PUBLIC_DATA_FORMAT_REGISTRY.freddie_mac.layoutVersion).toBe(
      "string"
    );
  });
});
