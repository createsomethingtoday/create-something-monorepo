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
| Gumloop                        | Possible comparison surface for chat, workflow automation, and custom MCP access                             | Candidate fallback, not the current baseline                          |
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

- Favor the centralized Template Review MCP through the Hub when authenticated reviewer identity is available: `https://wf-template-review.mcp.createsomething.agency/mcp` for Claude/OAuth-discovery clients and `https://wf-template-review.mcp.createsomething.agency/mcp/bearer` for Gumloop bearer-token clients.
- Keep reviewer-specific Hub lanes as the safe fallback while centralized identity is being validated.
- Never trust prompt text for reviewer identity. Identity should come from auth/session/token mapping.
- Treat direct shared-bearer MCP access as read/eval infrastructure, not as the authoritative write path for reviewer attribution.
- The central endpoint is now deployed, but reviewer-managed bearer issuance is gated by `.agency` entitlement state. The first live issuance attempt was correctly blocked with `policy_acceptance_required`, so reviewer-specific Hubs remain the production-safe fallback until entitlement and credential handoff are complete.

## Resolved Questions

These questions came out of the retro and are now resolved enough for PMM handoff. A few still have engineering gates before launch expansion.

| Question                                                                                       | Decision                                                                                                                                                                                                                                                                                                        | Gate before broader rollout                                                                                                                                                    |
| ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Can Claude Desktop/proper expose the required MCP surface only to the intended reviewer group? | Plausible and preferred if Webflow can configure a scoped remote MCP connector for the reviewer group. Claude custom connectors support remote MCP, but org-level setup, reviewer access, and tool scoping still need admin confirmation.                                                                       | Confirm connector visibility, user-level authentication, tool allowlisting, and reviewer-safe write behavior in the Webflow Claude environment.                                |
| Can a centralized MCP map authenticated reviewer identity to Airtable reviewer records?        | Yes, but only through Hub-resolved reviewer identity. The trusted path is Auth0/session or managed bearer to Hub actor context, then reviewer directory lookup, then Airtable action. Prompt text and downstream shared bearer tokens are not trusted identity.                                                 | Make the centralized path `session_required`, include reviewer `account_id`, `tenant_id`, `user_id`, and `allowedToolPrefixes`, and prove it with identity-isolation evals.    |
| Does Gumloop avoid adding another long-term tool?                                              | Not yet. Gumloop is worth comparing because it supports custom MCP servers, agents, workflows, bearer tokens, and OAuth discovery. It is not the recommended primary surface because its MCP agent path has no approval prompts, so write safety must come entirely from Hub scopes and server-side guardrails. | Run the same Dify trust workflow suite shape against Gumloop before considering it reviewer-facing. Require API access, traces, no-write defaults, and Hub-scoped write tools. |
| Which surface has the lowest training burden without weakening guardrails?                     | Dify now, Claude proper later if it matches the Hub identity and MCP behavior. Claude Code remains for operators and power users, not nontechnical reviewer onboarding. E2B remains test infrastructure, not a reviewer surface.                                                                                | Keep PMM and reviewer enablement centered on one chat surface at a time. Do not promote Gumloop or Claude proper until the eval and identity gates pass.                       |
| What traceability is required before feedback is reviewer-ready?                               | Every reviewer-ready run needs reviewer identity, Hub correlation or workflow ID, tool trace, template asset/version ID, capture session ID, cited public evidence, caveats for public-only evidence, and an explicit approval record for any write.                                                            | Until these are present, frame output as operator-assisted draft feedback, not autonomous reviewer action.                                                                     |

## Runtime Requirements Matrix

| Requirement             | Dify                                                                              | Claude Desktop / Claude proper                                                                           | Claude Code                                                               | Gumloop                                                                                     | E2B                                                                         |
| ----------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Reviewer chat UX        | Strong current baseline. Reviewers can use a standalone chat without local setup. | Preferred destination if custom connector rollout and access scoping land cleanly.                       | Too technical for nontechnical reviewer rollout.                          | Candidate chat/workflow surface. Needs hands-on validation.                                 | Not a reviewer UX.                                                          |
| MCP access              | Current live eval and reviewer prototype surface.                                 | Remote MCP custom connectors are supported, but Webflow org setup and access controls need confirmation. | Good for local operator workflows and debugging.                          | Custom MCP over public HTTPS is supported.                                                  | Useful as sandboxed capture environment, not the control-plane MCP surface. |
| Reviewer identity       | Safe writes should route through Hub identity, not direct shared bearer intake.   | Must authenticate each reviewer and preserve identity through the Hub.                                   | Operator identity is explicit but not the reviewer onboarding path.       | Personal/team credentials are possible, but no approval prompts means scopes must be tight. | No reviewer identity authority.                                             |
| Airtable writes         | Approval-gated and reviewer-safe only through MCP guardrails.                     | Viable only after identity and write approval behavior are proven.                                       | Useful for testing and emergency fallback with operator oversight.        | Possible only if Hub-scoped tools make unsafe writes impossible.                            | Should stay read/capture-only.                                              |
| Observability and evals | Strongest current path: Dify API, Braintrust suites, and trace sidecars.          | Needs a mechanical eval path after connector setup.                                                      | Manual and scriptable, but not equivalent to live reviewer surface evals. | Needs proof of API-driven evals, logs, and trace export.                                    | Strong for repeatable public-site capture inside evals.                     |
| Decision                | Live baseline.                                                                    | Preferred aligned destination, gated.                                                                    | Operator/calibration surface.                                             | Comparison candidate.                                                                       | Evaluation substrate.                                                       |

## Completed Next Steps And Remaining Gates

| Next step                                             | Status                                                       | Notes                                                                                                                                                                                                                                                                                                                                                      |
| ----------------------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Create the requirements matrix.                       | Complete in this brief.                                      | The matrix above is the PMM-ready comparison.                                                                                                                                                                                                                                                                                                              |
| Prototype centralized MCP identity mapping.           | Central endpoint deployed; reviewer credential gate remains. | The shared `wf-template-review` Hub target uses `session_required` identity and rejects unauthenticated MCP calls. Reviewer-managed bearer issuance is currently blocked by `.agency` entitlement state (`policy_acceptance_required`), so the reviewer-specific Hubs remain the safe fallback until credential handoff and identity-isolation evals pass. |
| Keep Braintrust evals focused on workflow behavior.   | Implemented and should continue.                             | Existing suites cover Dify comprehensive behavior, Dify trust workflows, MCP Hub/Airtable behavior, E2B public-site capture, prompt injection boundaries, and no-write guardrails.                                                                                                                                                                         |
| Use Dify as the live baseline.                        | Confirmed.                                                   | Dify remains the reviewer/eval baseline while Claude proper and Gumloop are gated by identity, connector, and eval requirements.                                                                                                                                                                                                                           |
| Prepare PMM language around governed review workflow. | Complete in this brief.                                      | Use the messaging below. Avoid "scanner" and avoid making the analyzer MCP sound launch-critical.                                                                                                                                                                                                                                                          |

## Eval Coverage And Gaps

Current coverage is strong enough to support the PMM handoff:

- Dify comprehensive suite covers four reviewers, E2B public-site capture scenarios, Hub/Airtable read-only scenarios, and no-write guardrails.
- Dify trust workflow suite covers multi-turn capture continuity, evidence-bound natural review prompts, live Hub/Dify drift, prompt-injection boundaries, and approval-gated write roundtrip behavior.
- MCP Hub/Airtable suite covers reviewer Hub visibility, tool exposure, Airtable read paths, and assign/unassign roundtrips.
- Package tests cover capture-session tools, missing `capture_state` rejection, reviewer ownership checks, broad update rejection, and draft feedback behavior.

The remaining eval gaps should become tracked follow-up work before expanding beyond the current Dify baseline:

- Add structural capture-state scoring: verify the state is valid, accumulated, session-bound, and usable across start/continue/draft calls.
- Add adversarial reviewer identity isolation: prompt-spoofed identity, cross-reviewer assignment attempts, and attempts to mutate another reviewer's version.
- Add live write roundtrips for `request_changes`, `save_draft_feedback`, and status writes against reversible fixture rows.
- Add a prompt-injection fixture where the malicious instruction is captured from public page content, not only described in the user prompt.
- Add mechanical Claude proper and Gumloop runtime evals only after those surfaces are connected through the Hub.

## PMM Messaging Draft

Short version:

> We are moving Template Review from a tool-specific analyzer into a portable, governed review workflow. The assistant can gather public-site evidence, preserve capture state, draft grounded feedback, and route Airtable actions through reviewer-safe MCP controls. Dify is the live proving ground, Claude is the preferred aligned destination once identity and connector gates pass, and E2B gives us repeatable evaluation coverage.

Positioning line:

> The product is not the analyzer. The product is a reviewer-safe review workflow with evidence, identity, and write boundaries built in.

What to avoid:

- Avoid implying that the agent replaces human review judgment.
- Avoid presenting public-site evidence as Designer/API evidence.
- Avoid naming Dify as the permanent destination until Claude proper or Gumloop has passed the same identity and eval gates.
- Avoid making the analyzer MCP sound required for launch.
- Avoid saying centralized MCP is ready for writes until Hub `session_required` identity is proven.

## Related Docs

- [Webflow Template Review Nontechnical Reviewer Delivery](./WEBFLOW_TEMPLATE_REVIEW_NONTECH_REVIEWER_DELIVERY.md)
- [Webflow Template Review Central MCP Connector](./WEBFLOW_TEMPLATE_REVIEW_CENTRAL_MCP_CONNECTOR.md)
- [Webflow Template Review Claude Code Reviewer Setup](./WEBFLOW_TEMPLATE_REVIEW_CLAUDE_CODE_REVIEWER_SETUP.md)
- [Webflow Template Review Hub Eval Suite](./WEBFLOW_TEMPLATE_REVIEW_HUB_EVAL_SUITE.md)
- [Remote MCP Identity Standard](./REMOTE_MCP_IDENTITY_STANDARD.md)
- [Dify-First Agent Control Plane](./guides/DIFY_FIRST_AGENT_CONTROL_PLANE.md)
- [Webflow Marketplace Template Review Hub Delivery Pack](../specs/webflow-marketplace/delivery/template-review-hub/README.md)
- [Claude custom connectors using remote MCP](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp)
- [Gumloop custom MCP servers](https://docs.gumloop.com/nodes/mcp/custom_mcp_servers)
