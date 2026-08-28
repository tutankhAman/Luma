import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin } from "better-auth/plugins";
import { prisma } from "./prisma.js";

export const auth = betterAuth({
  advanced: {
    defaultCookieAttributes:
      process.env.CROSS_ORIGIN_COOKIES === "true"
        ? { sameSite: "none", secure: true }
        : undefined,
  },
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: { enabled: true },
  plugins: [
    admin({
      adminRoles: ["admin"],
      defaultRole: "data_consumer",
    }),
  ],
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: [
    process.env.FRONTEND_URL ?? "http://localhost:3000",
    ...(process.env.EXTRA_FRONTEND_URLS ?? "")
      .split(",")
      .map((url) => url.trim())
      .filter((url) => url.length > 0),
  ],
});
