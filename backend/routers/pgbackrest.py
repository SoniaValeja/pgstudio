from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from services.pgbackrest import fetch_raw, parse_summary

router = APIRouter(prefix="/api/v1/pgbackrest", tags=["pgBackRest"])


@router.get(
    "/info",
    summary="Backup dashboard data",
    description="Returns parsed backup summary for all stanzas or a specific one. "
                "Suitable for direct consumption by Grafana, PMM, or any HTTP client.",
)
def backup_info(stanza: Optional[str] = Query(default=None, description="Filter by stanza name")):
    raw, source = fetch_raw(stanza)
    result = parse_summary(raw)
    result["_source"] = source   # tells caller where data came from
    return result


@router.get(
    "/stanzas",
    summary="List stanza names",
    description="Returns a flat list of all configured pgBackRest stanza names.",
)
def list_stanzas():
    raw, _ = fetch_raw()
    return [s["name"] for s in raw]


@router.get(
    "/stanzas/{stanza_name}",
    summary="Single stanza detail",
    description="Returns full backup timeline and metadata for one stanza.",
)
def stanza_detail(stanza_name: str):
    raw, source = fetch_raw(stanza_name)
    result = parse_summary(raw)
    matches = [s for s in result["stanzas"] if s["name"] == stanza_name]
    if not matches:
        raise HTTPException(status_code=404, detail=f"Stanza '{stanza_name}' not found")
    return {**matches[0], "_source": source}


@router.get(
    "/raw",
    summary="Raw pgBackRest JSON",
    description="Returns the unmodified output of `pgbackrest info --output=json`. "
                "Useful for debugging or building custom integrations.",
)
def raw_info(stanza: Optional[str] = Query(default=None)):
    raw, source = fetch_raw(stanza)
    return {"_source": source, "data": raw}
