# Quality Band Readiness Gate

**Status:** Draft
**Date:** 2026-05-27
**Related artifacts:** `rubric-codification-map.md`, `subjective-judge-panel-eval-harness.md`, `visual-quality-proxy-canary-audit-2026-05-26.md`, `balanced-50-multimodal-calibration-2026-05-27.md`

## Purpose

This gate answers one operational question: is the review system ready to expose quality-band judgment, or should it remain evidence/creator-guidance only?

The gate intentionally aggregates shadow evaluation outputs. It does not call model providers, does not write Airtable, does not write D1, and does not create reviewer-facing decisions.

## Inputs

The readiness scorer can consume these summaries:

- `subjective-panel-eval-score-summary.json`
- `rubric-reviewer-score-summary.json`
- `exceptional-candidate-score-summary.json`
- `visual-proxy-canary-summary.json`

Each input is optional for experimentation, but missing lanes should block promotion because missing evidence means the system has not proved readiness for that decision surface.

## Explicit Exclusion

Popularity, sales, views, favorites, and marketplace engagement are intentionally excluded from this quality-readiness corpus.

Those metrics may be useful for separate business analysis, but they can muddy review calibration because they are confounded by category demand, creator audience, launch timing, price, marketplace placement, promotion, and historical distribution. They must not approve, reject, score, or flag Exceptional candidates in this quality gate.

## Script

Run the fixture smoke:

```bash
pnpm --filter @create-something/webflow-template-review-mcp quality:readiness:score -- \
  --subjective-panel-summary fixtures/quality-band-readiness/subjective-panel-eval-score-summary.blocked.sample.json \
  --rubric-reviewer-summary fixtures/quality-band-readiness/rubric-reviewer-score-summary.blocked.sample.json \
  --exceptional-lane-summary fixtures/quality-band-readiness/exceptional-candidate-score-summary.blocked.sample.json \
  --visual-proxy-canary-summary fixtures/quality-band-readiness/visual-proxy-canary-summary.blocked.sample.json \
  --out /tmp/webflow-template-review-quality-band-readiness-fixture-smoke
```

This writes:

- `quality-band-readiness-summary.json`
- `quality-band-readiness-summary.md`
- `quality-band-readiness-ledger-import.sql`
- `quality-band-readiness-ledger-summary.json`
- `quality-band-readiness-artifact-manifest.json`

The ledger SQL targets `quality_band_readiness_runs` and
`quality_band_readiness_artifacts` in `review-ledger.phase1.sql`. The script
only writes local artifacts; it does not apply D1 migrations or insert rows.

Derive the coordinator exposure artifact:

```bash
pnpm --filter @create-something/webflow-template-review-mcp coordinator:exposure-policy -- \
  --input /tmp/webflow-template-review-quality-band-readiness-fixture-smoke/quality-band-readiness-summary.json \
  --out /tmp/webflow-template-review-coordinator-exposure-policy-fixture-smoke
```

This writes:

- `coordinator-exposure-policy.json`
- `coordinator-exposure-policy.md`

The exposure policy is the Dify-facing contract. It translates readiness into allowed outputs, blocked outputs, required human gates, and lead-approval requirements. It does not call providers, does not write D1 or Airtable, and does not authorize marketplace decisions.

## Readiness Levels

| Level | Meaning |
|---|---|
| `blocked_no_calibration` | No usable shadow calibration summaries exist. |
| `creator_guidance_only` | The system may generate evidence and revision guidance, but quality-band output is unsafe. |
| `shadow_only` | Continue internal shadow evaluation; do not expose quality bands in Dify or reviewer-facing flows. |
| `reviewer_assist_candidate` | A human may review whether limited reviewer-assist quality cues are appropriate. |
| `quality_band_shadow_expansion_candidate` | The next step is wider shadow evaluation, not autonomous production decisions. |

## Default Promotion Gates

- false approval risk rate must be `0`
- false rejection risk rate must be `<= 0.05`
- missed Exceptional candidate rate must be `<= 0.25`
- false Exceptional rate must be `0`
- approved Good overpromotion rate must be `0`
- approved-control visual-proxy collision rate must be `<= 0.1`
- rejected visual-quality proxy recall must be `>= 0.8`
- escalation rate must be `<= 0.7`
- safety failures and provider failures must be `0`

The fixture intentionally fails several of these gates and returns `creator_guidance_only`. That is the expected safe posture until the shadow lanes improve.

## Current Interpretation

The system is improving because it now has a quantitative blocker list instead of a vague confidence estimate. The current safe posture remains:

- objective findings: reviewer-assist ready
- creator guidance: reviewer-assist ready
- visual quality: evidence-only / shadow-only
- Average vs Good vs Exceptional: not ready for autonomous decisions

The next measurable improvement is to reduce false approval risk and Exceptional overpromotion to zero on a reviewer-balanced golden set while maintaining recall for approved Exceptional cases.

## Dify Exposure Boundary

Dify should read a coordinator exposure policy derived from the readiness artifact to decide which review lanes are allowed:

- `creator_guidance_only`: evidence and creator coaching only
- `shadow_only`: internal calibration only; no reviewer-facing quality band
- `reviewer_assist_candidate`: human lead must approve before exposing assistive quality cues
- `quality_band_shadow_expansion_candidate`: expand shadow evaluation; still not autonomous approval/rejection

Dify must not convert a readiness artifact or coordinator exposure policy into a final marketplace decision. The readiness artifact and exposure policy are control-plane gates, not review outcomes.

The exposure policy must always block:

- autonomous approval
- autonomous rejection
- final quality bands
- featured or Exceptional decisions
- Airtable writes without reviewer confirmation
- creator-facing final decision language
- quality decisions from popularity, sales, views, favorites, or marketplace engagement
