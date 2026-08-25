import type { Role } from "@repo/types";
import { auth } from "./lib/auth.js";
import { prisma } from "./lib/prisma.js";

interface SeedUser {
  email: string;
  name: string;
  password: string;
  role: Role;
}

const SEED_USERS: SeedUser[] = [
  {
    email: "operator@luma.dev",
    name: "Operator User",
    password: "password",
    role: "data_operator",
  },
  {
    email: "reviewer@luma.dev",
    name: "Reviewer User",
    password: "password",
    role: "reviewer",
  },
  {
    email: "consumer@luma.dev",
    name: "Consumer User",
    password: "password",
    role: "data_consumer",
  },
];

const ensureRole = async (email: string, role: Role): Promise<void> => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return;
  }
  if (user.role !== role) {
    await prisma.user.update({ data: { role }, where: { id: user.id } });
  }
};

const upsertSeedUser = async (seedUser: SeedUser): Promise<string> => {
  const existing = await prisma.user.findUnique({
    where: { email: seedUser.email },
  });

  if (existing) {
    const needsUpdate =
      existing.name !== seedUser.name || existing.role !== seedUser.role;
    if (needsUpdate) {
      await prisma.user.update({
        data: { name: seedUser.name, role: seedUser.role },
        where: { id: existing.id },
      });
      process.stdout.write(
        `updated ${seedUser.email} -> role=${seedUser.role}\n`
      );
    } else {
      process.stdout.write(`exists ${seedUser.email} (${existing.role})\n`);
    }
    // verify role after update
    await ensureRole(seedUser.email, seedUser.role);
    return "exists";
  }

  try {
    await auth.api.signUpEmail({
      body: {
        email: seedUser.email,
        name: seedUser.name,
        password: seedUser.password,
      },
      headers: new Headers(),
    });

    // signUp creates user with defaultRole; force correct role and verify
    await ensureRole(seedUser.email, seedUser.role);

    const created = await prisma.user.findUnique({
      where: { email: seedUser.email },
    });

    if (!created || created.role !== seedUser.role) {
      throw new Error(
        `role mismatch after create for ${seedUser.email}: expected ${seedUser.role} got ${created?.role ?? "null"}`
      );
    }

    process.stdout.write(
      `created ${seedUser.email} -> role=${seedUser.role}\n`
    );
    return "created";
  } catch (error) {
    const message =
      error instanceof Error ? error.message : JSON.stringify(error);

    const raceUser = await prisma.user.findUnique({
      where: { email: seedUser.email },
    });

    if (raceUser) {
      await ensureRole(seedUser.email, seedUser.role);
      process.stdout.write(
        `exists (race) ${seedUser.email} (${raceUser.role})\n`
      );
      return "race";
    }

    throw new Error(`seed failed for ${seedUser.email}: ${message}`, {
      cause: error,
    });
  }
};

const seed = async (): Promise<void> => {
  for (const seedUser of SEED_USERS) {
    await upsertSeedUser(seedUser);
  }

  const count = await prisma.user.count();
  process.stdout.write(`seed done: ${count} user(s) in db\n`);

  const seeded = await prisma.user.findMany({
    select: { email: true, role: true },
    where: { email: { in: SEED_USERS.map((u) => u.email) } },
  });

  const mismatched = seeded.filter(
    (u) => SEED_USERS.find((s) => s.email === u.email)?.role !== u.role
  );

  if (mismatched.length > 0) {
    throw new Error(`role verification failed: ${JSON.stringify(mismatched)}`);
  }
};

try {
  await seed();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`seed error: ${message}\n`);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
