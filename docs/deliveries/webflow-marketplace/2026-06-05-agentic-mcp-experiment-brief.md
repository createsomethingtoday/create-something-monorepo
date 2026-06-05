# Agentic MCP Experiment Brief

**Prepared:** 2026-06-05
**Strategic question:** Can agent-native template discovery create a new path into template selection and recovery, beyond the human browse/search funnel?

## Why This Experiment Exists

The Marketplace decline is a top-of-funnel problem. Supplied analytics showed `Selected/View` roughly halving from winter to late spring, while detail-page CTA and checkout conversion stayed healthy.

The UI/UX work is aimed at the right leak, but early data shows it has stabilized rather than reversed browse-to-select. That makes an agent-native experiment a rational next bet: open a new discovery path instead of continuing to rely only on human browsing through grids.

This aligns with the repo's broader thesis:

- MCP consumption is becoming commoditized.
- MCP creation and domain-specific agent workflows are the moat.
- Policy, evidence, and review boundaries should be artifacts, not vague prompt behavior.

Repo links:

- [MCP First Thesis](../../../docs/MCP_FIRST_THESIS.md)
- [Three-Tier Framework](../../../docs/THREE_TIER_FRAMEWORK.md)
- [Webflow Surface Ownership Runtime Map](../../../docs/WEBFLOW_SURFACE_OWNERSHIP_RUNTIME_MAP.md)

## Experiment Hypothesis

An agent-native template discovery/build path, using Webflow MCP and Marketplace search/review artifacts, can lift the top-of-funnel outcome:

```text
visitor or agent intent -> selected/buildable template
```

without degrading:

- detail CTA conversion
- checkout-to-order conversion
- submission quality
- reviewer trust
- WebKit/Safari experience

## What To Test

The experiment should not start as "AI approves templates" or "AI replaces browsing." It should start as an agent-readable discovery and decision-support path:

1. **Agent-readable template search**
   - Use `webflow-template-search` as the Database tier.
   - Expose query, category, style, type, free/paid, popularity, recency, and 30-day sales signal fields through a controlled MCP or agent surface.

2. **Agent-assisted template shortlist**
   - Given a user/business brief, return a shortlist of templates with reasons.
   - Include transparent filters and evidence fields.
   - Do not claim final business fit without human/user confirmation.

3. **Agent-to-Designer handoff**
   - Use Webflow MCP where available to move from shortlist to inspect/build actions.
   - Keep mutation actions gated by explicit user approval and policy.

4. **Quality-aware discovery**
   - Use Validator/review evidence only as trust signals where policy allows.
   - Do not rank quality from sales, views, or popularity alone.

## Measurement Design

Do not bury agent traffic inside the human web funnel. Create a separate cohort.

### North-Star Metrics

For human web:

```text
template_card_clicked / results_rendered
```

For agent-native:

```text
agent_shortlist_selected / agent_search_sessions
agent_handoff_started / agent_shortlist_selected
agent_handoff_completed / agent_handoff_started
```

For business impact:

```text
orders / selected template
orders / agent handoff
```

### Guardrails

- CTA-to-order remains stable.
- Checkout-to-order remains approximately intact.
- No increase in reviewer request-changes caused by agent-selected templates.
- No autonomous approval/rejection or quality-band decision.
- No Safari/WebKit degradation.
- No raw query, template name, creator name, credential, or private review data sent into public analytics.

## Required Instrumentation

Before the experiment can be read cleanly:

1. `signal_window`, `signal_density`, `signal_bucket`, and `signal_metric` must land in the analytics event payload and be queryable.
2. `attribution_present` and `attribution_match` must be queryable for grid-to-detail tracking.
3. Agent sessions must carry an explicit cohort such as `source=agentic_mcp`.
4. Bot and crawler traffic must be segmented from human sessions, not discarded blindly.
5. Validator/review evidence must identify whether it is automatic, partial, manual, or human-reviewed.

## Why Bots Matter

Supplied Clarity notes showed a high bot share, and Datadog/server-log review found AI crawlers active in the Webflow ecosystem but not clearly browsing the Marketplace pages directly. That matters in two ways:

- Human-funnel analysis must stay bot-filtered.
- Agent/crawler activity should become a first-class cohort, not a nuisance bucket, if the Marketplace wants to serve agent-mediated discovery.

## Minimum Viable Experiment

1. Build an internal MCP or agent tool that queries `webflow-template-search`.
2. Use a small set of business briefs, such as "portfolio site for solo designer" or "SaaS landing page with blog."
3. Return a ranked shortlist with evidence:
   - scope/filter inputs
   - category/style/type
   - free/paid
   - recency
   - 30-day demand bucket
   - image/thumbnail availability
   - validator/review caveats where permitted
4. Have a human select whether each shortlist result is useful.
5. Compare selected-template rate against the human browse baseline near 5 percent.

## Success Criteria

The experiment is promising if:

- agent shortlist selection beats the current human browse-to-select baseline
- selected templates produce healthy detail/CTA/order behavior
- users report the evidence as useful and not misleading
- review/quality guardrails remain intact
- the agent path creates measurable sessions that did not exist in the current Marketplace funnel

## PM Recommendation

Frame this as a new discovery channel experiment:

```text
Open and instrument an agent-native template discovery path.
```

Do not frame it as:

```text
AI replaces the template marketplace UI.
```

The immediate business goal is to recover the lost browse-to-select step. The strategic goal is to learn whether agent-mediated discovery can become a better story than another human-only grid iteration.
