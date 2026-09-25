# Scoped Paperclip delivery

This pack serves the Judgment tier with explicit policy artifacts and the
Automation tier with dependency-free evidence predicates. Its assignment schema
and immutable evidence receipts serve the Database tier. Native Paperclip remains
the execution authority; Linear remains canonical for tracked scope and evidence.

Start with [the skill entrypoint](../../scripts/paperclip-delivery/SKILL.md) and a
complete authorized assignment passing both the schema and `validateAssignment`.
Use [the CLI and normalized evidence contract](../../scripts/paperclip-delivery/README.md)
to validate caller-supplied evidence. This is not a scheduler or verified provider
integration. Missing assignment authority is a hard stop.

[The company-library release runbook](../../scripts/paperclip-delivery/RELEASE.md)
documents the CRE-2128 target, authenticated native operations, exact reviewed
source/CI/merge linkage, deterministic inventory, readback and rollback. Engineer
freezes source; the native independent reviewer makes the decision; release-QA
promotes only the approved exact revision. Native transitions dispatch successors.
Never manually shuttle tasks to claim automatic qualification.

All roles retain scoped skill/agent creation and parallel delegation permissions.
Separate native ownership, isolated workspaces, nonoverlapping write paths and
independent review remain mandatory. Unknown provider outcomes remain held until
reconciled; library publication, agent attachment and behavior qualification are
separate levels of evidence. The initial qualification hold produced a native
request-changes decision and automatic repair successor. The pack's
[Qualification evidence](../../scripts/paperclip-delivery/README.md#qualification-evidence)
records actual runs/events, the failed retry and human login restoration; the
repaired revision still needs independent approval and fresh CI. Production,
attachment and full behavior qualification remain pending. See the
[scoped configuration recovery guidance](../../scripts/paperclip-delivery/coordinator.md#scoped-configuration-recovery)
for native management authority and the uncertainty holds it cannot clear.

Validate from the repository root with:

```sh
node --test scripts/paperclip-delivery/*.test.mjs
node scripts/paperclip-delivery/cli.mjs verify-manifest scripts/paperclip-delivery scripts/paperclip-delivery/manifest.json
```

No monorepo installation is required for these Node-only checks. CI's required
job ID and name are `delivery-policy`. After repairs, regenerate the manifest and
obtain fresh review and CI for the new SHA. Record actual checks, limitations,
rollback and `Worktree disposition:` at each handoff. Local evidence is never a
second coordinator database; the coordinator mirrors receipts to Linear.
