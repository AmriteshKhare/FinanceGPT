# Gpt Finance

Local-first personal finance copilot for India. Deterministic finance engine first; optional AI is **off by default**.

> Not a substitute for a Chartered Accountant, tax professional, or SEBI-registered investment adviser. Tax content (when added) is informational only.

## Architecture (Milestone 2)

| Path | Role |
|------|------|
| `apps/web` | Next.js PWA: dashboard, accounts, transactions, CSV import |
| `apps/api` | Fastify REST `/v1` auth + accounts/categories/transactions/imports |
| `packages/finance-core` | Paise helpers, CSV parse, duplicate fingerprints |
| `packages/shared` | Shared Zod schemas |
| `packages/db` | Drizzle schema + migrations (auth + ledger) |

See [docs/adr/0001-llm-not-trusted-for-calculations.md](docs/adr/0001-llm-not-trusted-for-calculations.md).

## Homelab target: smaug

Production-style deploy is the always-on LAN host **smaug** (`192.168.1.30`), not a cloud VPS.

Full host context: [docs/homelab-smaug.md](docs/homelab-smaug.md) (mirrors the Flipkart `localdockersetup.md` conventions).

| Service | Container | LAN URL |
|---------|-----------|---------|
| App UI | `finance-web` | http://192.168.1.30:3100 |
| Logs | Dozzle | http://192.168.1.30:8888 |
| Docker GUI | Portainer | https://192.168.1.30:9443 |

Postgres (`finance-db`) and the API (`finance-api`) stay on the Docker network only. The browser talks to port **3100**; Next.js rewrites `/v1` to the API container.

### Deploy to smaug

```bash
scp -r . keeper@192.168.1.30:~/FinanceGPT/
ssh -t keeper@192.168.1.30
cd ~/FinanceGPT
cp -n .env.example .env   # set SESSION_SECRET + INITIAL_ADMIN_PASSWORD
docker compose up -d --build
```

Then open http://192.168.1.30:3100 from any device on the LAN (including iPhone).

## Prerequisites

- Node.js 22+ (Docker images pin Node 22 LTS) for local Mac development
- pnpm 9 (`corepack enable` or `npx pnpm`)
- Docker Compose on **smaug** for the always-on stack

## Quick start (Docker on smaug / any Compose host)

1. Copy env and set secrets:

```bash
cp .env.example .env
# Edit SESSION_SECRET, INITIAL_ADMIN_PASSWORD
```

2. Start the stack:

```bash
docker compose up -d --build
```

3. Open http://192.168.1.30:3100 (or `http://localhost:3100` if Compose runs on the same machine).

4. Sign in with `INITIAL_ADMIN_EMAIL` / `INITIAL_ADMIN_PASSWORD` from `.env`.

### Security boundaries

- Postgres is **not** published to the host — only reachable on the Docker `internal` network.
- Only `finance-web` publishes a LAN port (`3100`).
- Session cookies are HttpOnly + `SameSite=Lax`. Keep `COOKIE_SECURE=false` for plain HTTP on the LAN; set `true` only behind TLS.
- `AI_ENABLED=false` by default; finance features do not require a model.
- Transaction notes/amounts are redacted from API logs by default (enforced as routes are added).

### Bootstrap admin

On first API start, if no users exist, the API creates:

- one user from `INITIAL_ADMIN_EMAIL` / `INITIAL_ADMIN_PASSWORD`
- a default household (`Asia/Kolkata` timezone unless overridden)
- an audit event `bootstrap.admin_created`

Change the password after first login in a later milestone (or rotate via DB for now).

## Local development (Mac, without full Compose)

1. Run Postgres yourself (do **not** publish Postgres in the default Compose file used on smaug).

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

Docker volumes are **not** encrypted by this project. On smaug:

```bash
docker compose exec -T db pg_dump -U finance finance | gzip > finance-$(date +%F).sql.gz
gpg --symmetric --cipher-algo AES256 finance-YYYY-MM-DD.sql.gz
```

Store the ciphertext off-box. Restore only onto a trusted machine.

## Limitations (M2)

- Budgets, goals, purchase evaluation, charts, and AI chat are not implemented yet.
- App lock PIN is a browser-session stub (not household-configured).
- CSRF hardening for cookie mutations is planned for a later pass; all writes require an authenticated session cookie.
- CSV import does not parse bank PDFs.

## License / privacy

Designed for private home-server use on a local network (`192.168.1.x`). Do not expose Postgres or unauthenticated admin bootstrap credentials to the public internet.
