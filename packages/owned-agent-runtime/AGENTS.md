# Agents: @create-something/owned-agent-runtime

## Agent Entry

- Read README.md for the authenticated Control, activation and source boundaries.
- Start with src/index.ts and src/control.ts for the owning runtime.
- scripts/github-commit-proof.mjs is a terminal-operated, fixed-repository GET
  verifier with a local checkpoint. It does not register a hosted executor or
  grant customer activation, source access, or Identity approval.
- Read packages/workflow-runtime/AGENTS.md before changing the core handoff.

## Rules

- Preserve exact activation, tenant, signer, approval and receipt binding.
- Keep transport and source access in the owning host; the core remains zero-write.
- Do not add source calls to offline verification or automatically replay an
  ambiguous attempt. Never print credentials or persist a signing private key.
- Fixture signatures are verification inputs: do not reformat hashed artifact
  files or weaken tamper assertions to make a check pass.
- Treat deployment, hosted executor registration and customer activation as
  distinct promotion checkpoints; a terminal source proof establishes none of them.

## Validation

```bash
pnpm --filter @createsomething/workflow-compiler build
pnpm --filter @createsomething/workflow-runtime build
pnpm --filter @create-something/owned-agent-runtime check
pnpm --filter @create-something/owned-agent-runtime test
```

Use the README's source verifier only for an authorized exact repository read.
Use REQUIRE_CONTROL_CONFIGURED=true for deployed Control smoke evidence.
