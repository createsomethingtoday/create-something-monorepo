#!/usr/bin/env python3
"""
Webflow Template Analyzer — hosted API with optional extension UI.

Usage
-----
  python3 server.py

Routes
------
  GET  /                   Hosted analyzer UI
  GET  /extension          Extension-facing analyzer UI
  POST /analyze            Run analysis on a template URL
  POST /open-form          Open Webflow submission form pre-filled in a visible browser
  GET  /screenshots/{job_id}/...    Serve / download screenshots for one analysis job
  GET  /install            Tampermonkey install page (legacy, still included)
  GET  /analyzer.user.js   Tampermonkey userscript (legacy, still included)
"""

import asyncio
import hmac
import io
import ipaddress
import json
import os
import re
import secrets
import socket
import threading
import time
import uuid
import zipfile
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, HTMLResponse, Response, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

load_dotenv()

from analyze import analyze_template, browser_provider_name, open_form_in_browser, steel_enabled  # noqa: E402

# ─── App setup ────────────────────────────────────────────────────────────────

app = FastAPI(title="Webflow Template Analyzer", version="2.0.0")

BASE_DIR = Path(__file__).parent
OUTPUT_DIR = BASE_DIR / "output"
STATIC_DIR = BASE_DIR / "static"
EXTENSION_HTML = BASE_DIR.parent / "public" / "index.html"
USERSCRIPT_TEMPLATE = BASE_DIR.parent / "userscript" / "template-analyzer.user.js"
ARTIFACT_METADATA_FILENAME = ".artifacts.json"
DEFAULT_ALLOWED_ORIGIN_PATTERNS = [
    re.compile(r"^https://([a-z0-9-]+\.)*webflow\.com$", re.IGNORECASE),
    re.compile(r"^https://([a-z0-9-]+\.)*webflow\.io$", re.IGNORECASE),
    re.compile(r"^https?://localhost(?::\d+)?$", re.IGNORECASE),
    re.compile(r"^https?://127\.0\.0\.1(?::\d+)?$", re.IGNORECASE),
]
DEFAULT_ANALYZE_RATE_LIMIT = 5
DEFAULT_ANALYZE_RATE_WINDOW_SECONDS = 900
_RATE_LIMIT_LOCK = threading.Lock()
_RATE_LIMIT_STATE: dict[str, list[float]] = {}
OUTPUT_DIR.mkdir(exist_ok=True)


def visible_browser_enabled() -> bool:
    return os.environ.get("ALLOW_VISIBLE_BROWSER", "true").lower() in {"1", "true", "yes"}


def read_ui_html() -> str:
    if not EXTENSION_HTML.exists():
        raise HTTPException(status_code=404, detail="Analyzer UI not found")
    return EXTENSION_HTML.read_text()


def parse_csv(raw: str | None) -> list[str]:
    if not raw:
        return []
    return [value.strip() for value in raw.split(",") if value.strip()]


def parse_int_env(name: str, default: int) -> int:
    raw = os.environ.get(name, "").strip()
    if not raw:
        return default
    try:
        parsed = int(raw)
    except ValueError:
        return default
    return parsed if parsed > 0 else default


def get_request_origin(request: Request) -> str:
    parsed = urlparse(str(request.base_url))
    return f"{parsed.scheme}://{parsed.netloc}"


def normalize_origin(value: str | None) -> str | None:
    if not value:
        return None
    parsed = urlparse(value)
    if not parsed.scheme or not parsed.netloc:
        return None
    return f"{parsed.scheme}://{parsed.netloc}"


def get_source_origin(request: Request) -> str | None:
    origin = normalize_origin(request.headers.get("origin"))
    if origin:
        return origin
    return normalize_origin(request.headers.get("referer"))


def is_local_dev_host(hostname: str | None) -> bool:
    return hostname in {"localhost", "127.0.0.1", "::1", "[::1]"}


def is_allowed_origin(origin: str, request: Request) -> bool:
    parsed = urlparse(origin)
    if not parsed.scheme or not parsed.hostname:
        return False

    if origin == get_request_origin(request):
        return True

    extra_allowed_origins = {
        value
        for value in (
            normalize_origin(entry)
            for entry in parse_csv(os.environ.get("ANALYZER_EXTRA_ALLOWED_ORIGINS"))
        )
        if value
    }
    if origin in extra_allowed_origins:
        return True

    if is_local_dev_host(parsed.hostname):
        return True

    if parsed.scheme != "https":
        return False

    return any(pattern.match(origin) for pattern in DEFAULT_ALLOWED_ORIGIN_PATTERNS)


def get_cors_headers(request: Request, allowed_origin: str | None) -> dict[str, str]:
    requested_headers = request.headers.get("access-control-request-headers")
    headers = {
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": (
            requested_headers
            if requested_headers and requested_headers.strip()
            else "Content-Type, Authorization, X-Analyzer-Token"
        ),
        "Access-Control-Max-Age": "86400",
        "Vary": "Origin",
    }
    if allowed_origin:
        headers["Access-Control-Allow-Origin"] = allowed_origin
    return headers


def get_request_token(request: Request) -> str | None:
    auth_header = request.headers.get("authorization")
    if auth_header and auth_header.lower().startswith("bearer "):
        token = auth_header[7:].strip()
        if token:
            return token

    header_token = request.headers.get("x-analyzer-token")
    if header_token and header_token.strip():
        return header_token.strip()

    query_token = request.query_params.get("token")
    if query_token and query_token.strip():
        return query_token.strip()

    return None


def has_valid_api_token(request: Request) -> bool:
    expected = os.environ.get("ANALYZER_API_TOKEN", "").strip()
    provided = get_request_token(request)
    if not expected or not provided:
        return False
    return hmac.compare_digest(provided, expected)


def require_origin_or_api_token(request: Request) -> None:
    source_origin = get_source_origin(request)
    if source_origin and is_allowed_origin(source_origin, request):
        return
    if has_valid_api_token(request):
        return
    raise HTTPException(
        status_code=403,
        detail="Analyzer requests must come from an allowed origin or include a valid token",
    )


def get_client_ip(request: Request) -> str:
    forwarded_ip = request.headers.get("cf-connecting-ip") or request.headers.get("x-forwarded-for")
    if forwarded_ip:
        return forwarded_ip.split(",")[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


def enforce_analyze_rate_limit(request: Request) -> None:
    client_ip = get_client_ip(request)
    limit = parse_int_env("ANALYZE_RATE_LIMIT", DEFAULT_ANALYZE_RATE_LIMIT)
    window_seconds = parse_int_env(
        "ANALYZE_RATE_WINDOW_SECONDS",
        DEFAULT_ANALYZE_RATE_WINDOW_SECONDS,
    )
    now = time.time()

    with _RATE_LIMIT_LOCK:
        attempts = [
            timestamp
            for timestamp in _RATE_LIMIT_STATE.get(client_ip, [])
            if now - timestamp < window_seconds
        ]
        if len(attempts) >= limit:
            retry_after = max(1, int(window_seconds - (now - attempts[0])))
            raise HTTPException(
                status_code=429,
                detail=f"Too many analysis requests. Try again in {retry_after} seconds.",
            )

        attempts.append(now)
        _RATE_LIMIT_STATE[client_ip] = attempts


def is_public_ip_address(address: str) -> bool:
    try:
        parsed = ipaddress.ip_address(address)
    except ValueError:
        return False
    return parsed.is_global


def validate_target_url(raw_url: str) -> str:
    candidate = raw_url.strip()
    if not candidate:
        raise ValueError("A published Webflow URL is required")

    parsed = urlparse(candidate)
    hostname = parsed.hostname

    if parsed.scheme != "https" or not hostname:
        raise ValueError("URL must be an https:// published Webflow URL")

    if parsed.username or parsed.password:
        raise ValueError("URL credentials are not allowed")

    if parsed.port not in {None, 443}:
        raise ValueError("Custom ports are not allowed")

    try:
        ipaddress.ip_address(hostname)
    except ValueError:
        pass
    else:
        raise ValueError("IP address URLs are not allowed")

    if hostname == "webflow.io" or not hostname.endswith(".webflow.io"):
        raise ValueError("URL must be hosted on a .webflow.io domain")

    try:
        resolved = socket.getaddrinfo(hostname, 443, type=socket.SOCK_STREAM)
    except socket.gaierror as exc:
        raise ValueError(f"Could not resolve {hostname}: {exc}") from exc

    resolved_addresses = {entry[4][0] for entry in resolved}
    if not resolved_addresses:
        raise ValueError("Unable to resolve the published hostname")

    if not all(is_public_ip_address(address) for address in resolved_addresses):
        raise ValueError("URL hostname must resolve only to public IP addresses")

    return parsed._replace(fragment="").geturl()


def get_job_dir(job_id: str) -> Path:
    try:
        uuid.UUID(job_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail="Job not found") from exc
    return OUTPUT_DIR / job_id


def get_job_metadata_path(job_dir: Path) -> Path:
    return job_dir / ARTIFACT_METADATA_FILENAME


def write_job_metadata(job_dir: Path, artifact_token: str, normalized_url: str) -> None:
    metadata = {
        "artifact_token": artifact_token,
        "created_at": int(time.time()),
        "url": normalized_url,
    }
    get_job_metadata_path(job_dir).write_text(json.dumps(metadata, indent=2))


def read_job_metadata(job_dir: Path) -> dict[str, Any]:
    metadata_path = get_job_metadata_path(job_dir)
    if not metadata_path.exists():
        raise HTTPException(status_code=404, detail="Artifact metadata not found")
    return json.loads(metadata_path.read_text())


def require_artifact_access(job_id: str, request: Request) -> Path:
    job_dir = get_job_dir(job_id)
    if not job_dir.exists():
        raise HTTPException(status_code=404, detail="Job not found")

    metadata = read_job_metadata(job_dir)
    provided_token = get_request_token(request)
    expected_token = str(metadata.get("artifact_token", ""))
    if not provided_token or not expected_token or not hmac.compare_digest(provided_token, expected_token):
        raise HTTPException(status_code=403, detail="Invalid artifact token")

    return job_dir


def sanitize_screenshot_manifest(screenshots: dict[str, Any]) -> dict[str, Any]:
    gallery = screenshots.get("gallery", [])
    return {
        "primary": Path(str(screenshots.get("primary", ""))).name if screenshots.get("primary") else "",
        "secondary": Path(str(screenshots.get("secondary", ""))).name if screenshots.get("secondary") else "",
        "gallery": [Path(str(path)).name for path in gallery if path],
    }


@app.middleware("http")
async def apply_cors(request: Request, call_next):
    source_origin = get_source_origin(request)
    allowed_origin = source_origin if source_origin and is_allowed_origin(source_origin, request) else None

    if request.method == "OPTIONS":
        if source_origin and not allowed_origin:
            return Response(status_code=403, content="Origin not allowed")
        return Response(status_code=204, headers=get_cors_headers(request, allowed_origin))

    response = await call_next(request)
    for header_name, header_value in get_cors_headers(request, allowed_origin).items():
        response.headers[header_name] = header_value
    return response


# ─── Models ───────────────────────────────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    url: str


class OpenFormRequest(BaseModel):
    url: str
    result: dict


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "key_set": bool(os.environ.get("ANTHROPIC_API_KEY")),
        "steel_key_set": steel_enabled(),
        "browser_provider": browser_provider_name(),
        "visible_browser": visible_browser_enabled(),
    }


@app.get("/", response_class=HTMLResponse)
async def serve_root():
    """Serve the hosted analyzer UI."""
    return HTMLResponse(read_ui_html())


@app.get("/extension", response_class=HTMLResponse)
async def serve_extension():
    """Serve the extension-facing analyzer UI."""
    return HTMLResponse(read_ui_html())


@app.get("/template-autofill.js")
async def serve_autofill_script():
    """Serve the form autofill script for embedding on the submission page."""
    script_path = BASE_DIR.parent / "public" / "template-autofill.js"
    if not script_path.exists():
        raise HTTPException(status_code=404, detail="Autofill script not found")
    return Response(
        content=script_path.read_text(),
        media_type="application/javascript",
        headers={"Cache-Control": "public, max-age=0, must-revalidate"},
    )


@app.post("/analyze")
async def analyze_endpoint(req: AnalyzeRequest, request: Request):
    if not os.environ.get("ANTHROPIC_API_KEY"):
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY is not set in .env")

    require_origin_or_api_token(request)
    normalized_url = validate_target_url(req.url)
    enforce_analyze_rate_limit(request)

    job_id = str(uuid.uuid4())
    job_dir = get_job_dir(job_id)
    job_dir.mkdir(parents=True, exist_ok=False)
    artifact_token = secrets.token_urlsafe(24)
    write_job_metadata(job_dir, artifact_token, normalized_url)

    try:
        result, _ = await asyncio.to_thread(
            analyze_template,
            normalized_url,
            output_dir=job_dir,
        )
        return {
            **result,
            "job_id": job_id,
            "artifact_token": artifact_token,
            "screenshots": sanitize_screenshot_manifest(result.get("screenshots", {})),
        }
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {exc}")


@app.post("/open-form")
async def open_form_endpoint(req: OpenFormRequest, request: Request):
    """Launch a visible browser pre-filled with the generated submission details."""
    require_origin_or_api_token(request)

    if not visible_browser_enabled():
        raise HTTPException(
            status_code=501,
            detail="Open submission form is available only when the analyzer runs locally.",
        )
    threading.Thread(
        target=open_form_in_browser,
        args=(req.result, req.url),
        daemon=True,
    ).start()
    return {"status": "opening"}


@app.get("/screenshots/{job_id}/download")
async def download_screenshots(job_id: str, request: Request):
    """Return screenshots for a single analysis job as a ZIP file."""
    job_dir = require_artifact_access(job_id, request)
    files = sorted(job_dir.glob("*.webp"))
    if not files:
        raise HTTPException(status_code=404, detail="No screenshots found")
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for f in files:
            zf.write(f, f.name)
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={"Content-Disposition": "attachment; filename=template-screenshots.zip"},
    )


@app.get("/screenshots/{job_id}/{filename}")
async def get_screenshot(job_id: str, filename: str, request: Request):
    job_dir = require_artifact_access(job_id, request)
    filepath = (job_dir / Path(filename).name).resolve()
    if job_dir.resolve() not in filepath.parents:
        raise HTTPException(status_code=404, detail="Screenshot not found")
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Screenshot not found")
    return FileResponse(filepath, media_type="image/webp")


@app.get("/install")
async def install_page(request: Request):
    base = str(request.base_url).rstrip("/")
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Install — Webflow Template Analyzer</title>
  <style>
    *{{box-sizing:border-box;margin:0;padding:0}}
    body{{font:14px/1.6 system-ui,sans-serif;background:#f4f5f7;color:#111;
          display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px}}
    .card{{background:#fff;border-radius:14px;border:1px solid #e5e7eb;
           padding:40px;max-width:480px;width:100%}}
    .logo{{width:40px;height:40px;background:linear-gradient(135deg,#146EF5,#6B2EFF);
           border-radius:10px;display:flex;align-items:center;justify-content:center;margin-bottom:20px}}
    .logo svg{{color:#fff}}
    h1{{font-size:20px;font-weight:700;letter-spacing:-.02em;margin-bottom:8px}}
    p{{color:#6b7280;margin-bottom:24px;font-size:13px}}
    .step{{display:flex;gap:14px;margin-bottom:20px;align-items:flex-start}}
    .num{{width:26px;height:26px;background:#146EF5;color:#fff;border-radius:50%;
          display:flex;align-items:center;justify-content:center;
          font:600 12px system-ui;flex-shrink:0;margin-top:1px}}
    .step-body h3{{font-size:13px;font-weight:600;margin-bottom:3px}}
    .step-body p{{color:#6b7280;font-size:12px;margin:0}}
    .btn{{display:inline-flex;align-items:center;gap:6px;
          padding:10px 18px;background:#146EF5;color:#fff;
          border-radius:8px;font:600 13px system-ui;text-decoration:none;
          transition:background .15s;margin-top:4px;border:none;cursor:pointer}}
    .btn:hover{{background:#0f5fd4}}
    .btn.outline{{background:#fff;color:#374151;border:1.5px solid #e5e7eb}}
    .btn.outline:hover{{border-color:#9ca3af}}
    hr{{border:none;border-top:1px solid #f0f0f0;margin:24px 0}}
    code{{font-family:monospace;font-size:12px;background:#f3f4f6;
          padding:2px 6px;border-radius:4px;color:#374151}}
  </style>
</head>
<body>
<div class="card">
  <div class="logo">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  </div>
  <h1>Webflow Template Analyzer</h1>
  <p>Auto-fill your marketplace submission details in one click.<br>
     Works directly on the Webflow submission form.</p>

  <div class="step">
    <div class="num">1</div>
    <div class="step-body">
      <h3>Install Tampermonkey</h3>
      <p>A free browser add-on. No account required.</p>
      <a class="btn outline" href="https://www.tampermonkey.net" target="_blank" style="margin-top:8px">
        Get Tampermonkey →
      </a>
    </div>
  </div>

  <div class="step">
    <div class="num">2</div>
    <div class="step-body">
      <h3>Install the analyzer script</h3>
      <p>Tampermonkey will open and ask you to confirm. Click Install.</p>
      <a class="btn" href="/analyzer.user.js" style="margin-top:8px">
        Install Script →
      </a>
    </div>
  </div>

  <div class="step">
    <div class="num">3</div>
    <div class="step-body">
      <h3>Go to the submission form</h3>
      <p>Fill in your name, email, template name, published URL, preview URL and pricing.
         Then click <strong>Generate remaining fields</strong> in the bottom-right corner.</p>
    </div>
  </div>

  <hr>
  <p style="font-size:12px;color:#9ca3af">
    The script connects to <code>{base}</code> to analyze your template.
    Screenshots are generated automatically at the correct dimensions.
  </p>
</div>
</body>
</html>"""
    return HTMLResponse(html)


@app.get("/analyzer.user.js")
async def serve_userscript(request: Request):
    """Serve the userscript with the backend URL injected."""
    if not USERSCRIPT_TEMPLATE.exists():
        raise HTTPException(status_code=404, detail="Userscript not found")
    base = str(request.base_url).rstrip("/")
    script = USERSCRIPT_TEMPLATE.read_text()
    script = script.replace("__BACKEND_URL__", base)
    return Response(content=script, media_type="application/javascript")


# Serve the frontend (must be last so API routes take priority)
if STATIC_DIR.exists():
    app.mount("/", StaticFiles(directory=str(STATIC_DIR), html=True), name="static")


# ─── Entry point ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 7860))
    print(f"\n  Webflow Template Analyzer (Designer Extension Edition)")
    print(f"  ─────────────────────────────────────────────────────")
    print(f"  Running at    http://localhost:{port}")
    print(f"  Extension UI  http://localhost:{port}/extension")
    print(f"  Install page  http://localhost:{port}/install\n")
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="warning")
