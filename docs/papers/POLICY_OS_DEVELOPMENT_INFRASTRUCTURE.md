# Policy OS Applied to Development Infrastructure

> Draft: May 11, 2026
> Route target: `packages/io/src/routes/papers/policy-os-development-infrastructure/+page.svelte`
> Status: Content draft — scaffold with `/paper policy-os-development-infrastructure` when ready

## Abstract

Policy OS — CREATE SOMETHING's governed execution platform — was designed for client MCP deployments. This paper documents applying the same product to our own development workflow via the Pi coding agent harness, demonstrating that agent governance is not an add-on but a structural property that emerges from the Three-Tier Framework at every scale.

## 1. Introduction

Agent coding harnesses (Pi, Claude Code, Codex, Cursor) share a fundamental problem: they are general-purpose tools operating in domain-specific environments. An agent writing SvelteKit components needs to know about Canon design tokens. An agent deploying MCP servers needs to know about the fleet registry. An agent closing a Linear issue needs to know about the evidence contract.

This knowledge traditionally lives in documentation that agents may or may not read. The Policy OS approach makes it structural: quality gates enforce compliance automatically, custom tools make verification easy, and domain skills make knowledge loadable on demand.

## 2. The Three-Tier Mapping

The development harness maps cleanly to the Three-Tier Framework:

| Tier | Framework Role | Development Implementation |
|------|---------------|---------------------------|
| **Database** | What exists | Git state, package exports, fleet registry, Canon tokens |
| **Automation** | What happens | Quality gates (tool_result events), custom tools (context7_query, verify_exports), interactive commands (/linear, /fleet) |
| **Judgment** | What should happen | Bash guard (block loom, enforce commit refs), pre-completion checks (typecheck, lint), evidence requirements |

### Control Models Verified

- **Application-controlled (Database)**: Session context is injected via `before_agent_start` — the extension decides what state the agent sees, not the agent itself.
- **Model-controlled (Automation)**: Custom tools like `context7_query` and `verify_exports` are available but the agent decides when to call them.
- **User-controlled (Judgment)**: Skills like `repo-navigator` and `policy-os` are loaded when the user invokes `/skill:name` — explicit selection of guidance.

## 3. Implementation

### Scale

| Component | Count | Lines |
|-----------|-------|-------|
| Event handlers | 8 | Quality gates, context injection, bash guard, lifecycle |
| Custom tools | 3 | Context7 bridge (×2), package export verifier |
| Commands | 8 | Linear workflow, testing, fleet ops, Canon audit, pre-commit |
| Prompt templates | 8 | Deploy, audit, review, research, experiment, paper, MCP scaffold |
| Skills | 3 native + 18 cross-loaded | Domain knowledge on demand |
| Theme | 1 (51 colors) | Glass Design System alignment |
| Total extension | 1,181 lines | Single coherent extension file |

### Quality Gate Architecture

```
Write/Edit
    │
    ├─► tool_result handler
    │     ├── Canon token compliance (6 pattern checks)
    │     ├── Import verification (@create-something/* packages)
    │     ├── Paper structure (SEO, container, classes)
    │     └── Experiment structure (SEO, Canon tokens, hex colors)
    │
    └── Violations? → Append to tool result → Agent self-corrects

Bash execution
    │
    └─► tool_call handler
          ├── Block legacy loom commands → redirect to Linear
          └── Enforce [CRE-NNN] in commit messages

Agent completion
    │
    └─► agent_end handler
          ├── TypeScript type check (modified packages)
          ├── ESLint lint check (modified packages)
          ├── Uncommitted changes reminder
          └── Issues found? → sendUserMessage(followUp) → Agent fixes
```

### The Recursive Property in Practice

The extension exhibits the Three-Tier Framework's recursive property:

1. **tool_result** (Automation) checks Canon compliance (Judgment) and feeds violations back
2. The agent (Automation) reads the violations and self-corrects (more Automation)
3. **agent_end** (Automation) runs typecheck (Database verification) and reports to the agent
4. If issues exist, `sendUserMessage` re-enters the agent loop — Automation invoking more Automation with embedded Judgment

This is the sampling feedback loop described in the framework paper, realized in a development harness.

## 4. The Product Insight

What we built for the development workflow is structurally identical to what we sell as Policy OS:

| Policy OS Deliverable | Development Implementation |
|----------------------|---------------------------|
| `mcp_contract.yaml` | `.pi/settings.json` + cross-loaded skills |
| `agent_contract.yaml` | Bash guard rules + quality gate event handlers |
| `outcome_contract.md` | `APPEND_SYSTEM.md` + prompt templates |
| `golden_tasks.yaml` | Pre-commit checks + typecheck/lint on completion |
| `runbook.md` | Interactive commands (`/linear`, `/fleet`, `/deploy`) |

**The meta-insight**: Policy OS is not a product you bolt onto a system. It is a structural property that the Three-Tier Framework reveals in any system where agents operate. The development workflow IS a governed agent system. The harness configuration IS the policy artifact.

## 5. Distribution as Discovery

The Pi package ecosystem enables a new distribution channel:

```
Developer installs @createsomething/pi-three-tier-framework
    → Learns to think in Database/Automation/Judgment
    → Installs @createsomething/pi-policy-os
    → Runs /policy-check on their own codebase
    → Sees governance gaps
    → Contacts CREATE SOMETHING for full Policy OS engagement
```

This mirrors the MCP-First Thesis: the entry point is connectivity (installable agent configuration), not intelligence (full consulting engagement).

## 6. Measurements

*(To be collected after deployment)*

- Quality gate fire rate per session
- False positive rate (gates firing on correct code)
- Self-correction success rate (agent fixes on first attempt)
- Time from `/linear claim` to `/done` per issue type
- Canon compliance trend across sessions

## 7. Conclusion

Policy OS is not a product category — it is a consequence of the Three-Tier Framework applied to any agent-governed workflow. When you configure quality gates, you are building Database checks. When you register custom tools, you are building Automation. When you write domain skills and prompt templates, you are building Judgment artifacts.

The harness IS the policy. The configuration IS the contract. The development workflow IS the first client.

---

*CREATE SOMETHING builds the connectivity and control layer between tools and AI. The Three-Tier Framework is how we think. Policy OS is how we deliver. The creation moat — understanding what to build, not just how to install it — is how we differentiate.*
