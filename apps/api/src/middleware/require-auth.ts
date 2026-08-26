import { fromNodeHeaders } from "better-auth/node";
import type { NextFunction, Request, Response } from "express";
import { auth } from "../lib/auth.js";
import { normalizeRole } from "../lib/roles.js";

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  if (!session) {
    res.status(401).json({ code: "UNAUTHENTICATED", error: "Unauthorized" });
    return;
  }

  const role = normalizeRole(session.user.role);

  if (!role) {
    res.status(401).json({ code: "UNAUTHENTICATED", error: "Unauthorized" });
    return;
  }

  req.user = { ...session.user, role };
  req.session = session.session;
  next();
};
