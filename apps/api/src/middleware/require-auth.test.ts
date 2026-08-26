import { afterEach, describe, expect, it } from "bun:test";
import type { NextFunction, Request, Response } from "express";
import { auth } from "../lib/auth.js";
import { requireAuth } from "./require-auth.js";

interface SessionPayload {
  session: { expiresAt: Date; id: string; userId: string };
  user: { email: string; id: string; name: string; role?: string | null };
}

const sessionFixture = (role?: string | null): SessionPayload => ({
  session: { expiresAt: new Date(), id: "sess_1", userId: "user_1" },
  user: {
    email: "reviewer@luma.dev",
    id: "user_1",
    name: "Reviewer User",
    role,
  },
});

const originalGetSession = auth.api.getSession;

afterEach(() => {
  (
    auth.api as unknown as {
      getSession: typeof originalGetSession;
    }
  ).getSession = originalGetSession;
});

const stubGetSession = (
  impl: (headers: unknown) => Promise<SessionPayload | null>
) => {
  interface GetSessionArgs {
    headers: unknown;
  }
  (
    auth.api as unknown as {
      getSession: (args: GetSessionArgs) => Promise<SessionPayload | null>;
    }
  ).getSession = impl;
};

interface ResState {
  body: unknown;
  statusCode: number;
}

const createRes = (): { res: Response; state: ResState } => {
  const state: ResState = { body: undefined, statusCode: 0 };
  const res = {
    json(payload: unknown) {
      state.body = payload;
      return this;
    },
    status(code: number) {
      state.statusCode = code;
      return this;
    },
  };
  return { res: res as unknown as Response, state };
};

const createReq = (): Request => ({ headers: {} }) as unknown as Request;

const runMiddleware = async (
  middleware: (req: Request, res: Response, next: NextFunction) => Promise<void>
): Promise<{ calledNext: boolean; req: Request; state: ResState }> => {
  const req = createReq();
  const { res, state } = createRes();
  let calledNext = false;
  await middleware(req, res, () => {
    calledNext = true;
  });
  return { calledNext, req, state };
};

describe("requireAuth", () => {
  it("returns 401 UNAUTHENTICATED and skips next when there is no session", async () => {
    stubGetSession(() => Promise.resolve(null));
    const { calledNext, state } = await runMiddleware(requireAuth);
    expect(state.statusCode).toBe(401);
    expect(state.body).toEqual({
      code: "UNAUTHENTICATED",
      error: "Unauthorized",
    });
    expect(calledNext).toBe(false);
  });

  it("passes request headers to better-auth getSession", async () => {
    let received: unknown = null;
    stubGetSession((headers) => {
      received = headers;
      return Promise.resolve(sessionFixture("reviewer"));
    });
    await runMiddleware(requireAuth);
    const args = received as { headers: unknown };
    expect(args.headers).toBeInstanceOf(Headers);
  });

  it("attaches typed user with contract Role and calls next", async () => {
    stubGetSession(() => Promise.resolve(sessionFixture("reviewer")));
    const { calledNext, req } = await runMiddleware(requireAuth);
    expect(calledNext).toBe(true);
    expect(req.user?.id).toBe("user_1");
    expect(req.user?.email).toBe("reviewer@luma.dev");
    expect(req.user?.role).toBe("reviewer");
    expect(req.session?.userId).toBe("user_1");
  });

  it("returns 401 when session user has no role", async () => {
    stubGetSession(() => Promise.resolve(sessionFixture(null)));
    const { calledNext, state } = await runMiddleware(requireAuth);
    expect(state.statusCode).toBe(401);
    expect(calledNext).toBe(false);
  });

  it("returns 401 for an unknown role string (fail-closed)", async () => {
    stubGetSession(() => Promise.resolve(sessionFixture("space_wizard")));
    const { calledNext, state } = await runMiddleware(requireAuth);
    expect(state.statusCode).toBe(401);
    expect(calledNext).toBe(false);
  });
});
