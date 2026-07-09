# Webflow Template Review MCP

Remote MCP server for Webflow Template Review workflows, scoped to Airtable `Assets` + `Asset Versions`.

## Scope

- Base: `appMoIgXMTTTNIc3p`
- Tables:
  - `👛Assets` (`tblRwzpWoLgE9MrUm`)
  - `🖌️Asset Versions` (`tblHxZ2hgSFLZxsZu`)
  - `🚀Asset Releases` (`tblhLAXcJiXrkZxUL`)
- Data policy:
  - templates-only filtering (`🆎Type = Template🏗️` in v1)
  - read/write for confirmed template asset fields
  - reviewer assignment and bounded version-review writes use confirmed field mappings for `📝Review Status`, `📝Review Feedback`, and release linkage

## Current Status

Phase 1 is intentionally conservative:

- confirmed asset reads and updates are supported
- queue and version inspection are supported
- field-map and hotspot resources are supported
- reviewer assignment helpers are active
- reviewer-safe workflow helpers (`request changes`, `set review status`, `save draft feedback`, `approve`, `reject`, `update version review`) are implemented against confirmed reviewer/status field mappings
- supplemental agent-feedback writes are supported for `📝Agent Review Feedback`
- some broader write surfaces still depend on remaining field verification and policy rollout

## Auth

The worker supports two parallel auth modes:

### OAuth 2.1 + DCR via Clerk (Claude Enterprise connector)

For claude.ai / Claude Enterprise custom connectors. **Clerk is the
authorization server**; this worker is a pure OAuth resource server:

- Connector URL: `https://webflow-template-review-mcp.createsomething.workers.dev/mcp`.
  Do not attach a `createsomething.agency` custom domain to this worker and do
  not point the connector at `wf-template-review.mcp.createsomething.agency`:
  that domain is the hub remote, and a same-zone custom domain here breaks the
  hub's downstream fetch with Cloudflare error 1042.
- Discovery: the worker serves RFC 9728 metadata at
  `/.well-known/oauth-protected-resource`, pointing clients at the Clerk
  Frontend API (derived from `CLERK_PUBLISHABLE_KEY`). Claude registers itself
  with Clerk via Dynamic Client Registration and sends users through Clerk's
  hosted sign-in/consent.
- Token validation: `@clerk/backend` `authenticateRequest` with
  `acceptsToken: 'oauth_token'`; the Clerk user's primary email is resolved
  (cached per isolate) and passed through the access policy in
  `src/oauth-access.ts`.
- Access policy:
  - email must be a `@webflow.com` account (`OAUTH_ALLOWED_EMAIL_DOMAIN`)
  - when `OAUTH_ALLOWED_EMAILS` is set, only those emails may connect at all
  - allowlisted users and `REVIEWER_DIRECTORY_JSON` email matches get
    `template-review:write`; everyone else gets `template-review:read`
- Write tools are **not registered** on read-only sessions, so non-reviewers
  never see them.

One-time Clerk setup:

1. Create a Clerk application (a dedicated one is recommended — Claude's DCR
   clients and reviewer users will live in it) and enable **Dynamic client
   registration** under OAuth Applications in the Clerk Dashboard.
2. Store keys in Infisical, then sync the secret to the worker:

```bash
infisical secrets set --env=prod --path=/webflow-template-review-mcp \
  CLERK_SECRET_KEY=sk_live_... CLERK_PUBLISHABLE_KEY=pk_live_...

cd packages/webflow-template-review-mcp/worker
infisical run --env=prod --path=/webflow-template-review-mcp -- \
  sh -c 'printf %s "$CLERK_SECRET_KEY" | node ../../../scripts/run-wrangler.mjs secret put CLERK_SECRET_KEY'
infisical run --env=prod --path=/webflow-template-review-mcp -- \
  sh -c 'printf %s "$CLERK_PUBLISHABLE_KEY" | node ../../../scripts/run-wrangler.mjs secret put CLERK_PUBLISHABLE_KEY'
```

Claude Enterprise rollout: an org Owner adds a custom connector pointing at
`https://webflow-template-review-mcp.createsomething.workers.dev/mcp`. Claude discovers
Clerk via the protected-resource metadata, registers via DCR, and each
reviewer signs in once through Clerk. Enterprise-managed (Okta) auth is not
yet available for custom connectors, so per-user OAuth is the supported path.

### Legacy shared bearer (hub bridges)

- Header: `Authorization: Bearer <MCP_API_KEY>`
- Reviewer identity via trusted `x-mcp-account-id` / `x-hub-account-id` header
  (per-reviewer hub bridges only).
- Legacy sessions keep the full tool surface. If `MCP_API_KEY` is unset, the
  legacy path is disabled and only OAuth traffic is served.

## Secrets / Vars

Required:

- `AIRTABLE_API_KEY` (Airtable PAT)

OAuth mode:

- `CLERK_SECRET_KEY` (worker secret; canonical copy in Infisical at
  `prod:/webflow-template-review-mcp`)
- `CLERK_PUBLISHABLE_KEY` (worker secret or var; also encodes the Clerk
  Frontend API domain used in discovery metadata)
- `OAUTH_ALLOWED_EMAIL_DOMAIN` (defaults to `webflow.com`)
- `OAUTH_ALLOWED_EMAILS` (comma-separated sign-in allowlist; allowlisted
  users receive write scope)

Legacy mode:

- `MCP_API_KEY` (shared worker boundary bearer token for hub bridges)

Optional:

- `AIRTABLE_BASE_ID` (defaults to `appMoIgXMTTTNIc3p`)
- `REVIEWER_DIRECTORY_JSON` (JSON map from hub `account_id` to reviewer identity;
  entries need `email` set for OAuth write-scope matching, and are used by
  `template_review_assign_self` and reviewer resources)
- `WEBFLOW_TEMPLATE_VALIDATION_WORKER_URL` (defaults to `https://validation-worker.createsomething.workers.dev/validate`)
- `GSAP_VALIDATION_WORKER_URL` (defaults to `https://gsap-validation-worker.createsomething.workers.dev/validateGsap`)
- `TEMPLATE_REVIEW_VALIDATION_TIMEOUT_MS` (defaults to `45000`)

## Published Site Sandbox Bundle

Generate a Dify/E2B-ready evidence runner for published-site rendering checks:

```bash
cd packages/webflow-template-review-mcp
pnpm published-site:sandbox:prepare -- --url https://example-template.webflow.io --out /tmp/template-review-sandbox
pnpm published-site:sandbox:normalize -- --input /tmp/webflow-template-review-sandbox/published-site-sandbox-output.json --out /tmp/template-review-sandbox-normalized
```

When coordinator-side commands need credentials, run them through Infisical:

```bash
infisical run --env=prod --path=/ --include-imports=true -- pnpm published-site:sandbox:prepare -- --url https://example-template.webflow.io
```

Run the prepared bundle directly through E2B when the coordinator has `E2B_API_KEY` or `DIFY_E2B_API_KEY`:

```bash
infisical run --env=prod --path=/ --include-imports=true -- \
  pnpm published-site:sandbox:e2b-preflight

infisical run --env=prod --path=/ --include-imports=true -- \
  pnpm published-site:sandbox:e2b-run -- \
  --bundle-dir /tmp/template-review-sandbox \
  --out /tmp/template-review-sandbox-e2b \
  --normalize
```

The preflight emits only secret presence/missing status, never secret values. The direct E2B adapter creates the sandbox from the coordinator process, executes the generated runner, downloads JSON/html/network/screenshot artifacts, optionally normalizes the output, and kills the sandbox unless `--keep-sandbox` is set. Use `--bootstrap-browser` only when the E2B image allows installing Playwright dependencies as root, or use `--template <name-or-id>` for a browser-ready E2B template.

Run a private real-subset calibration against Airtable human outcomes:

```bash
infisical run --env=prod --path=/ --include-imports=true -- \
  pnpm published-site:sandbox:e2b-calibration -- \
  --limit 2 \
  --bootstrap-browser \
  --max-pages 1 \
  --viewports desktop:1024x768 \
  --out /tmp/webflow-template-review-direct-e2b-calibration-smoke
```

The calibration command writes `manifest.blind.jsonl`, `outcomes.private.jsonl`, `sandbox-results.jsonl`, `status-alignment.jsonl`, and `summary.json`. The joined alignment files are private diagnostics only; they compare sandbox evidence to human review status without writing Airtable, D1, R2, Dify, approvals, rejections, ratings, or feedback.

Draft reviewer-approved creator guidance from sandbox evidence:

```bash
pnpm guidance:draft -- \
  --title "Example Template" \
  --url https://example-template.webflow.io/ \
  --sandbox-normalized /tmp/template-review-sandbox-e2b/normalized \
  --html /tmp/template-review-sandbox-e2b/html-snapshot.html \
  --visual-proxies /tmp/template-review-visual-proxies/visual-proxy-features.json \
  --network-log /tmp/template-review-sandbox-e2b/network-log.json \
  --guidance-rule-catalog specs/webflow-marketplace/delivery/template-review-hub/guidance-rule-catalog.phase1.json \
  --fetch-asset-sizes \
  --out /tmp/template-review-guidance
```

The guidance draft command writes `creator-guidance-draft.json`, `creator-guidance-draft.md`, and `creator-guidance-summary.json`. It is intended for appeal support and creator coaching only. It does not emit final approvals, final rejections, quality bands, Airtable writes, D1 writes, or reviewer feedback writes. The JSON includes `signal_sources`, which separates programmatic detectors, catalog-configured detectors, artifact-backed inputs, and human-review-required signals. Any visual-quality language must stay human-approved and should be phrased as improvement direction unless a versioned policy snapshot supports stronger wording.

Aggregate quality-band readiness from shadow score summaries:

```bash
pnpm quality:readiness:score -- \
  --subjective-panel-summary fixtures/quality-band-readiness/subjective-panel-eval-score-summary.blocked.sample.json \
  --rubric-reviewer-summary fixtures/quality-band-readiness/rubric-reviewer-score-summary.blocked.sample.json \
  --exceptional-lane-summary fixtures/quality-band-readiness/exceptional-candidate-score-summary.blocked.sample.json \
  --visual-proxy-canary-summary fixtures/quality-band-readiness/visual-proxy-canary-summary.blocked.sample.json \
  --out /tmp/webflow-template-review-quality-band-readiness-fixture-smoke
```

The readiness scorer writes `quality-band-readiness-summary.json` and `.md`. It is a shadow gate only. It intentionally excludes popularity, sales, views, and marketplace engagement metrics so quality calibration does not absorb demand, audience, pricing, placement, or launch-timing bias.

It also writes `quality-band-readiness-ledger-import.sql`, `quality-band-readiness-ledger-summary.json`, and `quality-band-readiness-artifact-manifest.json`. Those files are D1/R2 import artifacts only; the scorer does not write D1, Airtable, reviewer feedback, approvals, rejections, ratings, or featured decisions.

Derive the Dify/coordinator exposure policy from a readiness summary:

```bash
pnpm coordinator:exposure-policy -- \
  --input /tmp/webflow-template-review-quality-band-readiness-fixture-smoke/quality-band-readiness-summary.json \
  --out /tmp/webflow-template-review-coordinator-exposure-policy-fixture-smoke
```

The exposure policy writes `coordinator-exposure-policy.json` and `.md`. It is the artifact a Dify coordinator should consume before deciding which lanes or outputs may be shown. It preserves the quality-readiness exclusions and blocks autonomous approvals, autonomous rejections, final quality bands, featured decisions, creator-facing final decision language, and quality decisions from popularity, sales, views, favorites, or marketplace engagement. `reviewer_assist_candidate` only enables reviewer-facing quality cues when the command is run with `--lead-approved-reviewer-assist`.

Gate a proposed coordinator output before Dify shows it:

```bash
pnpm coordinator:output-gate -- \
  --policy /tmp/webflow-template-review-coordinator-exposure-policy-fixture-smoke/coordinator-exposure-policy.json \
  --request /tmp/template-review-coordinator-output-request.json \
  --out /tmp/webflow-template-review-coordinator-output-gate-smoke
```

The request must use `schema_version: "template_review_coordinator_output_request.v0.1"` and declare a `request_id`, `requested_outputs`, `requested_lanes`, `input_sources`, `intended_audience`, and any `human_gate_confirmations`. The gate writes `coordinator-output-gate.json` and `.md`, exits with code `2` when blocked, and fails closed on malformed request shape, unknown request fields, outputs outside the exposure policy, explicitly blocked outputs, excluded inputs such as sales/views/popularity, missing human gates, or internal-only outputs aimed at reviewers or creators.

Run the fixture-backed coordinator contract smoke:

```bash
pnpm coordinator:contract-smoke -- \
  --out /tmp/webflow-template-review-coordinator-contract-smoke
```

The smoke uses `fixtures/coordinator-output-requests/manifest.json`, derives an exposure policy from the quality-readiness fixtures, and verifies that allowed creator guidance passes while final quality-band output, sales-derived quality input, and malformed coordinator requests are blocked. It writes `coordinator-contract-smoke-summary.json` and `.md`.

For broader calibration, build a reviewer-balanced blind/private sample before tuning subjective prompts:

```bash
infisical run --env=prod --path=/ --include-imports=true -- \
  pnpm calibration:phase1 -- \
  --limit 75 \
  --balance-reviewers \
  --max-reviewer-share 0.4 \
  --min-reviewers 3 \
  --out /tmp/webflow-template-review-calibration-balanced-75
```

Reviewer labels remain private outcome metadata. The blind manifest does not expose reviewer identity, final status, quality rating, rejection reason, or feedback to the reviewer prompt.

Run a single-template standardized rubric response in shadow mode:

```bash
infisical run --env=prod --path=/ --include-imports=true -- \
  pnpm rubric:reviewer:dry-run -- \
  --input /tmp/webflow-template-review-direct-e2b-calibration-expanded-2026-05-27 \
  --case-id e2b_calibration_case_003 \
  --provider openai \
  --model gpt-5.5 \
  --include-screenshot \
  --max-screenshots 4 \
  --out /tmp/webflow-template-review-rubric-reviewer-dry-run
```

The rubric reviewer excludes private Airtable outcomes from the prompt and writes a shadow-only standardized response. It can attach a bounded set of E2B screenshots for direct image-capable OpenAI calls. Direct OpenAI calls retry transient `408`/`409`/`429`/`5xx` and network failures up to three attempts, then fail closed to `insufficient_evidence` when the model provider remains unavailable.

Run a small shadow batch through the standardized reviewer:

```bash
infisical run --env=prod --path=/ --include-imports=true -- \
  pnpm rubric:reviewer:batch -- \
  --input /tmp/webflow-template-review-direct-e2b-calibration-expanded-2026-05-27 \
  --limit 4 \
  --provider dify-agent \
  --agent eric-hub \
  --include-screenshot \
  --max-screenshots 4 \
  --out /tmp/webflow-template-review-rubric-reviewer-batch-dify
```

The batch command writes per-case prompt, output, and Dify smoke artifacts plus `rubric-reviewer-batch-results.jsonl` and `rubric-reviewer-batch-summary.json`. Private Airtable outcomes are joined only after the reviewer response for calibration scoring. The Dify provider receives text prompt artifacts only; use the direct OpenAI provider for actual screenshot image input once quota is available.

Score a shadow rubric reviewer batch against private outcomes:

```bash
pnpm rubric:reviewer:score -- \
  --input /tmp/webflow-template-review-rubric-reviewer-batch-dify \
  --out /tmp/webflow-template-review-rubric-reviewer-score
```

The scorer writes `rubric-reviewer-scored.jsonl` and `rubric-reviewer-score-summary.json`. It blocks promotion when the run is too small, provider failures occur, safety fails, false approvals or false rejections exceed thresholds, exceptional candidates are missed, or escalation is too high for quality-band automation.

Run the exceptional-candidate specialist lane separately from the broad reviewer:

```bash
infisical run --env=prod --path=/ --include-imports=true -- \
  pnpm exceptional:lane:run -- \
  --input /tmp/webflow-template-review-direct-e2b-calibration-8case-multimodal-2026-05-27 \
  --provider openai \
  --model gpt-5.5 \
  --limit 8 \
  --precedent-file /tmp/webflow-template-review-visual-quality-calibration/visual-quality-golden-cases.proposed.jsonl \
  --out /tmp/webflow-template-review-exceptional-candidate-lane

pnpm exceptional:lane:score -- \
  --input /tmp/webflow-template-review-exceptional-candidate-lane \
  --require-image-inputs
```

The exceptional lane can only emit `exceptional_human_review_candidate`, `not_exceptional_enough`, or `insufficient_exceptional_evidence`. The scorer blocks on false exceptional routing, approved-good over-promotion, missed exceptional candidates, provider failures, safety failures, or missing image inputs.

Build an appeal/equity comparison artifact from an existing calibration run:

```bash
pnpm appeal:equity:compare -- \
  --input /tmp/webflow-template-review-direct-e2b-calibration-balanced-50-multimodal-2026-05-27 \
  --target Automatia \
  --cited Introx \
  --out /tmp/webflow-template-review-appeal-equity-automatia-vs-introx-2026-05-27
```

The comparison command reads local calibration artifacts only. It joins blind case context, private outcomes, sandbox findings, screenshots, and status alignment after evidence collection, then writes `appeal-equity-comparison.json` and `appeal-equity-comparison.md`. The output is shadow-only: it may produce objective findings and consistency questions, but it must not decide appeals, approvals, rejections, quality ratings, or creator-facing feedback.

Run a conservative appeal/equity batch across rejected low-quality cases:

```bash
pnpm appeal:equity:batch -- \
  --input /tmp/webflow-template-review-direct-e2b-calibration-balanced-50-multimodal-2026-05-27 \
  --out /tmp/webflow-template-review-appeal-equity-batch-low-quality-vs-approved-issues-2026-05-27 \
  --limit 8
```

The batch command selects rejected low-quality cases with usable evidence and no substantive sandbox findings, then pairs them with approved comparison candidates that do have substantive objective findings. It writes `appeal-equity-batch-summary.json`, `appeal-equity-batch-summary.md`, and one per-target comparison packet. Same-reviewer cited examples are preferred when available. When real creator-cited examples exist, run `appeal:equity:compare` directly with those cited cases instead of relying on batch-selected comparison candidates.

Resolve real creator-cited appeal examples before comparison:

```bash
pnpm appeal:equity:intake -- \
  --input /tmp/webflow-template-review-direct-e2b-calibration-balanced-50-multimodal-2026-05-27 \
  --appeals packages/webflow-template-review-mcp/fixtures/appeal-equity-intake.sample.jsonl \
  --out /tmp/webflow-template-review-appeal-equity-intake-automatia-introx-2026-05-27 \
  --run-comparisons
```

The intake command reads JSONL rows shaped like:

```json
{
  "appeal_id": "automatia-introx-creator-claim",
  "target": "Automatia",
  "cited": ["https://webflow.com/templates/html/introx-website-template"],
  "claim_summary": "Creator cited Introx as an approved template with overflow issues after Automatia was rejected."
}
```

It resolves target and cited lookups against captured calibration evidence, including marketplace URL slugs, then marks each row as `comparison_generated`, `ready_for_comparison`, `needs_target_evidence_capture`, `needs_cited_evidence_capture`, or `ambiguous_resolution`. It also writes `appeal-equity-evidence-capture-queue.jsonl` for unresolved or ambiguous target/cited examples. Use this as the preferred path for real creator claims; use batch mode only to discover recurring policy questions.

Smoke the unresolved path:

```bash
pnpm appeal:equity:intake -- \
  --input /tmp/webflow-template-review-direct-e2b-calibration-balanced-50-multimodal-2026-05-27 \
  --appeals packages/webflow-template-review-mcp/fixtures/appeal-equity-intake.unresolved.sample.jsonl \
  --out /tmp/webflow-template-review-appeal-equity-intake-unresolved-queue-2026-05-27
```

The unresolved smoke should produce one `needs_cited_evidence_capture` row and one medium-priority queue item telling the reviewer or follow-up agent to map the marketplace URL to a published URL or Asset Version before comparison.

Turn unresolved intake rows into a bounded capture plan:

```bash
pnpm appeal:equity:capture-queue -- \
  --queue /tmp/webflow-template-review-appeal-equity-intake-unresolved-queue-2026-05-27/appeal-equity-evidence-capture-queue.jsonl \
  --out /tmp/webflow-template-review-appeal-equity-capture-queue-plan-2026-05-27
```

The capture-queue command writes `appeal-equity-capture-plan.jsonl`, `appeal-equity-capture-summary.json`, and `appeal-equity-capture-summary.md`. Without mappings, marketplace URLs stop at `needs_marketplace_mapping`.

After a marketplace URL is mapped to a published Webflow URL or Asset Version, prepare a sandbox bundle:

```bash
pnpm appeal:equity:capture-queue -- \
  --queue /tmp/webflow-template-review-appeal-equity-intake-unresolved-queue-2026-05-27/appeal-equity-evidence-capture-queue.jsonl \
  --mappings packages/webflow-template-review-mcp/fixtures/appeal-equity-capture-mapping.sample.jsonl \
  --out /tmp/webflow-template-review-appeal-equity-capture-queue-mapped-prepare-2026-05-27 \
  --prepare-bundles
```

Bundle preparation is local. Direct E2B execution is opt-in via `--run-e2b` and should run through Infisical-backed credentials only when the URL mapping has been reviewed.

Verify the cited template's status before treating a creator-cited approved example as an actual approved/published precedent:

```bash
pnpm appeal:equity:verify-status -- \
  --input /tmp/webflow-template-review-direct-e2b-calibration-balanced-50-multimodal-2026-05-27 \
  --lookup https://webflow.com/templates/html/introx-website-template \
  --out /tmp/webflow-template-review-appeal-equity-status-introx-2026-05-27
```

The status verifier reads captured calibration outcomes, status alignment rows, and optional trusted status exports. It writes `appeal-equity-status-verification.jsonl`, `appeal-equity-status-verification-summary.json`, and `appeal-equity-status-verification-summary.md`. Current marketplace reachability can be checked with `--fetch-marketplace`, but that is only current visibility, not historical approval.

Compare a resolved target against a captured external cited evidence directory:

```bash
pnpm appeal:equity:external-compare -- \
  --input /tmp/webflow-template-review-direct-e2b-calibration-balanced-50-multimodal-2026-05-27 \
  --target Automatia \
  --external-name Introx \
  --external-url https://introx1.webflow.io/ \
  --external-normalized-dir /tmp/webflow-template-review-direct-e2b-calibration-balanced-50-multimodal-2026-05-27/runs/e2b_calibration_case_006/e2b/normalized \
  --external-claim creator_cited_approved_claim \
  --status-verification /tmp/webflow-template-review-appeal-equity-status-introx-2026-05-27/appeal-equity-status-verification-summary.json \
  --out /tmp/webflow-template-review-appeal-equity-external-automatia-vs-introx-verified-2026-05-27
```

The external comparison command is the post-capture re-entry path. It treats the cited template's approval or marketplace status as a claim until a separate status artifact verifies it, then emits objective findings and human consistency questions. It does not write final appeal decisions, ratings, or creator-facing feedback.

Build a casebook from one or more creator-cited appeal rows:

```bash
pnpm appeal:equity:casebook -- \
  --input /tmp/webflow-template-review-direct-e2b-calibration-balanced-50-multimodal-2026-05-27 \
  --appeals packages/webflow-template-review-mcp/fixtures/appeal-equity-intake.sample.jsonl \
  --out /tmp/webflow-template-review-appeal-equity-casebook-automatia-introx-2026-05-27 \
  --run-external-comparisons
```

The casebook command orchestrates intake, cited-status verification, and verified external comparisons where normalized evidence exists. It writes `appeal-equity-casebook-summary.json`, `appeal-equity-casebook-summary.md`, `appeal-equity-casebook-cases.jsonl`, nested intake artifacts, nested status-verification artifacts, and per-cited comparison packets. Use this as the preferred widening path for multiple appeal examples; unresolved cited rows still flow to the capture queue before comparison.

Score a casebook before handing it to reviewers:

```bash
pnpm appeal:equity:score-casebook -- \
  --input /tmp/webflow-template-review-appeal-equity-casebook-automatia-introx-2026-05-27 \
  --out /tmp/webflow-template-review-appeal-equity-casebook-score-automatia-introx-2026-05-27
```

The scorer writes `appeal-equity-casebook-score-summary.json`, `appeal-equity-casebook-score-summary.md`, and `appeal-equity-casebook-scored.jsonl`. A passing gate means the packet is structurally ready for human review. It does not mean the appeal should be accepted, the rejection should be reversed, or any creator-facing response should be sent.

Run the casebook and score gate together:

```bash
pnpm appeal:equity:eval -- \
  --input /tmp/webflow-template-review-direct-e2b-calibration-balanced-50-multimodal-2026-05-27 \
  --appeals packages/webflow-template-review-mcp/fixtures/appeal-equity-intake.sample.jsonl \
  --out /tmp/webflow-template-review-appeal-equity-shadow-eval-automatia-introx-2026-05-27
```

The eval command writes nested casebook and score artifacts plus `appeal-equity-shadow-eval-summary.json` and `appeal-equity-shadow-eval-summary.md`. This is the preferred operator/Dify-facing command for a small appeal set because it returns one `gate_status` while preserving the underlying lane artifacts.

Audit reviewer concentration and reviewer-correlated feedback language after a widened sample:

```bash
pnpm calibration:reviewer-bias -- \
  --outcomes /tmp/webflow-template-review-calibration-balanced-75/outcomes.private.jsonl \
  --visual-feedback /tmp/webflow-template-review-visual-quality-calibration/visual-quality-feedback.normalized.jsonl \
  --model-results /tmp/webflow-template-review-exceptional-candidate-lane/exceptional-candidate-results.jsonl \
  --out /tmp/webflow-template-review-reviewer-calibration
```

Use reviewer-bias output to rebalance eval slices and normalize vocabulary. Do not use reviewer identity as an active review-policy branch.

Run the full provider-independent shadow eval chain from an existing calibration directory:

```bash
pnpm rubric:reviewer:eval -- \
  --input /tmp/webflow-template-review-direct-e2b-calibration-multimodal-smoke-2026-05-27 \
  --out /tmp/webflow-template-review-rubric-reviewer-shadow-eval \
  --provider dry-run \
  --limit 2
```

The eval command runs `multimodal:packet`, `rubric:reviewer:batch`, and `rubric:reviewer:score`, then writes `rubric-reviewer-shadow-eval-summary.json` with stage outputs and the promotion gate result. It starts from an existing calibration directory and does not call Airtable, E2B, D1, R2, or reviewer write tools.

Check direct OpenAI multimodal readiness before running a full image-input eval:

```bash
infisical run --env=prod --path=/ --include-imports=true -- \
  pnpm openai:multimodal:preflight -- \
  --model gpt-5.5 \
  --out /tmp/webflow-template-review-openai-multimodal-readiness
```

The preflight sends a tiny generated PNG through the OpenAI Responses API as an image input and writes `openai-multimodal-readiness-summary.json`. Run full `--provider openai --require-image-inputs` reviewer evals only when this reports `status: "ready"`.

Package a reusable multimodal evidence packet from a calibration run:

```bash
pnpm multimodal:packet -- \
  --input /tmp/webflow-template-review-direct-e2b-calibration-multimodal-smoke-2026-05-27 \
  --out /tmp/webflow-template-review-multimodal-review-packet \
  --max-screenshots 8
```

The packet command copies screenshots into a stable packet directory, records hashes and dimensions, writes a blind JSONL/contact sheet for prompt and evidence review, and writes private outcome files separately for calibration scoring only.

The generated bundle is evidence-only. It emits page metadata, static HTML signals, network summaries, screenshots when Playwright is available in the sandbox, and explicit failure states. If the E2B image does not already include Playwright, the bundle includes an optional bootstrap command. The normalizer converts downloaded sandbox JSON into ledger-ready JSONL/SQL with manual, partial, and error findings only. These commands do not write Airtable, D1, reviewer feedback, approvals, or rejections.

Do not pass `AIRTABLE_API_KEY`, `OPENAI_API_KEY`, `E2B_API_KEY`, `DIFY_E2B_API_KEY`, D1/R2 credentials, reviewer credentials, or Webflow credentials into the generated sandbox runner or its artifacts.

Check whether a submitted or published template includes the required Validator
app bridge script:

```bash
pnpm validator:bridge:check -- \
  --url https://example.webflow.io \
  --policy-state enabled_for_new_submission \
  --out /tmp/webflow-template-review-validator-bridge-presence
```

The bridge check writes `validator-app-submission-contract.json` and a Markdown
summary. It records marker/script presence and redacted token provenance only;
it never stores raw bridge tokens and does not claim the template passed
Validator app rules without a separate persisted result artifact.

Normalize persisted Validator app results into review-ledger-ready artifacts:

```bash
pnpm validator:results:normalize -- \
  --input fixtures/validator-app-results.sample.json \
  --policy-snapshot-id validator_app_policy_v0 \
  --out /tmp/webflow-template-review-validator-app-results-normalized
```

The normalizer accepts direct Validator app output, `/app-validator/submit`
payloads, review-status responses with `result`, or enhanced worker analysis. It
writes normalized JSON, JSONL findings, and SQL import text. It redacts
secret-like fields and does not emit approval, rejection, rating, or
creator-facing feedback.

## Tools

- `template_review_health`
- `template_review_get_metrics`
- `template_review_list_queue` (compact queue summaries)
- `template_review_my_queue` (compact active queue summaries for the authenticated reviewer; pass `status` or `include_completed` for history)
- `template_review_search_assets`
- `template_review_search_versions`
- `template_review_get_asset`
- `template_review_list_versions`
- `template_review_get_version`
- `template_review_get_review_context`
- `template_review_get_comprehensive_review_contract` (read-only comprehensive evidence contract for Auto/Partial/Manual coverage, rubric dimensions, manual checks, and Agent Review Feedback format)
- `template_review_format_agent_review_feedback` (read-only comprehensive evidence validator/formatter for Agent Review Feedback drafts; does not write Airtable)
- `template_review_prepare_published_site_sandbox` (read-only E2B sandbox job/runner bundle for first-class published-site evidence; does not execute E2B or write Airtable)
- `template_review_run_published_site_validation` (read-only published-site validation; no Designer/Preview data or Airtable writes)
- `template_review_list_releases`
- `template_review_complete_publishing`
- `template_review_assign_reviewer`
- `template_review_assign_self`
- `template_review_unassign_self`
- `template_review_request_changes`
- `template_review_set_review_status`
- `template_review_save_draft_feedback`
- `template_review_get_field_map`
- `template_review_update_asset_metadata`
- `template_review_update_version_review`
- `template_review_save_agent_feedback`
- `template_review_approve_version`
- `template_review_reject_version`

## Resources

- `template-review://field-map`
- `template-review://status-options`
- `template-review://queue-snapshot`
- `template-review://hotspot-groups`
- `template-review://reviewer-me`
- `template-review://reviewer-workflow`

## Worker

```bash
cd packages/webflow-template-review-mcp/worker
pnpm install
pnpm dev
pnpm deploy
```

## Token Rotation

Rotate shared bearer token:

```bash
cd packages/webflow-template-review-mcp/worker
pnpm exec wrangler secret put MCP_API_KEY
```

## Schema Audit

Compare the checked-in template review schema contract against live Airtable metadata:

```bash
cd packages/webflow-template-review-mcp
AIRTABLE_API_KEY=... pnpm audit:schema
```

This checks:

- configured Airtable table IDs
- confirmed asset/version/release field names
- compatibility aliases used for legacy API shape
- metrics field IDs
- write field IDs

## Agent Feedback Script

Generate and save supplemental internal reviewer notes into `📝Agent Review Feedback` on `🖌️Asset Versions`:

```bash
OPENAI_API_KEY=... AIRTABLE_API_KEY=... pnpm template-review:agent-feedback --dry-run
OPENAI_API_KEY=... AIRTABLE_API_KEY=... pnpm template-review:agent-feedback --limit 5
OPENAI_API_KEY=... AIRTABLE_API_KEY=... pnpm template-review:agent-feedback --version-id recXXXXXXXXXXXXXX --overwrite
```

Behavior:

- targets `🆕Ready for Review` rows by default
- skips rows that already have agent feedback unless `--overwrite` is set
- does lightweight same-origin page discovery from the asset `Website URL` or preview URL when available, so the draft is not limited to a single page when no sitemap exists

## Template Review Hub Agent Feedback Runner

Run the standalone `TEMPLATE REVIEW HUB` Dify agent over the most recently submitted Ready for Review versions with blank `📝Agent Review Feedback`:

```bash
infisical run --env=prod --path=/ --include-imports=true -- \
  pnpm template-review:hub-agent-feedback -- --dry-run --since-days 7 --limit 20
```

The default is list-only dry run. A no-write Dify probe for one candidate is available when validating prompt/tool behavior:

```bash
infisical run --env=prod --path=/ --include-imports=true -- \
  pnpm template-review:hub-agent-feedback -- --run-dify-dry-run --since-days 7 --limit 1
```

To authorize the agent to save feedback:

```bash
infisical run --env=prod --path=/ --include-imports=true -- \
  pnpm template-review:hub-agent-feedback -- --write --since-days 7 --limit 5 --concurrency 1
```

Ongoing operation should use small recurring batches, for example every 30-60 minutes:

```bash
infisical run --env=prod --path=/ --include-imports=true -- \
  pnpm template-review:hub-agent-feedback -- --write --since-days 7 --limit 5 --concurrency 1 --timeout-ms 600000
```

The repo also includes `.github/workflows/template-review-hub-agent-feedback.yml` for ongoing hourly runs. Scheduled runs use `--write --since-days 7 --limit 5 --concurrency 1`; manual dispatch defaults to dry-run unless the `write` input is enabled. GitHub must have `AIRTABLE_API_KEY` and `DIFY_TEMPLATE_REVIEW_HUB_API_KEY` configured as repository secrets before the scheduled job can run.

Behavior:

- lists newest submitted rows first using `📅Submission Datetime`
- scopes to `🆕Ready for Review` and blank `📝Agent Review Feedback` by default
- re-reads each version immediately before calling Dify and skips rows that are no longer blank or no longer in scope
- calls the Dify Service API using `DIFY_TEMPLATE_REVIEW_HUB_API_KEY`, stored at `prod:/dify/template-review-hub`
- lets the Dify agent use Hub MCP and first-class E2B tools for comprehensive review
- expects comprehensive reviews to take several minutes per item; keep scheduled concurrency at `1` until live timings are stable
- authorizes only the narrow `template_review_save_agent_feedback` write path; the runner does not write review status, creator-facing feedback, owner, or publishing fields directly
