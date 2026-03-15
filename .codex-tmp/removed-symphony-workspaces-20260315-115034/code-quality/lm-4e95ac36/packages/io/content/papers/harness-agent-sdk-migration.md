---
title: "Harness Agent SDK Migration: Empirical Analysis"
subtitle: "Security, Reliability, and Cost Improvements Through Explicit Tool Permissions"
authors: ["Micah Johnson"]
category: "Case Study"
abstract: "This paper documents the migration of the CREATE Something Harness from legacy headless mode
				patterns to Agent SDK best practices. We analyze the trade-offs between security, reliability,
				and operational efficiency, drawing from empirical observation of a live Canon Redesign project
				(21 features across 19 files). The migration replaces--dangerously-skip-permissionswith explicit--allowedTools, adds runaway prevention via--max-turns,
				and enables cost tracking through structured JSO"
keywords: []
publishedAt: "2025-01-08"
readingTime: 10
difficulty: "12 min read"
published: true
---


## Abstract
This paper documents the migration of the CREATE Something Harness from legacy headless mode
				patterns to Agent SDK best practices. We analyze the trade-offs between security, reliability,
				and operational efficiency, drawing from empirical observation of a live Canon Redesign project
				(21 features across 19 files). The migration replaces--dangerously-skip-permissionswith explicit--allowedTools, adds runaway prevention via--max-turns,
				and enables cost tracking through structured JSON output parsing.



## 1. Introduction
The CREATE Something Harness orchestrates autonomous Claude Code sessions for large-scale
					refactoring and feature implementation. Prior to this migration, the harness used--dangerously-skip-permissionsfor tool access—a pattern that prioritized
					convenience over security.
The Agent SDK documentation recommends explicit tool allowlists via--allowedTools.
					This migration implements that recommendation alongside additional optimizations.
Per the CREATE Something philosophy, infrastructure should exhibitZuhandenheit(ready-to-hand: when a tool disappears into transparent use, like a hammer during skilled carpentry)—receding into transparent use. The harness should be invisible when working
				correctly; failures should surface clearly with actionable context.
The test project: removing--webflow-blue(#4353ff) from the Webflow Dashboard.
				This brand color polluted focus states, buttons, links, nav, and logos—43 violations across 19 files.


## 2. Architecture
Each session spawns Claude Code in headless mode with explicit configuration:


## 3. Migration Changes
Characteristics:
Characteristics:
- All tools available without restriction
- No runaway prevention
- No cost tracking
- No model selection
- Security relies entirely on session isolation
- Explicit tool allowlist (defense in depth)
- Turn limit prevents infinite loops
- JSON output enables metrics parsing
- Model selection for cost optimization


## 4. Peer Review Pipeline
The harness runs three peer reviewers at checkpoint boundaries:
Finding:Architecture reviewer surfaces legitimate concerns (token consistency,
				pattern adherence) without blocking progress. This matches the intended "first-pass analysis" philosophy.


## 5. Empirical Observations
Finding:No legitimate harness operations were blocked by the new restrictions.
				The allowlist is sufficient for all observed work patterns.
--max-turns 100prevents infinite loops. Observed session turn counts:


## 6. Trade-offs Analysis


## 7. Recommendations


## 8. How to Apply This
To apply this migration pattern to your autonomous Claude Code orchestration:
Let's say you have a harness that autonomously deploys Cloudflare Workers. Before migration:
After analyzing actual usage, you discover the harness needs:
After migration:
Notice:
Add tools to the allowlist when:
Don't add tools when:
After migration, validate success by:
The goal isexplicit security without operational cost. If the migration
					blocks legitimate work or significantly slows execution, the allowlist is too restrictive.
					If it allows operations that shouldn't be automated, it's too permissive. Iterate until
					the harness operates transparently—Zuhandenheit achieved.
- File operations to read wrangler.toml and Worker scripts
- Git to check status and create deployment tags
- Wrangler to deploy and check deployment status
- Cloudflare MCP to update KV/D1 data if needed
- Scoped Bash patterns:git:statusallowed,git:reset --hardblocked
- Lower turn limit: Deployments complete in 10-20 turns; 50 provides headroom
- Model selection: Sonnet is 5x cheaper than Opus, sufficient for standard deploys
- Metrics capture: JSON output enables cost analysis over time
- Sessions fail with "permission denied": Check logs, identify blocked tool, evaluate if it should be allowed
- New workflow requirements: Adding database migrations? Addmcp__cloudflare__d1_query
- Peer review identifies missing capability: Architecture reviewer notes the harness can't perform needed operation
- The request is "just in case"—only add verified needs
- A safer alternative exists (preferWebFetchoverBash(curl:*))
- The operation should require human approval (don't automate destructive operations)


## 9. Conclusion
The Agent SDK migration improves the CREATE Something Harness without degrading operational
				capability. The explicit tool allowlist provides defense-in-depth security, while--max-turnsprevents runaway sessions.
The key insight:restrictive defaults with explicit exceptionsis more
				maintainable thanpermissive defaults with implicit risks.
This aligns with theSubtractive Triad:
- DRY:One allowlist, not per-session permission decisions
- Rams:Only necessary tools; each earns its place
- Heidegger:Infrastructure recedes; security becomes invisible when correct


## Appendix A: Full Tool Allowlist


## References
- Claude Code Agent SDK Documentation
- CREATE Something Harness Package
- Beads Patterns Documentation

