const MIN_SECRET_LENGTH = 32;

export type BootEnv = Partial<
  Record<"BETTER_AUTH_SECRET" | "DATABASE_URL" | "FRONTEND_URL", string>
>;

/**
 * Fail loud at boot (G5). A missing/short secret silently falls back to a
 * publicly-known constant inside better-auth when NODE_ENV !== "production",
 * which makes sessions forgeable -> full privilege takeover.
 */
export const assertBootEnv = (env: BootEnv = process.env as BootEnv): void => {
  const secret = env.BETTER_AUTH_SECRET;

  if (!secret || secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `BETTER_AUTH_SECRET must be set and at least ${MIN_SECRET_LENGTH} characters (generate: openssl rand -base64 32)`
    );
  }

  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  if (!env.FRONTEND_URL) {
    process.stderr.write(
      "[env] FRONTEND_URL not set - CORS/trustedOrigins defaulting to http://localhost:3000\n"
    );
  }
};
