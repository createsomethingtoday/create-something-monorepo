# Agent Harness Configuration Service

> Defined: May 11, 2026
> Scope: New service tier between MCP-only and Policy OS
> Position: Development workflow governance via agent harness configuration

## Summary

**Agent Harness Configuration** is a focused service that delivers governed agent behavior for a client's development workflow. It packages domain knowledge, quality gates, and workflow automation as installable agent harness configuration — Pi packages, Claude Code `.claude/` setups, or Codex task definitions.

This is not MCP creation (that's Policy OS). This is making the client's existing tools and agents work correctly in their specific domain.

## Position in the Funnel

```
MCP Audit → MCP-only → Agent Harness Config → Policy OS Trial → Policy OS Core
                              ↑
                         NEW TIER
```

### When to Route Here

- Client already uses AI coding agents (Pi, Claude Code, Codex, Cursor)
- Quality problems stem from agents not knowing the domain, not from missing connectivity
- No new MCP server is needed — existing tools are sufficient
- Client wants governed execution without the full Policy OS investment

### When NOT to Route Here

- Client needs MCP server creation → Route to Policy OS
- Client needs ongoing managed judgment → Route to Policy OS
- Client needs a one-time audit → Route to MCP Audit
- Client just needs connectivity → Route to MCP-only

## Deliverables

| Artifact | Format | Purpose |
|----------|--------|---------|
| Extension | `.ts` file (Pi) or shell hooks (Claude) | Quality gates, custom tools, interactive commands |
| Skills | Markdown files | Domain knowledge loaded on demand |
| Prompt templates | Markdown files | Workflow templates as slash commands |
| Theme | JSON (Pi) | Visual identity alignment |
| Settings | JSON | Tool configuration, skill discovery paths |
| System supplement | Markdown | Agent-specific operational instructions |

## Pricing Model

**One-time setup** + optional **quarterly tuning** retainer.

Setup scope:
- Discovery session (2-4 hours) — understand the client's domain, conventions, and pain points
- Configuration delivery (1-2 weeks) — build the harness config
- Validation (1-2 days) — verify quality gates fire correctly, no false positives

Optional quarterly tuning:
- Review quality gate fire rates and false positive data
- Update skills with new domain patterns
- Add commands for new workflows
- Adjust bash guard rules

## Evidence of Viability

The CREATE SOMETHING monorepo itself is the reference implementation:

| Metric | Value |
|--------|-------|
| Extension size | 1,181 lines |
| Event handlers | 8 (quality gates, context injection, bash guard) |
| Custom tools | 3 (Context7 bridge, export verifier) |
| Interactive commands | 8 (Linear, testing, fleet, Canon, pre-commit) |
| Prompt templates | 8 (deploy, audit, review, research, experiment, paper, MCP) |
| Skills | 21 (3 native + 18 cross-loaded) |
| Domain rules surfaced | 23 rule files indexed via skill |

Build time: 4 focused sessions. The resulting config is the same structural shape as a Policy OS engagement — just scoped to the development workflow instead of a business workflow.

## Competitive Positioning

- **vs. "Add a .cursorrules file"**: We deliver event-driven quality gates, custom tools, and interactive commands — not just a text file
- **vs. Full Policy OS**: No MCP server creation, no managed judgment loop, no recurring ops burden
- **vs. DIY**: We understand both the agent harness API AND the domain. The moat is creation expertise.

## Three-Tier Mapping

| Policy OS Layer | Harness Config Implementation |
|----------------|-------------------------------|
| Workflow Infrastructure | Extension events, custom tools, commands |
| Policy Enforcement | Bash guard, Canon checks, import verification, typecheck/lint |
| Judgment Artifacts | Skills, prompt templates, system supplement |
| Evidence & Tuning | Linear integration, completion checks, session naming |

## Delivery Targets

| Target | Config Format | Distribution |
|--------|--------------|-------------|
| **Pi** | Pi package | `pi install` or `.pi/settings.json` with local paths |
| **Claude Code** | `.claude/` directory | Repository config (rules, skills, commands, hooks) |
| **Codex** | Tasks + system prompt | Codex project setup |
| **Cursor** | `.cursorrules` + MCP config | Repository config |

All formats deliver the same conceptual shape. Pi is the richest target (extensions, tools, commands, themes). Claude Code is second (hooks, skills, commands). Codex and Cursor receive a subset.

## Next Steps

1. Add to `docs/FUNNEL_AND_DISCOVERY_STRATEGY_2026-03-09.md` routing matrix
2. Create a landing page section on `.agency`
3. Price the setup engagement
4. Identify first external client (construction vertical for WORKWAY?)
