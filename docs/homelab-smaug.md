# Homelab deploy — smaug

Source of truth for the always-on LAN host: `/Volumes/DevDrive/Repositories/flipkart/localdockersetup.md` (on the Mac).

## Host

| Field | Value |
|--------|--------|
| Hostname | `smaug` |
| LAN IP | `192.168.1.30` |
| SSH | `ssh keeper@192.168.1.30` |
| Role | Docker Compose homelab (Portainer / Dozzle) |

## FinanceGPT on smaug

| Container | Image / build | Host ports | LAN URL |
|-----------|---------------|------------|---------|
| `finance-db` | `postgres:16-alpine` | none | (internal only) |
| `finance-api` | build `apps/api` | none | via web `/v1`, `/health`, `/docs` |
| `finance-web` | build `apps/web` | `3100 → 3000` | http://192.168.1.30:3100 |

Port `3100` is chosen to avoid collisions with Sonarr/Radarr/qBittorrent/Dozzle/Portainer/etc.

Caddy / `finance.local` is **not** used on smaug. Access matches other homelab apps: `http://192.168.1.30:<port>`.

## Deploy from the Mac

```bash
# From the repo root on the Mac
scp -r . keeper@192.168.1.30:~/FinanceGPT/

ssh -t keeper@192.168.1.30 <<'EOF'
cd ~/FinanceGPT
cp -n .env.example .env
# Edit SESSION_SECRET and INITIAL_ADMIN_PASSWORD before first start
docker compose up -d --build
docker compose ps
docker logs -f finance-api
EOF
```

Open on any LAN device (including iPhone): http://192.168.1.30:3100

Watch logs in Dozzle: http://192.168.1.30:8888 (containers `finance-web`, `finance-api`, `finance-db`).

Manage in Portainer: https://192.168.1.30:9443

## Conventions followed

- `container_name` set for Dozzle/Portainer clarity
- `restart: unless-stopped`
- `env_file: .env` (secrets not committed)
- Postgres not published to the host/LAN
- Only the web UI port is LAN-reachable
