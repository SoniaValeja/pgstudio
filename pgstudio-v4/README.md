# pgStudio

PostgreSQL Backup Intelligence — a GUI and REST API for monitoring and managing pgBackRest backups.

> PoC — currently supports pgBackRest. Designed to be extensible to other tools (Barman, pg_dump, etc.)

---

## What it does

- **Dashboard** — visual overview of all stanzas, backup history, repo sizes, health status
- **Charts** — per-stanza backup history (full / diff / incr) and DB size growth forecast
- **REST API** — standard HTTP endpoints any tool (Grafana, PMM, scripts) can call
- **Remote support** — works even when pgBackRest runs on a different server (via agent)
- **Demo mode** — automatically shows mock data if no pgBackRest is found

---

## Architecture

```
Browser  ──►  React UI  ──►  FastAPI backend  ──►  pgStudio Agent (remote server)
                                              └──►  pgbackrest CLI (local)
                                              └──►  Mock data (fallback)
```

---

## Quick Start

### Prerequisites (on the pgStudio server)
- Docker
- Docker Compose v2

```bash
# 1. Clone / copy the project
cd pgstudio

# 2. Set up environment
cp .env.example .env
# Edit .env — see the two options below

# 3. Start everything
docker compose up --build -d

# 4. Open the UI
# http://your-server:3000

# 5. Browse the API docs
# http://your-server:8000/docs
```

---

## Connecting to pgBackRest

### Option A — pgBackRest on a DIFFERENT server (recommended)

Run the agent on the backup server (zero dependencies — just Python 3):

```bash
# On the backup server
python3 pgstudio-agent.py --port 9731 --bind 0.0.0.0
```

Then in your `.env` on the pgStudio server:

```
PGVAULT_AGENT_URL=http://backup-server-ip:9731
```

Restart: `docker compose restart backend`

### Option B — pgBackRest on the SAME server

Leave `PGVAULT_AGENT_URL` blank. In `docker-compose.yml`, uncomment:

```yaml
environment:
  PGBACKREST_BIN: pgbackrest
volumes:
  - /etc/pgbackrest:/etc/pgbackrest:ro
```

---

## REST API

The backend exposes a versioned REST API at `http://your-server:8000`.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/pgbackrest/info` | Full dashboard data (all stanzas) |
| GET | `/api/v1/pgbackrest/info?stanza=main-db` | Single stanza data |
| GET | `/api/v1/pgbackrest/stanzas` | List stanza names |
| GET | `/api/v1/pgbackrest/stanzas/{name}` | Single stanza detail |
| GET | `/api/v1/pgbackrest/raw` | Raw pgbackrest JSON output |
| GET | `/health` | API health check |

Interactive docs (auto-generated): `http://your-server:8000/docs`

### Example — call from Grafana or any script

```bash
curl http://your-server:8000/api/v1/pgbackrest/info | jq .
```

---

## Project Structure

```
pgstudio/
├── agent/
│   └── pgstudio-agent.py      # Deploy this on the backup server
├── backend/
│   ├── main.py               # FastAPI app
│   ├── routers/
│   │   └── pgbackrest.py     # REST endpoints
│   ├── services/
│   │   └── pgbackrest.py     # Data fetching + parsing logic
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── pages/Dashboard.jsx
│   │   ├── components/       # StatCard, StanzaCard, charts, Sidebar
│   │   └── api/              # HTTP calls to backend
│   ├── Dockerfile
│   └── nginx.conf
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Tech Stack (all MIT / Apache licensed — free forever)

| Component | Technology | License |
|-----------|-----------|---------|
| Agent | Python stdlib only | — |
| Backend | FastAPI + Uvicorn | MIT |
| Frontend | React + Vite | MIT |
| Styling | Tailwind CSS | MIT |
| Charts | Recharts | MIT |
| Container | Docker Compose | Apache 2.0 |

---

## Stopping

```bash
docker compose down
```
