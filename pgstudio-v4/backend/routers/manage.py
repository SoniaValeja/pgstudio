from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from services.agent import agent_get, agent_post

router = APIRouter(prefix="/api/v1/manage", tags=["Management"])


# ── request models ────────────────────────────────────────────────────────────

class BackupRequest(BaseModel):
    stanza: str
    type: str = "full"   # full | diff | incr


class StanzaRequest(BaseModel):
    stanza: str
    force: Optional[bool] = False


class VerifyRequest(BaseModel):
    stanza: str


# ── backup triggers ───────────────────────────────────────────────────────────

@router.post(
    "/backup",
    summary="Trigger a backup",
    description="Starts a backup job on the agent. Returns a job_id to poll for status.",
)
def trigger_backup(req: BackupRequest):
    try:
        return agent_post("/backup", {"stanza": req.stanza, "type": req.type})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/jobs",
    summary="List all background jobs",
    description="Returns recent backup, verify, and stanza jobs with status and log.",
)
def list_jobs():
    try:
        return agent_get("/jobs")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/jobs/{job_id}",
    summary="Get job status and logs",
)
def get_job(job_id: str):
    try:
        return agent_get(f"/jobs/{job_id}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── stanza management ─────────────────────────────────────────────────────────

@router.post(
    "/stanza/create",
    summary="Create (initialise) a stanza",
    description="Runs pgbackrest stanza-create. The stanza must already be in pgbackrest.conf.",
)
def create_stanza(req: StanzaRequest):
    try:
        return agent_post("/stanza/create", {"stanza": req.stanza})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post(
    "/stanza/delete",
    summary="Delete a stanza",
    description="Runs pgbackrest stanza-delete. Set force=true to bypass confirmation.",
)
def delete_stanza(req: StanzaRequest):
    try:
        return agent_post("/stanza/delete", {"stanza": req.stanza, "force": req.force})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── verify ────────────────────────────────────────────────────────────────────

@router.post(
    "/verify",
    summary="Verify backup integrity",
    description="Runs pgbackrest verify for a stanza. Returns a job_id to poll for results.",
)
def verify_backup(req: VerifyRequest):
    try:
        return agent_post("/verify", {"stanza": req.stanza})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── browse ────────────────────────────────────────────────────────────────────

@router.get(
    "/browse",
    summary="Browse backups for a stanza",
    description="Returns detailed backup list including WAL archive info.",
)
def browse_backups(stanza: Optional[str] = None):
    try:
        return agent_get("/browse", params={"stanza": stanza} if stanza else {})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
