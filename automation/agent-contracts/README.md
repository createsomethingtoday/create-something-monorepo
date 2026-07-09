# Agent Work Contracts

These machine-readable artifacts define the minimum work and proof shape that
must be valid before Symphony dispatches a reviewed repo loop.

- `work-unit.schema.json` describes a bounded worker, reviewer, or integrator.
- `evidence-receipt.schema.json` describes proof left by a completed stage.
- `reviewed-run-receipt.schema.json` joins the three stage receipts with the
  reviewer mutation guard and aggregate cycle metrics.
- `scripts/agent-work-unit-verify.mjs` is the fail-fast local verifier.

Every unit names Linear ownership, Database / Automation / Judgment tiers,
scope and locks, allowed commands, verification, evidence, stop conditions, and
promotion gates. Keep reviewed pilots at one work unit until receipts and
workspace cleanup are boring.

Reviewer contracts must use read locks. Each stage receipt identifies its run
and role and records duration, retries, human interventions, and token usage.
The reviewed run is valid only when all stages target the same Linear issue and
the reviewer fingerprint is unchanged.

```bash
node scripts/agent-work-unit-verify.mjs \
  automation/agent-contracts/examples/reviewed-pilot.worker.work-unit.json \
  automation/agent-contracts/examples/reviewed-pilot.reviewer.work-unit.json \
  automation/agent-contracts/examples/reviewed-pilot.integrator.work-unit.json
```
