# Workflow Artifact Templates

These files mirror the canonical contract bundle in `/templates`.

Use the root `/templates` directory as the source of truth. This folder exists so `.agency` operators can draft the same bundle without maintaining a second schema.

## Canonical bundle

1. `mcp_contract.yaml`
2. `agent_contract.yaml`
3. `outcome_contract.md`
4. `golden_tasks.yaml`
5. `runbook.md`

Each artifact must carry the Policy OS metadata required by the canonical bundle:

- `package_name`
- `approved_workflows`
- `approval_mode`
- `escalation_policy`
- `review_cadence`
- `billing_and_entitlement_assumptions`

## Recommended sequence

1. Complete `discovery-note-template.md`
2. Complete `policy-os-proposal-input-template.md`
3. Draft the full bundle from the approved workflow map
4. Review the bundle together before implementation
5. Keep root `/templates` and this mirrored bundle aligned

## Usage notes

- `mcp_contract.yaml` defines systems, tools, resources, scopes, and failure model.
- `agent_contract.yaml` defines behavior, approval boundaries, escalation logic, runtime ownership, trigger surfaces, sandbox mode, and runtime guardrails.
- `outcome_contract.md` defines workflow scope, success criteria, fallback path, and accountability.
- `golden_tasks.yaml` defines must-pass scenarios that prove the workflow behaves correctly before release.
- `runbook.md` defines operating cadence, approvals, exceptions, containment, rollback, and recovery.
- Flue service-agent promotion should include `pnpm --dir packages/agents/flue-service-agent flue:evidence:cloudflare` output in Linear before deployment.
- Flue service-agent run history should be recorded with `pnpm --dir packages/agents/flue-service-agent flue:history:cloudflare`; generated JSONL stays in ignored `.artifacts/` storage unless promoted to an approved observability sink.
- Flue run history can be exposed to MCP hosts as read-only resources: `flue://run-history/status`, `flue://run-history/latest`, and `flue://run-history/list`.
- Hosted `create-something` MCP reads Flue run-history resources from the `TELEMETRY_DB.flue_run_history` D1 table after `packages/create-something-mcp/worker/migrations/0001_flue_run_history.sql` is applied.
- Promote local JSONL into hosted Flue run-history resources with `pnpm --dir packages/create-something-mcp flue:history:upload`; this performs schema validation and idempotent D1 upserts without adding a public write endpoint.
- Prefer `pnpm --dir packages/create-something-mcp flue:history:promote -- --issue CRE-123` when generating new promotion evidence; it appends Cloudflare-ready history and uploads it in one operator step.
- CI promotion ownership lives in `.github/workflows/flue-run-history-promotion.yml`; dry-run validation is automatic on relevant changes, and remote D1 promotion is manual through `workflow_dispatch`.

Braintrust may be referenced only as observability and eval infrastructure, not as the policy control plane.
