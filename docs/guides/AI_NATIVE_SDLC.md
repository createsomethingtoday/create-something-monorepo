# AI-native delivery contract

Use the same loop internally and for consenting clients: define acceptance and owner, recover canonical context, implement within permission, independently verify, release only with authorization, then learn from observed operation. This is a Database evidence artifact, Automation validator, and Judgment policy reference. It adds no executor or orchestration platform.

Read AGENT_LEGIBILITY_CONTRACT.md first for package entry, boot, smoke, evidence and escalation paths. OPERATOR_AGENT_SYSTEM.md retains executor ownership; scripts/workflow-operations retains its fixed registered runtime. This record does not replace either.

## Working setup

`pnpm change:evidence init /tmp/change.json` creates an intentionally incomplete v1 draft without overwriting files. Fill its fields, then run `pnpm change:evidence validate /tmp/change.json` and `pnpm change:evidence report /tmp/change.json`. Run `pnpm change:evidence:test` for focused boundary checks. Direct Node equivalents work without dependencies. Entry: scripts/change-evidence/cli.mjs. Boot: initialize. Smoke: test. Evidence: JSON report and test output. UI: none. Escalate when evidence or permissions cannot be verified.

Version 1 uses explicit required fields in the validator. Gates carry status, evidence references and limits. Source revision is the full evaluated Git SHA; retain the working diff separately for local runs. Independent review names a separate reviewer and receipt. Stages distinguish prototype, local, merged, released and business-accepted. Release requires authorization receipt, immutable artifact reference, live verification and rollback, plus functional/release gates and independent review. Business acceptance needs its own receipt. Validation checks consistency, not receipt authenticity; the human reviewer must read references and verify provenance. Records are descriptive and never grant authority. No record content is executed.

## Packaging and pilot

Map defines workflow, owner, data, baseline, risk and acceptance. Build implements and independently verifies a bounded change. Control owns approved promotion, operation, rollback and measured learning. Use policy.git-light-agent-delivery.v1.md and AGENCY_CODEX_VECTOR_STRATEGY.md for existing delivery boundaries.

Week 1: inventory and consent; measure baseline for comparable feature, bug and maintenance samples. Week 2: run one bounded sample of each type internally. Week 3: repeat with the selected client only after activation consent; compare like scopes. Week 4: review evidence and decide continue, revise or stop. Four weeks have not elapsed. Record human minutes, rework minutes, escaped-defect count, elapsed delivery hours and cost in currency, with period, sample size, source and limits. Unknown values are null with a reason, never zero. Report baseline and observation separately; do not claim causal improvement from small unmatched samples.

## Portable client onboarding

Copy this checklist into the client's issue: client owner and reviewer; client-owned repository/accounts/data; canonical source catalog; requested scope and exclusions; policy and risk classification; allowed local actions; explicit external-write and promotion permissions; credential provisioning through the client's secret manager; baseline collection method; rollback owner; acceptance receipt and follow-up date. Keep private evidence in client-controlled storage. Repository access does not authorize payments, messaging, production or operational data writes.

Goldin is selected: https://github.com/Half-Dozen/goldin-portal . Preserve Goldin × Half Dozen identity. Consult docs/SOURCE-CATALOG.md, docs/NOTION-INTEGRATION.md and docs/RELEASE-0.4.0.md in that repository before integration. Prior 0.4.0 staging evidence is historical, not current runtime acceptance. Baseline collection and activation are pending. Parent integrates only after independent foundation review. Start with local catalog/validator maintenance, then an approved bounded feature and bug sample; payment, production, Notion and other external writes remain separately authorized. Do not edit that checkout during foundation work.
