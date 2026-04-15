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
  GET  /screenshots/...    Serve / download screenshots
  GET  /install            Tampermonkey install page (legacy, still included)
  GET  /analyzer.user.js   Tampermonkey userscript (legacy, still included)
"""

import asyncio
import io
import os
import threading
import zipfile
from pathlib import Path

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, Response, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

load_dotenv()

from analyze import analyze_template, browser_provider_name, open_form_in_browser, steel_enabled  # noqa: E402

# ─── App setup ────────────────────────────────────────────────────────────────

app = FastAPI(title="Webflow Template Analyzer", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).parent
OUTPUT_DIR = BASE_DIR / "output"
STATIC_DIR = BASE_DIR / "static"
EXTENSION_HTML = BASE_DIR.parent / "public" / "index.html"
USERSCRIPT_TEMPLATE = BASE_DIR.parent / "userscript" / "template-analyzer.user.js"
OUTPUT_DIR.mkdir(exist_ok=True)


def visible_browser_enabled() -> bool:
    return os.environ.get("ALLOW_VISIBLE_BROWSER", "true").lower() in {"1", "true", "yes"}


def read_ui_html() -> str:
    if not EXTENSION_HTML.exists():
        raise HTTPException(status_code=404, detail="Analyzer UI not found")
    return EXTENSION_HTML.read_text()


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
async def analyze_endpoint(req: AnalyzeRequest):
    if not os.environ.get("ANTHROPIC_API_KEY"):
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY is not set in .env")
    try:
        result, _ = await asyncio.to_thread(analyze_template, req.url)
        return result
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {exc}")


@app.post("/open-form")
async def open_form_endpoint(req: OpenFormRequest):
    """Launch a visible browser pre-filled with the generated submission details."""
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


@app.get("/screenshots/download")
async def download_screenshots():
    """Return all current screenshots as a ZIP file."""
    files = list(OUTPUT_DIR.glob("*.webp"))
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


@app.get("/screenshots/{filename}")
async def get_screenshot(filename: str):
    filepath = OUTPUT_DIR / filename
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
