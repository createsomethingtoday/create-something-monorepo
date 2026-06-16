---
name: policy-os
description: Policy OS product definition, contract artifacts, versioned policies, and the MCP-First Thesis. Use when working on policy enforcement, client delivery, or governance features.
---

# Policy OS

Domain knowledge for CREATE SOMETHING's Policy OS product and the MCP-First Thesis.

## Full References

| Topic | Document |
|-------|----------|
| Product definition | `docs/POLICY_OS_PRODUCT_DEFINITION.md` |
| MCP-First Thesis | `docs/MCP_FIRST_THESIS.md` |
| Three-Tier Framework | `docs/THREE_TIER_FRAMEWORK.md` |
| Policy lifecycle | `docs/policies/README.md` |
| All v1 policies | `docs/policies/v1/` |
| Service tier entitlements | `docs/SERVICE_TIER_ENTITLEMENT_OSO_MAPPING_2026-03-09.md` |
| Graduation checklist | `docs/POLICY_OS_GRADUATION_CHECKLIST_2026-03-09.md` |
| Judgment layer dogfood | `docs/guides/JUDGMENT_LAYER_DOGFOOD_PLAYBOOK.md` |

## The MCP-First Thesis

**The entry point to automation is connectivity, not intelligence.**

1. **MCP servers establish trust** (controlled, permissioned access)
2. **Skills provide capabilities** (reusable, portable)
3. **Agents produce outcomes** (the monetizable layer)

**MCP consumption is commoditized. MCP creation is not.** — This is the moat.

## Packaging Rule

| Tier | Name | Purpose |
|------|------|---------|
| Entry wedge | `MCP-only` | Discovery / compliance-constrained |
| Default paid | `Policy OS` | MCP + agents + policy + runbook + managed judgment |
| Vector | Codex-first | With MCP/policy artifacts portable to Claude, Cursor |

## Policy OS Product Shape

Three delivery layers:

1. **Workflow Infrastructure** — trusted MCP connectivity, deterministic execution
2. **Policy OS** — approval/block/escalation logic, policy artifacts, review cadence
3. **Enterprise Extension** — cross-system orchestration, compliance-heavy governance

## Contract Bundle

Every Policy OS engagement ships:

| Artifact | Purpose |
|----------|---------|
| `mcp_contract.yaml` | MCP connectivity scope |
| `agent_contract.yaml` | Agent behavior boundaries |
| `outcome_contract.md` | Expected outcomes |
| `golden_tasks.yaml` | Regression test tasks |
| `runbook.md` | Operator procedures |

Required fields: `package_name`, `approved_workflows`, `approval_mode`, `escalation_policy`, `review_cadence`, `billing_and_entitlement_assumptions`.

## Entitlement Enum

Runtime enforcement uses:

| Entitlement | Scope |
|------------|-------|
| `mcp_only` | Free / discovery |
| `policy_os_trial` | Time-limited paid trial |
| `policy_os_core` | Full paid package |

Decision inputs: `service_entitled`, `policy_accepted`, `contract_active`.

## Versioned Policies

20 v1 policies in `docs/policies/v1/`, each as paired `.md` (human) + `.json` (machine). Key policies:

| Policy | Governs |
|--------|---------|
| `service-tier-entitlement` | Which features each tier gets |
| `hub-route-authorization` | MCP Hub route access rules |
| `judgment-baseline` | Default agent judgment boundaries |
| `git-light-agent-delivery` | Agent deploy without PR |
| `tenant-tool-exposure` | Which tools each tenant sees |
| `mcp-credential-delivery` | How MCP credentials flow |
| `policy-lifecycle-governance` | How policies themselves change |

## .agency Service Offerings

| Service | Description |
|---------|-------------|
| **MCP Audit** | What MCPs would unlock value? |
| **MCP-only** | Limited-scope connectivity |
| **Policy OS** | Full governed execution package |
| **Ongoing Support** | Auth updates, policy tuning, golden-task regressions |

## The Creation Moat

Commoditized: installing, using, scaffolding MCP servers.

Not commoditized: understanding *what* to build, custom development, system integration, the Intelligence Layer on top.

**CREATE SOMETHING operates in the "not commoditized" space.**
