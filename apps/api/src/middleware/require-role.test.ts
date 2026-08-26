import { describe, expect, it } from "bun:test";
import type { NextFunction, Request, Response } from "express";
import { requireRole } from "./require-role.js";

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

const createReq = (user?: {
  email: string;
  id: string;
  name: string;
  role: string;
}): Request =>
  ({
    headers: {},
    user: user
      ? {
          email: user.email,
          emailVerified: false,
          id: user.id,
          name: user.name,
          role: user.role as "reviewer" | "data_operator" | "data_consumer",
        }
      : undefined,
  }) as unknown as Request;

const runMiddleware = async (
  middleware: (
    req: Request,
    res: Response,
    next: NextFunction
  ) => void | Promise<void>,
  user?: { email: string; id: string; name: string; role: string }
): Promise<{ calledNext: boolean; req: Request; state: ResState }> => {
  const req = createReq(user);
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

    it("returns 401 when there is no user (requireAuth not run)", async () => {
      const { calledNext, state } = await runMiddleware(reviewerOnly);
      expect(state.statusCode).toBe(401);
      expect(calledNext).toBe(false);
    });

    it("returns 403 FORBIDDEN for an authenticated wrong role", async () => {
      const { calledNext, state } = await runMiddleware(reviewerOnly, {
        email: "operator@luma.dev",
        id: "user_1",
        name: "Operator User",
        role: "data_operator",
      });
      expect(state.statusCode).toBe(403);
      expect(state.body).toEqual({ code: "FORBIDDEN", error: "Forbidden" });
      expect(calledNext).toBe(false);
    });

    it("calls next and attaches user when role matches", async () => {
      const { calledNext, req } = await runMiddleware(reviewerOnly, {
        email: "operator@luma.dev",
        id: "user_1",
        name: "Operator User",
        role: "reviewer",
      });
      expect(calledNext).toBe(true);
      expect(req.user?.role).toBe("reviewer");
    });
  });

  describe("multi-role guard", () => {
    const operatorOrReviewer = requireRole("data_operator", "reviewer");

    it("allows any of the listed roles", async () => {
      const { calledNext, req } = await runMiddleware(operatorOrReviewer, {
        email: "operator@luma.dev",
        id: "user_1",
        name: "Operator User",
        role: "data_operator",
      });
      expect(calledNext).toBe(true);
      expect(req.user?.role).toBe("data_operator");
    });

    it("still rejects roles outside the list", async () => {
      const { calledNext, state } = await runMiddleware(operatorOrReviewer, {
        email: "operator@luma.dev",
        id: "user_1",
        name: "Operator User",
        role: "data_consumer",
      });
      expect(state.statusCode).toBe(403);
      expect(calledNext).toBe(false);
    });
  });

  it("rejects every authenticated user when no roles are provided", async () => {
    const denyAll = requireRole();
    const { calledNext, state } = await runMiddleware(denyAll, {
      email: "operator@luma.dev",
      id: "user_1",
      name: "Operator User",
      role: "reviewer",
    });
    expect(state.statusCode).toBe(403);
    expect(calledNext).toBe(false);
  });
});
