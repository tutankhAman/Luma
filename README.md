# Luma

Turborepo + Bun monorepo.

- `apps/api` — Express + Prisma + Better Auth (port `4000`)
- `apps/web` — Vite + React (port `3000`)
- `packages/types` — shared Zod types
- `packages/typescript-config` — shared tsconfigs

## Prerequisites

- **Bun** `1.4.0` (`bun --version`)
- **Node** `>=24` (`node --version`)
- **Docker** + Docker Compose (for Postgres)
- **Git**

## Init

```sh
# 1. clone
git clone <repo-url> Luma
cd Luma

# 2. install (also installs lefthook hook via `prepare`)
bun install --frozen-lockfile

# 3. env
cp apps/api/.env.example apps/api/.env
# edit apps/api/.env if needed — generate a secret:
# openssl rand -base64 32
```

`apps/api/.env` defaults (works with `docker-compose.yml`):

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/luma"
BETTER_AUTH_SECRET="replace-with-openssl-rand-base64-32"
BETTER_AUTH_URL="http://localhost:4000"
FRONTEND_URL="http://localhost:3000"
PORT=4000
```

## Run

```sh
# 1. start postgres
docker compose up -d
# check: docker compose ps ; pg_isready -h localhost -p 5432 -U postgres

# 2. prisma — generate client + run migrations
bun --filter api exec prisma generate
bun --filter api exec prisma migrate dev
# alternatives:
# bunx prisma migrate deploy --schema apps/api/prisma/schema.prisma
# bunx prisma db push --schema apps/api/prisma/schema.prisma

# 3. seed (creates 3 users, password: `password`)
bun --filter api run seed
# operator@luma.dev (data_operator)
# reviewer@luma.dev (reviewer)
# consumer@luma.dev (data_consumer)

# 4. dev (runs api + web via turbo)
bun run dev
# api  -> http://localhost:4000  (health: /api/health)
# web  -> http://localhost:3000  (proxies /api to :4000)

# single app only
# bun --filter api run dev
# bun --filter web run dev
```

## Build / Check

```sh
bun run build        # turbo build (all)
bun run check-types  # turbo typecheck
bun x ultracite check
bun x ultracite fix
```

## Scripts

| Command | Description |
|---|---|
| `bun run dev` | `turbo run dev` — watch api + web |
| `bun run build` | `turbo run build` |
| `bun run check-types` | `turbo run check-types` |
| `bun run check` / `bun run fix` | `ultracite check/fix` (Biome) |
| `bun --filter api run seed` | seed users via `apps/api/src/seed.ts` |
| `docker compose up -d` / `down` | start/stop postgres |
| `docker compose logs postgres` | db logs |

## Project Structure

```
Luma/
├── apps/
│   ├── api/        # Express, Prisma (prisma/schema.prisma), Better Auth
│   └── web/        # Vite React, proxy /api -> localhost:4000
├── packages/
│   ├── types/
│   └── typescript-config/
├── docker-compose.yml  # postgres:16-alpine, db `luma`
├── lefthook.yml        # pre-commit: lint + typecheck + build (mirrors CI)
├── turbo.json
└── biome.jsonc
```

## CI

`.github/workflows/ci.yml` runs on `push`/`pull_request` to `main` as three separate checks:

- `lint` — install + `ultracite check`
- `typecheck` — install + generate Prisma client + `check-types`
- `build` — install + generate Prisma client + `build`

Same steps run locally on pre-commit via lefthook.

Branch protection is enabled on `main`:

- Direct pushes to `main` are blocked — all changes must go through a pull request
- All three checks (`lint`, `typecheck`, `build`) are required and must be green before a PR can be merged
- The PR branch must be up to date with `main` before merging

Workflow:

1. Create a feature branch from `main`
2. Make changes and push the branch
3. Open a pull request against `main`
4. Wait for the CI checks to run on the PR
5. If checks fail, fix and push again — merge stays blocked until green
6. Merge only when all required checks pass
