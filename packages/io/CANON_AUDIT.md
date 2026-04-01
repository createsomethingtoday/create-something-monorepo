# Canon Audit: .io Property

**Date**: 2026-04-01
**Auditor**: Codex (design-governance audit)
**Last Verified**: 2026-04-01
**Scope**: `packages/io/src/**/*.svelte`, `packages/io/src/**/*.css`

## Summary

The `.io` property is now governance-clean on unresolved Canon drift. The property still contains many local palettes, but they are no longer ambient debt: they are documented as reviewed exceptions tied to research, visualization, and demonstration routes. Mobile smoke coverage is active for the primary route set.

| Category | Status | Count |
|---|---|---|
| Canon Dependency | PASS | `@create-something/canon` present |
| Canon Imports | Strong | 145 occurrences |
| Canon Variable Usage | Strong | 6,925 `var(--` occurrences |
| Hardcoded Hex Signals | PASS | 0 unresolved |
| Reviewed Exception Files | REVIEWED | 16 files / 149 hex signals |
| Reviewed rgba() Signals | REVIEWED | 87 exception literals |
| Mobile Smoke Coverage | PASS | 1 script / 2 specs |
| Viewport Meta | PASS | configured |

## Reviewed Exceptions

The following files retain intentional local palettes and are treated as reviewed exceptions rather than unresolved drift:

- `packages/io/src/lib/animations/TufteMorph.svelte`
- `packages/io/src/routes/experiments/ascii-renderer/+page.svelte`
- `packages/io/src/routes/experiments/hybrid-scheduling/+page.svelte`
- `packages/io/src/routes/experiments/living-arena-gpu/+page.svelte`
- `packages/io/src/routes/experiments/render-preview/+page.svelte`
- `packages/io/src/routes/experiments/render-studio/+page.svelte`
- `packages/io/src/routes/papers/animation-spec-architecture/+page.svelte`
- `packages/io/src/routes/papers/ground-evidence-based-claims/+page.svelte`
- `packages/io/src/routes/papers/harness-agent-sdk-migration/+page.svelte`
- `packages/io/src/routes/papers/hermeneutic-spiral-ux/+page.svelte`
- `packages/io/src/routes/papers/open-weight-models-mcp-guidance/+page.svelte`
- `packages/io/src/routes/papers/subtractive-studio/+page.svelte`
- `packages/io/src/routes/papers/teaching-modalities-experiment/+page.svelte`
- `packages/io/src/routes/papers/threshold-dwelling/+page.svelte`
- `packages/io/src/routes/papers/tufte-mobile-optimization/+page.svelte`
- `packages/io/src/routes/visualizations/arena-scale/+page.svelte`

## Verification

This checkpoint was verified with:

```bash
node scripts/design-governance-audit.mjs --format json
pnpm --dir packages/io run smoke:mobile
```

## Verdict

**Overall Compliance**: Good

`.io` now has a clean unresolved drift report, explicit responsive review, and a repeatable reviewed-exception path for research-specific visuals.
