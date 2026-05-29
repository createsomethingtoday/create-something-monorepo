# Multimodal Evidence Smoke - 2026-05-27

**Status:** Evidence lane validated; direct model call blocked by OpenAI quota
**Linear:** `CRE-452`
**Subset:** 2 cases
**Evidence:** 2 pages x 2 viewports per case
**Screenshots:** 8 total

## Goal

Move the quality-review harness from a single desktop screenshot toward a real multimodal calibration packet. This keeps quality-band decisions shadow-only while making the evidence format strong enough for future image-capable model scoring.

## Code Changes

The rubric reviewer now supports a bounded screenshot set:

```bash
pnpm --filter @create-something/webflow-template-review-mcp rubric:reviewer:dry-run -- \
  --include-screenshot \
  --max-screenshots 4
```

The batch wrapper forwards `--max-screenshots` and records screenshot count plus whether image inputs were actually attached. Dify remains text-only; direct OpenAI is the image-input path.

## Fresh Evidence Run

Command:

```bash
infisical run --env=prod --path=/ --include-imports=true -- \
  pnpm --filter @create-something/webflow-template-review-mcp published-site:sandbox:e2b-calibration -- \
  --limit 2 \
  --strata approved_exceptional,rejected_low_quality \
  --bootstrap-browser \
  --max-pages 2 \
  --viewports desktop:1024x768,mobile:390x844 \
  --out /tmp/webflow-template-review-direct-e2b-calibration-multimodal-smoke-2026-05-27 \
  --command-timeout-ms 1800000 \
  --sandbox-timeout-ms 1200000
```

Result:

```json
{
  "selected_count": 2,
  "strata_counts": {
    "approved_exceptional": 1,
    "rejected_low_quality": 1
  },
  "evidence_status_counts": {
    "usable": 2
  },
  "alignment_counts": {
    "sandbox_minor_signals_on_approved_case": 1,
    "sandbox_did_not_explain_human_rejection": 1
  },
  "screenshot_count": 8,
  "finding_count": 4,
  "options": {
    "max_pages": 2,
    "viewports": "desktop:1024x768,mobile:390x844"
  }
}
```

Cases:

- `Frentavo`: historically approved / exceptional.
- `Upword`: historically rejected / low quality.

## Reviewer Prompt Smoke

Command:

```bash
pnpm --filter @create-something/webflow-template-review-mcp rubric:reviewer:dry-run -- \
  --input /tmp/webflow-template-review-direct-e2b-calibration-multimodal-smoke-2026-05-27 \
  --case-id e2b_calibration_case_002 \
  --provider dry-run \
  --include-screenshot \
  --max-screenshots 4 \
  --out /tmp/webflow-template-review-rubric-reviewer-multimodal-dry-upword-2026-05-27
```

Result:

```json
{
  "case_id": "e2b_calibration_case_002",
  "template_name": "Upword",
  "screenshot_used": false,
  "screenshot_count": 4,
  "screenshot_image_input_attached": false,
  "recommendation": "manual_review_required",
  "quality_band": "uncertain"
}
```

The prompt artifact correctly included four local screenshot paths:

- homepage desktop
- homepage mobile
- about page desktop
- about page mobile

Because this was a dry run, no image input was attached to a model.

## Reusable Packet

Added:

```bash
pnpm --filter @create-something/webflow-template-review-mcp multimodal:packet
```

Command:

```bash
pnpm --filter @create-something/webflow-template-review-mcp multimodal:packet -- \
  --input /tmp/webflow-template-review-direct-e2b-calibration-multimodal-smoke-2026-05-27 \
  --out /tmp/webflow-template-review-multimodal-review-packet-2026-05-27 \
  --max-screenshots 8
```

Result:

```json
{
  "case_count": 2,
  "screenshot_count": 8,
  "private_outcome_count": 2,
  "files": {
    "blind_jsonl": "/tmp/webflow-template-review-multimodal-review-packet-2026-05-27/multimodal-review-packet.blind.jsonl",
    "private_jsonl": "/tmp/webflow-template-review-multimodal-review-packet-2026-05-27/multimodal-review-packet.private.jsonl",
    "blind_contact_sheet": "/tmp/webflow-template-review-multimodal-review-packet-2026-05-27/index.blind.html",
    "private_contact_sheet": "/tmp/webflow-template-review-multimodal-review-packet-2026-05-27/index.private.html"
  }
}
```

Validation:

- Blind packet rows include screenshot paths, copied packet paths, SHA-256 hashes, bytes, dimensions, evidence summaries, and normalized findings.
- Blind packet rows do not include private outcomes.
- Private packet rows include historical outcomes and no screenshot payloads.
- Contact sheet files were generated. A Playwright screenshot check was attempted, but local Playwright browser binaries were not installed after cache cleanup, so visual browser verification was skipped rather than reinstalling large browser binaries.

## Promotion Gate Scorer

Added:

```bash
pnpm --filter @create-something/webflow-template-review-mcp rubric:reviewer:score
```

Command:

```bash
pnpm --filter @create-something/webflow-template-review-mcp rubric:reviewer:score -- \
  --input /tmp/webflow-template-review-rubric-reviewer-batch-multimodal-dry-2026-05-27 \
  --out /tmp/webflow-template-review-rubric-reviewer-score-multimodal-default-gate-2026-05-27
```

Result:

```json
{
  "scored_output_count": 2,
  "false_approval_risk_count": 0,
  "false_rejection_risk_count": 0,
  "provider_failure_count": 0,
  "escalation_count": 2,
  "escalation_rate": 1,
  "by_comparison": {
    "missed_exceptional_candidate": 1,
    "cautious_on_rejected_case": 1
  },
  "promotion_gate": {
    "status": "blocked",
    "reasons": [
      "scored_output_count 2 below 8",
      "escalation_rate 1 exceeded 0.7"
    ]
  }
}
```

Interpretation:

- The current dry reviewer does not create false approvals or false rejections.
- It is not promotable as a quality-band classifier because it escalates every case and misses the exceptional case.
- This is acceptable for a standardized-response assistant, but blocks quality-band automation.

## One-Command Shadow Eval

Added:

```bash
pnpm --filter @create-something/webflow-template-review-mcp rubric:reviewer:eval
```

Command:

```bash
pnpm --filter @create-something/webflow-template-review-mcp rubric:reviewer:eval -- \
  --input /tmp/webflow-template-review-direct-e2b-calibration-multimodal-smoke-2026-05-27 \
  --out /tmp/webflow-template-review-rubric-reviewer-shadow-eval-multimodal-dry-2026-05-27 \
  --provider dry-run \
  --limit 2
```

Result:

```json
{
  "provider": "dry-run",
  "ok": false,
  "promotion_gate": {
    "status": "blocked",
    "reasons": [
      "scored_output_count 2 below 8",
      "escalation_rate 1 exceeded 0.7"
    ]
  },
  "stages": {
    "packet": 0,
    "reviewer_batch": 0,
    "score": 0
  }
}
```

Files:

- `/tmp/webflow-template-review-rubric-reviewer-shadow-eval-multimodal-dry-2026-05-27/rubric-reviewer-shadow-eval-summary.json`
- `/tmp/webflow-template-review-rubric-reviewer-shadow-eval-multimodal-dry-2026-05-27/packet/summary.json`
- `/tmp/webflow-template-review-rubric-reviewer-shadow-eval-multimodal-dry-2026-05-27/reviewer-batch/rubric-reviewer-batch-summary.json`
- `/tmp/webflow-template-review-rubric-reviewer-shadow-eval-multimodal-dry-2026-05-27/score/rubric-reviewer-score-summary.json`

The orchestrator starts from an existing calibration directory. It does not call Airtable, E2B, D1, R2, or reviewer write tools.

## Direct OpenAI Attempt

Command:

```bash
infisical run --env=prod --path=/ --include-imports=true -- \
  pnpm --filter @create-something/webflow-template-review-mcp rubric:reviewer:dry-run -- \
  --input /tmp/webflow-template-review-direct-e2b-calibration-multimodal-smoke-2026-05-27 \
  --case-id e2b_calibration_case_002 \
  --provider openai \
  --model gpt-5.5 \
  --include-screenshot \
  --max-screenshots 4 \
  --image-detail low \
  --out /tmp/webflow-template-review-rubric-reviewer-multimodal-openai-upword-2026-05-27
```

Result:

```json
{
  "provider": "openai",
  "model": "gpt-5.5",
  "status": "failed",
  "recommendation": "insufficient_evidence",
  "quality_band": "uncertain",
  "screenshot_used": true,
  "screenshot_count": 4,
  "screenshot_image_input_attached": true
}
```

The call reached the OpenAI Responses API with four screenshot image inputs attached, but the account returned:

```text
429 insufficient_quota
```

The harness failed closed and kept the case in human review.

## Interpretation

This is a meaningful stability improvement:

- the evidence lane can now produce multi-page, multi-viewport screenshots
- the reviewer prompt can carry a bounded screenshot set
- Dify is explicitly treated as text-only
- direct OpenAI is the only image-input path
- provider failure is not confused with a quality judgment

This still does not solve outdated-style scoring. The next blocker is provider quota, not evidence shape. Once direct image-capable calls are available, the same two-case packet is ready for a real multimodal comparison between approved-exceptional and rejected-low-quality examples.
