# Understanding: @create-something/judgment-layer

> Policy packs, approval posture, checks, and Andon logs for deciding when automation should continue or stop.

## Position In The Three-Tier Framework

**Primary tier**: Judgment.

The package turns policy artifacts into runtime behavior around Codex app-server sessions. It does not replace the agent; it controls sandbox posture, approval posture, monitoring checks, and operator escalation.

## Depends On

| Dependency | Why It Matters |
|------------|----------------|
| `.judgment/policies/*.toml` | Project-specific policy packs |
| `.judgment/checks.toml` | Deterministic monitoring check definitions |
| `.judgment/andon.jsonl` | Local audit trail for uncertainty and failures |
| `@create-something/policy-os-engine` | Hybrid policy evaluator used by check decisions |
| Codex app-server | Executes automation turns under the selected policy |

## Enables Understanding Of

| Consumer | What This Package Clarifies |
|----------|----------------------------|
| Operators | Which policy is active and why approval is required |
| Coding agents | When to stop instead of widening scope |
| Policy OS | How policy artifacts become executable gates |
| Incident review | What Andon events were emitted during a run |

## Internal Structure

```text
src/cli.ts               -> command parser and command implementations
src/policy/load.ts       -> project policy discovery and parsing
src/policy/builtin.ts    -> built-in fallback policies
src/checks/load.ts       -> monitoring check loading
src/checks/eval.ts       -> deterministic check comparison logic
src/andon/log.ts         -> Andon append/read behavior
src/app-server/client.ts -> Codex app-server integration
```

## To Understand This Package, Read

1. **`src/cli.ts`** - The behavior of `init`, `policies`, `run`, `route`, `check`, `watch`, and `andon`.
2. **`src/policy/load.ts`** - How project policy packs override or complement built-ins.
3. **`src/checks/eval.ts`** - How monitoring results become deterministic pass/fail decisions.
4. **`src/andon/log.ts`** - How uncertainty and failures are recorded.
5. **`test/*.test.mjs`** - Expected CLI, policy, checks, and fake app-server behavior.

## Common Tasks

| Task | Start Here |
|------|------------|
| Initialize policy artifacts | `cs-judge init` |
| List effective policies | `cs-judge policies` |
| Run a prompt under policy | `cs-judge run --policy standard --prompt "..."` |
| Inspect Andon events | `cs-judge andon --tail 20` |
| Validate the package | `pnpm --filter @create-something/judgment-layer test` |

## Escalation Notes

Stop when a policy, approval, or Andon decision cannot be traced to a policy artifact, check artifact, or explicit operator choice. In this package, unexplained judgment is a bug.
