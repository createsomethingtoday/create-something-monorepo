# Owner Compensation Margin Model

> Date: May 4, 2026
> Scope: commercial guardrail for making CREATE SOMETHING realistic as a one-operator, AI-native, remote business

## Purpose

This document corrects the Policy OS commercial model around owner compensation.

The target is not only `$1M ARR`. The target is `$1M ARR` with enough margin, reserve, and low-touch delivery shape for one operator to take meaningful compensation without turning the company into a high-stress custom services shop.

## Decision

CREATE SOMETHING should optimize for fewer, higher-value Policy OS retainers rather than many low-priced trials.

Default commercial posture:

- `MCP-only` stays a free or tightly bounded wedge.
- `Policy OS Trial` becomes a margin-safe paid pilot, not a discounted custom build.
- `Policy OS Core` becomes the owner-compensation engine.
- New workflows, extra systems, custom UI, and high-touch meeting cadence are paid scope expansions, not included favors.

## Owner Compensation Rule

At `$1M ARR`, a `$300k` owner-compensation target consumes `30%` of annual recurring revenue before considering delivery labor, tools, reserves, taxes, sales overhead, legal, insurance, and reinvestment.

That can be realistic only if the operating envelope stays disciplined:

| Envelope | Target |
|----------|--------|
| Owner compensation floor | `30%` of ARR |
| Direct delivery, subcontractor, AI, and tooling cost | `<=30%` of ARR |
| Platform, admin, sales, legal, insurance, and overhead | `<=15%` of ARR |
| Retained profit, tax buffer, and operating reserve | `>=25%` of ARR |

If a deal cannot fit this envelope, the proposal must do one of three things:

1. raise price
2. reduce scope
3. route the buyer to `MCP Audit`, `MCP-only`, or `Park`

Do not solve a margin problem by assuming the operator will absorb unpriced labor.

## ARR Math

Approximate account counts required to reach `$1M ARR`:

| Monthly retainer | Accounts required | Annualized revenue |
|------------------|-------------------|--------------------|
| `$9,500` | `9` | `$1.026M` |
| `$12,500` | `7` | `$1.05M` |
| `$18,000` | `5` | `$1.08M` |
| `$22,000` | `4` | `$1.056M` |
| `$25,000` | `4` | `$1.2M` |
| `$30,000` | `3` | `$1.08M` |

The old `$9,500/month` trial price requires too many concurrent accounts for a durable one-operator model unless those accounts are extremely low-touch and temporary.

The preferred `$1M ARR` shape is:

- `4` Policy OS Core accounts at roughly `$22k/month`
- or `5` tightly scoped Policy OS Core accounts at roughly `$18k/month`
- or `3` Enterprise Extension accounts at roughly `$30k/month`

## Current Pricing Guardrails

### Policy OS Trial

Margin-safe default:

- `$12,500-$15,000/month`
- `3-month minimum`
- one primary workflow
- up to `3` downstream systems or tool bundles
- weekly async review
- monthly live operating review
- bounded golden-task and policy tuning surface

Legacy exception:

- `$9,500/month` may be used only for a strategic proof account, narrow concierge pilot, or conversion-sensitive wedge where the operator load is explicitly capped.

### Policy OS Core

Owner-compensation-safe band:

- `$18,000-$30,000/month`
- `6-month minimum` preferred
- `$22,000/month` preferred planning default when CREATE SOMETHING owns recurring governance, review, and tuning

Core includes:

- one governed live workflow
- policy and entitlement operations
- incident and blocked-action review
- monthly tuning and release evidence
- narrow expansion through priced workflow packs

### Enterprise Extension

Use at:

- `$30,000+/month`

Trigger when:

- more than one primary workflow is live
- compliance or audit burden is high
- multi-team orchestration is required
- custom customer-facing UI is included
- response-time expectations exceed the standard cadence

## Scope Controls

Every Policy OS proposal must include an operator-load budget:

- maximum live review meetings per month
- expected async review frequency
- covered workflow count
- covered downstream systems
- monthly golden-task and policy-tuning limit
- support response expectation
- client-side approval owner
- explicit expansion price for new workflows

The standard cadence is:

- weekly async incident and blocked-action review
- monthly live operating review
- change review when workflow scope, approval mode, or commercial state changes

Do not sell weekly live meetings, unlimited tuning, unlimited tool expansion, or custom UI inside the base Core price.

## Proposal Acceptance Rule

A Policy OS proposal is commercially healthy only when it can answer:

1. What monthly recurring revenue does this account add?
2. How many operator hours per month does it consume?
3. What direct delivery cost is allowed before margin is broken?
4. Does this account move the company toward `$300k` owner compensation at `$1M ARR`?
5. What scope expansion triggers a new price?

If those answers are missing, the proposal is not ready.

## Source Anchors

- [POLICY_OS_PRODUCT_DEFINITION.md](./POLICY_OS_PRODUCT_DEFINITION.md)
- [POLICY_OS_TRIAL_PACKAGING_MEMO_2026-03-09.md](./POLICY_OS_TRIAL_PACKAGING_MEMO_2026-03-09.md)
- [FUNNEL_AND_DISCOVERY_STRATEGY_2026-03-09.md](./FUNNEL_AND_DISCOVERY_STRATEGY_2026-03-09.md)
- [AGENCY_CODEX_VECTOR_STRATEGY.md](./AGENCY_CODEX_VECTOR_STRATEGY.md)
