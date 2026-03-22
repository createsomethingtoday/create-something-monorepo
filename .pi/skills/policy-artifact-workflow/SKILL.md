---
name: policy-artifact-workflow
description: Follow the CREATE SOMETHING policy artifact workflow in Pi. Use for versioned policy artifacts, governance docs, policy-adjacent runbooks, and authz-manifest-related changes.
---

# Policy Artifact Workflow

Use this skill when the task is about policy behavior, governance rules, or versioned policy artifacts rather than only application code.

## Start Here

1. Read `AGENTS.md`.
2. Read `docs/guides/PI_WORKFLOW.md`.
3. Read `docs/policies/README.md`.
4. Read `automation/pi/policy/README.md`.
5. Open the nearest policy markdown and JSON artifacts before editing.

## Working Rules

- Treat policy artifacts as auditable, versioned deliverables.
- Infer the governance objective from the task and nearby artifacts before editing.
- Keep markdown and machine-readable policy artifacts aligned when both are in scope.
- Prefer the smallest viable governance change that matches the live system and the task.
- Preserve unrelated changes.

## Validation Order

Use the narrowest relevant verification set first:

1. `pnpm policy:artifacts:check`
2. `pnpm authz:compile` when authz inputs or outputs are affected
3. targeted `pnpm check`, `pnpm lint`, or `pnpm test` only when code or scripts are touched

## Review Standard

Call out these issues explicitly if they appear:

- policy conflicts
- missing evidence requirements
- lifecycle mismatches
- promotion or rollback gaps
- documentation drift between markdown and machine-readable artifacts

## Anti-Patterns

- Do not leave markdown and JSON policy artifacts out of sync without stating why.
- Do not publish or promote policy changes without the required approvals.
- Do not treat conversational guidance as a substitute for a versioned artifact when the repo already expects one.

## Finish

End with a concise operator summary:

- changed artifacts
- commands run
- remaining policy risks, approvals, or follow-ups
