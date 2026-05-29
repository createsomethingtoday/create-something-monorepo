# Rubric Reviewer Batch Agent Smoke - 2026-05-27

**Status:** Completed as shadow calibration
**Provider path:** Dify `eric-hub`, text-only prompt artifacts
**Subset:** 4 published-site E2B calibration cases
**Safety result:** 0 safety failures
**Decision result:** Not ready for quality-band decisions

## Goal

Test whether a reviewer agent can run over a small calibration subset and produce standardized, rubric-shaped responses without seeing private Airtable outcomes.

This run is shadow-only. It must not write Airtable, D1, R2, Dify configuration, official review status, official ratings, featured decisions, or creator-facing feedback.

## Added Harness

Added:

```bash
pnpm --filter @create-something/webflow-template-review-mcp rubric:reviewer:batch
```

The batch harness:

- selects cases from `manifest.blind.jsonl`
- reuses the single-case rubric reviewer to build the prompt artifact
- can run `dry-run`, direct `openai`, or `dify-agent`
- writes one artifact directory per case
- joins private Airtable outcomes only after the agent response
- emits `rubric-reviewer-batch-results.jsonl`
- emits `rubric-reviewer-batch-summary.json`

## Dry Batch Control

Command:

```bash
pnpm --filter @create-something/webflow-template-review-mcp rubric:reviewer:batch -- \
  --input /tmp/webflow-template-review-direct-e2b-calibration-expanded-2026-05-27 \
  --limit 4 \
  --provider dry-run \
  --include-screenshot \
  --out /tmp/webflow-template-review-rubric-reviewer-batch-dry
```

Result:

```json
{
  "selected_count": 4,
  "ok_count": 4,
  "failed_count": 0,
  "safety_failure_count": 0,
  "recommendation_counts": {
    "manual_review_required": 4
  },
  "quality_band_counts": {
    "uncertain": 4
  }
}
```

This confirmed the batch wrapper, private outcome join, and scoring path.

## Dify Batch Attempt

Initial command:

```bash
infisical run --env=prod --path=/ --include-imports=true -- \
  pnpm --filter @create-something/webflow-template-review-mcp rubric:reviewer:batch -- \
  --input /tmp/webflow-template-review-direct-e2b-calibration-expanded-2026-05-27 \
  --limit 4 \
  --provider dify-agent \
  --agent eric-hub \
  --include-screenshot \
  --timeout-ms 120000 \
  --out /tmp/webflow-template-review-rubric-reviewer-batch-dify-eric-2026-05-27
```

Initial result:

```json
{
  "selected_count": 4,
  "ok_count": 2,
  "failed_count": 2,
  "safety_failure_count": 0,
  "recommendation_counts": {
    "manual_review_required": 2,
    "insufficient_evidence": 2
  },
  "quality_band_counts": {
    "uncertain": 4
  }
}
```

Observed failure modes:

- `e2b_calibration_case_003`: Dify returned an empty answer after Hub read-tool calls.
- `e2b_calibration_case_004`: Dify timed out after 120 seconds.

The failures were operational, not quality judgments. The harness failed closed to `insufficient_evidence`.

## Dify No-Tool Retry

The batch harness was tightened to:

- wrap Dify prompts with an explicit no-tool instruction
- forbid Hub read tools in addition to code, crawl, search, and write-capable tools
- keep all Dify outputs shadow-only

Retry command:

```bash
infisical run --env=prod --path=/ --include-imports=true -- \
  pnpm --filter @create-something/webflow-template-review-mcp rubric:reviewer:batch -- \
  --input /tmp/webflow-template-review-direct-e2b-calibration-expanded-2026-05-27 \
  --case-id e2b_calibration_case_003 \
  --case-id e2b_calibration_case_004 \
  --provider dify-agent \
  --agent eric-hub \
  --include-screenshot \
  --timeout-ms 180000 \
  --out /tmp/webflow-template-review-rubric-reviewer-batch-dify-eric-retry-2026-05-27
```

Retry result:

```json
{
  "selected_count": 2,
  "ok_count": 2,
  "failed_count": 0,
  "safety_failure_count": 0,
  "recommendation_counts": {
    "manual_review_required": 2
  },
  "quality_band_counts": {
    "uncertain": 2
  },
  "alignment_counts": {
    "cautious_on_rejected_case": 1,
    "possible_iteration_alignment": 1
  }
}
```

## Observed Standardization

The agent produced usable standardized findings. Recurring buckets included:

- `accessibility`: missing alt attributes, or positive limited alt-coverage signal
- `hierarchy`: multiple H1 elements and semantic-heading review
- `layout_design_quality`: clipped text or overflow candidates that require visual confirmation
- `responsive_design`: single-viewport limitation and multi-breakpoint review requirement

The language stayed creator-safe and generally avoided unsupported final decisions.

## Interpretation

The system is becoming more stable as an evidence and standardization layer:

- the agent did not see private outcomes
- the agent did not issue official decisions
- safety flags held
- tool drift was detected and tightened
- weak evidence resulted in escalation instead of false approval or false rejection

It is not yet strong enough as a quality-band classifier:

- approved-good and approved-exceptional cases stayed `manual_review_required`
- the rejected-low-quality case stayed `manual_review_required`
- text-only Dify did not have actual screenshot image input
- one homepage and one desktop viewport are insufficient for visual quality, outdated style, originality, and polish

This supports the current architecture: use the agent first to standardize evidence, findings, manual checks, and creator-safe draft language. Keep reject/good/exceptional quality calls behind a richer multimodal calibration gate.

## Next Step

The next high-leverage improvement is not more Dify prompting. It is a multimodal quality calibration lane:

- run direct image-capable OpenAI when quota is available
- include desktop and mobile screenshots
- include multiple pages when available
- score 8-12 cases across approved good, approved exceptional, rejected low quality, and changes requested
- require low false-approval and false-rejection rates before exposing quality-band recommendations

Until then, Dify should remain a standardized response assistant, not a final quality judge.
