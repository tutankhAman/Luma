import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  mock,
} from "bun:test";
import type { AddressInfo } from "node:net";

const fakePrisma = {
  $transaction: mock(async (cb: (tx: unknown) => Promise<unknown>) =>
    cb({
      auditLog: { create: fakePrisma.auditLog.create },
      uploadBatch: { create: fakePrisma.uploadBatch.create },
    } as never)
  ),
  auditLog: { create: mock(() => Promise.resolve({} as never)) },
  exception: {
    count: mock(() => Promise.resolve(0 as never)),
    findMany: mock(() => Promise.resolve([] as never)),
    groupBy: mock(() => Promise.resolve([] as never)),
  },
  loan: {
    count: mock(() => Promise.resolve(0 as never)),
    createMany: mock(() => Promise.resolve({ count: 0 } as never)),
  },
  uploadBatch: {
    count: mock(() => Promise.resolve(0 as never)),
    create: mock(() =>
      Promise.resolve({
        createdAt: new Date("2026-08-25T10:00:00.000Z"),
        fileName: "test.csv",
        fileType: "loan_tape",
        id: "batch_123",
        recordCount: 0,
        status: "processing",
      } as never)
    ),
    findFirst: mock(() => Promise.resolve(null as never)),
    findMany: mock(() => Promise.resolve([] as never)),
    findUnique: mock(() => Promise.resolve(null as never)),
    update: mock(() => Promise.resolve({} as never)),
  },
};

const fakeAuth = {
  api: {
    getSession: mock(() => Promise.resolve(null as never)),
  },
};

mock.module("../lib/prisma.js", () => ({ prisma: fakePrisma }));
mock.module("../lib/auth.js", () => ({ auth: fakeAuth }));
mock.module("../services/ingestion.service.js", () => ({
  MAX_FAILED_ROWS_STORED: 1000,
  cleanString: (value: unknown): string | null => {
    if (value === null || value === undefined) {
      return null;
    }
    const s = String(value).trim();
    return s === "" ? null : s;
  },
  processStreamAndNormalize: mock(() => Promise.resolve()),
}));

const { createApp } = await import("../app.js");

const operatorSession = {
  session: { expiresAt: new Date(), id: "sess_op", userId: "user_op" },
  user: {
    email: "operator@luma.dev",
    emailVerified: false,
    id: "user_op",
    image: null,
    name: "Operator User",
    role: "data_operator",
  },
};

const reviewerSession = {
  session: { expiresAt: new Date(), id: "sess_rev", userId: "user_rev" },
  user: {
    email: "reviewer@luma.dev",
    emailVerified: false,
    id: "user_rev",
    image: null,
    name: "Reviewer User",
    role: "reviewer",
  },
};

let app: ReturnType<typeof createApp>;
let server: {
  address: () => string | AddressInfo | null;
  close: (cb?: () => void) => void;
};
let baseUrl: string;

beforeAll(() => {
  app = createApp();
  server = app.listen(0);
  const addr = server.address() as AddressInfo;
  baseUrl = `http://localhost:${addr.port}`;
});

afterAll(() => {
  server.close();
});

beforeEach(() => {
  fakeAuth.api.getSession = mock(() =>
    Promise.resolve(operatorSession as never)
  );
  fakePrisma.uploadBatch.create = mock(() =>
    Promise.resolve({
      createdAt: new Date("2026-08-25T10:00:00.000Z"),
      fileName: "loan_tape.csv",
      fileType: "loan_tape",
      id: "batch_123",
      recordCount: 0,
      status: "processing",
    } as never)
  );
  fakePrisma.uploadBatch.findMany = mock(() => Promise.resolve([] as never));
  fakePrisma.uploadBatch.findUnique = mock(() =>
    Promise.resolve(null as never)
  );
  fakePrisma.uploadBatch.findFirst = mock(() => Promise.resolve(null as never));
  fakePrisma.uploadBatch.count = mock(() => Promise.resolve(0 as never));
  fakePrisma.loan.count = mock(() => Promise.resolve(0 as never));
  fakePrisma.exception.findMany = mock(() => Promise.resolve([] as never));
  fakePrisma.exception.groupBy = mock(() => Promise.resolve([] as never));
  fakePrisma.exception.count = mock(() => Promise.resolve(0 as never));
});

describe("POST /api/uploads", () => {
  it("returns 401 when unauthenticated", async () => {
    fakeAuth.api.getSession = mock(() => Promise.resolve(null as never));
    const form = new FormData();
    form.append(
      "file",
      new File(["a,b\n1,2"], "test.csv", { type: "text/csv" })
    );
    form.append("fileType", "loan_tape");
    const res = await fetch(`${baseUrl}/api/uploads`, {
      body: form,
      method: "POST",
    });
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-operator", async () => {
    fakeAuth.api.getSession = mock(() =>
      Promise.resolve(reviewerSession as never)
    );
    const form = new FormData();
    form.append(
      "file",
      new File(["a,b\n1,2"], "test.csv", { type: "text/csv" })
    );
    form.append("fileType", "loan_tape");
    const res = await fetch(`${baseUrl}/api/uploads`, {
      body: form,
      method: "POST",
    });
    expect(res.status).toBe(403);
  });

  it("returns 400 when file missing", async () => {
    const form = new FormData();
    form.append("fileType", "loan_tape");
    const res = await fetch(`${baseUrl}/api/uploads`, {
      body: form,
      method: "POST",
    });
    expect(res.status).toBe(400);
  });

  it("returns 415 for non-csv file", async () => {
    const form = new FormData();
    form.append(
      "file",
      new File(["hello"], "test.txt", { type: "text/plain" })
    );
    form.append("fileType", "loan_tape");
    const res = await fetch(`${baseUrl}/api/uploads`, {
      body: form,
      method: "POST",
    });
    expect(res.status).toBe(415);
  });

  it("returns 400 for invalid fileType", async () => {
    const form = new FormData();
    form.append(
      "file",
      new File(["a,b\n1,2"], "test.csv", { type: "text/csv" })
    );
    form.append("fileType", "invalid");
    const res = await fetch(`${baseUrl}/api/uploads`, {
      body: form,
      method: "POST",
    });
    expect(res.status).toBe(400);
  });

  it("returns 202 on valid upload and creates batch", async () => {
    const form = new FormData();
    form.append(
      "file",
      new File(["loan_id,borrower_id\nL-1,B-1"], "loan_tape.csv", {
        type: "text/csv",
      })
    );
    form.append("fileType", "loan_tape");
    const res = await fetch(`${baseUrl}/api/uploads`, {
      body: form,
      method: "POST",
    });
    if (res.status !== 202) {
      const body = await res.text();
      throw new Error(`expected 202 got ${res.status}: ${body}`);
    }
    expect(res.status).toBe(202);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.batchId).toBe("batch_123");
    expect(body.fileName).toBe("loan_tape.csv");
    expect(body.fileType).toBe("loan_tape");
    expect(body.status).toBe("processing");
    expect(body.message).toBeDefined();
    expect(fakePrisma.uploadBatch.create).toHaveBeenCalled();
  });
});

describe("GET /api/uploads", () => {
  it("returns paginated list", async () => {
    fakePrisma.uploadBatch.count = mock(() => Promise.resolve(1 as never));
    fakePrisma.uploadBatch.findMany = mock(() =>
      Promise.resolve([
        {
          createdAt: new Date("2026-08-25T10:00:00.000Z"),
          failedCount: 0,
          fileName: "a.csv",
          fileType: "loan_tape",
          id: "batch_1",
          recordCount: 10,
          status: "done",
        },
      ] as never)
    );
    const res = await fetch(`${baseUrl}/api/uploads?page=1&limit=20`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: unknown[];
      pagination: { total: number };
    };
    expect(body.data.length).toBe(1);
    expect(body.pagination.total).toBe(1);
  });

  it("returns 400 for invalid query", async () => {
    const res = await fetch(`${baseUrl}/api/uploads?page=0`);
    expect(res.status).toBe(400);
  });
});

describe("GET /api/uploads/:batchId", () => {
  it("returns 400 for a string that is neither cuid nor cuid2", async () => {
    // b1134e2 widened BATCH_ID_SCHEMA to cuid2().or(cuid()); "nonexistent"
    // is a valid cuid2, so an invalid id must fail both formats.
    const res = await fetch(`${baseUrl}/api/uploads/NOTACUID`);
    expect(res.status).toBe(400);
  });

  it("returns 404 when a well-formed id is not found", async () => {
    const cuid = "c".repeat(25);
    fakePrisma.uploadBatch.findFirst = mock(() =>
      Promise.resolve(null as never)
    );
    const res = await fetch(`${baseUrl}/api/uploads/${cuid}`);
    expect(res.status).toBe(404);
  });

  it("returns batch detail with failedRows", async () => {
    const cuid = "c".repeat(25);
    fakePrisma.uploadBatch.findFirst = mock(() =>
      Promise.resolve({
        createdAt: new Date("2026-08-25T10:00:00.000Z"),
        failedCount: 1,
        fileName: "test.csv",
        fileType: "loan_tape",
        id: cuid,
        metadata: { failedRows: [{ rawData: "x", reason: "y", rowNumber: 2 }] },
        recordCount: 10,
        status: "done",
        updatedAt: new Date("2026-08-25T10:00:00.000Z"),
        uploadedById: "user_op",
      } as never)
    );
    const res = await fetch(`${baseUrl}/api/uploads/${cuid}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { failedRows: unknown[]; id: string };
    expect(body.id).toBe(cuid);
    expect(body.failedRows.length).toBe(1);
  });
});

describe("GET /api/uploads/:batchId/summary", () => {
  it("returns 400 for a string that is neither cuid nor cuid2", async () => {
    const res = await fetch(`${baseUrl}/api/uploads/NOTACUID/summary`);
    expect(res.status).toBe(400);
  });

  it("returns 404 when batch not found", async () => {
    const cuid = "c".repeat(25);
    fakePrisma.uploadBatch.findFirst = mock(() =>
      Promise.resolve(null as never)
    );
    const res = await fetch(`${baseUrl}/api/uploads/${cuid}/summary`);
    expect(res.status).toBe(404);
  });

  it("returns summary with real counts and zeroed exception groups", async () => {
    const cuid = "c".repeat(25);
    fakePrisma.uploadBatch.findFirst = mock(() =>
      Promise.resolve({
        createdAt: new Date(),
        fileName: "test.csv",
        fileType: "loan_tape",
        id: cuid,
        status: "done",
      } as never)
    );
    // 338cfb4: failedValidation now counts DISTINCT loans with exceptions
    // via a second loan.count — the summary handler makes two loan.count
    // calls (totalImported first, failedValidation second).
    let loanCountCall = 0;
    fakePrisma.loan.count = mock(() => {
      loanCountCall += 1;
      return Promise.resolve(loanCountCall === 1 ? 10 : 0) as never;
    });
    fakePrisma.exception.groupBy = mock(() => Promise.resolve([] as never));
    const res = await fetch(`${baseUrl}/api/uploads/${cuid}/summary`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      batchId: string;
      totalImported: number;
      failedValidation: number;
      passedValidation: number;
      exceptionsByType: Record<string, number>;
      exceptionsBySeverity: Record<string, number>;
    };
    expect(body.batchId).toBe(cuid);
    expect(body.totalImported).toBe(10);
    expect(body.failedValidation).toBe(0);
    expect(body.passedValidation).toBe(10);
    expect(body.exceptionsByType.balance_error).toBe(0);
    expect(body.exceptionsBySeverity.critical).toBe(0);
  });
});
