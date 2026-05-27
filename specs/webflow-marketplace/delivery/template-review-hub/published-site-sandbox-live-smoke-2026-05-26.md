# Published Site Sandbox Live Smoke - 2026-05-26

**Status:** Completed with partial evidence
**Lane:** `published_site_validation`
**Agent:** `eric-hub`
**Sandbox path:** Dify builtin E2B `run_code`
**URL:** `https://example.com/`

## Goal

Verify that the generated published-site sandbox runner can execute through the live Dify/E2B path, return an evidence artifact, and normalize into review-ledger-ready findings without writing Airtable, D1, reviewer feedback, approvals, or rejections.

## Commands

Prepare the runner:

```bash
pnpm --filter @create-something/webflow-template-review-mcp published-site:sandbox:prepare -- \
  --url https://example.com \
  --out /tmp/webflow-template-review-live-e2b-example-v3 \
  --run-id live-e2b-example-v3 \
  --policy-snapshot-id policy.live-smoke \
  --max-pages 1 \
  --viewports desktop:1024x768
```

Run through Dify/E2B using `scripts/dify-agent-smoke.ts` with a file-backed prompt, `run_code` required, Hub tools forbidden, and tool observations captured to a local artifact.

Normalize the returned artifact:

```bash
pnpm --filter @create-something/webflow-template-review-mcp published-site:sandbox:normalize -- \
  --input /tmp/webflow-template-review-live-e2b-example-v3/published-site-sandbox-output.from-dify.json \
  --out /tmp/webflow-template-review-live-e2b-example-v3/normalized \
  --asset-id rec_live_smoke_asset \
  --version-id rec_live_smoke_version \
  --policy-snapshot-id policy.live-smoke
```

## Result

The live Dify request succeeded:

- Dify HTTP status: `200`
- smoke result: `ok=true`
- tools used: `run_code`, `run_code`
- message ID: `8d47ad89-1b5b-4b4a-bd85-7c501bef51e5`
- conversation ID: `15f1465d-7edf-45e1-b75f-6639bc545fb8`
- duration: `39822ms`
- total tokens: `24078`
- reported Dify usage price: `0.20523 USD`

The sandbox artifact returned:

```json
{
  "schema_version": "published_site_sandbox_output.v0.1",
  "run_id": "live-e2b-example-v3",
  "status": "partial",
  "source_url": "https://example.com/",
  "static_pages": 1,
  "rendered_status": "skipped",
  "render_error": "No module named 'playwright'"
}
```

The normalizer produced:

```json
{
  "schema_version": "published_site_sandbox_normalized.v0.1",
  "run_id": "live-e2b-example-v3",
  "evidence_status": "partial",
  "escalation_required": true,
  "finding_count": 1
}
```

Finding:

```json
{
  "rule_id": "sandbox.render.unavailable",
  "status": "partial",
  "severity": "info",
  "rejectability": "not_rejectable_partial_evidence"
}
```

## Interpretation

This is the correct safe behavior. The Dify/E2B execution path works and static evidence was returned, but the current Dify E2B Python image does not include Playwright. Because rendered/browser evidence was unavailable, the lane normalized to `partial` and requires escalation instead of producing a rejectable finding.

## Follow-Up

For screenshot and rendered layout evidence, use one of these paths:

- configure the Dify E2B image/provider with Playwright available
- allow the generated bootstrap command in a browser-capable sandbox run
- use the direct coordinator-side E2B adapter with `E2B_API_KEY` or `DIFY_E2B_API_KEY`, while still keeping secrets out of the sandbox runner

## Direct E2B Adapter Check

The package now includes:

```bash
pnpm --filter @create-something/webflow-template-review-mcp published-site:sandbox:e2b-run -- --help
```

The adapter can create an E2B sandbox from the coordinator process, execute the generated runner, download output artifacts, optionally run the normalizer, and kill the sandbox.

Preflight command:

```bash
pnpm --filter @create-something/webflow-template-review-mcp published-site:sandbox:e2b-preflight
```

The preflight writes `published-site-sandbox-e2b-preflight.json` with secret presence/missing status only. It does not print or persist secret values.

Initial live direct-E2B smoke was blocked because the current Infisical prod root path did not inject or return a non-empty `E2B_API_KEY` or `DIFY_E2B_API_KEY` into the child process. The command failed before contacting E2B with:

```text
Missing E2B_API_KEY or DIFY_E2B_API_KEY.
```

Observed safe checks:

- `infisical run --env=prod --path=/ --include-imports=true` injected `OPENAI_API_KEY` and `AIRTABLE_API_KEY`
- the same command did not inject `E2B_API_KEY` or `DIFY_E2B_API_KEY`
- `infisical secrets get E2B_API_KEY --env=prod --path=/ --plain` returned an empty value in this context
- `infisical secrets get DIFY_E2B_API_KEY --env=prod --path=/ --plain` returned an empty value in this context

No E2B secret value was printed or written to artifacts. The remaining unblocker for direct E2B smoke is a non-empty E2B key exposed to the coordinator process.

After adding `E2B_API_KEY` to the Infisical prod root path, preflight succeeded:

```json
{
  "ok": true,
  "selected_secret": "E2B_API_KEY",
  "env": {
    "E2B_API_KEY": "present",
    "DIFY_E2B_API_KEY": "missing"
  }
}
```

The first direct E2B run without browser bootstrap completed static evidence and normalized to partial evidence:

- output: `/tmp/webflow-template-review-direct-e2b-example-after-key-run/published-site-sandbox-output.json`
- normalized: `/tmp/webflow-template-review-direct-e2b-example-after-key-run/normalized/published-site-sandbox-normalized.json`
- status: `partial`
- finding: `sandbox.render.unavailable`
- cleanup: sandbox killed

The browser bootstrap initially downloaded Chromium under a different user cache. The runner and bootstrap were updated to use a shared `PLAYWRIGHT_BROWSERS_PATH=/tmp/ms-playwright`. A second bootstrap attempt reached Chromium but failed on missing Linux browser libraries (`libnspr4.so`). The bootstrap was then updated to run Playwright's `--with-deps` install as root.

The final direct E2B browser smoke succeeded:

```bash
infisical run --env=prod --path=/ --include-imports=true -- \
  pnpm --filter @create-something/webflow-template-review-mcp published-site:sandbox:e2b-run -- \
  --bundle-dir /tmp/webflow-template-review-direct-e2b-example-with-deps \
  --out /tmp/webflow-template-review-direct-e2b-example-with-deps-run \
  --normalize \
  --bootstrap-browser \
  --asset-id rec_direct_smoke_asset \
  --version-id rec_direct_smoke_version \
  --policy-snapshot-id policy.live-smoke
```

Result:

```json
{
  "ok": true,
  "run_id": "direct-e2b-example-with-deps",
  "provider": "direct_e2b",
  "bootstrap_requested": true,
  "bootstrap_ok": true,
  "screenshots": [
    "/tmp/webflow-template-review-direct-e2b-example-with-deps-run/screenshots/example.com__desktop.png"
  ]
}
```

The sandbox output returned `status: ok`, rendered status `ok`, zero console errors, no horizontal overflow, no clipped text candidates, one network request, and a downloaded `1024 x 768` PNG screenshot. The normalizer returned `evidence_status: usable`, `escalation_required: false`, and `finding_count: 0`. The generated ledger import SQL loaded successfully into an in-memory SQLite database with the phase-1 ledger schema.
