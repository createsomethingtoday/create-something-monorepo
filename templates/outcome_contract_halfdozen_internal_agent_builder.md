# Outcome Contract v1 - Half Dozen Internal Agent Builder

## 1) Engagement

- Client: `half-dozen`
- Engagement ID: `hd-internal-agent-builder-v1`
- Package Name: `Policy OS`
- Approved Workflow: `notion-agent-spec-builder`
- Approval Mode: `human-in-the-loop`
- Escalation Policy: `HD-AGENT-BUILDER-POLICY`
- Primary Interface: `Codex` and coded OpenAI Agents SDK runner
- Default Model: `gpt-5.5`

## 2) Target Workflow

The builder helps Half Dozen teammates turn rough agent ideas into complete, reviewable Notion agent specs.

For each request, the builder must:

1. Route the request as Database agent, Workflow agent, Integration agent, or Unknown/mixed.
2. Search `AI Agents [HD]` for similar existing agents before proposing a new one.
3. Search `AI Toolkits [HD]` before recommending external tools.
4. Ask focused clarifying questions until triggers, surfaces, inputs, outputs, and safety rules are concrete.
5. Produce Agent Spec, Instructions, Install / Enablement, Test Plan, Database row fields, and Open risks / missing permissions.
6. Create an `AI Agents [HD]` Draft page only after explicit user confirmation.
7. Attempt programmatic Notion agent creation only when API/private beta access is available and explicitly requested.

## 3) Success Metrics

- Source-of-truth preflight coverage: `100%` or clearly marked blocked.
- Final spec completeness: `>= 95%` of required sections present.
- Test plan coverage: `>= 90%` include happy path, missing-input, permission-failure, and must-not-change assertions.
- Unauthorized writes: `0`.
- Private-beta overclaims: `0`.

## 4) Fallback and Manual Path

- If `AI Agents [HD]` is unavailable, disclose that duplicate-agent detection is blocked and ask whether to continue spec-only.
- If `AI Toolkits [HD]` is unavailable, disclose that external toolkit validation is blocked and avoid claiming toolkit availability.
- If draft creation fails, return the exact Database row fields and page body for manual creation.
- If programmatic Notion agent creation is unavailable, stop at the Draft page and provide manual setup instructions.

## 5) Ownership Boundaries

- Half Dozen owns final approval of new production agents, permissions, and irreversible actions.
- CREATE SOMETHING owns the coded runner, governance eval, and reusable policy artifacts.
- Notion private-beta/API availability is an external dependency and must be reported as a capability gate, not assumed.

## 6) Handoff Bundle

- [ ] `mcp_contract_halfdozen_internal_agent_builder.yaml`
- [ ] `agent_contract_halfdozen_internal_agent_builder.yaml`
- [ ] `outcome_contract_halfdozen_internal_agent_builder.md`
- [ ] `golden_tasks_halfdozen_internal_agent_builder.yaml`
- [ ] Current `AI Agents [HD]` schema evidence
- [ ] Current `AI Toolkits [HD]` schema evidence
- [ ] Draft creation evidence or blocked reason

## 7) Change Control

- New write capabilities require explicit approval and a governance-eval update.
- Database schema changes are out of scope for the builder.
- The model default can change only with a recorded eval comparison and owner approval.

## 8) Review Cadence

- Weekly: review created Draft pages, blocked checks, and spec completeness.
- Monthly: calibrate generated instructions against teammate feedback.
- Quarterly: revisit Notion private-beta/API capability and model selection.
