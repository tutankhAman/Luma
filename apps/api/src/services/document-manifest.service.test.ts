import { describe, expect, it } from "bun:test";
import {
  buildApplyWindows,
  buildOrphanCleanupWhere,
  decideManifestStatus,
  type ManifestRow,
  normalizeManifestRow,
  validateManifestHeaders,
} from "./document-manifest.service.js";

describe("buildApplyWindows", () => {
  it("keeps each loan's rows together and respects the window cap", () => {
    const group = (loanId: string, count: number, startAt = 0): ManifestRow[] =>
      Array.from({ length: count }, (_, i) => ({
        available: true,
        documentType: "deed",
        loanId,
        rowNumber: startAt + i + 1,
      }));

    // 3 + 2 + 9999 + 1 rows: cap is 5000 → [3,2] window, [9999] intact
    // oversized single-group window, [1] window.
    const groups = [
      group("A", 3),
      group("B", 2),
      group("BIG", 9999),
      group("C", 1),
    ];
    const windows = buildApplyWindows(groups);
    expect(windows.length).toBe(3);
    expect(windows[0]?.length).toBe(5);
    expect(windows[1]?.length).toBe(9999);
    expect(windows[2]?.length).toBe(1);
    // Loan B's rows must never be split across windows.
    const bRows = windows.flat().filter((r) => r.loanId === "B");
    expect(bRows.length).toBe(2);
  });

  it("returns empty for no groups and single window for small input", () => {
    expect(buildApplyWindows([])).toEqual([]);
    const one = buildApplyWindows([
      [{ available: true, documentType: "d", loanId: "L", rowNumber: 1 }],
    ]);
    expect(one.length).toBe(1);
  });
});

const mkRow = (
  loanId: string,
  available: boolean,
  documentType: string | null = "deed",
  rowNumber = 1
): ManifestRow => ({
  available,
  documentType,
  loanId,
  rowNumber,
});

describe("normalizeManifestRow", () => {
  it("parses a valid snake_case row", () => {
    const result = normalizeManifestRow(
      { available: "true", document_type: "deed_of_trust", loan_id: "L-1" },
      2
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.row.loanId).toBe("L-1");
      expect(result.row.documentType).toBe("deed_of_trust");
      expect(result.row.available).toBe(true);
      expect(result.row.rowNumber).toBe(2);
    }
  });

  it("accepts camelCase header variants with BOM handled upstream", () => {
    const result = normalizeManifestRow(
      { available: "y", documentType: "title", loanId: "L-2" },
      3
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.row.available).toBe(true);
      expect(result.row.documentType).toBe("title");
    }
  });

  it("normalizes Title Case / spaced headers the same way as the header gate", () => {
    // validateManifestHeaders accepts "Loan Id, Document Type, Available";
    // row parsing must agree or the batch would complete with all rows failed.
    const result = normalizeManifestRow(
      { Available: "no", "Document Type": "deed", "Loan Id": "L-3" },
      4
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.row.loanId).toBe("L-3");
      expect(result.row.documentType).toBe("deed");
      expect(result.row.available).toBe(false);
    }
  });

  it("coerces the full boolean matrix", () => {
    const trueValues = ["1", "true", "TRUE", "Y", "yes"];
    for (const v of trueValues) {
      const result = normalizeManifestRow(
        { available: v, document_type: "x", loan_id: "L" },
        1
      );
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.row.available).toBe(true);
      }
    }
    const falseValues = ["0", "false", "FALSE", "N", "no"];
    for (const v of falseValues) {
      const result = normalizeManifestRow(
        { available: v, document_type: "x", loan_id: "L" },
        1
      );
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.row.available).toBe(false);
      }
    }
  });

  it("fails on missing loan_id", () => {
    const result = normalizeManifestRow(
      { available: "true", document_type: "deed" },
      4
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.failedRow.reason).toContain("loan_id");
      expect(result.failedRow.rowNumber).toBe(4);
      expect(JSON.parse(result.failedRow.rawData)).toEqual({
        available: "true",
        document_type: "deed",
      });
    }
  });

  it("fails on invalid boolean values", () => {
    for (const v of ["maybe", "", "2", "-1"]) {
      const result = normalizeManifestRow(
        { available: v, document_type: "deed", loan_id: "L-1" },
        5
      );
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.failedRow.reason).toContain("available");
      }
    }
  });
});

describe("validateManifestHeaders", () => {
  it("accepts recognized headers", () => {
    expect(
      validateManifestHeaders(["loan_id", "document_type", "available"])
    ).toBeNull();
    expect(
      validateManifestHeaders(["Loan Id", "DOCUMENT TYPE", "Available"])
    ).toBeNull();
    expect(
      validateManifestHeaders(["loanid", "documenttype", "available"])
    ).toBeNull();
    expect(validateManifestHeaders(["\uFEFFloan_id", "available"])).toBeNull();
  });

  it("rejects files without any recognized manifest column", () => {
    const error = validateManifestHeaders(["foo", "bar"]);
    expect(error).toContain("header mismatch");
    expect(error).toContain("foo");
  });
});

describe("decideManifestStatus", () => {
  it("returns complete when all documents are available", () => {
    const decision = decideManifestStatus([
      mkRow("L-1", true, "deed"),
      mkRow("L-1", true, "title"),
    ]);
    expect(decision.documentStatus).toBe("complete");
    expect(decision.missingDocumentTypes).toEqual([]);
  });

  it("returns missing when any document is unavailable, listing them", () => {
    const decision = decideManifestStatus([
      mkRow("L-1", true, "deed", 3),
      mkRow("L-1", false, "title", 4),
      mkRow("L-1", false, "insurance", 7),
    ]);
    expect(decision.documentStatus).toBe("missing");
    expect(decision.missingDocumentTypes).toEqual(["title", "insurance"]);
    expect(decision.sourceRowNumbers).toEqual([3, 4, 7]);
  });

  it("falls back to 'unknown' for missing docs without a type", () => {
    const decision = decideManifestStatus([mkRow("L-1", false, null)]);
    expect(decision.missingDocumentTypes).toEqual(["unknown"]);
    expect(decision.documentStatus).toBe("missing");
  });
});

describe("buildOrphanCleanupWhere", () => {
  it("scopes deletion to open unreviewed exceptions of this manifest batch only", () => {
    const where = buildOrphanCleanupWhere("batch_123") as Record<
      string,
      unknown
    >;
    expect(where.exceptionType).toBe("missing_field");
    expect(where.reviewerId).toBeNull();
    expect(where.status).toBe("open");
    expect(where.metadata).toEqual({
      equals: "batch_123",
      path: ["manifestBatchId"],
    });
  });
});
