import { beforeEach, describe, expect, it, mock } from "bun:test";

/**
 * Unit tests for conflict-detection.service.ts — mocked prisma, no DB.
 */

const fakePrisma: {
  $transaction: ReturnType<typeof mock>;
  auditLog: { createMany: ReturnType<typeof mock> };
  exception: {
    createMany: ReturnType<typeof mock>;
    deleteMany: ReturnType<typeof mock>;
    findMany: ReturnType<typeof mock>;
  };
  loan: { findMany: ReturnType<typeof mock> };
  uploadBatch: {
    findUnique: ReturnType<typeof mock>;
    update: ReturnType<typeof mock>;
  };
} = {
  $transaction: null as unknown as ReturnType<typeof mock>,
  auditLog: { createMany: mock(() => Promise.resolve({} as never)) },
  exception: {
    createMany: mock(() => Promise.resolve({} as never)),
    deleteMany: mock(() => Promise.resolve({} as never)),
    findMany: mock(() => Promise.resolve([] as never)),
  },
  loan: { findMany: mock(() => Promise.resolve([] as never)) },
  uploadBatch: {
    findUnique: mock(() => Promise.resolve(null as never)),
    update: mock(() => Promise.resolve({} as never)),
  },
};

(
  fakePrisma as unknown as { $transaction: ReturnType<typeof mock> }
).$transaction = mock((cb: (tx: unknown) => Promise<unknown>) =>
  cb({
    auditLog: fakePrisma.auditLog,
    exception: fakePrisma.exception,
    loan: fakePrisma.loan,
    uploadBatch: fakePrisma.uploadBatch,
  } as never)
) as never;

mock.module("../lib/prisma.js", () => ({
  prisma: fakePrisma as unknown as never,
}));

const { detectServicerConflicts, CHUNK_SIZE } = await import(
  "./conflict-detection.service.js"
);

const pick = (
  fields: Record<string, unknown>,
  key: string,
  fallback: unknown
): unknown => (key in fields ? fields[key] : fallback);

const tapeLoan = (
  id: string,
  loanId: string,
  fields: Record<string, unknown> = {}
) => ({
  borrowerState: pick(fields, "borrowerState", "CA"),
  creditGrade: pick(fields, "creditGrade", "A"),
  currentBalance: pick(fields, "currentBalance", "342000.00"),
  daysPastDue: pick(fields, "daysPastDue", 0),
  documentStatus: pick(fields, "documentStatus", "complete"),
  id,
  interestRate: pick(fields, "interestRate", "6.75"),
  loanId,
  originalPrincipal: pick(fields, "originalPrincipal", "350000.00"),
  paymentStatus: pick(fields, "paymentStatus", "current"),
  servicerName: pick(fields, "servicerName", "First National"),
  termMonths: pick(fields, "termMonths", 360),
});

const servicerLoan = (
  id: string,
  loanId: string,
  rowNumber: number,
  fields: Record<string, unknown> = {}
) => ({
  borrowerState: pick(fields, "borrowerState", "CA"),
  creditGrade: pick(fields, "creditGrade", "A"),
  currentBalance: pick(fields, "currentBalance", "342000.00"),
  daysPastDue: pick(fields, "daysPastDue", 0),
  documentStatus: pick(fields, "documentStatus", "complete"),
  id,
  interestRate: pick(fields, "interestRate", "6.75"),
  loanId,
  originalPrincipal: pick(fields, "originalPrincipal", "350000.00"),
  paymentStatus: pick(fields, "paymentStatus", "current"),
  servicerName: pick(fields, "servicerName", "First National"),
  sourceRowNumber: rowNumber,
  termMonths: pick(fields, "termMonths", 360),
});

const resetMocks = () => {
  fakePrisma.uploadBatch.findUnique = mock(() =>
    Promise.resolve({
      fileType: "servicer_update",
      id: "batch_srv",
      metadata: {},
    } as never)
  );
  fakePrisma.uploadBatch.update = mock(() => Promise.resolve({} as never));
  fakePrisma.exception.createMany = mock(() => Promise.resolve({} as never));
  fakePrisma.exception.deleteMany = mock(() => Promise.resolve({} as never));
  fakePrisma.exception.findMany = mock(() => Promise.resolve([] as never));
  fakePrisma.auditLog.createMany = mock(() => Promise.resolve({} as never));
  fakePrisma.loan.findMany = mock(() => Promise.resolve([] as never));
  (
    fakePrisma as unknown as { $transaction: ReturnType<typeof mock> }
  ).$transaction = mock((cb: (tx: unknown) => Promise<unknown>) =>
    cb({
      auditLog: fakePrisma.auditLog,
      exception: fakePrisma.exception,
      loan: fakePrisma.loan,
      uploadBatch: fakePrisma.uploadBatch,
    } as never)
  ) as never;
};

describe("detectServicerConflicts", () => {
  beforeEach(resetMocks);

  it("creates conflicting_source exception for each differing field", async () => {
    const srvRows = [
      servicerLoan("srv_1", "L-1", 2, { currentBalance: "340000.00" }),
    ];
    const tapeRows = [
      tapeLoan("tape_1", "L-1", { currentBalance: "342000.00" }),
    ];

    fakePrisma.loan.findMany = mock(
      (args: { where?: { sourceBatchId?: unknown } }) => {
        if (args.where?.sourceBatchId === "batch_srv") {
          return Promise.resolve(srvRows as never);
        }
        return Promise.resolve(tapeRows as never);
      }
    );
    fakePrisma.exception.findMany = mock(() =>
      Promise.resolve([{ id: "exc_1", loanId: "tape_1" }] as never)
    );

    const res = await detectServicerConflicts("batch_srv");
    expect(res.exceptionsCreated).toBe(1);
    expect(res.loansAffected).toBe(1);
    expect(res.matchedRows).toBe(1);
    const createArgs = (
      fakePrisma.exception.createMany as ReturnType<typeof mock>
    ).mock.calls[0]?.[0] as
      | {
          data: Array<{
            exceptionType: string;
            severity: string;
            metadata: Record<string, unknown>;
          }>;
        }
      | undefined;
    expect(createArgs?.data[0]?.exceptionType).toBe("conflicting_source");
    expect(createArgs?.data[0]?.severity).toBe("high");
    expect(createArgs?.data[0]?.metadata.conflictBatchId).toBe("batch_srv");
    expect(createArgs?.data[0]?.metadata.sourceValue).toBe("340000.00");
    expect(createArgs?.data[0]?.metadata.targetValue).toBe("342000.00");
  });

  it("no exception when values are equal (string case-insensitive, numeric equality)", async () => {
    const srvRows = [
      servicerLoan("srv_1", "L-1", 2, {
        borrowerState: "ca",
        paymentStatus: "current",
      }),
    ];
    const tapeRows = [
      tapeLoan("tape_1", "L-1", {
        borrowerState: "CA",
        paymentStatus: "Current",
      }),
    ];

    fakePrisma.loan.findMany = mock(
      (args: { where?: { sourceBatchId?: unknown } }) => {
        if (args.where?.sourceBatchId === "batch_srv") {
          return Promise.resolve(srvRows as never);
        }
        return Promise.resolve(tapeRows as never);
      }
    );

    const res = await detectServicerConflicts("batch_srv");
    expect(res.exceptionsCreated).toBe(0);
    expect(res.loansAffected).toBe(0);
  });

  it("treats null mismatch as conflict", async () => {
    const srvRows = [servicerLoan("srv_1", "L-1", 2, { creditGrade: null })];
    const tapeRows = [tapeLoan("tape_1", "L-1", { creditGrade: "A" })];

    fakePrisma.loan.findMany = mock(
      (args: { where?: { sourceBatchId?: unknown } }) => {
        if (args.where?.sourceBatchId === "batch_srv") {
          return Promise.resolve(srvRows as never);
        }
        return Promise.resolve(tapeRows as never);
      }
    );
    fakePrisma.exception.findMany = mock(() =>
      Promise.resolve([{ id: "exc_1", loanId: "tape_1" }] as never)
    );

    const res = await detectServicerConflicts("batch_srv");
    expect(res.exceptionsCreated).toBe(1);
  });

  it("ignores servicer rows with null/empty loanId", async () => {
    const srvRows = [
      {
        currentBalance: "1",
        id: "srv_1",
        loanId: null,
        sourceRowNumber: 2,
      } as unknown as never,
      {
        currentBalance: "1",
        id: "srv_2",
        loanId: "   ",
        sourceRowNumber: 3,
      } as unknown as never,
    ];

    fakePrisma.loan.findMany = mock(
      (args: { where?: { sourceBatchId?: unknown } }) => {
        if (args.where?.sourceBatchId === "batch_srv") {
          return Promise.resolve(srvRows as never);
        }
        return Promise.resolve([] as never);
      }
    );

    const res = await detectServicerConflicts("batch_srv");
    expect(res.exceptionsCreated).toBe(0);
    expect(res.unmatchedLoanIds).toBe(0);
  });

  it("counts unmatched when servicer loanId not in tape", async () => {
    const srvRows = [servicerLoan("srv_1", "L-UNKNOWN", 2)];

    fakePrisma.loan.findMany = mock(
      (args: { where?: { sourceBatchId?: unknown } }) => {
        if (args.where?.sourceBatchId === "batch_srv") {
          return Promise.resolve(srvRows as never);
        }
        return Promise.resolve([] as never);
      }
    );

    const res = await detectServicerConflicts("batch_srv");
    expect(res.unmatchedLoanIds).toBe(1);
    expect(res.exceptionsCreated).toBe(0);
  });

  it("handles empty servicer batch (no rows)", async () => {
    fakePrisma.loan.findMany = mock(() => Promise.resolve([] as never));
    const res = await detectServicerConflicts("batch_srv");
    expect(res.exceptionsCreated).toBe(0);
    expect(res.matchedRows).toBe(0);
  });

  it("returns 0 when batch is not servicer_update", async () => {
    fakePrisma.uploadBatch.findUnique = mock(() =>
      Promise.resolve({
        fileType: "loan_tape",
        id: "batch_loan",
        metadata: {},
      } as never)
    );
    const res = await detectServicerConflicts("batch_loan");
    expect(res.exceptionsCreated).toBe(0);
  });

  it("throws when batch does not exist", async () => {
    fakePrisma.uploadBatch.findUnique = mock(() =>
      Promise.resolve(null as never)
    );
    await expect(detectServicerConflicts("nope")).rejects.toThrow("not found");
  });

  it("skips when already done (idempotent)", async () => {
    fakePrisma.uploadBatch.findUnique = mock(() =>
      Promise.resolve({
        fileType: "servicer_update",
        id: "batch_srv",
        metadata: {
          conflictExceptionsCreated: 5,
          conflictLoansAffected: 3,
          conflictMatchedRows: 10,
          conflictStage: "done",
          conflictUnmatchedLoanIds: 2,
        },
      } as never)
    );
    let loanCalled = false;
    fakePrisma.loan.findMany = mock(() => {
      loanCalled = true;
      return Promise.resolve([] as never);
    });
    const res = await detectServicerConflicts("batch_srv");
    expect(res.exceptionsCreated).toBe(5);
    expect(res.loansAffected).toBe(3);
    expect(loanCalled).toBe(false);
  });

  it("cleans orphaned exceptions when prior run was interrupted", async () => {
    fakePrisma.uploadBatch.findUnique = mock(() =>
      Promise.resolve({
        fileType: "servicer_update",
        id: "batch_srv",
        metadata: { conflictStage: "detecting" },
      } as never)
    );
    fakePrisma.loan.findMany = mock(() => Promise.resolve([] as never));

    await detectServicerConflicts("batch_srv");
    expect(fakePrisma.exception.deleteMany).toHaveBeenCalled();
    const delArgs = (fakePrisma.exception.deleteMany as ReturnType<typeof mock>)
      .mock.calls[0]?.[0] as {
      where?: { metadata?: { equals?: string } };
    };
    expect(delArgs?.where?.metadata).toBeDefined();
  });

  it("handles multiple differing fields creating multiple exceptions per loan", async () => {
    const srvRows = [
      servicerLoan("srv_1", "L-1", 2, {
        borrowerState: "NY",
        currentBalance: "300000.00",
        interestRate: "5.0",
      }),
    ];
    const tapeRows = [
      tapeLoan("tape_1", "L-1", {
        borrowerState: "CA",
        currentBalance: "342000.00",
        interestRate: "6.75",
      }),
    ];

    fakePrisma.loan.findMany = mock(
      (args: { where?: { sourceBatchId?: unknown } }) => {
        if (args.where?.sourceBatchId === "batch_srv") {
          return Promise.resolve(srvRows as never);
        }
        return Promise.resolve(tapeRows as never);
      }
    );
    fakePrisma.exception.findMany = mock(() =>
      Promise.resolve([
        { id: "e1", loanId: "tape_1" },
        { id: "e2", loanId: "tape_1" },
        { id: "e3", loanId: "tape_1" },
      ] as never)
    );

    const res = await detectServicerConflicts("batch_srv");
    expect(res.exceptionsCreated).toBe(3);
  });

  it("chunks servicer rows via skip/take CHUNK_SIZE", async () => {
    let loanCalls = 0;
    fakePrisma.loan.findMany = mock(
      (args: {
        skip?: number;
        take?: number;
        where?: { sourceBatchId?: unknown };
      }) => {
        loanCalls += 1;
        if (args.where?.sourceBatchId === "batch_srv") {
          if ((args.skip ?? 0) === 0) {
            expect(args.take).toBe(CHUNK_SIZE);
            return Promise.resolve([servicerLoan("srv_1", "L-1", 2)] as never);
          }
          return Promise.resolve([] as never);
        }
        return Promise.resolve([tapeLoan("tape_1", "L-1")] as never);
      }
    );
    fakePrisma.exception.findMany = mock(() =>
      Promise.resolve([{ id: "e1", loanId: "tape_1" }] as never)
    );

    await detectServicerConflicts("batch_srv");
    expect(loanCalls).toBeGreaterThanOrEqual(2);
  });
});
