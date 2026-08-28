import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test";

let currentBatch: Record<string, unknown> = { metadata: {} };

const actualValidation = await import("../validation.service.js");
mock.module("../validation.service.js", () => ({
  ...actualValidation,
  validateBatch: mock(async (batchId: string) => {
    const existing = await fakePrisma.uploadBatch.findUnique({
      where: { id: batchId },
    });
    const existingMeta =
      (existing?.metadata as Record<string, unknown> | null) ?? {};
    await fakePrisma.uploadBatch.update({
      data: {
        metadata: {
          ...existingMeta,
          pipelineStage: "completed",
          pipelineStep: 5,
        },
        status: "done",
      },
      where: { id: batchId },
    });
  }),
}));

const fakePrisma: {
  $transaction: ReturnType<typeof mock>;
  auditLog: {
    create: ReturnType<typeof mock>;
    createMany: ReturnType<typeof mock>;
  };
  loan: {
    createMany: ReturnType<typeof mock>;
    deleteMany: ReturnType<typeof mock>;
  };
  uploadBatch: {
    findUnique: ReturnType<typeof mock>;
    update: ReturnType<typeof mock>;
  };
} = {
  auditLog: {
    create: mock(() => Promise.resolve({} as never)),
    createMany: mock(() => Promise.resolve({} as never)),
  },
  loan: {
    createMany: mock(() => Promise.resolve({ count: 0 })),
    deleteMany: mock(() => Promise.resolve({} as never)),
  },
  uploadBatch: {
    findUnique: mock(() => Promise.resolve(currentBatch as never)),
    update: mock(
      (args: { data: Record<string, unknown>; where: { id: string } }) => {
        currentBatch = { ...currentBatch, ...args.data };
        if (args.data.metadata) {
          currentBatch.metadata = args.data.metadata as unknown;
        }
        return Promise.resolve(currentBatch as never);
      }
    ),
  },
} as unknown as {
  $transaction: ReturnType<typeof mock>;
  auditLog: {
    create: ReturnType<typeof mock>;
    createMany: ReturnType<typeof mock>;
  };
  loan: {
    createMany: ReturnType<typeof mock>;
    deleteMany: ReturnType<typeof mock>;
  };
  uploadBatch: {
    findUnique: ReturnType<typeof mock>;
    update: ReturnType<typeof mock>;
  };
};

(
  fakePrisma as unknown as { $transaction: ReturnType<typeof mock> }
).$transaction = mock((callback: (tx: unknown) => Promise<unknown>) =>
  callback({
    auditLog: {
      create: fakePrisma.auditLog.create,
      createMany: fakePrisma.auditLog.createMany,
    },
    loan: {
      createMany: fakePrisma.loan.createMany,
      deleteMany: fakePrisma.loan.deleteMany,
    },
    uploadBatch: {
      findUnique: fakePrisma.uploadBatch.findUnique,
      update: fakePrisma.uploadBatch.update,
    },
  } as never)
) as never;

mock.module("../../lib/prisma.js", () => ({ prisma: fakePrisma }));
mock.module("../lib/prisma.js", () => ({ prisma: fakePrisma }));

const { processPublicDataIngestion } = await import("./ingestion.service.js");

const resetMocks = () => {
  currentBatch = { metadata: {} };
  fakePrisma.loan.createMany = mock((args: { data: unknown[] }) =>
    Promise.resolve({ count: (args.data as unknown[]).length } as never)
  );
  fakePrisma.loan.deleteMany = mock(() => Promise.resolve({} as never));
  fakePrisma.uploadBatch.update = mock(
    (args: { data: Record<string, unknown>; where: { id: string } }) => {
      currentBatch = { ...currentBatch, ...args.data };
      if (args.data.metadata) {
        currentBatch.metadata = args.data.metadata as unknown;
      }
      return Promise.resolve(currentBatch as never);
    }
  );
  fakePrisma.uploadBatch.findUnique = mock(() =>
    Promise.resolve(currentBatch as never)
  );
  fakePrisma.auditLog.create = mock(() => Promise.resolve({} as never));
  fakePrisma.auditLog.createMany = mock(() => Promise.resolve({} as never));
  (
    fakePrisma as unknown as { $transaction: ReturnType<typeof mock> }
  ).$transaction = mock((callback: (tx: unknown) => Promise<unknown>) =>
    callback({
      auditLog: {
        create: fakePrisma.auditLog.create,
        createMany: fakePrisma.auditLog.createMany,
      },
      loan: {
        createMany: fakePrisma.loan.createMany,
        deleteMany: fakePrisma.loan.deleteMany,
      },
      uploadBatch: {
        findUnique: fakePrisma.uploadBatch.findUnique,
        update: fakePrisma.uploadBatch.update,
      },
    } as never)
  ) as never;
};

const pipeRow = (fields: string[]): string => fields.join("|");

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
  arr[27] = overrides[27] ?? "SF";
  arr[29] = overrides[29] ?? "P";
  arr[30] = overrides[30] ?? "OH";
  arr[34] = overrides[34] ?? "FRM";
  arr[39] = overrides[39] ?? "00";
  arr[41] = overrides[41] ?? "N";
  for (const [k, v] of Object.entries(overrides)) {
    arr[Number(k)] = v as string;
  }
  return arr;
};

describe("processPublicDataIngestion", () => {
  beforeEach(() => {
    resetMocks();
    fakePrisma.uploadBatch.findUnique = mock(() =>
      Promise.resolve({ metadata: {} } as never)
    );
    fakePrisma.loan.createMany = mock((args: { data: unknown[] }) =>
      Promise.resolve({ count: (args.data as unknown[]).length } as never)
    );
  });

  afterEach(() => {
    resetMocks();
  });

  it("folds 3 monthly rows for same loanId -> 1 inserted loan with latest mutables winning", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pub-"));
    const filePath = path.join(tmpDir, "freddie.csv");
    const batchId = "batch_pub_fold";
    const base = buildPipeFields({
      1: "L-FOLD-1",
      2: "082009",
      11: "0.00",
      15: "0",
    });
    const row2 = buildPipeFields({
      1: "L-FOLD-1",
      2: "092009",
      8: "5.500",
      11: "54350.98",
      15: "1",
    });
    const row3 = buildPipeFields({
      1: "L-FOLD-1",
      2: "102009",
      11: "54200.00",
      15: "2",
    });
    const content = [pipeRow(base), pipeRow(row2), pipeRow(row3)].join("\n");
    fs.writeFileSync(filePath, content, "utf8");
    try {
      await processPublicDataIngestion(filePath, batchId, "freddie_mac");
      const { calls } = (
        fakePrisma.loan.createMany as unknown as {
          mock: { calls: unknown[][] };
        }
      ).mock;
      let total = 0;
      let insertedRows: Record<string, unknown>[] = [];
      for (const c of calls) {
        const args = c[0] as { data: unknown[] };
        total += args.data.length;
        insertedRows = insertedRows.concat(
          args.data as Record<string, unknown>[]
        );
      }
      expect(total).toBe(1);
      expect(insertedRows.length).toBe(1);
      const row = insertedRows[0] as Record<string, unknown>;
      expect(row.loanId).toBe("L-FOLD-1");
      expect(row.currentBalance).toBe(54_200);
      expect(row.interestRate).toBe(5.375);
      expect(row.daysPastDue).toBe(60);
      expect(row.paymentStatus).toBe("delinquent");
      expect(row.sourceSystem).toBe("freddie_mac");
      expect(row.documentStatus).toBe("unknown");
      expect((row.lastUpdatedAt as Date).getUTCMonth()).toBe(9);
    } finally {
      fs.rmSync(tmpDir, { force: true, recursive: true });
    }
  });

  it("2 distinct contiguous loanIds -> 2 inserted loans", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pub-2-"));
    const filePath = path.join(tmpDir, "fannie.csv");
    const batchId = "batch_pub_2";
    const a = buildPipeFields({ 1: "L-A", 2: "082009" });
    const b = buildPipeFields({ 1: "L-B", 2: "082009" });
    const content = [pipeRow(a), pipeRow(b)].join("\n");
    fs.writeFileSync(filePath, content, "utf8");
    try {
      await processPublicDataIngestion(filePath, batchId, "fannie_mae");
      const { calls } = (
        fakePrisma.loan.createMany as unknown as {
          mock: { calls: unknown[][] };
        }
      ).mock;
      let total = 0;
      for (const c of calls) {
        total += (c[0] as { data: unknown[] }).data.length;
      }
      expect(total).toBe(2);
    } finally {
      fs.rmSync(tmpDir, { force: true, recursive: true });
    }
  });

  it("bad rows become failedRows without aborting", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pub-bad-"));
    const filePath = path.join(tmpDir, "bad.csv");
    const batchId = "batch_pub_bad";
    const good = buildPipeFields({ 1: "L-GOOD", 2: "082009" });
    const bad = buildPipeFields({ 1: "" });
    const good2 = buildPipeFields({ 1: "L-GOOD2", 2: "082009" });
    const content2 = [pipeRow(good), pipeRow(bad), pipeRow(good2)].join("\n");
    fs.writeFileSync(filePath, content2, "utf8");
    try {
      await processPublicDataIngestion(filePath, batchId, "freddie_mac");
      const { calls } = (
        fakePrisma.loan.createMany as unknown as {
          mock: { calls: unknown[][] };
        }
      ).mock;
      let total = 0;
      for (const c of calls) {
        total += (c[0] as { data: unknown[] }).data.length;
      }
      expect(total).toBe(2);
      const { calls: updateCalls } = (
        fakePrisma.uploadBatch.update as unknown as {
          mock: { calls: unknown[][] };
        }
      ).mock;
      const withFailed = updateCalls.find(
        (c) =>
          (c[0] as { data: { failedCount?: number } }).data.failedCount === 1
      );
      expect(withFailed).toBeDefined();
    } finally {
      fs.rmSync(tmpDir, { force: true, recursive: true });
    }
  });

  it("empty file -> batch marked failed", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pub-empty-"));
    const filePath = path.join(tmpDir, "empty.csv");
    const batchId = "batch_pub_empty";
    fs.writeFileSync(filePath, "", "utf8");
    try {
      await processPublicDataIngestion(filePath, batchId, "fannie_mae");
      const { calls: updateCalls } = (
        fakePrisma.uploadBatch.update as unknown as {
          mock: { calls: unknown[][] };
        }
      ).mock;
      const failed = updateCalls.find(
        (c) => (c[0] as { data: { status?: string } }).data.status === "failed"
      );
      expect(failed).toBeDefined();
    } finally {
      fs.rmSync(tmpDir, { force: true, recursive: true });
    }
  });

  it("sourceSystem matches format (fannie vs freddie)", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pub-sys-"));
    const filePath = path.join(tmpDir, "sys.csv");
    const batchId = "batch_pub_sys";
    const row = buildPipeFields({ 1: "L-SYS", 2: "082009" });
    fs.writeFileSync(filePath, pipeRow(row), "utf8");
    try {
      await processPublicDataIngestion(filePath, batchId, "fannie_mae");
      const { calls } = (
        fakePrisma.loan.createMany as unknown as {
          mock: { calls: unknown[][] };
        }
      ).mock;
      expect(calls.length).toBeGreaterThan(0);
      const firstCall = calls[0] as unknown as [
        { data: Record<string, unknown>[] },
      ];
      const [firstArg] = firstCall;
      expect(firstArg.data.length).toBeGreaterThan(0);
      const inserted = firstArg.data[0] as Record<string, unknown>;
      expect(inserted.sourceSystem).toBe("fannie_mae");
    } finally {
      fs.rmSync(tmpDir, { force: true, recursive: true });
    }
  });

  it("caps failedRows and sets publicData* metadata", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pub-cap-"));
    const filePath = path.join(tmpDir, "cap.csv");
    const batchId = "batch_pub_cap";
    const bad = buildPipeFields({ 1: "" });
    const rows = Array.from({ length: 5 }, () => pipeRow(bad)).join("\n");
    const good = buildPipeFields({ 1: "L-CAP", 2: "082009" });
    const content = [pipeRow(good), rows].join("\n");
    fs.writeFileSync(filePath, content, "utf8");
    try {
      await processPublicDataIngestion(filePath, batchId, "freddie_mac");
      const { calls: updateCalls } = (
        fakePrisma.uploadBatch.update as unknown as {
          mock: { calls: unknown[][] };
        }
      ).mock;
      const validatingCall = updateCalls.find(
        (c) =>
          (c[0] as { data: { metadata?: Record<string, unknown> } }).data
            .metadata !== undefined &&
          (c[0] as { data: { metadata: Record<string, unknown> } }).data
            .metadata.publicDataSourceRows !== undefined
      );
      expect(validatingCall).toBeDefined();
      const meta = (
        validatingCall as unknown as [
          { data: { metadata: Record<string, unknown> } },
        ]
      )[0].data.metadata;
      expect(typeof meta.publicDataSourceRows).toBe("number");
      expect(typeof meta.publicDataDistinctLoans).toBe("number");
    } finally {
      fs.rmSync(tmpDir, { force: true, recursive: true });
    }
  });
});
