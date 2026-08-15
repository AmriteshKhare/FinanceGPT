# Gpt Finance

Local-first personal finance copilot for India. Deterministic finance engine first; optional AI is **off by default**.

> Not a substitute for a Chartered Accountant, tax professional, or SEBI-registered investment adviser. Tax content (when added) is informational only.

## Architecture (Milestone 1)

| Path | Role |
|------|------|
| `apps/web` | Next.js App Router PWA shell (login, lock screen, dashboard stub) |
| `apps/api` | Fastify REST API (`/v1`), OpenAPI at `/docs` |
| `packages/finance-core` | Pure money helpers (integer paise only) |
| `packages/shared` | Shared Zod schemas |
| `packages/db` | Drizzle schema + Postgres migrations |

See [docs/adr/0001-llm-not-trusted-for-calculations.md](docs/adr/0001-llm-not-trusted-for-calculations.md).

## Prerequisites

- Node.js 22+ (Docker images pin Node 22 LTS)
- pnpm 9 (`corepack enable` or `npx pnpm`)
- Docker + Docker Compose (for full local-network deploy)

## Quick start (Docker)

1. Copy env and set secrets:

```bash
cp .env.example .env
# Edit SESSION_SECRET, INITIAL_ADMIN_PASSWORD
```

2. Map the hostname (optional but recommended):

```bash
echo '127.0.0.1 finance.local' | sudo tee -a /etc/hosts
```

3. Start the stack:

```bash
docker compose up --build
```

4. Open `https://finance.local` (Caddy issues a local certificate). Trust the local CA if your browser warns, or use `https://localhost`.

5. Sign in with `INITIAL_ADMIN_EMAIL` / `INITIAL_ADMIN_PASSWORD` from `.env`.

### Security boundaries

- Postgres is **not** published to the host — only reachable on the Docker `internal` network.
- Web and API are reached through Caddy (TLS). Prefer `finance.local` on your LAN.
- Session cookies are HttpOnly + `SameSite=Lax`. Set `COOKIE_SECURE=true` behind HTTPS (Compose does this).
- `AI_ENABLED=false` by default; finance features do not require a model.
- Transaction notes/amounts are redacted from API logs by default (enforced as routes are added).

### Bootstrap admin

On first API start, if no users exist, the API creates:

- one user from `INITIAL_ADMIN_EMAIL` / `INITIAL_ADMIN_PASSWORD`
- a default household (`Asia/Kolkata` timezone unless overridden)
- an audit event `bootstrap.admin_created`

Change the password after first login in a later milestone (or rotate via DB for now).

## Local development (without Docker for apps)

1. Run Postgres locally (or temporarily expose it yourself — do **not** expose Postgres in the default Compose file).

2. Point `.env` `DATABASE_URL` at that instance (e.g. `postgresql://finance:finance@127.0.0.1:5432/finance`).

3. Install and migrate:

```bash
pnpm install
pnpm db:migrate
pnpm --filter @gpt-finance/shared build
pnpm --filter @gpt-finance/finance-core build
pnpm --filter @gpt-finance/db build
```

4. Run API + web:

```bash
pnpm --filter @gpt-finance/api dev
pnpm --filter @gpt-finance/web dev
```

Web proxies `/v1` to `http://127.0.0.1:4000` via Next.js rewrites.

## Tests

```bash
pnpm test
```

Covers finance-core paise formatting and API config/auth/health unit tests. Full integration against Postgres arrives with later milestones / CI.

## Backups (encrypted dumps)

Docker volumes are **not** encrypted by this project. For backups:

```bash
# From a host that can reach the db container on the compose network:
docker compose exec -T db pg_dump -U finance finance | gzip > finance-$(date +%F).sql.gz
# Encrypt the dump at rest, e.g.:
gpg --symmetric --cipher-algo AES256 finance-YYYY-MM-DD.sql.gz
```

Store the ciphertext off-box. Restore only onto a trusted machine.

Documented deletion/retention and data-export APIs are planned for later milestones.

## Limitations (M1)

- No accounts, transactions, budgets, goals, charts, or purchase evaluation yet.
- App lock PIN is a browser-session stub (not household-configured).
- No live AI / Ollama wiring.
- CSRF hardening for cookie mutations is planned with broader write APIs.

## License / privacy

Designed for private home-server use on a local network. Do not expose Postgres or unauthenticated admin bootstrap credentials to the public internet.
