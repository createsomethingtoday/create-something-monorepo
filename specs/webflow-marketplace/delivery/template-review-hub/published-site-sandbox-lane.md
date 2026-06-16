# Published Site Sandbox Lane

**Status:** Draft
**Date:** 2026-05-26
**Related artifacts:** `execution-isolation-and-sandbox-policy.md`, `review-lane-contracts.md`, `ai-native-review-phase-1-subset.md`, `template-review-secret-contract.md`, `published-site-sandbox-real-subset-calibration-2026-05-27.md`

## Purpose

The published-site sandbox lane gives the reviewer system a bounded way to inspect creator-controlled published URLs without giving the browser runtime access to Airtable, OpenAI, D1 write tokens, reviewer credentials, or Webflow credentials.

This lane is evidence-only. It can support review triage and feedback drafting, but it must not approve, reject, rate, or write creator-facing feedback.

## Initial Implementation

Use the package script:

```bash
pnpm --filter @create-something/webflow-template-review-mcp published-site:sandbox:prepare -- \
  --url https://example-template.webflow.io \
  --out /tmp/webflow-template-review-published-site-sandbox
```

The script writes a Dify/E2B-ready bundle:

- `published-site-sandbox-job.json` - normalized run contract
- `published-site-sandbox-e2b-run.py` - self-contained E2B runner
- `published-site-sandbox-e2b-command.txt` - command form for uploaded-file execution
- `published-site-sandbox-e2b-bootstrap-command.txt` - optional browser bootstrap command for E2B images that allow package installation
- `published-site-sandbox-summary.json` - local preparation summary
- `README.md` - operator instructions

For direct coordinator-managed E2B runs, prepare the same bundle with an explicit provider label:

```bash
pnpm --filter @create-something/webflow-template-review-mcp published-site:sandbox:prepare -- \
  --url https://example-template.webflow.io \
  --out /tmp/webflow-template-review-published-site-sandbox \
  --sandbox-provider direct_e2b
```

The generated Python runner writes sandbox output inside E2B:

- `/tmp/webflow-template-review-sandbox/published-site-sandbox-output.json`
- `/tmp/webflow-template-review-sandbox/network-log.json`
- `/tmp/webflow-template-review-sandbox/html-snapshot.html`
- `/tmp/webflow-template-review-sandbox/screenshots/*.png` when browser rendering succeeds

After downloading the sandbox output, normalize it outside E2B:

```bash
pnpm --filter @create-something/webflow-template-review-mcp published-site:sandbox:normalize -- \
  --input /tmp/webflow-template-review-sandbox/published-site-sandbox-output.json \
  --out /tmp/webflow-template-review-published-site-sandbox-normalized
```

The normalizer writes:

- `published-site-sandbox-normalized.json` - coordinator-facing summary
- `published-site-sandbox-findings.jsonl` - one evidence finding per line
- `published-site-sandbox-ledger-import.sql` - D1 import SQL for `review_runs` and `review_findings`
- `published-site-sandbox-normalization-summary.json` - compact run summary

## Output Contract

The sandbox output schema version is `published_site_sandbox_output.v0.1`.

Required top-level fields:

- `run_id`
- `lane_id`
- `source_url`
- `policy_snapshot_id`
- `status`
- `evidence_quality`
- `sandbox_metadata`
- `static_pages`
- `rendered`
- `network_summary`
- `errors`
- `caveats`

Allowed statuses:

- `ok` - static and rendered evidence completed
- `partial` - static evidence completed, rendered evidence skipped or partially failed
- `failed` - the lane could not collect usable evidence

Any `partial` or `failed` result is an escalation signal, not a reason to reject.

The normalized output schema version is `published_site_sandbox_normalized.v0.1`. It maps sandbox evidence to `manual`, `partial`, or `error` findings only. A future promotion may add stricter validator-backed `fail` findings, but the initial sandbox lane does not.

## Evidence It May Emit

- page title and metadata
- same-origin link discovery
- heading counts
- image counts and missing alt counts
- static HTML byte counts
- network request summary
- console error count
- horizontal overflow signal
- clipped text candidate count
- screenshot artifact paths
- timeout and error states

## Evidence It Must Not Emit

- final approval
- final rejection
- average/good/exceptional band
- creator-facing feedback
- Airtable writes
- D1 writes
- raw secrets
- reviewer identity

## Dify/E2B Flow

Run coordinator-side commands through Infisical when they need secrets:

```bash
infisical run --env=prod --path=/ --include-imports=true -- \
  pnpm --filter @create-something/webflow-template-review-mcp published-site:sandbox:prepare -- \
  --url https://example-template.webflow.io \
  --out /tmp/webflow-template-review-published-site-sandbox
```

The generated sandbox runner itself must not receive `E2B_API_KEY`, `DIFY_E2B_API_KEY`, `AIRTABLE_API_KEY`, `OPENAI_API_KEY`, D1 credentials, R2 credentials, reviewer credentials, or Webflow credentials.

Prerequisite: keep the general reviewer-agent E2B health smoke separate from this lane:

```bash
infisical run --env=prod --path=/ --include-imports=true -- pnpm dify:reviewer-hubs:e2b-smoke
```

That smoke proves Dify can execute E2B `run_code`. This lane then proves the review-specific evidence contract.

1. The coordinator prepares the bundle outside E2B.
2. Dify uses E2B `run_code` with language `python` and the generated runner code.
3. The runner collects evidence with the configured max pages, viewports, timeout, allowed hosts, and network request cap.
4. Dify downloads the JSON output and screenshots as review artifacts.
5. The coordinator stores artifacts in the review ledger/R2 path outside the sandbox.
6. The recommendation composer may reference confirmed evidence but still cannot make an official review decision.

The initial runner treats `allowed_hosts` as a navigation policy: the submitted site and discovered same-origin pages may be visited, while public subresources such as Webflow CDN assets and font files may load unless they are private/local or exceed the request cap.

## Direct E2B Coordinator Flow

When the coordinator has `E2B_API_KEY` or `DIFY_E2B_API_KEY`, run the prepared bundle directly:

```bash
infisical run --env=prod --path=/ --include-imports=true -- \
  pnpm --filter @create-something/webflow-template-review-mcp published-site:sandbox:e2b-preflight

infisical run --env=prod --path=/ --include-imports=true -- \
  pnpm --filter @create-something/webflow-template-review-mcp published-site:sandbox:e2b-run -- \
  --bundle-dir /tmp/webflow-template-review-published-site-sandbox \
  --out /tmp/webflow-template-review-published-site-sandbox-e2b \
  --normalize
```

If `infisical run` does not inject the E2B key into the child process but the key is otherwise available to the operator, export it into the coordinator process only. Do not write it into the bundle, runner, prompt, output JSON, screenshots, or normalized findings.

Direct E2B options:

- `--preflight-only` checks coordinator E2B credential readiness without creating a sandbox
- `--template <name-or-id>` uses a browser-ready E2B template when one exists
- `--bootstrap-browser` runs the generated Playwright bootstrap command as root before the evidence runner; it installs Playwright browser dependencies and Chromium into `PLAYWRIGHT_BROWSERS_PATH=/tmp/ms-playwright`
- `--keep-sandbox` is for debugging only and should not be used in normal review runs
- `--normalize` writes the same ledger-ready JSONL/SQL artifacts as the standalone normalizer

The preflight writes `published-site-sandbox-e2b-preflight.json` with only secret presence/missing status and the selected secret name. It must not contain secret values.

## Real-Subset Calibration Flow

Use the direct E2B calibration command to sample private Airtable Asset Version outcomes, collect sandbox evidence, and compare the two after the run:

```bash
infisical run --env=prod --path=/ --include-imports=true -- \
  pnpm --filter @create-something/webflow-template-review-mcp published-site:sandbox:e2b-calibration -- \
  --limit 2 \
  --bootstrap-browser \
  --max-pages 1 \
  --viewports desktop:1024x768 \
  --policy-snapshot-id policy.real-subset-smoke \
  --out /tmp/webflow-template-review-direct-e2b-calibration-smoke
```

The command writes:

- `manifest.blind.jsonl` - review-safe case manifest without human outcome fields
- `outcomes.private.jsonl` - private human status/rating/reviewer context for comparison
- `sandbox-results.jsonl` - normalized sandbox evidence summary per case
- `status-alignment.jsonl` - private diagnostic comparison labels
- `summary.json` - aggregate counts

This flow is for calibration only. It must not write Airtable, D1, R2, Dify configuration, approvals, rejections, ratings, or creator-facing feedback.

## Rendering Availability

The runner attempts Playwright rendering when Playwright is present in the sandbox. If Playwright is unavailable, it still emits static HTML evidence and marks rendering as skipped.

Skipped rendering is a partial result. The system should either retry in a browser-capable E2B image or escalate to human review.

## Stability Notes

- Keep the viewport set deterministic.
- Keep request caps and timeouts low enough for repeatability.
- Treat current published-site evidence as mutable and distinct from review-time evidence.
- Store the policy snapshot ID with every artifact.
- Treat element-level overflow counts and clipped-text counts as raw candidates unless they produce confirmed page-level overflow or pass a later visual-quality gate.
- Do not compare subjective visual quality from screenshots until the visual-quality golden set and judge-panel gates pass.
