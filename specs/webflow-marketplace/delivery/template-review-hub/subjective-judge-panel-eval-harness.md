# Subjective Judge Panel Eval Harness

**Status:** Draft
**Date:** 2026-05-26
**Related artifacts:** `ai-reviewer-proposal-alignment.md`, `review-orchestration-model.md`, `review-lane-contracts.md`, `visual-quality-calibration-audit-2026-05-26.md`

## Purpose

This harness is the first safe implementation step for the proposed three-judge panel. It does not run LLM judges yet. It defines the blind eval set, private answers, expected panel-output schema, and scoring metrics needed before any subjective panel can become reviewer-facing.

The goal is to test whether a panel can align with locked human outcomes on a small subset of subjective criteria without creating false approvals, false rejections, or unstable escalation behavior.

## Eval Set Shape

Start with 20-30 cases from the visual-quality calibration outputs:

- approved `Good` controls
- approved `Exceptional` controls
- rejected visual-quality cases
- rejected app/guideline controls that should not become visual-quality rejections

Use two or three subjective criteria first:

- `visual_quality`
- `visual_hierarchy`
- `polish_and_coherence`

Do not include broad final-review labels in the panel prompt. The prompt input should be a blind manifest with template context, URL, criteria, allowed evidence sources, and artifact references only.

## Scripts

Prepare a blind eval set from a visual-quality calibration output directory:

```bash
pnpm --filter @create-something/webflow-template-review-mcp panel:eval:prepare -- \
  --input /tmp/webflow-template-review-visual-quality-calibration-2026-05-26-v3 \
  --out /tmp/webflow-template-review-subjective-panel-eval
```

This writes:

- `subjective-panel-eval.cases.jsonl`: safe blind cases for panel prompts.
- `subjective-panel-eval.answers.private.jsonl`: private locked answers for scoring only.
- `subjective-panel-output.template.json`: expected shadow panel output shape.
- `subjective-panel-eval-summary.json`: case counts and gating notes.

After a panel runner produces `subjective-panel-output.jsonl`, score it:

```bash
pnpm --filter @create-something/webflow-template-review-mcp panel:eval:score -- \
  --input /tmp/webflow-template-review-subjective-panel-eval \
  --panel-output /tmp/webflow-template-review-subjective-panel-eval/subjective-panel-output.jsonl
```

This writes:

- `subjective-panel-eval-scored.jsonl`
- `subjective-panel-eval-score-summary.json`

The current safe runner does not call model providers. It generates independent judge prompts and, in dry-run mode, conservative placeholder outputs that always escalate:

```bash
pnpm --filter @create-something/webflow-template-review-mcp panel:eval:run -- \
  --input /tmp/webflow-template-review-subjective-panel-eval \
  --mode dry-run
```

This writes:

- `subjective-panel-prompts.jsonl`
- `subjective-panel-output.jsonl` in `dry-run` mode
- `subjective-panel-run-summary.json`

The first provider-backed path is opt-in OpenAI live mode. It still writes shadow artifacts only:

```bash
OPENAI_API_KEY=... OPENAI_MODEL=... \
pnpm --filter @create-something/webflow-template-review-mcp panel:eval:run -- \
  --input /tmp/webflow-template-review-subjective-panel-eval \
  --provider openai \
  --max-cases 1 \
  --criteria visual_quality
```

Live mode writes the same `subjective-panel-output.jsonl` shape. It does not write Airtable, D1, or reviewer-facing feedback.

## Required Panel Output

Each panel output row should represent one case and one criterion:

```json
{
  "case_id": "subjective_panel_2026-05-26:rec...",
  "criterion_id": "visual_quality",
  "panel_version": "subjective_panel.v0.1",
  "status": "shadow",
  "panel_band": "good",
  "panel_score": 4,
  "confidence": "medium",
  "agreement_level": "medium",
  "escalation_required": true,
  "reasoning_summary": "Short evidence-grounded criterion reasoning.",
  "evidence_references": ["visual_proxy_artifact", "approved_precedent:..."],
  "judges": [
    {
      "judge_id": "judge_1",
      "provider": "openai",
      "model": "model-id",
      "score": 4,
      "band": "good",
      "confidence": "medium",
      "reasoning_summary": "Short independent reasoning.",
      "cost_usd": 0.01,
      "latency_ms": 1200
    }
  ],
  "cost_usd": 0.03,
  "latency_ms": 2400
}
```

Allowed `panel_band` values:

- `reject`
- `average`
- `good`
- `exceptional`
- `uncertain`

## Metrics

The scorer computes:

- expected output count
- scored output count
- missing output count
- exact match rate
- acceptable rate
- false approval risk rate
- false rejection risk rate
- escalation rate
- low-agreement rate
- cost
- latency
- by-criterion comparison counts

The most important metric is false approval risk. A rejected visual-quality case must not receive a passing band without escalation.

## Promotion Gate

The default promotion gate is intentionally strict:

- false approval risk rate must be `0`
- false rejection risk rate must be `<= 0.05`
- escalation rate must be `<= 0.7`
- expected outputs must not be missing

Passing this gate only means the criterion is a candidate for human review of the eval result. It does not authorize autonomous final decisions.

## Stability Rules

- Private answers must never be included in panel prompts.
- Proposed precedents must not be retrieved into judge prompts.
- Panel outputs must stay criterion-level, not final-review-level.
- Visual-quality panel output remains shadow mode until approved-control false rejection and rejected-visual false approval behavior are acceptable.
- Human reviewers own final approval, rejection, and Exceptional/featured decisions.

## Next Implementation Step

After the first provider-backed smoke is stable, extend the panel runner:

1. reads `subjective-panel-eval.cases.jsonl`
2. retrieves only approved criterion-scoped precedents
3. adds the second and third model providers behind the same output contract
4. calls the selected judge models independently
5. runs a second-round deliberation only when configured
6. writes `subjective-panel-output.jsonl`
7. never writes Airtable, D1, or reviewer-facing feedback directly
