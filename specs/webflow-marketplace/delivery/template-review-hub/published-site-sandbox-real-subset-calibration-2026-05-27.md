# Published Site Sandbox Real-Subset Calibration - 2026-05-27

**Status:** Completed
**Lane:** `published_site_validation`
**Path:** direct coordinator-managed E2B
**Output:** `/tmp/webflow-template-review-direct-e2b-calibration-smoke`
**Expanded output:** `/tmp/webflow-template-review-direct-e2b-calibration-expanded-2026-05-27`

## Goal

Run the published-site sandbox lane against a small real Airtable subset and compare the evidence to human review status without promoting the output into Dify-facing decisions.

This is a calibration artifact. It joins private Airtable human outcomes to sandbox evidence, so it must stay internal.

## Command

```bash
infisical run --env=prod --path=/ --include-imports=true -- \
  pnpm --filter @create-something/webflow-template-review-mcp published-site:sandbox:e2b-calibration -- \
  --limit 2 \
  --bootstrap-browser \
  --max-pages 1 \
  --viewports desktop:1024x768 \
  --policy-snapshot-id policy.real-subset-smoke \
  --out /tmp/webflow-template-review-direct-e2b-calibration-smoke \
  --command-timeout-ms 1500000
```

The command uses `AIRTABLE_API_KEY` to sample Asset Version outcomes and `E2B_API_KEY` or `DIFY_E2B_API_KEY` to create the sandbox. Secret values are not written to the bundle, runner, normalized output, screenshots, or comparison artifacts.

## Result

```json
{
  "selected_count": 2,
  "strata_counts": {
    "approved_good": 1,
    "rejected_low_quality": 1
  },
  "evidence_status_counts": {
    "usable": 2
  },
  "alignment_counts": {
    "sandbox_minor_signals_on_approved_case": 1,
    "sandbox_did_not_explain_human_rejection": 1
  },
  "screenshot_count": 2,
  "finding_count": 2
}
```

Both cases produced browser-rendered evidence and screenshots. Each case had one minor accessibility signal for missing image alt text. Neither case produced a substantive sandbox finding after the overflow and clipped-text candidate gates were tightened.

The generated normalized SQL for both cases loaded successfully against the phase-1 ledger schema in an in-memory SQLite smoke:

```text
ledger_sql_ok /tmp/webflow-template-review-real-subset-ledger-smoke.sql
```

## Calibration Finding

The first run emitted the same three rule families on both the approved-good case and the rejected-low-quality case:

- `published_site.static.images_missing_alt`
- `published_site.render.horizontal_overflow`
- `published_site.render.clipped_text_candidates`

That was a useful false-positive signal. The runner metrics showed document width equal to viewport width for both cases, so element-level overflow counts did not prove page-level horizontal overflow. The normalizer now emits horizontal-overflow findings only when page-level overflow is confirmed. Clipped-text candidates remain available in rendered summaries as raw candidate counts but are not emitted as findings until a later visual-quality gate proves the signal.

## Interpretation

This run makes the system more stable:

- Direct E2B browser evidence works on real template URLs.
- The sandbox lane can produce private alignment artifacts against human outcomes.
- The lane did not explain the low-quality rejection using deterministic evidence alone.
- The approved case no longer looks like a failure because unstable responsive-layout candidates were demoted.

The result reinforces the lane boundary: published-site sandbox evidence is useful for objective/runtime/accessibility evidence, but it cannot yet decide low-quality or outdated-style rejections. Those need the visual-quality calibration lane and human-reviewed golden sets.

## Files

- `/tmp/webflow-template-review-direct-e2b-calibration-smoke/manifest.blind.jsonl`
- `/tmp/webflow-template-review-direct-e2b-calibration-smoke/outcomes.private.jsonl`
- `/tmp/webflow-template-review-direct-e2b-calibration-smoke/sandbox-results.jsonl`
- `/tmp/webflow-template-review-direct-e2b-calibration-smoke/status-alignment.jsonl`
- `/tmp/webflow-template-review-direct-e2b-calibration-smoke/summary.json`

## Guardrails

- No Airtable writes were performed.
- No D1/R2 writes were performed.
- No Dify-facing approval, rejection, rating, or feedback was emitted.
- Private comparison files must not be shown to creators or used as final decisions.

## Expanded Subset

After freeing local cache space, the same calibration lane was rerun across four strata:

```bash
infisical run --env=prod --path=/ --include-imports=true -- \
  pnpm --filter @create-something/webflow-template-review-mcp published-site:sandbox:e2b-calibration -- \
  --limit 4 \
  --strata approved_good,approved_exceptional,rejected_low_quality,iterative_review \
  --bootstrap-browser \
  --max-pages 1 \
  --viewports desktop:1024x768 \
  --policy-snapshot-id policy.real-subset-expanded \
  --out /tmp/webflow-template-review-direct-e2b-calibration-expanded-2026-05-27 \
  --command-timeout-ms 1500000
```

Result:

```json
{
  "selected_count": 4,
  "strata_counts": {
    "approved_good": 1,
    "approved_exceptional": 1,
    "rejected_low_quality": 1,
    "iterative_review": 1
  },
  "evidence_status_counts": {
    "usable": 4
  },
  "alignment_counts": {
    "sandbox_minor_signals_on_approved_case": 2,
    "sandbox_did_not_explain_human_rejection": 1,
    "sandbox_did_not_explain_iterative_review": 1
  },
  "screenshot_count": 4,
  "finding_count": 3
}
```

The expanded run produced screenshots for all four cases and no substantive sandbox findings. Three cases had only the minor missing-alt signal; the changes-requested case had no sandbox findings. The generated SQL loaded successfully against the phase-1 ledger schema:

```text
ledger_sql_ok /tmp/webflow-template-review-real-subset-expanded-ledger-smoke.sql
```

This reinforces the boundary: the published-site sandbox lane is stable enough to collect runtime/accessibility evidence, but low-quality and outdated-style decisions need a separate visual-quality golden-set lane plus reviewer-feedback comparison.
