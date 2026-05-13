#!/usr/bin/env python3
"""
pgStudio Agent v0.3.0 — runs on the pgBackRest server.
Zero external dependencies — Python stdlib only.

Usage:
    PGBACKREST_CONFIG=/path/to/pgbackrest.conf python3 pgstudio-agent.py

Endpoints:
    GET  /health           health check
    GET  /info             pgbackrest backup info (query: stanza=name)
    GET  /stanzas          list stanza names
    GET  /config           read pgbackrest.conf as raw text + parsed sections
    POST /config/raw       write raw text to pgbackrest.conf (backs up first)
    POST /backup           trigger backup  (body: {"stanza":"main","type":"full"})
    GET  /jobs             list recent jobs
    GET  /jobs/<id>        job status + log tail
    POST /stanza/create    init a stanza   (body: {"stanza":"main"})
    POST /stanza/delete    delete a stanza (body: {"stanza":"main","force":false})
    GET  /browse           list backups    (query: stanza=main)
    POST /verify           run verify      (body: {"stanza":"main"})
"""

import argparse, configparser, io, json, os, shutil, subprocess, sys
import threading, uuid
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, parse_qs

VERSION           = "0.3.0"
DEFAULT_PORT      = 9731
PGBACKREST_BIN    = os.environ.get("PGSTUDIO_BIN", os.environ.get("PGBACKREST_BIN", "pgbackrest"))
PGBACKREST_CONFIG = os.environ.get("PGBACKREST_CONFIG", "")

_jobs: dict = {}
_jobs_lock  = threading.Lock()

def _now(): return datetime.now(timezone.utc).isoformat()

def _pgcmd(*args):
    cmd = [PGBACKREST_BIN]
    if PGBACKREST_CONFIG: cmd += [f"--config={PGBACKREST_CONFIG}"]
    return cmd + list(args)

def pgb_info(stanza=None):
    cmd = _pgcmd("--output=json", "info")
    if stanza: cmd += [f"--stanza={stanza}"]
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    if r.returncode != 0: raise RuntimeError(r.stderr.strip())
    combined = (r.stdout + r.stderr).strip()
    start = combined.find("[")
    if start == -1: raise RuntimeError(f"No JSON in output: {combined[:300]}")
    return json.loads(combined[start:])

def get_mock_data():
    now, day = int(datetime.now(timezone.utc).timestamp()), 86400
    return [{"name":"main-db","status":{"code":0,"message":"ok"},
             "db":[{"id":1,"system-id":7123456789012345678,"version":"15"}],
             "backup":[
                 {"label":"20240310-020001F","type":"full",
                  "info":{"size":42949672960,"delta":42949672960,"repository":{"size":8589934592,"delta":8589934592}},
                  "timestamp":{"start":now-7*day,"stop":now-7*day+3600},"error":False},
                 {"label":"20240313-020001D","type":"diff",
                  "info":{"size":43521654784,"delta":5368709120,"repository":{"size":8589934592,"delta":1073741824}},
                  "timestamp":{"start":now-4*day,"stop":now-4*day+900},"error":False},
                 {"label":"20240316-020001I","type":"incr",
                  "info":{"size":44023414784,"delta":1073741824,"repository":{"size":8589934592,"delta":214748364}},
                  "timestamp":{"start":now-1*day,"stop":now-1*day+420},"error":False},
             ]}]

def read_config_raw():
    """Return raw file content as string."""
    if not PGBACKREST_CONFIG or not os.path.exists(PGBACKREST_CONFIG):
        return None, f"Config file not found: {PGBACKREST_CONFIG}"
    with open(PGBACKREST_CONFIG) as f:
        return f.read(), None

def read_config_parsed():
    """Return parsed sections dict."""
    raw, err = read_config_raw()
    if err: return {"error": err}
    cp = configparser.RawConfigParser()
    cp.read(PGBACKREST_CONFIG)
    result = {}
    if cp.defaults(): result["global"] = dict(cp.defaults())
    for sec in cp.sections(): result[sec] = dict(cp.items(sec))
    return result

def backup_and_write_config(new_content: str) -> str:
    """Back up existing config with timestamp, write new content. Returns backup filename."""
    if not PGBACKREST_CONFIG:
        raise RuntimeError("PGBACKREST_CONFIG not set")
    config_dir  = os.path.dirname(PGBACKREST_CONFIG)
    config_base = os.path.splitext(os.path.basename(PGBACKREST_CONFIG))[0]
    ts          = datetime.now().strftime("%Y%m%d%H%M")
    backup_name = f"{config_base}_{ts}.conf"
    backup_path = os.path.join(config_dir, backup_name)
    # backup existing file
    if os.path.exists(PGBACKREST_CONFIG):
        shutil.copy2(PGBACKREST_CONFIG, backup_path)
    # write new content
    with open(PGBACKREST_CONFIG, "w") as f:
        f.write(new_content)
    return backup_name

def _run_job(job_id, cmd):
    with _jobs_lock: _jobs[job_id].update({"status":"running","started_at":_now()})
    log_lines = []
    try:
        proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
        for line in proc.stdout:
            log_lines.append(line.rstrip())
            with _jobs_lock: _jobs[job_id]["log"] = log_lines[-200:]
        proc.wait()
        rc = proc.returncode
        with _jobs_lock:
            _jobs[job_id].update({"status":"success" if rc==0 else "failed",
                                   "returncode":rc,"finished_at":_now(),"log":log_lines[-200:]})
    except Exception as e:
        with _jobs_lock: _jobs[job_id].update({"status":"failed","error":str(e),"finished_at":_now()})

def start_job(label, cmd):
    job_id = str(uuid.uuid4())[:8]
    with _jobs_lock:
        _jobs[job_id] = {"id":job_id,"label":label,"status":"queued","cmd":" ".join(cmd),
                          "log":[],"created_at":_now(),"started_at":None,"finished_at":None}
    threading.Thread(target=_run_job, args=(job_id, cmd), daemon=True).start()
    return job_id

class AgentHandler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args): print(f"[{_now()}] {fmt%args}", flush=True)

    def _send(self, status, data):
        body = json.dumps(data, indent=2).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("X-pgStudio-Agent", VERSION)
        self.end_headers()
        self.wfile.write(body)

    def _body(self):
        n = int(self.headers.get("Content-Length", 0))
        return json.loads(self.rfile.read(n)) if n else {}

    def _body_text(self):
        n = int(self.headers.get("Content-Length", 0))
        return self.rfile.read(n).decode() if n else ""

    def do_GET(self):
        parsed = urlparse(self.path)
        qs, path = parse_qs(parsed.query), parsed.path.rstrip("/")

        if path == "/health":
            self._send(200, {"status":"ok","version":VERSION,"agent":"pgstudio-agent","ts":_now()})

        elif path == "/info":
            stanza = qs.get("stanza",[None])[0]
            try: self._send(200, {"source":"pgbackrest","data":pgb_info(stanza)})
            except FileNotFoundError: self._send(200, {"source":"mock","data":get_mock_data()})
            except RuntimeError as e: self._send(500, {"error":str(e)})

        elif path == "/stanzas":
            try: raw = pgb_info()
            except Exception: raw = get_mock_data()
            self._send(200, [s["name"] for s in raw])

        elif path == "/config":
            raw, err = read_config_raw()
            if err:
                self._send(500, {"error": err})
            else:
                parsed_sections = read_config_parsed()
                self._send(200, {
                    "raw": raw,
                    "sections": parsed_sections,
                    "path": PGBACKREST_CONFIG,
                })

        elif path == "/jobs":
            with _jobs_lock: jobs = sorted(_jobs.values(), key=lambda j: j["created_at"], reverse=True)
            self._send(200, jobs[:50])

        elif path.startswith("/jobs/"):
            job_id = path.split("/jobs/",1)[1]
            with _jobs_lock: job = _jobs.get(job_id)
            self._send(200 if job else 404, job or {"error":f"Job {job_id!r} not found"})

        elif path == "/browse":
            stanza = qs.get("stanza",[None])[0]
            try: self._send(200, {"source":"pgbackrest","data":pgb_info(stanza)})
            except Exception as e: self._send(500, {"error":str(e)})

        else:
            self._send(404, {"error":"not found"})

    def do_POST(self):
        path = urlparse(self.path).path.rstrip("/")

        # POST /config/raw — write raw text, backup first
        if path == "/config/raw":
            new_content = self._body_text()
            if not new_content.strip():
                return self._send(400, {"error": "empty content"})
            try:
                backup_name = backup_and_write_config(new_content)
                self._send(200, {"ok": True, "message": "Config saved", "backup": backup_name})
            except Exception as e:
                self._send(500, {"error": str(e)})

        # POST /config — legacy JSON sections write (kept for compatibility)
        elif path == "/config":
            body = self._body()
            try:
                sections = body.get("sections", body)
                cp = configparser.RawConfigParser()
                for sec, values in sections.items():
                    if sec == "global":
                        for k, v in values.items(): cp.defaults()[k] = v
                    else:
                        cp.add_section(sec)
                        for k, v in values.items(): cp.set(sec, k, v)
                buf = io.StringIO()
                cp.write(buf)
                backup_name = backup_and_write_config(buf.getvalue())
                self._send(200, {"ok": True, "message": "Config saved", "backup": backup_name})
            except Exception as e:
                self._send(500, {"error": str(e)})

        elif path == "/backup":
            body = self._body()
            stanza, btype = body.get("stanza"), body.get("type","full")
            if not stanza: return self._send(400, {"error":"stanza required"})
            if btype not in ("full","diff","incr"): return self._send(400, {"error":"type must be full/diff/incr"})
            job_id = start_job(f"{btype} backup · {stanza}",
                               _pgcmd("--log-level-console=info", f"--stanza={stanza}", f"--type={btype}", "backup"))
            self._send(202, {"job_id":job_id,"message":"Backup job started"})

        elif path == "/stanza/create":
            body = self._body()
            stanza = body.get("stanza")
            if not stanza: return self._send(400, {"error":"stanza required"})
            job_id = start_job(f"stanza-create · {stanza}", _pgcmd(f"--stanza={stanza}", "stanza-create"))
            self._send(202, {"job_id":job_id,"message":"stanza-create job started"})

        elif path == "/stanza/delete":
            body = self._body()
            stanza = body.get("stanza")
            if not stanza: return self._send(400, {"error":"stanza required"})
            cmd = _pgcmd(f"--stanza={stanza}", "stanza-delete")
            if body.get("force"): cmd += ["--force"]
            job_id = start_job(f"stanza-delete · {stanza}", cmd)
            self._send(202, {"job_id":job_id,"message":"stanza-delete job started"})

        elif path == "/verify":
            body = self._body()
            stanza = body.get("stanza")
            if not stanza: return self._send(400, {"error":"stanza required"})
            job_id = start_job(f"verify · {stanza}", _pgcmd(f"--stanza={stanza}", "verify"))
            self._send(202, {"job_id":job_id,"message":"Verify job started"})

        else:
            self._send(404, {"error":"not found"})

def main():
    parser = argparse.ArgumentParser(description="pgStudio Agent")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT)
    parser.add_argument("--bind", default="0.0.0.0")
    args = parser.parse_args()
    server = HTTPServer((args.bind, args.port), AgentHandler)
    print(f"pgStudio Agent v{VERSION} — listening on {args.bind}:{args.port}", flush=True)
    if PGBACKREST_CONFIG: print(f"  Config : {PGBACKREST_CONFIG}", flush=True)
    print(f"  Binary : {PGBACKREST_BIN}", flush=True)
    try: server.serve_forever()
    except KeyboardInterrupt: print("\nShutting down."); sys.exit(0)

if __name__ == "__main__":
    main()
