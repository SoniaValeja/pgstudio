"""
pgBackRest data service.

Priority order for data source:
  1. Remote agent (PGVAULT_AGENT_URL set) — polls agent HTTP endpoint
  2. Local CLI  (pgbackrest binary available)
  3. Mock data  (dev / demo fallback)
"""

import subprocess
import json
import os
from datetime import datetime, timezone
from typing import Optional

import httpx

AGENT_URL = os.getenv("PGVAULT_AGENT_URL", "").rstrip("/")   # e.g. http://backup-server:9731
PGBACKREST_BIN = os.getenv("PGBACKREST_BIN", "pgbackrest")
PGBACKREST_CONFIG = os.getenv("PGBACKREST_CONFIG", "")


# ── data acquisition ──────────────────────────────────────────────────────────

def _from_agent(stanza: Optional[str] = None) -> list:
    params = {"stanza": stanza} if stanza else {}
    r = httpx.get(f"{AGENT_URL}/info", params=params, timeout=15)
    r.raise_for_status()
    return r.json()["data"]


def _from_local(stanza: Optional[str] = None) -> list:
    cmd = [PGBACKREST_BIN, "--output=json"]
    if PGBACKREST_CONFIG:
        cmd += [f"--config={PGBACKREST_CONFIG}"]
    cmd.append("info")
    if stanza:
        cmd += [f"--stanza={stanza}"]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip())
    return json.loads(result.stdout)


def _mock_data() -> list:
    now = int(datetime.now(timezone.utc).timestamp())
    day = 86400
    return [
        {
            "name": "main-db",
            "status": {"code": 0, "message": "ok"},
            "db": [{"id": 1, "system-id": 7123456789012345678, "version": "15"}],
            "backup": [
                {"label": "20240310-020001F", "type": "full",
                 "info": {"size": 42949672960, "delta": 42949672960,
                          "repository": {"size": 8589934592, "delta": 8589934592}},
                 "timestamp": {"start": now - 7*day, "stop": now - 7*day + 3600}, "error": False},
                {"label": "20240311-020001D", "type": "diff",
                 "info": {"size": 43521654784, "delta": 5368709120,
                          "repository": {"size": 8589934592, "delta": 1073741824}},
                 "timestamp": {"start": now - 6*day, "stop": now - 6*day + 900}, "error": False},
                {"label": "20240312-020001I", "type": "incr",
                 "info": {"size": 44023414784, "delta": 1073741824,
                          "repository": {"size": 8589934592, "delta": 214748364}},
                 "timestamp": {"start": now - 5*day, "stop": now - 5*day + 420}, "error": False},
                {"label": "20240314-020001D", "type": "diff",
                 "info": {"size": 45097156608, "delta": 6442450944,
                          "repository": {"size": 8589934592, "delta": 1288490188}},
                 "timestamp": {"start": now - 3*day, "stop": now - 3*day + 1020}, "error": False},
                {"label": "20240315-020001I", "type": "incr",
                 "info": {"size": 45634023424, "delta": 2147483648,
                          "repository": {"size": 8589934592, "delta": 429496729}},
                 "timestamp": {"start": now - 2*day, "stop": now - 2*day + 660}, "error": False},
                {"label": "20240316-020001I", "type": "incr",
                 "info": {"size": 46170890240, "delta": 2684354560,
                          "repository": {"size": 8589934592, "delta": 536870912}},
                 "timestamp": {"start": now - 1*day, "stop": now - 1*day + 720}, "error": False},
            ],
        },
        {
            "name": "analytics-db",
            "status": {"code": 0, "message": "ok"},
            "db": [{"id": 1, "system-id": 9876543210987654321, "version": "14"}],
            "backup": [
                {"label": "20240310-030001F", "type": "full",
                 "info": {"size": 107374182400, "delta": 107374182400,
                          "repository": {"size": 21474836480, "delta": 21474836480}},
                 "timestamp": {"start": now - 6*day, "stop": now - 6*day + 7200}, "error": False},
                {"label": "20240313-030001D", "type": "diff",
                 "info": {"size": 109521723392, "delta": 10737418240,
                          "repository": {"size": 21474836480, "delta": 2147483648}},
                 "timestamp": {"start": now - 3*day, "stop": now - 3*day + 2400}, "error": False},
                {"label": "20240316-030001I", "type": "incr",
                 "info": {"size": 111669264384, "delta": 3221225472,
                          "repository": {"size": 21474836480, "delta": 644245094}},
                 "timestamp": {"start": now - 1*day, "stop": now - 1*day + 900}, "error": False},
            ],
        },
    ]


def fetch_raw(stanza: Optional[str] = None) -> tuple[list, str]:
    """Return (raw_data, source_label). Never raises — falls back to mock."""
    if AGENT_URL:
        try:
            return _from_agent(stanza), "agent"
        except Exception:
            pass
    try:
        return _from_local(stanza), "local"
    except Exception:
        pass
    return _mock_data(), "mock"


# ── data parsing ──────────────────────────────────────────────────────────────

def _fmt_ts(epoch: int) -> str:
    return datetime.fromtimestamp(epoch, tz=timezone.utc).isoformat()


def parse_summary(raw: list) -> dict:
    stanzas = []
    for s in raw:
        backups = s.get("backup", [])
        last = backups[-1] if backups else None
        timeline = [
            {
                "label": b["label"],
                "type": b["type"],
                "start": _fmt_ts(b["timestamp"]["start"]),
                "stop": _fmt_ts(b["timestamp"]["stop"]),
                "duration_sec": b["timestamp"]["stop"] - b["timestamp"]["start"],
                "db_size_bytes": b["info"]["size"],
                "delta_bytes": b["info"]["delta"],
                "repo_size_bytes": b["info"]["repository"]["size"],
                "repo_delta_bytes": b["info"]["repository"]["delta"],
                "error": b.get("error", False),
            }
            for b in backups
        ]
        stanzas.append({
            "name": s["name"],
            "status": s.get("status", {}),
            "pg_version": s["db"][0]["version"] if s.get("db") else "?",
            "backup_count": len(backups),
            "last_backup_at": _fmt_ts(last["timestamp"]["stop"]) if last else None,
            "last_backup_type": last["type"] if last else None,
            "last_duration_sec": (last["timestamp"]["stop"] - last["timestamp"]["start"]) if last else None,
            "timeline": timeline,
        })
    return {
        "stanza_count": len(stanzas),
        "total_backups": sum(s["backup_count"] for s in stanzas),
        "stanzas": stanzas,
    }
