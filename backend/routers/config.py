from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from services.agent import agent_get, agent_post

router = APIRouter(prefix="/api/v1/config", tags=["Config"])


class ConfigRawSaveRequest(BaseModel):
    content: str   # raw file text


@router.get(
    "",
    summary="Read pgbackrest.conf",
    description="Returns raw file content + parsed sections + file path.",
)
def get_config():
    try:
        return agent_get("/config")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post(
    "/raw",
    summary="Save raw pgbackrest.conf content",
    description="Backs up existing file with timestamp, then writes new content.",
)
def save_config_raw(req: ConfigRawSaveRequest):
    try:
        return agent_post("/config/raw", req.content.encode(),
                          content_type="text/plain")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
