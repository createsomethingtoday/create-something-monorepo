# Recurring Cleanup Loops

This guide defines the default CREATE SOMETHING pattern for keeping agent-generated drift small, frequent, and reviewable.

The goal is not occasional cleanup. The goal is continuous garbage collection.

## Why this exists

Agent-heavy repositories accumulate drift in predictable places:

- docs stop matching code behavior
- architectural shortcuts spread by imitation
- design token or canon violations replicate
- policy artifacts go stale or lose required structure
- small quality regressions linger because they are not urgent enough to block feature work

If cleanup is not scheduled and mechanical, humans inherit it as periodic manual triage.

## Cleanup lanes

Treat cleanup as four separate recurring lanes.

### 1. Docs freshness lane

Question:

> Does the repository-local explanation still match the actual system?

Focus:

- stale runbooks
- stale setup instructions
- outdated package docs
- internal memos that should now be replaced by canonical docs

Signals already available in this repo:

- package `README.md`
- `UNDERSTANDING.md`
- docs indexes
- policy and runbook cross-links

### 2. Architecture drift lane

Question:

> Are local shortcuts spreading in ways that make future agent runs less legible?

Focus:

- duplicated helpers
- design token drift
- known structural anti-patterns
- ad hoc patterns that should become shared helpers or lint rules

Signals already available in this repo:

- `ground find drift`
- duplicate/import analysis
- package-level architecture docs

### 3. Quality grade refresh lane

Question:

> Which areas are getting healthier, and which are silently decaying?

Focus:

- validation coverage
- package legibility coverage
- health/smoke path coverage
- review-loop coverage

This lane should produce scorecards or tracked gaps, not only prose.

### 4. Policy integrity lane

Question:

> Are policy artifacts still structurally valid and aligned with current operations?

Focus:

- required sections and metadata
- policy JSON and markdown alignment
- release gate correctness
- stale references or missing source anchors

Signals already available in this repo:

- `scripts/policy-artifact-check.mjs`

## Existing primitives to use

Use what already exists before introducing new tools.

### Drift detection

```bash
cd packages/ground
cargo run --release -- find drift ../.. --extensions css
```

### Policy artifact integrity

```bash
node scripts/policy-artifact-check.mjs
```

### MCP quality gates

```bash
pnpm mcp:gate:typecheck
pnpm mcp:gate:lint
pnpm mcp:gate:test
```

### General repo quality gates

```bash
pnpm check
pnpm lint
pnpm test
```

## Output shape

Each cleanup run should produce one of two outcomes:

### Outcome A: Small targeted fix

Examples:

- fix stale doc commands
- replace repeated helper pattern with shared utility
- repair a policy artifact section
- add a missing health-path note to a package doc

### Outcome B: Tracked follow-up work

If the cleanup is larger than a small targeted fix, create tracked work in Linear.

Examples:

- architecture refactor needed across multiple packages
- a missing validation surface across a package family
- repeated drift that should become a lint or shared checker

## Cadence

Recommended minimum cadence:

- **Per PR**: quality gates and targeted drift checks
- **Daily**: docs freshness and small drift scan on active areas
- **Weekly**: broader architecture drift and quality-grade refresh

The rule is simple:

- high-frequency runs should be narrow and cheap
- low-frequency runs can be broader and more analytical

## Review rule

Cleanup changes should be easy to review.

Prefer:

- one narrow category per PR
- small, mechanically justified changes
- explicit before/after rationale

Avoid:

- giant "cleanup everything" sweeps
- mixed stylistic and behavioral changes
- refactors without a concrete drift signal

## Escalation rule

Stop and create Linear work when:

- the cleanup requires changing package semantics
- the fix crosses multiple domains with unclear ownership
- the repository lacks enough evidence to tell which version is correct
- repeated cleanup suggests a missing lint, checker, or shared helper

## Suggested Linear issue shapes

Use task titles like:

- `Docs freshness: align package README commands with actual scripts`
- `Architecture drift: replace duplicated helper pattern in MCP workers`
- `Policy integrity: repair missing required sections in policy artifacts`
- `Quality grade refresh: audit legibility contract coverage across active packages`

## Definition of success

A cleanup system is working when:

1. drift is detected close to when it is introduced
2. fixes are small enough to review in minutes
3. recurring issues are promoted into mechanical checks
4. the repo gets easier for future agents to navigate, not harder

## Related docs

- `./CODING_AGENT_HARNESS_PATTERN.md`
- `./AGENT_LEGIBILITY_CONTRACT.md`
- `./OBSERVABILITY_SETUP.md`
- `../internal/OPENAI_HARNESS_ENGINEERING_IMPLICATIONS_2026-03-09.md`
