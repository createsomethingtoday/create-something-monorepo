# Rubric Reviewer Standardized Response Smoke - 2026-05-27

**Status:** Completed with provider caveat
**Case:** `e2b_calibration_case_003`
**Template:** `Upword`
**Published URL:** `https://upword-themeflow.webflow.io/`
**Private historical outcome:** rejected / low quality
**Prompt outcome leakage:** excluded from prompt

## Goal

Test whether an agent can produce a standardized rubric-shaped review response for one template using the baseline Webflow grading rubric, E2B sandbox evidence, and no private human outcome label.

The run is shadow-only. It must not write Airtable, D1, R2, Dify configuration, official review status, official ratings, or creator-facing feedback.

## Harness

Added:

```bash
pnpm --filter @create-something/webflow-template-review-mcp rubric:reviewer:dry-run
```

The harness reads:

- `manifest.blind.jsonl`
- `sandbox-results.jsonl`
- normalized E2B sandbox evidence
- optional screenshot artifact
- `rubric-codification-map.md`

It writes:

- `rubric-reviewer-prompt.json`
- `rubric-reviewer-output.json`
- `rubric-reviewer-summary.json`
- OpenAI metadata when the direct OpenAI provider succeeds

Private Airtable outcomes are joined only after the model response for calibration comparison.

## Direct OpenAI Attempt

Direct `gpt-5.5` and `gpt-5.4-mini` attempts reached the OpenAI Responses API but were blocked by account quota:

```text
OpenAI Responses API failed (429): insufficient_quota
```

The harness now fails closed and writes a structured `status: failed` shadow artifact instead of aborting the review lane.

Example failed artifact:

```json
{
  "status": "failed",
  "recommendation": "insufficient_evidence",
  "quality_band": "uncertain",
  "confidence": "low",
  "manual_checks_remaining": ["provider_retry", "human_review"]
}
```

## Dify Agent Fallback

Because the direct OpenAI account was quota-blocked, the same prompt was sent through `eric-hub` as a text-only Dify smoke.

Command:

```bash
infisical run --env=prod --path=/ --include-imports=true -- \
  pnpm tsx scripts/dify-agent-smoke.ts \
  --agent eric-hub \
  --query-file /tmp/webflow-template-review-rubric-reviewer-dry-run-dry/rubric-reviewer-prompt.json \
  --forbid-tool run_code \
  --forbid-tool crawl \
  --forbid-tool search \
  --timeout-ms 120000 \
  --max-attempts 1
```

Result:

```json
{
  "ok": true,
  "status": 200,
  "duration_ms": 44657,
  "tools": [],
  "forbidden_tools_used": [],
  "total_tokens": 11352,
  "total_price_usd": 0.1102575
}
```

## Agent Response

The Dify agent returned valid `rubric_reviewer_shadow.v0.1` JSON.

Top-level output:

```json
{
  "status": "shadow",
  "recommendation": "manual_review_required",
  "quality_band": "uncertain",
  "confidence": "low"
}
```

Standardized findings:

- `accessibility`, minor: missing alt text candidate, 35 missing alt attributes across 53 images.
- `layout_design_quality`, info: overflow and clipped-text candidates need manual confirmation.
- `hierarchy`, info: homepage reports four H1 elements and should be reviewed for semantic hierarchy.

Manual checks remaining included visual quality, UX, responsive breakpoints, typography, utility pages, PageSpeed/Lighthouse, interactions, CTA paths, and image-alt context.

## Interpretation

This is a useful standardization result, but not yet a quality-decision result.

What worked:

- The agent followed the schema.
- It did not use forbidden tools.
- It excluded private historical outcome context.
- It produced consistent rubric buckets and creator-safe draft language.
- It did not overclaim a rejection based on weak evidence.

What did not work yet:

- It did not explain the historical low-quality rejection.
- It had no actual multimodal image input in the Dify fallback path.
- It had only one desktop viewport and one page of sandbox evidence.
- It could not assess outdated visual style, originality, polish, or category fit.

The result supports the current architecture: a standardized response agent is feasible, but the agent needs richer evidence lanes and calibrated visual-quality examples before it can distinguish rejected low quality from good or exceptional cases.

## Next Step

Run the same standardized-response harness across 8-12 cases after direct OpenAI quota is restored, using actual screenshot image input and the same output schema. Score outputs against private Airtable outcomes for:

- false rejection of approved good/exceptional cases
- false approval of rejected low-quality cases
- escalation rate
- consistency of standardized findings
- quality of creator-safe draft language

Do not promote the response agent to Dify-facing reviewer decisions until this scorer shows low false-positive risk and stable wording.
