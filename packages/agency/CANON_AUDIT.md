# Canon Audit: .agency Property

**Date**: 2026-04-01
**Auditor**: Codex (design-governance audit)
**Last Verified**: 2026-04-01
**Scope**: `packages/agency/src/**/*.svelte`, `packages/agency/src/**/*.css`

## Summary

The `.agency` property is currently governance-clean. Unresolved hardcoded hex drift is down to zero, the mobile smoke lane is active, and the only remaining literal brand colors are documented as a reviewed exception for third-party platform badges in the community admin surface.

| Category | Status | Count |
|---|---|---|
| Canon Dependency | PASS | `@create-something/canon` present |
| Canon Imports | Strong | 69 occurrences |
| Canon Variable Usage | Strong | 2,000 `var(--` occurrences |
| Hardcoded Hex Signals | PASS | 0 unresolved |
| Reviewed Exception Files | REVIEWED | 1 file / 8 hex signals |
| Hardcoded rgba() Signals | REVIEWED | 283 occurrences |
| Mobile Smoke Coverage | PASS | 1 script / 2 specs |
| Viewport Meta | PASS | configured |

## Reviewed Exceptions

- `packages/agency/src/routes/admin/community/+page.svelte`
  Platform badges intentionally preserve external network brand colors for operator recognition. This is a documented exception, not unresolved design drift.

## Verification

This checkpoint was verified with:

```bash
node scripts/design-governance-audit.mjs --format json
pnpm --dir packages/agency run smoke:mobile
```

## Verdict

**Overall Compliance**: Good

`.agency` now has a clean Canon drift report, a responsive review lane, and a documented exception model for intentional non-Canon palettes.
