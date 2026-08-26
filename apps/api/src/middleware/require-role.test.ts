import { afterEach, describe, expect, it } from "bun:test";
import type { NextFunction, Request, Response } from "express";
import { auth } from "../lib/auth.js";
import { requireRole } from "./require-role.js";

interface SessionPayload {
  session: { expiresAt: Date; id: string; userId: string };
  user: { email: string; id: string; name: string; role?: string | null };
}

const sessionFixture = (role?: string | null): SessionPayload => ({
  session: { expiresAt: new Date(), id: "sess_1", userId: "user_1" },
  user: {
    email: "operator@luma.dev",
    id: "user_1",
    name: "Operator User",
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
  impl: () => Promise<SessionPayload | null>
): undefined => {
  (
    auth.api as unknown as {
      getSession: () => Promise<SessionPayload | null>;
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

describe("requireRole", () => {
  describe("single role guard", () => {
    const reviewerOnly = requireRole("reviewer");

    it("returns 401 when there is no session", async () => {
      stubGetSession(() => Promise.resolve(null));
      const { calledNext, state } = await runMiddleware(reviewerOnly);
      expect(state.statusCode).toBe(401);
      expect(calledNext).toBe(false);
    });

    it("returns 403 FORBIDDEN for an authenticated wrong role", async () => {
      stubGetSession(() => Promise.resolve(sessionFixture("data_operator")));
      const { calledNext, state } = await runMiddleware(reviewerOnly);
      expect(state.statusCode).toBe(403);
      expect(state.body).toEqual({ code: "FORBIDDEN", error: "Forbidden" });
      expect(calledNext).toBe(false);
    });

    it("calls next and attaches user when role matches", async () => {
      stubGetSession(() => Promise.resolve(sessionFixture("reviewer")));
      const { calledNext, req } = await runMiddleware(reviewerOnly);
      expect(calledNext).toBe(true);
      expect(req.user?.role).toBe("reviewer");
      expect(req.session?.userId).toBe("user_1");
    });
  });

  describe("multi-role guard", () => {
    const operatorOrReviewer = requireRole("data_operator", "reviewer");

    it("allows any of the listed roles", async () => {
      stubGetSession(() => Promise.resolve(sessionFixture("data_operator")));
      const { calledNext, req } = await runMiddleware(operatorOrReviewer);
      expect(calledNext).toBe(true);
      expect(req.user?.role).toBe("data_operator");
    });

    it("still rejects roles outside the list", async () => {
      stubGetSession(() => Promise.resolve(sessionFixture("data_consumer")));
      const { calledNext, state } = await runMiddleware(operatorOrReviewer);
      expect(state.statusCode).toBe(403);
      expect(calledNext).toBe(false);
    });
  });

  it("rejects every authenticated user when no roles are provided", async () => {
    const denyAll = requireRole();
    stubGetSession(() => Promise.resolve(sessionFixture("reviewer")));
    const { calledNext, state } = await runMiddleware(denyAll);
    expect(state.statusCode).toBe(403);
    expect(calledNext).toBe(false);
  });
});
