import type { NextFunction, Request, Response } from "express";

const DEFAULT_LIMIT = 20;
const DEFAULT_WINDOW_MS = 60_000;

type Bucket = number[];

const buckets = new Map<string, Bucket>();

const prune = (timestamps: Bucket, now: number, windowMs: number): Bucket => {
  const cutoff = now - windowMs;
  let start = 0;
  while (
    start < timestamps.length &&
    timestamps[start] !== undefined &&
    (timestamps[start] as number) <= cutoff
  ) {
    start += 1;
  }
  if (start > 0) {
    timestamps.splice(0, start);
  }
  return timestamps;
};

export const createAiRateLimiter = (opts?: {
  clock?: () => number;
  limit?: number;
  windowMs?: number;
}): ((req: Request, res: Response, next: NextFunction) => void) => {
  const limit = opts?.limit ?? DEFAULT_LIMIT;
  const windowMs = opts?.windowMs ?? DEFAULT_WINDOW_MS;
  const clock = opts?.clock ?? Date.now;

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.user?.id ?? req.ip ?? "anon";
    const now = clock();
    const existing = buckets.get(key) ?? [];
    const bucket = prune(existing, now, windowMs);

    if (bucket.length === 0) {
      buckets.delete(key);
    }

    if (bucket.length >= limit) {
      const retryAfterMs = (bucket[0] ?? now) + windowMs - now;
      const retryAfterSec = Math.max(1, Math.ceil(retryAfterMs / 1000));
      res.setHeader("Retry-After", String(retryAfterSec));
      res.status(429).json({
        code: "RATE_LIMITED",
        error: "Too many AI requests — please try again shortly.",
      });
      return;
    }

    bucket.push(now);
    buckets.set(key, bucket);
    next();
  };
};

export const __resetRateLimitBuckets = (): void => {
  buckets.clear();
};

export const __getRateLimitBucketSize = (key: string): number =>
  buckets.get(key)?.length ?? 0;
