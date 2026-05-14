# Webflow Template Review Runtime Strategy Brief

**Date:** May 14, 2026
**Audience:** PMM, Marketplace operations, reviewer enablement, engineering
**Status:** Strategy brief for PMM handoff

## Executive Summary

The Webflow Template Review agent work should be positioned as a portable review workflow, not as a dependency on one analyzer MCP.

The durable product is the governed workflow:

1. gather bounded public-site evidence
2. preserve capture state across turns
3. draft evidence-bound reviewer feedback
4. use reviewer-safe Airtable context and write paths
5. evaluate the full behavior across agent runtimes

The analyzer MCP remains useful as a specialized implementation detail, but it is no longer the center of gravity. The runtime strategy now favors portability across Claude Code, Claude Desktop/proper, Dify, and E2B-backed evaluation environments.

## What Changed

The original implementation path leaned on a dedicated analyzer-style tool to inspect templates. That created platform coupling: if a reviewer-facing environment could not expose that analyzer consistently, the review workflow stalled.

The new posture separates the product contract from the execution environment:

- `webflow-template-review-mcp` owns reviewer identity, queue context, Airtable-backed evidence, safe draft writes, and capture-session tools.
- Claude Code gives operators and power users a local environment for skill iteration, raw HTML checks, and debugging.
- Dify remains a useful proving ground because it has a low-friction chat UI, API access, hosted tool wiring, and observability hooks.
- E2B gives the eval suite a repeatable sandbox for public-site capture.
- Claude Desktop/proper remains the preferred aligned destination if MCP access, permissioning, and reviewer identity mapping land cleanly.

In short: the analyzer is optional specialization. The review contract is the product.

## Current Runtime Roles

| Runtime                        | Current role                                                                                                 | PMM framing                                                           |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| `webflow-template-review-mcp`  | Governed control layer for reviewer identity, Airtable context, capture-session state, and safe draft writes | The reliable backbone: policy, evidence, and reviewer-safe actions    |
| Dify                           | Fast reviewer-facing prototype and live eval surface                                                         | Low-friction proving ground while Claude rollout details are resolved |
| Claude Code                    | Operator and power-user environment for local checks, skill iteration, and fallback workflows                | Internal enablement and calibration surface                           |
| Claude Desktop / Claude proper | Desired long-term reviewer surface if internal MCP availability and access scoping are workable              | Preferred aligned destination, pending platform fit                   |
| E2B                            | Repeatable sandbox for public-site capture and Dify/API evals                                                | Test environment for runtime-independent evidence gathering           |
| Analyzer MCP                   | Optional specialized analyzer, not required for the reviewer contract                                        | Enhancement path, not launch dependency                               |

## Why This Matters For PMM

This pivot makes the story easier to explain and safer to launch:

- **Less tool fragility:** the workflow does not depend on one analyzer being available in every runtime.
- **Clearer value proposition:** reviewers get evidence-bound draft feedback, not a black-box scanner.
- **Better adoption path:** Dify can support immediate low-friction usage while Claude remains the preferred destination.
- **Stronger governance story:** Airtable writes and reviewer identity stay behind MCP guardrails.
- **Better evaluation:** Braintrust can test whether the agent follows the workflow, not just whether it called one tool.

The message should not be "we built a scanner." The message should be "we built a governed review assistant that can move between approved AI surfaces while preserving evidence, identity, and write boundaries."

## Decision Posture

Recommended near-term position:

- Keep Dify as the working reviewer/eval surface while Claude access details are resolved.
- Continue improving Claude Code support for operators, calibration, and fallback.
- Use E2B-backed evals to prove capture quality and runtime behavior.
- Treat Claude Desktop/proper as the desired reviewer destination, but do not block reviewer progress on it.
- Keep the analyzer MCP out of the required reviewer path unless a future environment can expose it safely and consistently.

Recommended architecture position:

- Favor one centralized Template Review MCP with authenticated reviewer identity when feasible.
- Keep reviewer-specific MCP lanes as a practical fallback while the team is small or while centralized identity is being validated.
- Never trust prompt text for reviewer identity. Identity should come from auth/session/token mapping.

## Open Questions

These questions should be resolved before making a hard platform commitment:

1. Can Claude Desktop/proper expose the required MCP surface only to the intended reviewer group?
2. Can a centralized MCP reliably map authenticated reviewer identity to Airtable reviewer records?
3. Does Gumloop already provide enough chat, MCP, auth, and observability capability to avoid adding another long-term tool?
4. Which surface gives PMM and reviewer enablement the lowest training burden without weakening write guardrails?
5. What level of traceability is required before PMM positions agent review feedback as reviewer-ready rather than operator-assisted?

## Recommended Next Steps

1. Create a short requirements matrix comparing Claude Desktop/proper, Dify, Gumloop, Claude Code, and E2B for reviewer UX, MCP access, identity, observability, and eval support.
2. Prototype centralized MCP identity mapping with the current reviewer actions: queue read, self-assign, capture, draft feedback, and save draft.
3. Keep Braintrust evals focused on workflow behavior: capture state continuity, evidence binding, prompt-injection boundaries, reviewer identity isolation, and write approval gates.
4. Use Dify as the live baseline until Claude proper can match the required identity and MCP behavior.
5. Prepare PMM language around "governed review workflow" rather than "template scanner" or "analyzer MCP."

## PMM Messaging Draft

Short version:

> We are moving Template Review from a tool-specific analyzer into a portable, governed review workflow. The assistant can gather public-site evidence, preserve capture state, draft grounded feedback, and route Airtable actions through reviewer-safe MCP controls. Dify is the proving ground, Claude is the preferred destination, and E2B gives us repeatable evaluation coverage.

Positioning line:

> The product is not the analyzer. The product is a reviewer-safe review workflow with evidence, identity, and write boundaries built in.

What to avoid:

- Avoid implying that the agent replaces human review judgment.
- Avoid presenting public-site evidence as Designer/API evidence.
- Avoid naming Dify as the permanent destination until the Claude/Gumloop comparison is complete.
- Avoid making the analyzer MCP sound required for launch.

## Related Docs

- [Webflow Template Review Nontechnical Reviewer Delivery](./WEBFLOW_TEMPLATE_REVIEW_NONTECH_REVIEWER_DELIVERY.md)
- [Webflow Template Review Claude Code Reviewer Setup](./WEBFLOW_TEMPLATE_REVIEW_CLAUDE_CODE_REVIEWER_SETUP.md)
- [Webflow Template Review Hub Eval Suite](./WEBFLOW_TEMPLATE_REVIEW_HUB_EVAL_SUITE.md)
- [Webflow Marketplace Template Review Hub Delivery Pack](../specs/webflow-marketplace/delivery/template-review-hub/README.md)
