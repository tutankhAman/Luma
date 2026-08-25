import { auth } from "./lib/auth.js";
import { prisma } from "./lib/prisma.js";

interface SeedUser {
  email: string;
  name: string;
  password: string;
  role: string;
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

const seed = async (): Promise<void> => {
  for (const seedUser of SEED_USERS) {
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
      continue;
    }

    try {
      const result = await auth.api.signUpEmail({
        body: {
          email: seedUser.email,
          name: seedUser.name,
          password: seedUser.password,
        },
        headers: new Headers(),
      });

      const createdId =
        // better-auth returns { user } on success
        (result as { user?: { id: string } }).user?.id ?? null;

      if (createdId) {
        await prisma.user.update({
          data: { role: seedUser.role },
          where: { id: createdId },
        });
      } else {
        // fallback: lookup by email and set role
        const created = await prisma.user.findUnique({
          where: { email: seedUser.email },
        });
        if (created) {
          await prisma.user.update({
            data: { role: seedUser.role },
            where: { id: created.id },
          });
        }
      }

      process.stdout.write(
        `created ${seedUser.email} -> role=${seedUser.role}\n`
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : JSON.stringify(error);
      // idempotent: if signUp fails because user already exists (race), update role
      const raceUser = await prisma.user.findUnique({
        where: { email: seedUser.email },
      });
      if (raceUser) {
        if (raceUser.role !== seedUser.role) {
          await prisma.user.update({
            data: { role: seedUser.role },
            where: { id: raceUser.id },
          });
        }
        process.stdout.write(
          `exists (race) ${seedUser.email} (${raceUser.role})\n`
        );
      } else {
        throw new Error(`seed failed for ${seedUser.email}: ${message}`, {
          cause: error,
        });
      }
    }
  }

  const count = await prisma.user.count();
  process.stdout.write(`seed done: ${count} user(s) in db\n`);
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
