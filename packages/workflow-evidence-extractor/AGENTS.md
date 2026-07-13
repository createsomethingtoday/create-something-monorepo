# Agents: @create-something/workflow-evidence-extractor

## Agent Entry

- Start with `README.md` for the evidence/proposal boundary.
- Read the parent compiler contract in `../workflow-compiler/README.md` before changing proposal application.
- Primary entrypoints: `src/index.ts`, `src/extract.ts`, `src/approval.ts`, `src/source.ts`, and `src/cli.ts`.

## Ownership

| Tier | This package owns | This package does not own |
| --- | --- | --- |
| Database | Parsed source snapshots, hashes, evidence records, proposal operations, conflicts, approval manifests, and application receipts | Live Airtable, Webflow, Substrate, Atlas, or policy state |
| Automation | Source adapters, normalization, deterministic proposal generation, artifact writing, and approved operation application | Workflow compilation semantics or live workflow execution |
| Judgment | Confidence metadata, conflict escalation, explicit approve/reject accounting, and fail-closed gates | Resolving conflicts automatically or deciding real marketplace policy |

## Validation

- Boot: `pnpm build`
- Smoke: `pnpm check && pnpm test && pnpm test:acceptance`
- Verify public imports with `pnpm exports @create-something/workflow-evidence-extractor`.
- Escalate if a requested change would auto-resolve a conflict, apply an unreviewed operation, accept mismatched hashes, mutate a source artifact, call a live system, or move compiler ownership into this package.

Develop one public behavior at a time: failing check, minimal implementation, green check, then refactor while preserving deterministic output.
