import { describe, expect, it } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { normalizeRow } from "./ingestion.service.js";

describe("6k Loan Tape CSV verification", () => {
  const candidatePaths = [
    path.resolve(process.cwd(), "loan_tape_6k.csv"),
    path.resolve(process.cwd(), "../../loan_tape_6k.csv"),
    path.resolve(process.cwd(), "sample-files/loan_tape_6k.csv"),
    path.resolve(process.cwd(), "../../sample-files/loan_tape_6k.csv"),
    path.resolve(import.meta.dirname, "../../../../../loan_tape_6k.csv"),
    path.resolve(import.meta.dirname, "../../../../loan_tape_6k.csv"),
    path.resolve(import.meta.dirname, "../../../loan_tape_6k.csv"),
  ];
  const csvPath =
    candidatePaths.find((p) => fs.existsSync(p)) ?? candidatePaths[0] ?? "";

  it("exists and has exactly 6001 lines with 21 columns", () => {
    expect(fs.existsSync(csvPath)).toBe(true);
    const content = fs.readFileSync(csvPath, "utf8");
    const lines = content.trim().split("\n");
    expect(lines.length).toBe(6001);

    const [header] = lines;
    const headers = (header ?? "").split(",");
    expect(headers.length).toBe(21);
    expect(headers[0]).toBe("loan_id");
    expect(headers[1]).toBe("borrower_id");
    expect(headers[20]).toBe("source_system");
  });

  it("normalizes correctly and catches expected failedRows", () => {
    const content = fs.readFileSync(csvPath, "utf8");
    const lines = content.trim().split("\n");
    const [header] = lines;
    const headers = (header ?? "").split(",");

    let normalizedCount = 0;
    let failedCount = 0;

    for (let i = 1; i < lines.length; i += 1) {
      const line = lines[i];
      if (!line) {
        continue;
      }
      const values = line.split(",");
      const row: Record<string, string> = {};
      for (const [idx, h] of headers.entries()) {
        row[h] = values[idx] ?? "";
      }

      const res = normalizeRow(row, "test_batch", i + 1);
      if (res.success) {
        normalizedCount += 1;
      } else {
        failedCount += 1;
      }
    }

    expect(normalizedCount).toBe(5970);
    expect(failedCount).toBe(30);
  });
});
