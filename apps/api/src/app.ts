import type { HealthResponse, MeResponse } from "@repo/types";
import { toNodeHandler } from "better-auth/node";
import cors from "cors";
import express, { type Express } from "express";
import { auth } from "./lib/auth.js";
import { assertBootEnv } from "./lib/env.js";
import { requireAuth } from "./middleware/require-auth.js";

export const createApp = (): Express => {
  assertBootEnv();

  const app = express();

  const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:3000";

  app.use(
    cors({
      credentials: true,
      origin: frontendUrl,
    })
  );

  // Better Auth must be mounted before express.json() so it can read raw bodies
  app.all("/api/auth/*splat", toNodeHandler(auth));

  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    const body: HealthResponse = {
      status: "ok",
      timestamp: new Date().toISOString(),
    };
    res.json(body);
  });

  app.get("/api/me", requireAuth, (req, res) => {
    const { user } = req;
    if (!user) {
      res.status(401).json({ code: "UNAUTHENTICATED", error: "Unauthorized" });
      return;
    }
    const body: MeResponse = {
      email: user.email,
      id: user.id,
      name: user.name,
      role: user.role,
    };
    res.json(body);
  });

  return app;
};
