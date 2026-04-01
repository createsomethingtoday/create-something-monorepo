# CREATE SOMETHING Design Governance And Drift Architecture

This document defines how CREATE SOMETHING should keep design consistent across `.agency`, `.io`, `.space`, `.ltd`, and other governed properties.

The goal is not to centralize aesthetics by hand. The goal is to make design consistency, drift review, and responsive remediation legible, repeatable, and promotable.

## Decision

- `Canon` is the shared design source of truth for CREATE SOMETHING properties.
- Cross-property design review is a governed loop, not a one-time audit.
- Code-level design drift should be detected automatically before human review.
- Responsive and mobile review should be explicit per property, with missing coverage treated as a governance gap.
- Visual drift and breakpoint failures should create tracked remediation work rather than living as undocumented reviewer memory.

## Three-Tier Mapping

| Tier | Design governance job | Repo surfaces |
|---|---|---|
| Database | store baselines, audit outputs, screenshots, reviewer decisions, experiment results | docs, specs, Loom tasks, Braintrust results, property audit artifacts |
| Automation | detect drift, run mobile checks, capture previews, execute remediation loops | `packages/canon`, `packages/ground`, `packages/ui-diff`, `packages/ui-bridge`, `packages/ui-viewer`, `packages/webflow-site-analyzer-mcp` |
| Judgment | decide when drift matters, what blocks promotion, and when human review is required | policy docs, review scorecards, property-specific reviewer lanes |

## Source Of Truth

### Shared design system

`packages/canon` is the canonical source for shared tokens, components, layout patterns, and cross-property visual language.

Properties should consume `Canon`. They should not silently fork tokens or invent new visual primitives in isolation.

### Property exceptions

Property-level deviations are allowed only when they are:

- intentional
- documented
- reviewable
- either backported into `Canon` or explicitly treated as a local exception

Undocumented divergence is drift.

## Review Surfaces

### 1. Code-level drift

Use `Ground` as the preferred drift detector when available:

- `find drift`
- `find adoption-ratio`
- `find patterns`

This is the fastest way to catch:

- hardcoded colors
- arbitrary design utilities
- token avoidance
- spacing or typography inconsistency
- ungoverned local style patterns

### 2. Visual drift

Use the UI preview stack when work is actively being changed:

- `packages/ui-diff`
- `packages/ui-bridge`
- `packages/ui-viewer`

This gives agents and operators a visual feedback loop while remediation is in progress.

### 3. Responsive review

Responsive review is not implied by desktop correctness.

Each property should have:

- a defined mobile smoke surface
- at least one overflow or clipping check
- at least one feature-critical mobile visibility check

For Webflow and reviewer-style lanes, multi-breakpoint published-site review and Designer extraction should remain part of the checklist through `packages/webflow-site-analyzer-mcp`.

## Promotion Rules

No property change should be treated as design-safe unless all applicable checks pass:

- cross-property design drift does not worsen materially
- responsive/mobile smoke does not regress on covered properties
- new local patterns are either promoted into `Canon` or explicitly documented as exceptions
- any reviewer-noted visual drift has a tracked remediation path

Human review remains required for:

- new property-level design language
- major breakpoint redesigns
- brand or tone shifts
- exceptions that widen divergence from `Canon`

## Required Artifacts

Each governed design review cycle should produce:

- the target property or properties
- a property-level `CANON_AUDIT.md` baseline or an explicit reason it does not exist yet
- the design baseline or prior audit
- a drift report
- a responsiveness review result
- explicit findings or a no-findings result
- remediation tasks for unresolved issues
- the promotion decision

## Primary Metrics

Useful primary metrics for this lane:

- `cross_property_design_drift_rate`
- `canon_token_adoption_ratio`
- `responsive_review_coverage_rate`
- `mobile_smoke_pass_rate`
- `time_to_resolve_design_drift`
- `shared_component_reuse_rate`

Each experiment should choose one primary metric and treat the others as guardrails.

## Default Operating Loop

1. Run cross-property design audit.
2. Identify drift, missing responsive coverage, and exception candidates.
3. Create tracked remediation work.
4. Resolve issues locally with visual feedback where needed.
5. Re-run design and responsive checks.
6. Promote only if drift is reduced or intentionally accepted with evidence.

## Current Repo Posture

Today the repo already has:

- `Canon` as the shared design system
- `Ground` for token and drift analysis
- `UI Preview` for visual remediation loops
- Webflow checklist coverage that explicitly models responsive review
- one shared cross-property audit entrypoint
- baseline `CANON_AUDIT.md` artifacts for `.agency`, `.io`, `.space`, and `.ltd`
- a repeatable scorecard for design drift promotion decisions
- property-level mobile smoke coverage for `.agency`, `.io`, `.space`, and `.ltd`

Today the repo still needs:

- drift review and token cleanup for remaining local color literals across all governed properties
- broader route and breakpoint coverage beyond the initial mobile smoke surfaces
- cleanup of build-time content warnings in `.ltd` so presentation hygiene does not erode trust in the lane

## Commands

Use the repo-level audit command to review cross-property posture:

```bash
pnpm design:governance:audit
pnpm design:governance:audit:json
pnpm design:governance:audit:mobile
```

Use property-specific mobile smoke where available:

```bash
pnpm --dir packages/agency smoke:mobile
pnpm --dir packages/io run smoke:mobile
pnpm --dir packages/space run smoke:mobile
pnpm --dir packages/ltd run smoke:mobile
```

Use deeper drift inspection when local `Ground` execution is available:

```bash
cargo run --bin ground --manifest-path packages/ground/Cargo.toml -- find drift packages/agency/src
cargo run --bin ground --manifest-path packages/ground/Cargo.toml -- find adoption-ratio packages/agency/src
```

## Related Docs

- [CREATE_SOMETHING_OBSERVABILITY_AND_EXPERIMENTATION_ARCHITECTURE.md](./CREATE_SOMETHING_OBSERVABILITY_AND_EXPERIMENTATION_ARCHITECTURE.md)
- [guides/UI_PREVIEW_SYSTEM.md](./guides/UI_PREVIEW_SYSTEM.md)
- [webflow-template-checklist-mcp-coverage.md](./webflow-template-checklist-mcp-coverage.md)
- [internal/braintrust-experiments/README.md](./internal/braintrust-experiments/README.md)
