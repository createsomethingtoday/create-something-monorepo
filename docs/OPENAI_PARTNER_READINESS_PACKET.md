# OpenAI Partner Readiness Packet

> Owner: CREATE SOMETHING
> Status: readiness review, not approved-partner status
> Scope: OpenAI ecosystem positioning, startup/community paths, agent runtime proof, and public-claim guardrails

## Positioning

OpenAI should be considered, but it should not be treated like the Dify
partner-plus-affiliate lane.

The strongest current CREATE SOMETHING posture is:

1. `OpenAI ecosystem readiness` as an internal and stack-level proof lane.
2. `OpenAI for Startups` or builder/community participation if CREATE
   SOMETHING qualifies for the current program criteria.
3. `Partner Portal` or sales-led conversation only after stronger customer
   proof and a clear joint-delivery ask exist.
4. `Frontier Alliance` as aspirational only. It currently reads like a
   large-enterprise transformation lane, not an immediate CREATE SOMETHING
   application target.

Do not build an OpenAI affiliate funnel. OpenAI has promotional and referral
mechanics for eligible campaigns, but the public help docs describe
campaign-specific, non-transferable promo/referral codes rather than an open,
Dify-style recurring affiliate program.

## Application Narrative

CREATE SOMETHING uses OpenAI as a reasoning and agent host inside governed AI
workflow systems. The differentiated package is not "OpenAI setup" by itself.
The differentiated package is OpenAI plus the CREATE SOMETHING control layer:

- MCP tool schemas and custom connector boundaries.
- Policy OS approval, blocked-state, and escalation artifacts.
- OpenAI Agents SDK smoke tests against named MCP scenarios.
- Braintrust tracing and eval scaffolds for MCP and agent runs.
- ChatGPT MCP OAuth compatibility that still delivers managed bearer tokens
  through the existing identity and Hub resolver path.
- Public stack boundaries that keep model hosts replaceable.

Use this concise positioning summary:

> CREATE SOMETHING builds governed workflow systems where OpenAI can provide
> reasoning throughput and agent execution, while CREATE SOMETHING provides the
> tool boundary, approval policy, evidence model, and operator handoff. We are
> not presenting as an official OpenAI partner or affiliate. The near-term
> motion is ecosystem readiness, startup/community participation where
> eligible, and proof that OpenAI agents can operate safely through CREATE
> SOMETHING MCP and Policy OS controls.

## Proof Matrix

| Proof point | Evidence source | How to use it |
| --- | --- | --- |
| OpenAI role in stack boundary | `packages/agency/src/routes/stack/+page.svelte` | Shows OpenAI as the reasoning and agent host while CREATE SOMETHING owns tool schemas, prompts, approval behavior, eval gates, and model-routing notes. |
| Judgment layer dogfood loop | `docs/guides/JUDGMENT_LAYER_DOGFOOD_PLAYBOOK.md` | Shows the internal rule: OpenAI generates evidence and candidate actions; CREATE SOMETHING policy decides allowed, blocked, or escalated behavior. |
| Agents SDK MCP smoke | `docs/OPENAI_AGENT_SDK_HALFDOZEN_SMOKE.md` | Shows scenario-wired OpenAI Agents SDK runs against Half Dozen MCP servers, including required-tool coverage and blocked-tool filters. |
| Braintrust observability | `docs/BRAINTRUST_TRACING_QUICKSTART.md` | Shows OpenAI call tracing, Agents SDK tracing, and the warning that raw traces do not replace governed MCP policy metadata. |
| ChatGPT MCP compatibility | `docs/guides/CHATGPT_MCP_OAUTH_MANAGED_BEARER.md` | Shows how ChatGPT can connect to MCP hubs while identity-worker still delivers managed bearer credentials through governed resolver behavior. |
| Hub route authorization | `docs/policies/v1/policy.hub-route-authorization.v1.md` | Shows default-deny protected discovery and execution, human review for destructive/control-plane routes, and brokered service-first discovery. |
| MCP credential delivery | `docs/policies/v1/policy.mcp-credential-delivery.v1.md` | Shows host-bound managed bearer tokens, revocation, audit records, and the requirement not to expose shared runtime guardrail tokens. |

## Program Readiness Decision

### Consider Now

- `OpenAI for Startups`: useful if CREATE SOMETHING wants builder resources,
  events, startup community, and possible startup support tied to OpenAI's
  current eligibility rules.
- `OpenAI Partner Portal`: useful as a signal to monitor or as an inbound route
  if OpenAI provides a relevant partner application path, but the public login
  page alone does not establish an open application category.

### Consider Later

- `Frontier Alliance`: revisit only after CREATE SOMETHING has multiple
  enterprise customer proofs, a documented OpenAI plus MCP plus Policy OS
  operating model, and a credible joint-transformation story.
- `Pioneers Program`: keep the existing Ground application draft as a separate
  model-eval or research-collaboration lane, not as the agency partner stack.

### Do Not Build Now

- Public `/openai` partner page.
- OpenAI affiliate funnel.
- OpenAI reseller, certified partner, or Frontier Alliance claim.
- Promo-code/referral-code content unless OpenAI explicitly grants CREATE
  SOMETHING campaign participation and provides compliant materials.

## Public Messaging Guardrails

Approved before any OpenAI acceptance:

- "OpenAI ecosystem readiness"
- "OpenAI-ready MCP and Policy OS delivery"
- "OpenAI as a reasoning and agent host in the stack"
- "ChatGPT MCP compatibility"
- "OpenAI Agents SDK smoke coverage"

Not approved before acceptance:

- "Official OpenAI Partner"
- "Certified OpenAI Provider"
- "OpenAI-approved implementation partner"
- "OpenAI reseller"
- "OpenAI affiliate"
- "Frontier Alliance partner"
- Any OpenAI commercial brand use that implies endorsement or program approval.

## Operating Rule

OpenAI belongs in the partner stack as a model and agent-host lane, not as the
whole offer. The CREATE SOMETHING claim remains:

- `Database`: source systems, D1/KV/R2/Notion/Linear state, inventories, and
  non-secret evidence catalogs.
- `Automation`: MCP tools, Workers, Agents SDK scenarios, Dify agents, Notion
  workers, and Hub routing.
- `Judgment`: Policy OS artifacts, approval states, blocked states, eval gates,
  Braintrust scorecards, and operator escalation.

## Submission Assets

Prepare these only if a current OpenAI program path is selected:

- Organization name: `CREATE SOMETHING`
- Primary offer: `Policy OS`
- Primary proof: governed MCP and ChatGPT-compatible agent systems.
- Public reference page: `/stack` and `/partners`, not a standalone `/openai`
  page until a concrete program path exists.
- Internal proof: Agents SDK smoke, Braintrust tracing quickstart, ChatGPT MCP
  OAuth managed bearer contract, and policy route authorization docs.
- Compliance note: no official partnership, certification, reseller, affiliate,
  or Frontier Alliance claim until OpenAI grants the relevant authorization.

## Validation

Run these checks before referencing OpenAI proof in public collateral:

```bash
pnpm --filter @create-something/agency check
pnpm partner:policy:conformance --strict
pnpm trust:catalog:check
```

When validating live OpenAI agent proof, use connect-only checks before live API
calls where possible:

```bash
pnpm agent:halfdozen:dedup:connect
pnpm agent:halfdozen:inbox-triage:connect
pnpm agent:halfdozen:fleet-watchdog:connect
```
