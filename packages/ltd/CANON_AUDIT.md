# Canon Audit: .ltd Property

**Date**: 2026-04-01
**Auditor**: Codex (design-governance audit)
**Last Verified**: 2026-04-01
**Scope**: `packages/ltd/src/**/*.svelte`, `packages/ltd/src/**/*.css`

## Summary

The `.ltd` property is now governance-clean on unresolved Canon drift. The remaining local palettes are confined to reviewed presentation visuals, while the public editorial routes have responsive smoke coverage and the canon markdown structure warnings have been resolved.

| Category | Status | Count |
|---|---|---|
| Canon Dependency | PASS | `@create-something/canon` present |
| Canon Imports | Good | 74 occurrences |
| Canon Variable Usage | Strong | 1,476 `var(--` occurrences |
| Hardcoded Hex Signals | PASS | 0 unresolved |
| Reviewed Exception Files | REVIEWED | 6 files / 12 hex signals |
| Reviewed rgba() Signals | REVIEWED | 29 exception literals |
| Mobile Smoke Coverage | PASS | 1 script / 2 specs |
| Viewport Meta | PASS | configured |

## Reviewed Exceptions

- `packages/ltd/src/routes/presentations/abundance-system/BudgetAllocationVisual.svelte`
- `packages/ltd/src/routes/presentations/abundance-system/IntakeExperience.svelte`
- `packages/ltd/src/routes/presentations/abundance-system/MatchingShortlistVisual.svelte`
- `packages/ltd/src/routes/presentations/abundance-system/PolicyEscalationVisual.svelte`
- `packages/ltd/src/routes/presentations/abundance-system/RolloutTimelineVisual.svelte`
- `packages/ltd/src/routes/presentations/canon-design/+page.svelte`

These presentation routes retain reviewed palette choices for deck readability and narrative contrast.

## Verification

This checkpoint was verified with:

```bash
node scripts/design-governance-audit.mjs --format json
pnpm --dir packages/ltd run smoke:mobile
```

## Verdict

**Overall Compliance**: Good

`.ltd` now has a clean unresolved drift report, active mobile review, and a documented exception boundary for presentation-specific visuals.
