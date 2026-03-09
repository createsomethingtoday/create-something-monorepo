# Agent Legibility Contract

This guide defines the minimum contract a package should expose so a coding agent can work on it reliably.

The question is not only:

> Can an agent edit this package?

The more important question is:

> Can an agent boot it, validate it, inspect evidence, and know when to escalate?

## Why this exists

Agents fail when packages are opaque.

Opaque packages usually have one or more of these problems:

- no clear boot command
- no smoke path
- no observable evidence surface
- no UI validation path for frontend work
- no explicit escalation rule when validation fails

This contract makes those expectations explicit.

## Required fields

Each package should document the following.

### 1. Entry point

What file or document should an agent read first?

Examples:

- `README.md`
- `UNDERSTANDING.md`
- `src/index.ts`
- `worker/index.ts`

### 2. Boot command

How does the agent start the package in the narrowest useful way?

Examples:

```bash
pnpm dev
pnpm --filter @create-something/search dev
wrangler dev
cargo test
```

### 3. Smoke command

What is the fastest trustworthy command that proves the package still works at a basic level?

Examples:

```bash
pnpm test
pnpm vitest run src/foo.test.ts
curl http://localhost:8787/health
pnpm exec tsx scripts/smoke.ts
```

### 4. Validation surfaces

What evidence can the agent inspect after making a change?

Choose whichever apply:

- test output
- typecheck output
- lint output
- HTTP health endpoint
- logs
- traces
- metrics
- UI preview
- screenshots

### 5. UI validation path

For packages with a user interface, document the narrowest path for visual validation.

Examples:

- `pnpm ui:viewer`
- a local route to open
- a specific component preview
- screenshot workflow

### 6. Escalation rule

When should the agent stop and hand off instead of guessing?

Examples:

- health check passes but data is semantically wrong
- UI cannot be validated with available tooling
- auth or secret-bound flow cannot be reproduced locally
- traces are missing for a package that claims observability support

## Recommended shape

Add an **Agent Legibility Contract** section to the package's `README.md` or `UNDERSTANDING.md`.

Suggested format:

```md
## Agent Legibility Contract

| Field | Value |
|-------|-------|
| Entry point | `src/index.ts` |
| Boot command | `pnpm dev` |
| Smoke command | `pnpm test` |
| Validation surfaces | tests, logs, `/health` |
| UI validation path | none |
| Escalation rule | stop if `/health` is green but the primary workflow still fails |
```

## Tier-aware guidance

### Database-heavy packages

Prioritize:

- seed/load path
- schema entrypoint
- sample query or fetch path
- data correctness smoke check

### Automation-heavy packages

Prioritize:

- runtime boot command
- tool invocation smoke path
- logs and traces
- retry or failure behavior

### Judgment-heavy packages

Prioritize:

- policy artifact entrypoint
- policy selection or compilation path
- deterministic checks
- escalation artifact path

### UI-heavy packages

Prioritize:

- preview path
- screenshot path
- route or component target
- visual acceptance rule

## Minimal bar

A package is not agent-legible enough until an agent can answer:

1. Where do I start?
2. How do I boot this?
3. What is the fastest proof it still works?
4. What evidence do I inspect after I change it?
5. When do I stop and escalate?

## Mechanical check

The repository now includes an enforcement script for packages that opt into the contract:

```bash
pnpm agent:legibility:check
```

Current default scope is discovered from package metadata:

- `packages/create-something-mcp/README.md`
- `packages/harness/README.md`
- `packages/harness-mcp/README.md`
- `packages/search/README.md`
- `packages/space/README.md`
- `packages/substrate-mcp/README.md`
- `packages/tufte/README.md`

Packages opt in by setting this field in `package.json`:

```json
{
  "createSomething": {
    "agentLegibilityContract": true
  }
}
```

Use `--target` to check a custom comma-separated list of files while expanding coverage.

The check also fails if a package `README.md` contains `## Agent Legibility Contract` but the sibling `package.json` does not opt in. This keeps documentation and enforcement aligned during review.

For opted-in packages, the check also enforces:

- `UNDERSTANDING.md` must exist
- `UNDERSTANDING.md` must include the core package-reading section
- `UNDERSTANDING.md` cannot still contain obvious template placeholder text
- documented entry-point paths in the contract must exist
- documented `pnpm` / `npm` boot and smoke scripts must exist in the relevant `package.json`
- for packages with `src/routes`, documented backticked UI validation paths must map to real routes

A matching GitHub Actions workflow exists at:

- `.github/workflows/agent-legibility-check.yml`

The workflow watches:

- `packages/*/README.md`
- `packages/*/package.json`

## Example

```md
## Agent Legibility Contract

| Field | Value |
|-------|-------|
| Entry point | `worker/index.ts`, `README.md` |
| Boot command | `wrangler dev` |
| Smoke command | `curl http://localhost:8787/health` |
| Validation surfaces | `/health`, logs, Langfuse traces |
| UI validation path | none |
| Escalation rule | stop if `/health` is healthy but tool output is inconsistent with the backing data |
```

## Related docs

- `./CODING_AGENT_HARNESS_PATTERN.md`
- `./OBSERVABILITY_SETUP.md`
- `./UI_PREVIEW_SYSTEM.md`
- `./UNDERSTANDING_TEMPLATE.md`
