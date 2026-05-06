# Understanding: @create-something/policy-os-engine

> POLICY OS compiler and hybrid evaluator for constraint policies.

## Position In The Three-Tier Framework

**Primary tier**: Judgment.

The package evaluates what should happen. It compiles policy artifacts, compares local and primary evaluator decisions, and supports rollout modes so policy changes can be introduced without silent behavioral drift.

## Depends On

| Dependency | Why It Matters |
|------------|----------------|
| `ConstraintPolicy` | Source policy artifact |
| Oso Cloud | Optional primary policy evaluator |
| Local evaluator | Deterministic fallback and legacy comparison path |
| Policy hash and compiler version | Evidence that a decision came from a specific compiled artifact |

## Enables Understanding Of

| Consumer | What This Package Clarifies |
|----------|----------------------------|
| `@create-something/mcp-authz` | How authorization decisions are computed |
| Judgment Layer | How checks can rely on deterministic policy evaluation |
| Operators | Whether rollout is legacy, shadow, or Polar enforce |
| Auditors | Why fallback or mismatch occurred |

## Internal Structure

```text
src/index.ts      -> public export surface
src/types.ts      -> policy, input, result, rollout contracts
src/compile.ts    -> Polar source, fallback IR, facts, hash generation
src/local-eval.ts -> deterministic local evaluator
src/oso-primary.ts -> Oso Cloud primary evaluator
src/hybrid.ts     -> primary/fallback/circuit-breaker evaluator
src/rollout.ts    -> canary sampling helpers
```

## To Understand This Package, Read

1. **`src/types.ts`** - The policy and evaluation contracts.
2. **`src/compile.ts`** - How policy artifacts become runtime policy source.
3. **`src/local-eval.ts`** - Deterministic fallback behavior.
4. **`src/hybrid.ts`** - Primary evaluator, fallback, and circuit-breaker behavior.
5. **`test/compiler.test.mjs`** - Expected compiler/evaluator behavior.

## Common Tasks

| Task | Start Here |
|------|------------|
| Add a policy condition | `src/types.ts`, `src/compile.ts`, `src/local-eval.ts` |
| Change fallback behavior | `src/hybrid.ts` |
| Validate rollout sampling | `src/rollout.ts` |
| Validate the package | `pnpm --filter @create-something/policy-os-engine test` |

## Escalation Notes

Stop when local and primary decisions diverge without a recorded mismatch, rollout mode, or fallback reason. Silent policy drift is the primary failure mode.
