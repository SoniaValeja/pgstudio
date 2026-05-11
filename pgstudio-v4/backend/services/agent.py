"""Shared helper — talk to the pgStudio agent."""
import os
import httpx

AGENT_URL = os.getenv("PGVAULT_AGENT_URL", "").rstrip("/")
TIMEOUT   = 30


def agent_get(path: str, params: dict = None) -> dict:
    if not AGENT_URL:
        raise RuntimeError("PGVAULT_AGENT_URL is not set")
    r = httpx.get(f"{AGENT_URL}{path}", params=params, timeout=TIMEOUT)
    r.raise_for_status()
    return r.json()


def agent_post(path: str, body=None, content_type: str = "application/json") -> dict:
    if not AGENT_URL:
        raise RuntimeError("PGVAULT_AGENT_URL is not set")
    if content_type == "text/plain":
        r = httpx.post(f"{AGENT_URL}{path}",
                       content=body,
                       headers={"Content-Type": "text/plain"},
                       timeout=TIMEOUT)
    else:
        r = httpx.post(f"{AGENT_URL}{path}", json=body or {}, timeout=TIMEOUT)
    r.raise_for_status()
    return r.json()
