# Agent Review and Validation Report

**Prepared:** 2026-06-05
**Tier focus:** Judgment and Automation
**Surfaces:** Webflow Way Validator, Template Review MCP, agent workflow prompts, tests/evals

## Summary

The agent-review system is becoming more reliable by tightening what automated validation is allowed to mean. The most important improvement is not just adding checks; it is clarifying interpretation:

- Lorem and placeholder findings are evidence, not automatic blockers.
- Utility-page examples can be intentional.
- Alt-text findings are actionable only for editable content images/icons.
- Generated Webflow video fallback/poster images should not create false creator-fixable failures.
- Asset-size guidance distinguishes a 150KB compression target from a 4MB maximum.
- Published-site validation remains supplemental triage evidence unless Designer/manual checks confirm the issue.

This is the right guardrail model for agent-assisted review.

## Validator Surfaces

`packages/webflow-template-validation` preserves three surfaces together:

- Next.js companion app
- Webflow Designer app
- Cloudflare backend worker

The README states the MVP focuses on published-site checks for Typography, Styles, and Naming, while Components and Variables require Designer/Apps SDK work. Other implementation files and tests include Designer-data validation paths for variables, components, styles, pages, and assets. PM-facing reports should treat this as documentation drift until the exact production surface is verified.

Repo links:

- [Validator README](../../../packages/webflow-template-validation/README.md)
- [Validator Agent Context](../../../packages/webflow-template-validation/AGENT_CONTEXT.md)
- [Worker index](../../../packages/webflow-template-validation/worker/src/index.ts)
- [Designer validator](../../../packages/webflow-template-validation/worker/src/validators/designer-validator.ts)

## Content and Placeholder Guardrails

The content validator detects:

- lorem ipsum patterns
- placeholder copy patterns
- generic content patterns
- Webflow default copy patterns
- heading hierarchy
- SEO metadata
- missing-alt coverage
- content quality

Recent guardrails reduce false positives:

- utility pages such as Style Guide, License, Instructions, Changelog, Search, 401/404, and `/utility/*` can contain example/specimen text
- Webflow search snippets and search result areas are excluded from placeholder scanning
- video fallback/poster images and decorative empty-alt images are excluded from missing-alt claims

Repo link:

- [content-validator.ts](../../../packages/webflow-template-validation/worker/src/validators/content-validator.ts)

## Asset and Image-Size Guardrails

The asset validator now separates:

- **150KB target:** warning-level compression goal where possible
- **4MB maximum:** error-level hard limit
- SVG/vector assets are treated differently from raster imagery
- metadata-only HEAD requests are used for lighter asset analysis where possible

This matches the PM need to improve submission quality without treating every asset above 150KB as a hard reject.

Repo link:

- [asset-validator.ts](../../../packages/webflow-template-validation/worker/src/validators/asset-validator.ts)

## Template Review MCP Guardrails

The Template Review MCP is scoped to Airtable template assets, asset versions, and releases. It supports queue inspection, reviewer assignment, bounded reviewer writes, supplemental agent feedback, and read-only comprehensive evidence contracts.

The core workflow prompt requires:

- health check first
- queue/context inspection before decisions
- published-site validation as supplemental evidence only
- `assign_self` before any write action
- human judgment for design quality
- concrete evidence in feedback
- explicit separation of automatic, partial, and manual checks

Repo links:

- [Template Review MCP README](../../../packages/webflow-template-review-mcp/README.md)
- [prompts.ts](../../../packages/webflow-template-review-mcp/src/prompts.ts)
- [validation.ts](../../../packages/webflow-template-review-mcp/src/validation.ts)

## Tests and Evals

The repo contains tests that lock key guardrails:

- utility pages may be nested and example text is not necessarily placeholder failure
- placeholder and alt-text interpretation must align with validator policy
- variable modes only warn when mode data is actually collected and empty
- responsive variable modes are recognized
- non-breakpoint mode names do not fail by themselves
- class naming accepts common Webflow patterns and rejects literal unit class names
- coordinator exposure gates block final quality bands, sales-derived quality input, and malformed requests

Repo links:

- [Validator worker tests](../../../packages/webflow-template-validation/worker/test/index.spec.ts)
- [Template Review prompt tests](../../../packages/webflow-template-review-mcp/tests/prompts.test.ts)
- [Template Review tools tests](../../../packages/webflow-template-review-mcp/tests/tools.test.ts)
- [Quality readiness tests](../../../packages/webflow-template-review-mcp/tests/quality-readiness.test.ts)

## What This Improves

- Reviewer consistency: agents receive explicit rules about what evidence means.
- Creator fairness: warning-only or context-dependent findings are less likely to become incorrect feedback.
- Review speed: automated checks can narrow attention to concrete evidence.
- Governance: final approval/rejection remains a human-review action.
- Calibration: test fixtures and shadow lanes can evaluate behavior without mutating Airtable or publishing decisions.

## Remaining Gaps

- Documentation needs reconciliation between published-site MVP language and Designer-data validation behavior.
- Live Validator pass/fail rates need reporting by category and preflight status.
- Manual checks remain necessary for visual quality, asset licensing, browser testing, interactions, custom app connections, pricing/category decisions, and final quality ratings.
- Agent output should continue writing supplemental lanes such as `Agent Review Feedback`, not reviewer status decisions.

## PM Recommendation

Use the agent stack as reviewer assistance and creator coaching infrastructure first. Do not present it as autonomous template approval. The current system is strongest when framed as: "automated evidence plus human reviewer judgment."
