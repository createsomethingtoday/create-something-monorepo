# @create-something/policy-os-engine

Shared POLICY OS compiler and evaluator.

This package compiles constraint policies into Polar-compatible policy source, evaluates the same policy locally as a fallback, and supports rollout modes for legacy, shadow, and Polar enforcement.

## Core Concepts

- `ConstraintPolicy` is the policy artifact.
- `compileConstraintPolicy` produces Polar source, fallback IR, context facts, and hashes.
- `evaluateConstraintPolicyLocal` provides deterministic local fallback behavior.
- `evaluateConstraintPolicyHybrid` calls the primary evaluator and falls back locally when configured.
- `evaluateConstraintPolicyWithRollout` chooses the final decision from legacy, shadow, or Polar rollout mode.

## Agent Legibility Contract

| Field | Value |
|-------|-------|
| Entry point | `src/index.ts`, `src/compile.ts`, `src/hybrid.ts` |
| Boot command | `pnpm build` |
| Smoke command | `pnpm check && pnpm test` |
| Validation surfaces | TypeScript check output, node test output, compiled policy hash, fallback IR, rollout decision payload |
| UI validation path | none |
| Escalation rule | stop if local and primary policy decisions diverge without an explicit rollout, mismatch, or fallback explanation |

## Development

```bash
pnpm --filter @create-something/policy-os-engine check
pnpm --filter @create-something/policy-os-engine test
```

## Related Packages

- `@create-something/mcp-authz`
- `@create-something/judgment-layer`
