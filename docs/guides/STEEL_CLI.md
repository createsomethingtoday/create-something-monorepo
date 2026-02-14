# Steel CLI Reference

Command-line interface for the [Steel](https://steel.dev) browser platform. Use it to scaffold projects, run automations, and switch between local and cloud execution.

**Repository:** [steel-dev/cli](https://github.com/steel-dev/cli)

**In this repo:** We use **steel-sdk** programmatically (e.g. `packages/webflow-site-analyzer-mcp`, `packages/halfdozen-zoom-sync`). The CLI is optional for quick runs, forging templates, and local vs cloud settings. Releasing orphaned sessions is done via the [Steel API](https://docs.steel.dev) or curl, not the CLI.

---

## Installation

Requires Node.js 18+.

```bash
npm install -g @steel-dev/cli
steel --version
```

For TypeScript examples: `npm install -g ts-node`.

---

## Quick Start

```bash
# Authenticate (opens browser)
steel login

# Run automation without creating files
steel run playwright
steel run browser-use --task "Navigate to example.com and take a screenshot"

# Scaffold a project
steel forge                    # interactive template picker
steel forge playwright --name my-automation
steel forge browser-use --name ai-agent --openai_key YOUR_KEY
```

---

## Core Commands

| Command | Purpose |
|--------|---------|
| `steel forge [template]` | Scaffold project (playwright, puppeteer, browser-use, selenium, auth, creds, etc.) |
| `steel run [template]` | Execute automation once (no project files) |
| `steel settings` | Switch Cloud vs Local execution |
| `steel login` / `steel logout` | Auth |
| `steel config` | Show current session info |
| `steel browser start` | Start Steel Browser dev server locally |
| `steel cache --clean` | Clear template cache |
| `steel docs` / `steel support` | Docs and Discord |

**Forge options:** `-n, --name`, `-a, --api_url`, `--api_key`, `--openai_key`, `--skip_auth`  
**Run options:** `-t, --task`, `-o, --view` (live viewer), `-a, --api_url`, `--api_key`, `--no-update-check`

---

## Templates (Forge / Run)

- **playwright** / **playwright-py** – Playwright (TS/Python)
- **puppeteer** / **puppeteer-js** – Puppeteer
- **selenium** – Selenium (Python)
- **browser-use** – Browser Use AI agent
- **stagehand** / **magnitude** – AI frameworks (TS)
- **claude-cua** / **oai-cua** – Claude / OpenAI Computer Use
- **auth** – Reusable auth context
- **creds** – Steel Credentials API
- **files** – Steel Files API

---

## Execution Mode

- **Cloud** (default): Steel’s infrastructure; no local browser.
- **Local**: Run on your machine; requires local browser.

```bash
steel settings   # toggle Cloud / Local
```

---

## CI / Env

```bash
export STEEL_API_KEY=your_key
export STEEL_CLI_SKIP_UPDATE_CHECK=true
steel run playwright --skip_auth
```

---

## Releasing Orphaned Sessions (API, not CLI)

If sessions are left open (e.g. after a cancelled run), release them via the API:

```bash
# Single session
curl -s -X POST "https://api.steel.dev/v1/sessions/SESSION_ID/release" \
  -H "Steel-Api-Key: $STEEL_API_KEY"

# Multiple
for id in SESSION_ID_1 SESSION_ID_2; do
  curl -s -X POST "https://api.steel.dev/v1/sessions/$id/release" -H "Steel-Api-Key: $STEEL_API_KEY"
  echo " released $id"
done
```

---

## Links

- [Steel API docs](https://docs.steel.dev/docs/api.md)
- [Steel Sessions](https://docs.steel.dev/docs/sessions.md)
- [Steel Browser (open-source)](https://github.com/steel-dev/steel-browser)
- [Steel Discord](https://discord.gg/steel)
