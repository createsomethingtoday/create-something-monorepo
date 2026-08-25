# Agents: @createsomething/workflow-runtime

This package is the provider-neutral, zero-write Workflow Runtime core. It is
the Automation tier reducer for a verified compiler artifact; it is not an
executor, provider adapter, queue consumer, or activation surface.

## Agent Entry

- Start with `README.md` and `COMPATIBILITY.md` for the runtime boundary.
- Primary entrypoints: `src/index.ts`, `src/runtime.ts`, and `src/checkpoint.ts`.
- Read `packages/workflow-compiler/AGENTS.md` before changing the compiler
  handoff, and the accepted Workflow Runtime ADRs before changing authority,
  receipts, approval, or recovery semantics.

## Rules

- Keep manifest parsing, state transitions, and receipt hashes deterministic.
- Fail closed for an unknown schema, field, dependency, approval binding,
  receipt chain, checkpoint state, idempotency digest, or stale version.
- Preserve the port boundary: storage, clock, identity, queue, and receipt sink
  are host-owned. The executor port is `never`.
- Never add credentials, provider URLs, raw prompts, shell commands, customer
  data, external-effect calls, or automatic replay of a capability.
- A `wait`, `stop`, or recovery plan must never expose a capability.
- Treat changes to the runtime manifest, receipt schema, or compatibility
  contract as a reviewed migration; do not silently reinterpret historical
  compiler artifacts.

## Validation

```bash
pnpm --filter @createsomething/workflow-runtime check
pnpm --filter @createsomething/workflow-runtime test
pnpm --filter @createsomething/workflow-compiler check
pnpm --filter @createsomething/workflow-compiler test
pnpm --filter @create-something/owned-agent-runtime check
pnpm --filter @create-something/owned-agent-runtime test
pnpm exports @createsomething/workflow-runtime
git diff --check
```

Escalate before introducing a capability executor, live activation authority,
trusted-signer policy, source-system adapter, deployment, or customer data.
