---
title: "Policy OS Applied to Development Infrastructure"
subtitle: "Governed Agent Execution via the Pi Coding Agent Harness"
authors: ["CREATE SOMETHING"]
category: "Case Study"
abstract: "Policy OS, CREATE SOMETHING's governed execution platform, was designed for client MCP deployments. This paper documents applying the same product to our own development workflow via the Pi coding agent harness, demonstrating that agent governance is not an add-on but a structural property that emerges from the Three-Tier Framework at every scale."
keywords: ["Policy OS", "Three-Tier Framework", "Pi", "Agent Governance", "Quality Gates", "MCP", "Development Infrastructure"]
publishedAt: "2026-05-11"
readingTime: 10
difficulty: "intermediate"
published: true
---

## Abstract

Policy OS, CREATE SOMETHING's governed execution platform, was designed for client MCP deployments. This paper documents applying the same product to our own development workflow via the Pi coding agent harness, demonstrating that agent governance is not an add-on but a structural property that emerges from the Three-Tier Framework at every scale.

## 1. Introduction

Agent coding harnesses, including Pi, Claude Code, Codex, and Cursor, share a fundamental problem: they are general-purpose tools operating in domain-specific environments. An agent writing SvelteKit components needs to know about Canon design tokens. An agent deploying MCP servers needs to know about the fleet registry. An agent closing a Linear issue needs to know about the evidence contract.

This knowledge traditionally lives in documentation that agents may or may not read. The Policy OS approach makes it structural: quality gates enforce compliance automatically, custom tools make verification easy, and domain skills make knowledge loadable on demand.

## 2. The Three-Tier Mapping

The development harness maps cleanly to the Three-Tier Framework:

| Tier | Framework Role | Development Implementation |
| --- | --- | --- |
| Database | What exists | Git state, package exports, fleet registry, Canon tokens |
| Automation | What happens | Quality gates, custom tools, interactive commands |
| Judgment | What should happen | Bash guard, pre-completion checks, evidence requirements |

### Control Models Verified

- **Application-controlled (Database)**: Session context injected via `before_agent_start`. The extension decides what state the agent sees.
- **Model-controlled (Automation)**: Custom tools like `context7_query` are available, but the agent decides when to call them.
- **User-controlled (Judgment)**: Skills loaded via `/skill:name`, making guidance an explicit selection.

## 3. Implementation

### Scale

| Component | Count | Role |
| --- | --- | --- |
| Event handlers | 8 | Quality gates, context injection, bash guard, lifecycle |
| Custom tools | 3 | Context7 bridge x2, package export verifier |
| Commands | 8 | Linear workflow, testing, fleet ops, Canon audit, pre-commit |
| Prompt templates | 8 | Deploy, audit, review, research, experiment, paper, MCP scaffold |
| Skills | 21 | 3 native + 18 cross-loaded, domain knowledge on demand |
| Theme | 51 colors | Glass Design System alignment |
| Total extension | 1,181 lines | Single coherent extension file |

### Quality Gate Architecture

```text
Write/Edit
    |
    |-- tool_result handler
    |     |-- Canon token compliance (6 pattern checks)
    |     |-- Import verification (@create-something/* packages)
    |     |-- Paper structure (SEO, container, classes)
    |     `-- Experiment structure (SEO, Canon tokens, hex colors)
    |
    `-- Violations? -> Append to tool result -> Agent self-corrects

Bash execution
    |
    `-- tool_call handler
          |-- Block legacy loom commands -> redirect to Linear
          `-- Enforce [CRE-NNN] in commit messages

Agent completion
    |
    `-- agent_end handler
          |-- TypeScript type check (modified packages)
          |-- ESLint lint check (modified packages)
          |-- Uncommitted changes reminder
          `-- Issues? -> sendUserMessage(followUp) -> Agent fixes
```

## 4. The Recursive Property in Practice

The extension exhibits the Three-Tier Framework's recursive property:

1. `tool_result` (Automation) checks Canon compliance (Judgment) and feeds violations back.
2. The agent (Automation) reads the violations and self-corrects (more Automation).
3. `agent_end` (Automation) runs typecheck (Database verification) and reports.
4. If issues exist, `sendUserMessage` re-enters the agent loop: Automation invoking more Automation with embedded Judgment.

This is the sampling feedback loop described in the framework paper, realized in a development harness.

## 5. The Product Insight

What we built for the development workflow is structurally identical to what we sell as Policy OS:

| Policy OS Deliverable | Development Implementation |
| --- | --- |
| `mcp_contract.yaml` | `.pi/settings.json` + cross-loaded skills |
| `agent_contract.yaml` | Bash guard rules + quality gate event handlers |
| `outcome_contract.md` | `APPEND_SYSTEM.md` + prompt templates |
| `golden_tasks.yaml` | Pre-commit checks + typecheck/lint on completion |
| `runbook.md` | Interactive commands (`/linear`, `/fleet`, `/deploy`) |

The harness is the policy. The configuration is the contract. The development workflow is the first client.

## 6. Distribution as Discovery

The Pi package ecosystem enables a new funnel:

```text
pi install npm:@create-something/pi-three-tier-framework
    -> Developer learns Database/Automation/Judgment
    -> Classifies their own systems

pi install npm:@create-something/pi-policy-os
    -> Developer runs /policy-check
    -> Sees governance score and gaps
    -> Contacts createsomething.agency
```

This mirrors the MCP-First Thesis: the entry point is connectivity, installable agent configuration, not intelligence through a full consulting engagement.

## 7. Conclusion

Policy OS is not a product category. It is a consequence of the Three-Tier Framework applied to any agent-governed workflow. When you configure quality gates, you are building Database checks. When you register custom tools, you are building Automation. When you write domain skills and prompt templates, you are building Judgment artifacts.

The creation moat, understanding what to build and not just how to install it, applies to agent harness configuration just as it applies to MCP server creation. Both require domain expertise combined with protocol knowledge. Both are hard to commoditize.

CREATE SOMETHING builds the connectivity and control layer between tools and AI.
