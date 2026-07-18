# Example non-production Build runbook

## Verify

From the repository root, run:

```bash
pnpm build:release:check -- config/delivery/build-releases/example-non-production/build-release.json
```

Expected output includes `Evidence package: VALID` and `Release readiness: READY`. This is fixture evidence only; stop before any deployment, customer communication, access grant, billing change, or production write.

## Rollback

The fixture rollback command is recorded in `build-release.json`. It is deliberately inert and restores the prior synthetic artifact reference only.

## Escalation

If the command reports `INVALID` or `NOT READY`, do not edit hashes to force green. Identify the changed receipt or artifact, generate new evidence, and obtain a new terminal decision. Route unresolved integrity failures to `fixture-support@example.test`.
