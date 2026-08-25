import { fromNodeHeaders } from "better-auth/node";
import type { NextFunction, Request, Response } from "express";
import { auth } from "../lib/auth";

export const APP_ROLES = [
  "data_operator",
  "reviewer",
  "data_consumer",
] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const requireRole =
  (...roles: AppRole[]) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session) {
      res.status(401).json({ code: "UNAUTHENTICATED", error: "Unauthorized" });
      return;
    }

    if (!roles.includes(session.user.role as AppRole)) {
      res.status(403).json({ code: "FORBIDDEN", error: "Forbidden" });
      return;
    }

    req.user = session.user;
    req.session = session.session;
    next();
  };
