import type { HealthResponse, MeResponse } from "@repo/types";
import { toNodeHandler } from "better-auth/node";
import cors from "cors";
import express, { type Express } from "express";
import { auth } from "./lib/auth.js";
import { assertBootEnv } from "./lib/env.js";
import { requireAuth } from "./middleware/require-auth.js";
import uploadsRouter from "./routes/uploads.js";

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

  app.use("/api/uploads", uploadsRouter);

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

  app.use(
    (
      err: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ): void => {
      if (err !== null && typeof err === "object" && "code" in err) {
        const { code } = err as { code: string };
        if (code === "LIMIT_FILE_SIZE") {
          res
            .status(413)
            .json({ code: "PAYLOAD_TOO_LARGE", error: "File too large" });
          return;
        }
        if (
          code === "LIMIT_UNEXPECTED_FILE" ||
          code === "LIMIT_FIELD_KEY" ||
          code === "LIMIT_FIELD_VALUE"
        ) {
          res
            .status(400)
            .json({ code: "BAD_REQUEST", error: "Invalid upload" });
          return;
        }
      }
      if (
        err !== null &&
        typeof err === "object" &&
        "message" in err &&
        typeof (err as { message: unknown }).message === "string"
      ) {
        res
          .status(500)
          .json({ code: "INTERNAL_ERROR", error: "Internal server error" });
        return;
      }
      res
        .status(500)
        .json({ code: "INTERNAL_ERROR", error: "Internal server error" });
    }
  );

  return app;
};
