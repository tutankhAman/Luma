import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { NextFunction, Request, Response } from "express";
import { __resetRateLimitBuckets, createAiRateLimiter } from "./rate-limit.js";

const fakeReq = (userId?: string, ip = "127.0.0.1"): Request =>
  ({
    ip,
    user: userId
      ? {
          email: "x@luma.dev",
          emailVerified: false,
          id: userId,
          name: "X",
          role: "reviewer",
        }
      : undefined,
  }) as unknown as Request;

const fakeRes = (): Response & {
  _status?: number;
  _body?: unknown;
  _headers: Record<string, string>;
} => {
  const headers: Record<string, string> = {};
  const res = {
    _body: undefined as unknown,
    _headers: headers,
    _status: undefined as unknown as number,
    json(body: unknown) {
      (res as unknown as { _body: unknown })._body = body;
      return res as unknown as Response;
    },
    setHeader(k: string, v: string) {
      headers[k] = v;
    },
    status(code: number) {
      (res as unknown as { _status: number })._status = code;
      return res as unknown as Response;
    },
  } as unknown as Response & {
    _status?: number;
    _body?: unknown;
    _headers: Record<string, string>;
  };
  return res;
};

describe("createAiRateLimiter", () => {
  beforeEach(() => __resetRateLimitBuckets());

  it("allows 20 requests then 429 on 21st for same user", () => {
    const now = 1000;
    const clock = () => now;
    const limiter = createAiRateLimiter({ clock, limit: 20, windowMs: 60_000 });

    for (let i = 0; i < 20; i += 1) {
      const req = fakeReq("user-a");
      const res = fakeRes();
      const next = mock(() => {});
      limiter(req, res as Response, next as unknown as NextFunction);
      expect((next as ReturnType<typeof mock>).mock.calls.length).toBe(1);
      expect((res as unknown as { _status?: number })._status).toBeUndefined();
    }

    const blockedReq = fakeReq("user-a");
    const blockedRes = fakeRes();
    const blockedNext = mock(() => {});
    limiter(
      blockedReq,
      blockedRes as Response,
      blockedNext as unknown as NextFunction
    );
    expect((blockedNext as ReturnType<typeof mock>).mock.calls.length).toBe(0);
    expect((blockedRes as unknown as { _status?: number })._status).toBe(429);
    const body = (blockedRes as unknown as { _body?: { code?: string } })
      ._body as { code?: string };
    expect(body.code).toBe("RATE_LIMITED");
    expect(
      (blockedRes as unknown as { _headers: Record<string, string> })._headers[
        "Retry-After"
      ]
    ).toBeDefined();
  });

  it("window resets after 60s", () => {
    let now = 1000;
    const clock = () => now;
    const limiter = createAiRateLimiter({ clock, limit: 2, windowMs: 1000 });

    const n1 = mock(() => {});
    limiter(fakeReq("u"), fakeRes() as Response, n1 as unknown as NextFunction);
    expect(n1.mock.calls.length).toBe(1);
    const n2 = mock(() => {});
    limiter(fakeReq("u"), fakeRes() as Response, n2 as unknown as NextFunction);
    expect(n2.mock.calls.length).toBe(1);

    const blocked = fakeRes();
    const n3 = mock(() => {});
    limiter(fakeReq("u"), blocked as Response, n3 as unknown as NextFunction);
    expect((blocked as unknown as { _status?: number })._status).toBe(429);

    now += 1100;
    const afterWindow = fakeRes();
    const n4 = mock(() => {});
    limiter(
      fakeReq("u"),
      afterWindow as Response,
      n4 as unknown as NextFunction
    );
    expect(n4.mock.calls.length).toBe(1);
  });

  it("isolates per-user buckets", () => {
    const now = 1000;
    const clock = () => now;
    const limiter = createAiRateLimiter({ clock, limit: 1, windowMs: 60_000 });

    const nA = mock(() => {});
    limiter(
      fakeReq("alice"),
      fakeRes() as Response,
      nA as unknown as NextFunction
    );
    expect(nA.mock.calls.length).toBe(1);

    const nB = mock(() => {});
    limiter(
      fakeReq("bob"),
      fakeRes() as Response,
      nB as unknown as NextFunction
    );
    expect(nB.mock.calls.length).toBe(1);

    const blockedRes = fakeRes();
    const blocked = mock(() => {});
    limiter(
      fakeReq("alice"),
      blockedRes as Response,
      blocked as unknown as NextFunction
    );
    expect(blocked.mock.calls.length).toBe(0);
    expect((blockedRes as unknown as { _status?: number })._status).toBe(429);
  });

  it("keys on ip when no user", () => {
    const now = 1000;
    const clock = () => now;
    const limiter = createAiRateLimiter({ clock, limit: 1, windowMs: 60_000 });

    const r1 = fakeReq(undefined, "1.2.3.4");
    const res1 = fakeRes();
    const n1 = mock(() => {});
    limiter(r1, res1 as Response, n1 as unknown as NextFunction);
    expect(n1.mock.calls.length).toBe(1);

    const r2 = fakeReq(undefined, "1.2.3.4");
    const res2 = fakeRes();
    const n2 = mock(() => {});
    limiter(r2, res2 as Response, n2 as unknown as NextFunction);
    expect(n2.mock.calls.length).toBe(0);

    const r3 = fakeReq(undefined, "5.6.7.8");
    const res3 = fakeRes();
    const n3 = mock(() => {});
    limiter(r3, res3 as Response, n3 as unknown as NextFunction);
    expect(n3.mock.calls.length).toBe(1);
  });
});
