# Multimodal 8-Case Shadow Eval - 2026-05-27

**Status:** Evidence lane stable; reviewer promotion blocked
**Linear:** `CRE-452`
**Sample:** 8 Airtable `Asset Versions`
**Strata:** 2 approved good, 2 approved exceptional, 2 rejected low quality, 2 iterative review
**Evidence:** 2 pages x 2 viewports per case
**Screenshots:** 32 total

## Purpose

Move beyond the two-case proof and test whether the shadow reviewer can pass the minimum promotion sample size. This run is still calibration-only. It does not write Airtable, D1, R2, Dify decisions, approvals, rejections, ratings, or creator-facing feedback.

## E2B Calibration Run

Command:

```bash
infisical run --env=prod --path=/ --include-imports=true -- \
  pnpm --filter @create-something/webflow-template-review-mcp published-site:sandbox:e2b-calibration -- \
  --limit 8 \
  --strata approved_good,approved_exceptional,rejected_low_quality,iterative_review \
  --bootstrap-browser \
  --max-pages 2 \
  --viewports desktop:1024x768,mobile:390x844 \
  --out /tmp/webflow-template-review-direct-e2b-calibration-8case-multimodal-2026-05-27 \
  --command-timeout-ms 1800000 \
  --sandbox-timeout-ms 1200000
```

Result:

```json
{
  "selected_count": 8,
  "strata_counts": {
    "approved_good": 2,
    "approved_exceptional": 2,
    "rejected_low_quality": 2,
    "iterative_review": 2
  },
  "evidence_status_counts": {
    "usable": 8
  },
  "alignment_counts": {
    "sandbox_minor_signals_on_approved_case": 4,
    "sandbox_did_not_explain_human_rejection": 2,
    "sandbox_did_not_explain_iterative_review": 2
  },
  "screenshot_count": 32,
  "finding_count": 18
}
```

Files:

- `/tmp/webflow-template-review-direct-e2b-calibration-8case-multimodal-2026-05-27/summary.json`
- `/tmp/webflow-template-review-direct-e2b-calibration-8case-multimodal-2026-05-27/manifest.blind.jsonl`
- `/tmp/webflow-template-review-direct-e2b-calibration-8case-multimodal-2026-05-27/outcomes.private.jsonl`
- `/tmp/webflow-template-review-direct-e2b-calibration-8case-multimodal-2026-05-27/sandbox-results.jsonl`
- `/tmp/webflow-template-review-direct-e2b-calibration-8case-multimodal-2026-05-27/status-alignment.jsonl`

## Dry Shadow Eval

Command:

```bash
pnpm --filter @create-something/webflow-template-review-mcp rubric:reviewer:eval -- \
  --input /tmp/webflow-template-review-direct-e2b-calibration-8case-multimodal-2026-05-27 \
  --out /tmp/webflow-template-review-rubric-reviewer-shadow-eval-8case-dry-2026-05-27 \
  --provider dry-run \
  --limit 8
```

Result:

```json
{
  "scored_output_count": 8,
  "false_approval_risk_count": 0,
  "false_rejection_risk_count": 0,
  "provider_failure_count": 0,
  "safety_failure_count": 0,
  "escalation_count": 8,
  "escalation_rate": 1,
  "promotion_gate": {
    "status": "blocked",
    "reasons": [
      "escalation_rate 1 exceeded 0.7"
    ]
  }
}
```

Interpretation:

- The minimum sample-size gate is now satisfied.
- The dry reviewer fails safely with no false approval, false rejection, provider, or safety failures.
- The dry reviewer is not a useful quality-band classifier because it escalates every case.

## OpenAI Multimodal Probe

Before rerunning full direct OpenAI evals, use the provider readiness gate:

```bash
infisical run --env=prod --path=/ --include-imports=true -- \
  pnpm --filter @create-something/webflow-template-review-mcp openai:multimodal:preflight -- \
  --out /tmp/webflow-template-review-openai-multimodal-readiness-2026-05-27 \
  --model gpt-5.5 \
  --image-detail low
```

Original quota-blocked result:

```json
{
  "schema_version": "openai_multimodal_readiness.v0.1",
  "provider": "openai",
  "model": "gpt-5.5",
  "status": "not_ready",
  "ok": false,
  "image_input_attached": true,
  "http_status": 429,
  "failure_kind": "insufficient_quota"
}
```

After the Webflow OpenAI API key was verified and stored as `OPENAI_API_KEY` in Infisical prod/root, the same preflight passed:

```json
{
  "schema_version": "openai_multimodal_readiness.v0.1",
  "provider": "openai",
  "model": "gpt-5.5",
  "status": "ready",
  "ok": true,
  "image_input_attached": true,
  "http_status": 200,
  "output_text": "image-input-ready"
}
```

The first preflight attempt used a 1x1 PNG and was rejected as invalid image input. The preflight now generates a 64x64 PNG in memory.

Command:

```bash
infisical run --env=prod --path=/ --include-imports=true -- \
  pnpm --filter @create-something/webflow-template-review-mcp rubric:reviewer:dry-run -- \
  --input /tmp/webflow-template-review-direct-e2b-calibration-8case-multimodal-2026-05-27 \
  --case-id e2b_calibration_case_005 \
  --provider openai \
  --model gpt-5.5 \
  --include-screenshot \
  --max-screenshots 4 \
  --image-detail low \
  --out /tmp/webflow-template-review-rubric-reviewer-openai-probe-upword-8case-2026-05-27
```

Result:

```json
{
  "provider": "openai",
  "model": "gpt-5.5",
  "case_id": "e2b_calibration_case_005",
  "template_name": "Upword",
  "screenshot_used": true,
  "screenshot_count": 4,
  "screenshot_image_input_attached": true,
  "recommendation": "insufficient_evidence",
  "quality_band": "uncertain",
  "manual_checks_remaining": [
    "provider_retry",
    "human_review"
  ]
}
```

The Responses API path attached four image inputs, but the account still returned `429 insufficient_quota`. The harness failed closed and did not emit a quality judgment.

## OpenAI 8-Case Shadow Eval

Command:

```bash
infisical run --env=prod --path=/ --include-imports=true -- \
  pnpm --filter @create-something/webflow-template-review-mcp rubric:reviewer:eval -- \
  --input /tmp/webflow-template-review-direct-e2b-calibration-8case-multimodal-2026-05-27 \
  --out /tmp/webflow-template-review-rubric-reviewer-shadow-eval-8case-openai-2026-05-27 \
  --provider openai \
  --model gpt-5.5 \
  --limit 8 \
  --require-image-inputs \
  --timeout-ms 180000
```

Initial scorer result:

```json
{
  "scored_output_count": 8,
  "false_approval_risk_count": 0,
  "false_rejection_risk_count": 0,
  "provider_failure_count": 0,
  "safety_failure_count": 0,
  "image_input_count": 8,
  "escalation_count": 5,
  "escalation_rate": 0.625,
  "promotion_gate": {
    "status": "candidate_for_human_review",
    "reasons": []
  }
}
```

The initial gate showed a meaningful improvement over dry-run and Dify:

- all eight cases attached screenshot image inputs
- provider and safety failures cleared
- false approval and false rejection risk stayed at zero
- escalation dropped below the previous threshold

However, the result still missed both approved-exceptional cases:

```json
{
  "by_expected_outcome": {
    "approved_exceptional": {
      "missed_exceptional_candidate": 2
    }
  }
}
```

The scorer was tightened after this run to add `max_missed_exceptional_rate`, defaulting to zero. Rescoring the same OpenAI batch without spending new model tokens produced:

```json
{
  "expected_exceptional_count": 2,
  "missed_exceptional_candidate_count": 2,
  "missed_exceptional_candidate_rate": 1,
  "image_input_count": 8,
  "promotion_gate": {
    "status": "blocked",
    "reasons": [
      "missed_exceptional_rate 1 exceeded 0"
    ]
  }
}
```

Interpretation:

- Direct multimodal OpenAI is now viable for evidence-aware shadow review.
- The current prompt/scorer is safe against false approvals in this sample.
- It is not ready to flag exceptional or featured candidates because it missed 2/2 historical exceptional examples.
- The next calibration target is exceptional recall, not rejection safety.

## Exceptional Recall Calibration

The prompt was adjusted to distinguish:

- official featured/exceptional decision: still forbidden
- internal `exceptional_human_review_candidate` routing: allowed only as non-final human lead review
- ordinary `manual_review_required`: used when evidence lacks a strong positive or negative route signal

Focused two-case run over only the approved-exceptional rows:

```bash
infisical run --env=prod --path=/ --include-imports=true -- \
  pnpm --filter @create-something/webflow-template-review-mcp rubric:reviewer:eval -- \
  --input /tmp/webflow-template-review-direct-e2b-calibration-8case-multimodal-2026-05-27 \
  --out /tmp/webflow-template-review-rubric-reviewer-shadow-eval-exceptional-prompt-openai-2026-05-27 \
  --provider openai \
  --model gpt-5.5 \
  --case-id e2b_calibration_case_003 \
  --case-id e2b_calibration_case_004 \
  --require-image-inputs \
  --timeout-ms 180000 \
  --min-scored-count 2
```

Result:

```json
{
  "scored_output_count": 2,
  "false_approval_risk_count": 0,
  "provider_failure_count": 0,
  "expected_exceptional_count": 2,
  "missed_exceptional_candidate_count": 0,
  "image_input_count": 2,
  "promotion_gate": {
    "status": "candidate_for_human_review",
    "reasons": []
  }
}
```

This proved that exceptional recall can be improved when the model is allowed to treat `exceptional_human_review_candidate` as routing rather than a final rating.

The same prompt did not hold on the full eight-case sample:

```json
{
  "scored_output_count": 8,
  "false_approval_risk_count": 2,
  "false_approval_risk_rate": 0.25,
  "expected_exceptional_count": 2,
  "missed_exceptional_candidate_count": 1,
  "missed_exceptional_candidate_rate": 0.5,
  "provider_failure_count": 0,
  "image_input_count": 8,
  "promotion_gate": {
    "status": "blocked",
    "reasons": [
      "false_approval_rate 0.25 exceeded 0",
      "missed_exceptional_rate 0.5 exceeded 0"
    ]
  }
}
```

The false approval cases were informative:

- `Upword`, historically rejected for outdated/default visual style, was initially over-promoted to `clean_good_candidate` because the sandbox had no deterministic hard blocker and the model over-weighted surface polish.
- `NextAI`, historically changes requested, was initially over-promoted to `exceptional_human_review_candidate` even though the evidence included an `/untitled-8` page, missing H1, and 53/53 images missing alt text.

Guardrails were added for screenshot-visible quality risks: outdated/default style, weak typography, generic stock or cutout-heavy composition, repetitive section patterns, low layout variety, oversized empty/unfinished areas, awkward mobile crops, placeholder or untitled routes, and saturated-category sameness.

Focused four-case regression after the guardrails:

```json
{
  "scored_output_count": 4,
  "false_approval_risk_count": 0,
  "false_rejection_risk_count": 0,
  "provider_failure_count": 1,
  "expected_exceptional_count": 2,
  "missed_exceptional_candidate_count": 1,
  "promotion_gate": {
    "status": "blocked",
    "reasons": [
      "provider_failure_rate 0.25 exceeded 0",
      "missed_exceptional_rate 0.5 exceeded 0"
    ]
  }
}
```

Interpretation:

- The visual-risk guardrails reduced the dangerous false approvals in the focused regression.
- The same guardrails also made the broad reviewer too conservative for exceptional recall.
- One OpenAI request hit a transient `502 Bad gateway`; the direct OpenAI reviewer now retries retryable 408/409/429/5xx or network failures up to three attempts before failing closed.
- The stable next architecture is a conservative primary reviewer plus a separate exceptional-route specialist or judge panel, rather than one prompt that owns reject/good/exceptional routing.

## Exceptional Candidate Specialist Lane

The standalone `exceptional_candidate` lane was implemented after the broad-prompt regression. Its contract is narrower:

- may emit `exceptional_human_review_candidate`
- may emit `not_exceptional_enough`
- may emit `insufficient_exceptional_evidence`
- must not approve, reject, rate, feature, write creator-facing feedback, or write external systems

Dry smoke:

```bash
pnpm --filter @create-something/webflow-template-review-mcp exceptional:lane:run -- \
  --provider dry-run \
  --limit 2 \
  --out /tmp/webflow-template-review-exceptional-candidate-lane-dry-smoke-2026-05-27

pnpm --filter @create-something/webflow-template-review-mcp exceptional:lane:score -- \
  --input /tmp/webflow-template-review-exceptional-candidate-lane-dry-smoke-2026-05-27 \
  --min-scored-count 2 \
  --out /tmp/webflow-template-review-exceptional-candidate-lane-dry-smoke-2026-05-27/score
```

Dry result:

```json
{
  "scored_output_count": 2,
  "false_exceptional_risk_count": 0,
  "approved_good_overpromotion_count": 0,
  "provider_failure_count": 2,
  "promotion_gate": {
    "status": "blocked",
    "reasons": [
      "provider_failure_rate 1 exceeded 0"
    ]
  }
}
```

Four-case OpenAI regression over the two approved-exceptional canaries plus the two prior over-promotion controls:

```bash
infisical run --env=prod --path=/ --include-imports=true -- \
  pnpm --filter @create-something/webflow-template-review-mcp exceptional:lane:run -- \
  --provider openai \
  --model gpt-5.5 \
  --case-id e2b_calibration_case_003 \
  --case-id e2b_calibration_case_004 \
  --case-id e2b_calibration_case_005 \
  --case-id e2b_calibration_case_008 \
  --out /tmp/webflow-template-review-exceptional-candidate-lane-openai-4case-v2-2026-05-27

pnpm --filter @create-something/webflow-template-review-mcp exceptional:lane:score -- \
  --input /tmp/webflow-template-review-exceptional-candidate-lane-openai-4case-v2-2026-05-27 \
  --out /tmp/webflow-template-review-exceptional-candidate-lane-openai-4case-v2-2026-05-27/score \
  --min-scored-count 4 \
  --require-image-inputs
```

Result:

```json
{
  "scored_output_count": 4,
  "expected_exceptional_count": 2,
  "false_exceptional_risk_count": 0,
  "approved_good_overpromotion_count": 0,
  "missed_exceptional_candidate_count": 2,
  "missed_exceptional_candidate_rate": 1,
  "provider_failure_count": 0,
  "image_input_count": 4,
  "promotion_gate": {
    "status": "blocked",
    "reasons": [
      "missed_exceptional_rate 1 exceeded 0"
    ]
  }
}
```

Interpretation:

- The specialist lane now has the right safety posture: it did not over-route the rejected low-quality or iterative-review controls.
- It is too conservative to recognize approved-exceptional cases from screenshots and deterministic evidence alone.
- More prompt relaxation would likely reopen false-exceptional risk. The next improvement should be precedent retrieval: approved-exceptional examples and rejected visual-quality counterexamples, scoped by category and rubric criterion, fed into this lane before the route decision.

The full eight-case run after the same correction recovered one of two approved-exceptional canaries while keeping the safety metrics clean:

```bash
infisical run --env=prod --path=/ --include-imports=true -- \
  pnpm --filter @create-something/webflow-template-review-mcp exceptional:lane:run -- \
  --provider openai \
  --model gpt-5.5 \
  --limit 8 \
  --out /tmp/webflow-template-review-exceptional-candidate-lane-openai-8case-v1-2026-05-27

pnpm --filter @create-something/webflow-template-review-mcp exceptional:lane:score -- \
  --input /tmp/webflow-template-review-exceptional-candidate-lane-openai-8case-v1-2026-05-27 \
  --out /tmp/webflow-template-review-exceptional-candidate-lane-openai-8case-v1-2026-05-27/score \
  --min-scored-count 8 \
  --require-image-inputs
```

Result:

```json
{
  "scored_output_count": 8,
  "expected_exceptional_count": 2,
  "false_exceptional_risk_count": 0,
  "approved_good_overpromotion_count": 0,
  "missed_exceptional_candidate_count": 1,
  "missed_exceptional_candidate_rate": 0.5,
  "provider_failure_count": 0,
  "image_input_count": 8,
  "promotion_gate": {
    "status": "blocked",
    "reasons": [
      "missed_exceptional_rate 0.5 exceeded 0"
    ]
  }
}
```

This is the best current posture for exceptional routing:

- safety is clean across approved-good, rejected-low-quality, and iterative-review controls
- Frentavo was routed as `exceptional_human_review_candidate`
- Calmlyss was missed as `not_exceptional_enough`
- the gate remains blocked until approved-exceptional recall improves

The Calmlyss miss is a precedent problem, not a provider problem. The lane saw cohesive wellness/spa craft but judged it as premium-minimal/good rather than exceptional. The next version should retrieve approved-exceptional precedents by category/style before judging whether sparse wellness/editorial layouts clear the exceptional route floor.

## Precedent And Reviewer Calibration Follow-Up

The first wider visual-quality precedent pull sampled 170 Airtable rows:

- 120 rejected rows
- 30 approved Good rows
- 20 approved Exceptional rows
- 66 rows with normalized visual-quality language
- 8 rows with exact outdated-style phrasing

That pull is useful for vocabulary normalization, but not yet enough to solve exceptional recall. Feeding the proposed golden cases into the eight-case exceptional lane kept safety clean but still missed one of two approved-exceptional canaries:

```json
{
  "scored_output_count": 8,
  "expected_exceptional_count": 2,
  "false_exceptional_risk_count": 0,
  "approved_good_overpromotion_count": 0,
  "missed_exceptional_candidate_count": 1,
  "missed_exceptional_candidate_rate": 0.5,
  "provider_failure_count": 0,
  "image_input_count": 8,
  "promotion_gate": {
    "status": "blocked",
    "reasons": [
      "missed_exceptional_rate 0.5 exceeded 0"
    ]
  }
}
```

Reviewer concentration is the larger calibration risk. The current eight-case outcome set has seven cases from Mariana Segura and one from Shea Sisco. The wider visual-feedback pull has six reviewers, but visual-signal language varies sharply by reviewer:

- Mariana Segura: 88 visual-feedback rows, 0.7955 visual-signal rate
- Natalia Ledford: 28 visual-feedback rows, 0.2857 exact outdated-phrase rate
- Pablo Miranda: 28 visual-feedback rows, 0 visual-signal rate
- Shea Sisco: 19 visual-feedback rows, 0.1053 visual-signal rate

Interpretation:

- Reviewer identity is a bias-audit dimension, not an active review-policy dimension.
- Do not tune the exceptional lane from the eight-case set alone.
- Widen the next set with reviewer-balanced sampling before changing subjective thresholds.
- Treat "outdated visual style" as a normalized manual-quality bucket that needs cross-reviewer validation, not as a deterministic rejection phrase.

## Dify Agent Shadow Eval

Command:

```bash
infisical run --env=prod --path=/ --include-imports=true -- \
  pnpm --filter @create-something/webflow-template-review-mcp rubric:reviewer:eval -- \
  --input /tmp/webflow-template-review-direct-e2b-calibration-8case-multimodal-2026-05-27 \
  --out /tmp/webflow-template-review-rubric-reviewer-shadow-eval-8case-dify-2026-05-27 \
  --provider dify-agent \
  --agent eric-hub \
  --limit 8 \
  --timeout-ms 120000
```

Result:

```json
{
  "scored_output_count": 8,
  "false_approval_risk_count": 0,
  "false_rejection_risk_count": 0,
  "provider_failure_count": 1,
  "provider_failure_rate": 0.125,
  "safety_failure_count": 0,
  "escalation_count": 7,
  "escalation_rate": 0.875,
  "image_input_count": 0,
  "promotion_gate": {
    "status": "blocked",
    "reasons": [
      "provider_failure_rate 0.125 exceeded 0",
      "escalation_rate 0.875 exceeded 0.7"
    ]
  }
}
```

Interpretation:

- Dify produced structured standardized findings for most cases.
- It remained text-only; screenshot paths were present, but no image input was attached.
- It reduced escalation slightly compared with dry-run, but not enough for promotion.
- It introduced provider instability in 1 of 8 cases.
- It is currently better treated as a standardized-response assistant than as the quality-band judge.

## Stability Assessment

The system is becoming more stable in the evidence and gating layers:

- evidence collection succeeded for all 8 selected cases
- private outcomes remained separate from blind prompts
- screenshot artifacts are repeatable enough to hash and packetize
- promotion gates blocked both unsafe or unhelpful reviewer paths
- provider and quota failures became explicit artifacts instead of implicit judgment errors

The system is not yet stable as an autonomous reviewer:

- static published-site validators did not explain low-quality rejections or iterative feedback
- Dify cannot evaluate actual screenshot pixels in this setup
- direct OpenAI image judging is available, but the current rubric prompt missed exceptional candidates
- the current agents still do not provide reliable exceptional or featured-candidate recall

## Recommended Next Step

Create the next exceptional-recall calibration pass. Keep `openai:multimodal:preflight` as the provider gate, then rerun the same eight-case packet after prompt or rubric changes:

```bash
infisical run --env=prod --path=/ --include-imports=true -- \
  pnpm --filter @create-something/webflow-template-review-mcp rubric:reviewer:eval -- \
  --input /tmp/webflow-template-review-direct-e2b-calibration-8case-multimodal-2026-05-27 \
  --out /tmp/webflow-template-review-rubric-reviewer-shadow-eval-8case-openai-2026-05-27 \
  --provider openai \
  --model gpt-5.5 \
  --limit 8 \
  --require-image-inputs \
  --max-missed-exceptional-rate 0
```

Promotion should remain blocked unless direct multimodal scoring reduces escalation and recognizes exceptional candidates without introducing false approvals, false rejections, provider failures, or safety failures.
