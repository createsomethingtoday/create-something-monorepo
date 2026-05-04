# Policy OS Trial Packaging Memo

> Prepared: March 9, 2026
> Scope: internal commercial recommendation for packaging the first client trial as a monthly subscription that ladders into CREATE SOMETHING Policy OS

> Superseded note (March 13, 2026): This memo preserves the March 9 framing. Current canonical packaging uses `Policy OS` as the paid package name. See [POLICY_OS_PRODUCT_DEFINITION.md](./POLICY_OS_PRODUCT_DEFINITION.md).

> Margin correction (May 4, 2026): The March 9 `$9,500/month` pilot recommendation is now treated as a legacy or strategic proof exception. The owner-compensation-safe default is `$12,500-$15,000/month` for `Policy OS Trial` and `$18,000-$30,000/month` for `Policy OS Core`. See [OWNER_COMPENSATION_MARGIN_MODEL_2026-05-04.md](./OWNER_COMPENSATION_MARGIN_MODEL_2026-05-04.md).

## Executive Summary

- The repo already makes the commercial answer clear: the default paid delivery is not `MCP-only`. It is **Agent Outcome Stack**: custom MCP + policy artifacts + runbooks + managed judgment loop + monthly tuning.
- The payment boundary should be explicit: `MCP-only` is the free wedge by default, and the first paid product begins at **Policy OS Trial**.
- For this client, the initial concierge project should be sold as a **managed monthly pilot**, not as:
  - a cheap per-seat copilot license
  - a commodity chatbot subscription
  - a one-time custom build with no recurring operating layer
- Recommended commercial shape:
  - **Offer name**: `Policy OS Trial: Concierge Pilot`
  - **Commercial family**: `Agent Outcome Stack`
  - **Client-facing label**: `Skills + MCP`
  - **Recommended price**: **$12,500-$15,000/month**
  - **Term**: **3-month minimum**
- The goal is not to maximize trial revenue in isolation. The goal is to create the right bridge into an ongoing **Policy OS Core** subscription where CREATE SOMETHING owns policy, governed execution, observability, and monthly tuning.

## Repo Ground Truth

The codebase already defines the durable value layer:

- [MCP_FIRST_THESIS.md](./MCP_FIRST_THESIS.md) says the default paid offer is **Agent Outcome Stack**: custom MCP + agent layer + policy operations.
- [AGENCY_CODEX_VECTOR_STRATEGY.md](./AGENCY_CODEX_VECTOR_STRATEGY.md) says the hard-to-copy elements are:
  - custom MCP creation
  - auth and security boundary design
  - policy artifacts
  - approval and escalation runbooks
  - monthly tuning
- [MIXED_STACK_CLIENT_MCP_OFFER_ASSESSMENT_2026-03-09.md](./MIXED_STACK_CLIENT_MCP_OFFER_ASSESSMENT_2026-03-09.md) says the client should see one CREATE SOMETHING house stack, with Composio kept behind the surface as plumbing.
- [policies/README.md](./policies/README.md) and the `policy.*` artifacts show that policy is intended to be versioned, portable, and saleable as an operating artifact rather than hidden in prompts.

### Important repo inference

The exact phrase `Policy OS` is not yet a canonical repo document title.

This memo uses `Policy OS` as shorthand for the business layer the repo already describes:

- policy catalog
- judgment layer
- approval and escalation behavior
- runbooks and contracts
- governance and observability
- monthly tuning and review cadence

That inference is grounded in repo strategy, not a literal existing packaging page.

## Payment Rule

Use this commercial rule unless a named exception is approved:

- `MCP-only` is free
- `Policy OS Trial` is the first paid product
- `Policy OS Core` is the recurring paid operating layer

Why:

- this protects the wedge
- it reflects current market reality that many clients still need Codex and MCP onboarding before they can productively adopt governed execution
- it keeps payment aligned with governance ownership
- it avoids asking buyers to pay before CREATE SOMETHING is taking on the real policy and operating burden

## Exception Rule

Strategic free wedges are allowed when they are intentionally used to open a larger governed relationship.

Paid `MCP-only` exceptions are also allowed, but only when the setup or advisory burden is unusually heavy relative to a normal education-and-trust wedge.

Conditions:

1. the wedge must stay bounded
2. the free work must be treated as an introduction, not an indefinite support model
3. the intended graduation path must already be identified

Named example:

- Outerfields MCP delivered free as an introduction to the Half Dozen system team, with the explicit goal of graduating the relationship into `Policy OS Trial`

## Market Anchors From EXA Research

Research was performed on March 9, 2026 using EXA through the Hub MCP surface.

### 1. Managed AI retainers already live in the mid-four to low-five figures monthly

- AutomateNexus says common AI automation agency monthly retainers fall around **$3,000-$30,000+/month**, with projects often starting around **$20,000-$150,000**.
- Hashmeta says most mid-market companies invest **$5,000-$25,000/month** for AI-enabled managed delivery.

Interpretation:

- A governed concierge pilot priced below roughly `$5k/month` risks reading like low-end freelancer automation.
- The current margin-safe trial lane is `$12.5k-$15k/month`; pricing materially above that needs stronger production proof, wider scope, or Enterprise Extension positioning.

Sources:

- [AutomateNexus pricing guide](https://automatenexus.com/blog/ai-automation-agency-pricing-complete-cost-guide-2025)
- [Hashmeta AI pricing guide](https://www.hashmeta.ai/en/ai-seo/ai-marketing-pricing)

### 2. Commodity AI assistants are much cheaper because they are not custom governed systems

- Microsoft lists Microsoft 365 Copilot at **$30/user/month** on its enterprise pricing page.
- OpenAI says ChatGPT Business is **$25/seat/month billed annually** or **$30/seat/month billed monthly**.

Interpretation:

- Seat pricing is the wrong frame for this offer.
- Those products are benchmarks for commodity assistant access, not for custom workflow governance, policy artifacts, or managed outcome delivery.

Sources:

- [Microsoft 365 Copilot enterprise pricing](https://www.microsoft.com/en-us/microsoft-365/copilot/pricing/enterprise)
- [OpenAI ChatGPT Business help article](https://help.openai.com/en/articles/8792828-what-is-chatgpt-business)

### 3. Healthcare concierge and intake tools are cheaper than our offer because they are narrow SaaS

- Medreception AI lists **$495/month** for its Essential plan and **$995/month** for Professional.
- mirro.ai lists **$79/provider/month** for Pro and **$99/provider/month** for Premium, with Enterprise as custom pricing.

Interpretation:

- This establishes the floor for commodity workflow SaaS.
- If we package this client trial too close to `$500-$1,000/month`, we collapse our value into a feature comparison against narrow vertical SaaS.

Sources:

- [Medreception AI pricing](https://www.medreception.ai/pricing)
- [mirro.ai pricing](https://mirro.ai/pricing-plans)

### 4. Fully custom chatbot builds are often sold as projects, but that is not the model to copy

- EXA surfaced multiple current references placing custom AI chatbot builds in the **$30,000-$150,000+** range, with much higher enterprise ceilings.

Interpretation:

- We should borrow the seriousness of custom delivery, but not the commercial shape.
- Selling this as a one-off build creates the wrong expectation. The repo says the durable value is managed judgment and policy operations, so the pricing model should reinforce that.

Source:

- [Master of Code chatbot pricing](https://masterofcode.com/blog/chatbot-pricing)

## Recommended Packaging

### Offer Name

**Policy OS Trial: Concierge Pilot**

Client-facing subtitle:

**Skills + MCP**

Internal commercial family:

**Agent Outcome Stack**

### Recommended Price

**$12,500-$15,000/month**

The prior `$9,500/month` price is still valid only as a strategic proof exception where scope, meetings, and operator load are explicitly capped.

### Term

**3-month minimum**

### Why this price

- It sits inside the observed mid-market managed AI retainer band.
- It is clearly above commodity SaaS pricing.
- It is materially below a large custom enterprise build.
- It gives enough room to include governance, runbooks, policy artifacts, and monthly tuning without pretending the work is just a cheap chatbot.
- It protects the owner-compensation model by avoiding a path that requires too many concurrent low-priced accounts to reach `$1M ARR`.

### What is included

1. One hosted concierge workflow surface
   - initial conversational concierge experience
   - approved dynamic widget set
   - bounded workflow scope
2. One CREATE SOMETHING governed execution surface
   - one house MCP hub endpoint
   - brokered tool discovery and execution
   - session and account-scoped access posture
3. One client policy pack
   - workflow-specific guardrails
   - approval and escalation rules
   - inferred-versus-confirmed data handling
4. One handoff bundle
   - `mcp_contract.yaml`
   - `agent_contract.yaml`
   - `outcome_contract.md`
   - operating runbook
5. Managed operating cadence
   - weekly operating review
   - monthly policy and prompt tuning
   - issue triage and controlled iteration

### Trial boundaries

Keep the scope explicit:

- 1 primary workflow
- up to 3 downstream systems or tool bundles
- bounded user volume for pilot learning
- no broad multi-tenant generalization
- no claim of fully generalized shared-hub SaaS maturity

## Why not price it as a seat license

- Seat pricing anchors the client to Microsoft/OpenAI assistant economics instead of CREATE SOMETHING house-stack economics.
- This repo’s value is not "give everyone another assistant seat."
- The differentiated layer is:
  - workflow design
  - policy artifacts
  - runbooks
  - approval and escalation behavior
  - governed integration and monthly tuning

## Why not price it as a one-time build

- One-time project pricing trains the client to think the main value is implementation labor.
- The repo’s stated thesis is the opposite: durable value lives in the operating layer and managed judgment loop.
- A subscription better matches:
  - policy iteration
  - prompt and workflow tuning
  - telemetry review
  - escalation refinement
  - rollout control

## Conversion Path Into Policy OS

The trial should explicitly ladder into an ongoing subscription.

### Recommended post-trial offer

**Policy OS Core**

Recommended target band:

**$18,000-$30,000/month**

Preferred planning default:

**$22,000/month**

### Structure

- base subscription for governance and platform operations
- workflow pack for the live concierge workflow
- optional add-ons for extra workflows, extra integrations, or higher support level
- explicit operator-load budget and margin assumptions

### What changes at conversion

Compared with trial, Policy OS Core should add:

- ongoing governance ownership
- wider workflow coverage
- higher confidence on production hardening
- deeper observability and review cadence
- recurring policy promotion and lifecycle management

## Alternative Pricing Bands

Use these only if deal pressure forces a narrower or wider opening.

### Lower-friction wedge

**$9,500/month for 3 months**

Use only if:

- scope is tightly constrained
- integrations are few
- the client is highly price-sensitive
- conversion upside is strong
- operator meetings are capped and the account does not become a standing support lane

Risk:

- can read too close to a services retainer without enough premium signal
- can break the one-operator owner-compensation model if repeated across too many accounts

### Higher-complexity pilot

**$18,000/month for 3 months**

Use when:

- there are multiple regulated systems
- the workflow needs heavier escalation logic
- the client expects higher-touch operating support

Risk:

- requires stronger proof and clearer sponsor urgency

### Enterprise-extension pilot

**$25,000-$30,000/month for 3 months**

Use when:

- more than one primary workflow is in scope
- custom customer-facing UI is included
- compliance or audit burden is high
- live weekly executive review is required

Risk:

- must be sold as a serious governed operating layer, not a trial experiment

## Commercial Guidance

### Positioning language

Say:

- `Skills + MCP`
- `governed concierge pilot`
- `policy-backed operating layer`
- `monthly tuning and review`

Avoid saying:

- `chatbot package`
- `Composio subscription`
- `seat license`
- `just an MVP`

### Selling motion

Frame the trial as:

1. a governed introduction to CREATE SOMETHING
2. proof that one high-value workflow can run under policy
3. the first subscription lane into Policy OS Core

## Final Recommendation

For this client, the cleanest subscription packaging is:

- **Policy OS Trial: Concierge Pilot**
- **$12,500-$15,000/month**
- **3-month minimum**
- sold as **Skills + MCP**
- explicitly designed to convert into **Policy OS Core**

That is the price and packaging shape most consistent with:

- the repo’s commercial thesis
- the repo’s policy and runbook posture
- the current maturity of the governed house stack
- the owner-compensation requirement for a one-operator business
- the EXA-backed market window between commodity SaaS and full custom enterprise build

## Source Anchors

### Repo canon

- [MCP_FIRST_THESIS.md](./MCP_FIRST_THESIS.md)
- [AGENCY_CODEX_VECTOR_STRATEGY.md](./AGENCY_CODEX_VECTOR_STRATEGY.md)
- [OWNER_COMPENSATION_MARGIN_MODEL_2026-05-04.md](./OWNER_COMPENSATION_MARGIN_MODEL_2026-05-04.md)
- [MIXED_STACK_CLIENT_MCP_OFFER_ASSESSMENT_2026-03-09.md](./MIXED_STACK_CLIENT_MCP_OFFER_ASSESSMENT_2026-03-09.md)
- [policies/README.md](./policies/README.md)

### EXA research sources

- [AutomateNexus pricing guide](https://automatenexus.com/blog/ai-automation-agency-pricing-complete-cost-guide-2025)
- [Hashmeta AI pricing guide](https://www.hashmeta.ai/en/ai-seo/ai-marketing-pricing)
- [Microsoft 365 Copilot enterprise pricing](https://www.microsoft.com/en-us/microsoft-365/copilot/pricing/enterprise)
- [OpenAI ChatGPT Business help article](https://help.openai.com/en/articles/8792828-what-is-chatgpt-business)
- [Medreception AI pricing](https://www.medreception.ai/pricing)
- [mirro.ai pricing](https://mirro.ai/pricing-plans)
- [Master of Code chatbot pricing](https://masterofcode.com/blog/chatbot-pricing)
