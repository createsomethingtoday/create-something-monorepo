# Workflow Shadow Pilot

`@create-something/workflow-shadow-pilot` is the read-only orchestration layer above the Workflow Compiler and its receipt and historical-context reconcilers.

It exposes one public `runWorkflowShadowPilot(options)` seam that hides source ordering, ownership-adapter construction, compilation, private-corpus reconciliation, privacy scanning, measurement, and operator-console generation. The acceptance command runs that seam twice and compares every deterministic artifact byte-for-byte.

This package owns no live workflow state and grants no mutation authority.

## Authorized shadow run

```bash
WORKFLOW_PILOT_CORPUS_DIR="/absolute/path/to/authorized-corpus" \
pnpm --filter @create-something/workflow-shadow-pilot test:acceptance
```

The command requires the four joined JSONL inputs, fails closed on discovery-source drift or private-value leakage, and writes the second clean run to the path reported as `outputDir`. The variable `measurement-receipt.json` is intentionally excluded from the deterministic manifest.

Serve the generated read-only console with the compiler's static server:

```bash
pnpm --filter @create-something/workflow-compiler serve -- \
  --dir /path/reported/as/outputDir --port 4173
```

The console reads only generated sanitized artifacts. It has no mutation endpoint or operator control.

## Agent Legibility Contract

| Field | Value |
| --- | --- |
| Entry point | `src/index.ts` |
| Boot command | `pnpm build` |
| Smoke command | `pnpm check && pnpm test` |
| Validation surfaces | source hashes, adapter boundaries, corpus joins, reconciliation, privacy scan, deterministic manifest, measurement receipt, operator console |
| UI validation path | serve the generated sanitized console and run the CRE-1219 browser workflow |
| Escalation rule | stop on source drift, private data leakage, insufficient sampling, ambiguity resolution, implied write authority, proposal application, or external mutation |

## Shadow boundary

No Airtable, Webflow, Cloudflare, Dify, Atlas, or other external writes are permitted. Langfuse is not an input, context source, storage layer, or measurement dependency.
