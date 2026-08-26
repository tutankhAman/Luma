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
  $transaction: mock(
    async (cb: (tx: unknown) => Promise<unknown>) =>
      cb({
        auditLog: { createMany: fakePrisma.auditLog.createMany },
        loan: { update: fakePrisma.loan.update },
      }) as never
  ),
  auditLog: { createMany: mock(() => Promise.resolve({ count: 1 }) as never) },
  loan: {
    findUnique: mock(() => Promise.resolve(null as never)),
    update: mock(
      () =>
        Promise.resolve({
          id: "c8x9y2z1a2b3c4d5e6f7g8h9",
          updatedAt: new Date("2026-08-26T10:00:00.000Z"),
        }) as never
    ),
  },
  verifiedLoan: { count: mock(() => Promise.resolve(0)) },
};

const fakeAuth = {
  api: {
    getSession: mock(() => Promise.resolve(null as never)),
  },
};

mock.module("../lib/prisma.js", () => ({ prisma: fakePrisma }));
mock.module("../lib/auth.js", () => ({ auth: fakeAuth }));
mock.module("../services/verification.service.js", () => ({
  VerificationError: class VerificationError extends Error {
    code: string;
    statusCode: number;
    constructor(message: string, statusCode = 409, code = "CONFLICT") {
      super(message);
      this.code = code;
      this.statusCode = statusCode;
    }
  },
  verifyLoan: mock(() => Promise.resolve({} as never)),
}));

const { createApp } = await import("../app.js");

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

const consumerSession = {
  session: { expiresAt: new Date(), id: "sess_con", userId: "user_con" },
  user: {
    email: "consumer@luma.dev",
    emailVerified: false,
    id: "user_con",
    image: null,
    name: "Consumer User",
    role: "data_consumer",
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
    Promise.resolve(reviewerSession as never)
  );
  fakePrisma.loan.findUnique = mock(() =>
    Promise.resolve({
      borrowerState: "CA",
      currentBalance: 100_000,
      id: "c8x9y2z1a2b3c4d5e6f7g8h9",
      interestRate: 5.5,
      loanId: "L-1",
      paymentStatus: "current",
      servicerName: null,
      documentStatus: "complete",
      creditGrade: "A",
    } as never)
  );
  fakePrisma.loan.update = mock(
    () =>
      Promise.resolve({
        id: "c8x9y2z1a2b3c4d5e6f7g8h9",
        updatedAt: new Date("2026-08-26T10:00:00.000Z"),
      }) as never
  );
  fakePrisma.auditLog.createMany = mock(
    () => Promise.resolve({ count: 1 }) as never
  );
  fakePrisma.$transaction = mock(
    async (cb: (tx: unknown) => Promise<unknown>) =>
      cb({
        auditLog: { createMany: fakePrisma.auditLog.createMany },
        loan: { update: fakePrisma.loan.update },
      }) as never
  );
});

const patchFields = (body: unknown, token: string): Promise<Response> =>
  fetch(`${baseUrl}/api/loans/c8x9y2z1a2b3c4d5e6f7g8h9/fields`, {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", cookie: token },
    method: "PATCH",
  });

describe("PATCH /api/loans/:id/fields", () => {
  it("returns 400 for invalid cuid", async () => {
    const res = await fetch(`${baseUrl}/api/loans/not-a-cuid/fields`, {
      body: JSON.stringify({
        fields: { currentBalance: "10" },
        reason: "test",
      }),
      headers: { "content-type": "application/json" },
      method: "PATCH",
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 for non-editable field keys with field map error", async () => {
    const res = await patchFields(
      {
        fields: { loanId: "hacked" } as Record<string, string>,
        reason: "test",
      },
      ""
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for empty fields object", async () => {
    const res = await patchFields({ fields: {}, reason: "test" }, "");
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing reason", async () => {
    const res = await patchFields({ fields: { currentBalance: "10" } }, "");
    expect(res.status).toBe(400);
  });

  it("returns 400 for negative numeric values", async () => {
    const res = await patchFields(
      { fields: { currentBalance: "-5" }, reason: "test" },
      ""
    );
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error?: string };
    expect(json.error).toContain("Invalid numeric");
  });

  it("updates a field and writes FIELD_EDITED audit inside one transaction", async () => {
    let txArg: unknown;
    fakePrisma.$transaction = mock((cb: (tx: unknown) => Promise<unknown>) => {
      txArg = cb;
      return cb({
        auditLog: { createMany: fakePrisma.auditLog.createMany },
        loan: { update: fakePrisma.loan.update },
      }) as never;
    });

    const res = await patchFields(
      { fields: { currentBalance: "150000" }, reason: "servicer update" },
      ""
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as { updatedFields: string[] };
    expect(json.updatedFields).toEqual(["currentBalance"]);

    expect(fakePrisma.loan.update).toHaveBeenCalled();

    const calls = fakePrisma.auditLog.createMany.mock
      .calls as unknown as Array<{
      0: {
        data: Array<{ eventType: string; metadata: Record<string, unknown> }>;
      };
    }>;
    expect(calls.length).toBeGreaterThan(0);
    const auditPayload = calls[0]?.[0];
    expect(auditPayload?.data?.[0]?.eventType).toBe("FIELD_EDITED");
    expect(auditPayload?.data?.[0]?.metadata?.field).toBe("currentBalance");
    expect(auditPayload?.data?.[0]?.metadata?.oldValue).toBe("100000");
    expect(auditPayload?.data?.[0]?.metadata?.newValue).toBe("150000");
    expect(typeof txArg).toBe("function");
  });

  it("rejects empty numeric strings with 400", async () => {
    const res = await patchFields(
      { fields: { interestRate: "" }, reason: "clear" },
      ""
    );
    expect(res.status).toBe(400);
    expect(fakePrisma.loan.update).not.toHaveBeenCalled();
  });

  it("returns 403 for consumer and operator roles", async () => {
    fakeAuth.api.getSession = mock(() =>
      Promise.resolve(consumerSession as never)
    );
    const resConsumer = await patchFields(
      { fields: { currentBalance: "1" }, reason: "x" },
      ""
    );
    expect(resConsumer.status).toBe(403);

    fakeAuth.api.getSession = mock(() =>
      Promise.resolve(operatorSession as never)
    );
    const resOperator = await patchFields(
      { fields: { currentBalance: "1" }, reason: "x" },
      ""
    );
    expect(resOperator.status).toBe(403);
  });
});
