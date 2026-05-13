from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import pgbackrest, config, manage

app = FastAPI(
    title="pgStudio API",
    description="""
## pgStudio — PostgreSQL Backup Intelligence

REST API for monitoring and managing pgBackRest backups.

### Data Sources
The API tries each source in order:
1. **Remote agent** — if `PGVAULT_AGENT_URL` env var is set (recommended for remote servers)
2. **Local CLI** — if `pgbackrest` is installed on the same host
3. **Mock data** — automatic fallback for development / demo

### Integration
All endpoints return standard JSON. Integrate with:
- **Grafana** — use the JSON datasource plugin pointing at `/api/v1/pgbackrest/info`
- **PMM** — call endpoints from custom panels
- **Any HTTP client** — curl, Python requests, etc.

### API Docs
Interactive docs available at `/docs` (Swagger) and `/redoc`.
    """,
    version="0.1.0",
    contact={"name": "pgStudio", "url": "https://github.com/your-org/pgstudio"},
    license_info={"name": "MIT"},
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # tighten to specific origins in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(pgbackrest.router)
app.include_router(config.router)
app.include_router(manage.router)


@app.get("/health", tags=["System"], summary="Health check")
def health():
    """Returns API status. Use this for uptime monitoring."""
    return {"status": "ok", "version": "0.1.0"}
