import { describe, expect, it } from "bun:test";
import {
  buildOrphanCleanupWhere,
  decideManifestStatus,
  type ManifestRow,
  normalizeManifestRow,
  validateManifestHeaders,
} from "./document-manifest.service.js";

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
      { "Loan Id": "L-3", "Document Type": "deed", Available: "no" },
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
