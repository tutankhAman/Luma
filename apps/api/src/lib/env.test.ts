import { describe, expect, it } from "bun:test";
import { assertBootEnv } from "./env.js";

const VALID_SECRET = "a".repeat(32);
const SECRET_ERROR = /BETTER_AUTH_SECRET/;
const MIN_LENGTH_ERROR = /at least 32/;
const DATABASE_URL_ERROR = /DATABASE_URL/;

describe("assertBootEnv", () => {
  it("throws when BETTER_AUTH_SECRET is missing", () => {
    expect(() =>
      assertBootEnv({
        BETTER_AUTH_SECRET: undefined,
        DATABASE_URL: "postgres://x",
      })
    ).toThrow(SECRET_ERROR);
  });

  it("throws when BETTER_AUTH_SECRET is shorter than 32 chars", () => {
    expect(() =>
      assertBootEnv({
        BETTER_AUTH_SECRET: "too-short",
        DATABASE_URL: "postgres://x",
      })
    ).toThrow(MIN_LENGTH_ERROR);
  });

  it("throws when DATABASE_URL is missing even with a valid secret", () => {
    expect(() => assertBootEnv({ BETTER_AUTH_SECRET: VALID_SECRET })).toThrow(
      DATABASE_URL_ERROR
    );
  });

  it("passes with valid secret and database url (frontend url optional)", () => {
    expect(() =>
      assertBootEnv({
        BETTER_AUTH_SECRET: VALID_SECRET,
        DATABASE_URL: "postgresql://localhost/luma",
      })
    ).not.toThrow();
  });

  it("defaults to process.env when called without arguments", () => {
    expect(() => assertBootEnv()).not.toThrow();
  });
});
