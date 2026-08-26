import type { Role } from "@repo/types";
import type { NextFunction, Request, Response } from "express";

export type AppRole = Role;

export const requireRole =
  (...roles: AppRole[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const { user } = req;

    if (!user) {
      res.status(401).json({ code: "UNAUTHENTICATED", error: "Unauthorized" });
      return;
    }

    const matchedRole = roles.find((role) => role === user.role);

    if (!matchedRole) {
      res.status(403).json({ code: "FORBIDDEN", error: "Forbidden" });
      return;
    }

    req.user = { ...user, role: matchedRole };
    next();
  };
