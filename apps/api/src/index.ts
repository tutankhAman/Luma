import { toNodeHandler } from "better-auth/node";
import cors from "cors";
import express from "express";
import { auth } from "./lib/auth";

const app = express();

const port = Number(process.env.PORT ?? 4000);
const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:3000";

app.use(
  cors({
    credentials: true,
    origin: frontendUrl,
  })
);

app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  process.stdout.write(`api listening on http://localhost:${port}\n`);
});
