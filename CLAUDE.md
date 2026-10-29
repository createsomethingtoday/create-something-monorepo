# CREATE SOMETHING Monorepo

## Atlas/Substrate agent context

For Atlas/Substrate orientation, use the shared repository skill at
`.agents/skills/atlas-substrate/SKILL.md` (also exposed under `.claude/skills`).
Start with `node packages/database-layer/scripts/atlas-context.mjs search "your question"`.
Load the cited domain module, then inspect its canonical source. Search is local and bounded. Changed local artifacts automatically refresh only
the ignored wiki/index cache; no model evaluation or external refresh runs.
Context is descriptive evidence, not action permission. See
`docs/guides/ATLAS_SUBSTRATE_AGENT_CONTEXT.md` for freshness and access boundaries.


## Philosophy: The Subtractive Triad

**Meta-principle**: Creation is the discipline of removing what obscures.

### The Three Levels

Every creation exists simultaneously at three levels, each with its corresponding discipline:

| Level | Discipline | Question | Action |
|-------|------------|----------|--------|
| **Implementation** | DRY | "Have I built this before?" | Unify |
| **Artifact** | Rams | "Does this earn its existence?" | Remove |
| **System** | Heidegger | "Does this serve the whole?" | Reconnect |

### Application

For any decision, ask the three questions in order:

1. **DRY** (Implementation) → Eliminate duplication
2. **Weniger, aber besser** (Artifact) → Eliminate excess
3. **Hermeneutic circle** (System) → Eliminate disconnection

### Why This Works

The triad is coherent because it's one principle—**subtractive revelation**—applied at three scales. Truth emerges through disciplined removal at every level of abstraction.

### Zero Framework Cognition

At the meta-level above the Triad: decisions emerge from reasoning about the problem, not from framework assumptions.

| Framework Imprisonment | Framework Freedom |
|----------------------|-------------------|
| Default patterns chosen without examination | Each pattern independently defensible |
| "The framework's way" overrides domain logic | Domain logic selects appropriate tools |
| Inherited settings become invisible constraints | Assumptions surfaced and examined |
| Tools determine architecture | Architecture selects tools |

**The question**: "Am I solving this problem, or solving it as the framework expects?"

The Triad removes duplication, excess, and disconnection from *artifacts*. Zero Framework Cognition prevents disconnection in *reasoning*—the most insidious form, where unexamined framework assumptions silently constrain possibility space.

*Provenance: Steve Yegge's VC project. The Beads integration itself exemplifies this—we adopted Beads because the problem demanded agent-native persistence, not because it was a popular framework.*


## Context Loaded on Demand

These load only when relevant. Read them before work in their area.

| Topic | Where |
|-------|-------|
| Strategy and vocabulary (Three-Tier Framework, MCP-first thesis, WORKWAY, creation moat, Atlas, Automotive Framework) | `create-something-strategy` skill |
| `.agency` product spine (Map → Build → Control, altitude discipline) | `packages/agency/CLAUDE.md` |
| CSS, Glass Design System, WORKWAY alignment | `.claude/rules/css-architecture.md` |
| UI preview workflow | `ui-preview` skill |
| Cloudflare Pages project names (deploys) | `.claude/rules/PROJECT_NAME_REFERENCE.md` |
| Cloudflare D1, KV, Workers, deploys, MCP domains | `.claude/rules/cloudflare-patterns.md` |

**Public copy**: internal names (Atlas, Workflow Pilot, Policy OS) and architecture names (Database · Automation · Judgment) never reach `.agency` public copy. Enforced by `packages/agency/scripts/check-public-copy.mjs`.

**External library docs**: use Context7. Not for internal monorepo APIs; read the source instead.

## Integration connectivity (Composio)

Composio is legacy and frozen for new connector work. Preserve an existing
Composio-backed production path until it has a verified owned replacement or an
approved retirement plan. New integrations start behind a CREATE SOMETHING MCP
contract, with custom OAuth and APIs when required; any new Composio exception
requires explicit operator approval recorded in Linear. Packaging is unchanged:
Composio remains internal plumbing on approved legacy paths, while client
delivery follows the product spine (Map → Build → Control). See
`docs/COMPOSIO_PATTERNS.md` for the compatibility boundary and SDK pointers;
`docs/internal/COMPOSIO_EVALUATION.md` remains the historical evaluation.


## Languages

The Language Triad maps to the Subtractive Triad:

| Language | Domain | When to Use |
|----------|--------|-------------|
| **TypeScript** | Frontend, APIs, Workers | UI components, server routes, edge functions |
| **Python** | LLM orchestration | Agent workflows, provider integration, rapid iteration |
| **Rust** | Infrastructure tooling | Code analysis, verification, performance-critical computation |

**Quick Decision**: If the bottleneck is *network latency* (LLM calls), use Python. If the bottleneck is *correctness* or *computation*, use Rust. Everything else is TypeScript.

See `STANDARDS.md` §3.4 for full language philosophy, including WebAssembly bridging for edge computation.

## Complementarity Principle

Claude Code handles the full creation-to-deployment cycle. Tools recede into transparent use—the hammer disappears when hammering.

| Claude Code (You) | WezTerm (User) |
|-------------------|----------------|
| Write code | Monitor logs |
| Deploy code | Verify production |
| Run migrations | Debug edge cases |
| Test | Interactive sessions |
| Plan & Execute | Observe |

**Canon**: The infrastructure disappears; only the work remains. Deploy directly via Bash or MCP tools. Reserve WezTerm handoff for truly interactive operations (debugging sessions, real-time log monitoring, production verification).

## Task Management: Linear

Linear is the CREATE SOMETHING source of truth for task coordination, ownership, status, and delivery evidence.

```bash
# Session Start: Surface ready work
pnpm linear:ready

# During Work
pnpm linear:list -- --status open --label code-quality
pnpm linear:create -- --title "Task" --description "..." --label code-quality
pnpm linear:claim -- --issue CRE-123

# Session End
pnpm linear:done -- --issue CRE-123 --evidence "Validation: ..."
```

**Labels**: `agency`, `io`, `space`, `ltd` (scope) + `feature`, `bug`, `research`, `refactor` (type)

**Issue Types**: use Linear issue labels and projects to capture `bug`, `feature`, `task`, `epic`, and `chore` semantics.

**Why Linear**: shared issue state, MCP access, source-of-truth registry review, and durable delivery evidence across local and remote agents.

Loom *the task tracker* is historical in this repository. Do not create new Loom tasks; update legacy references to Linear or file a Linear cleanup issue. (Related: **Loom MCP** at `/products/loom` is an archived retrospective on that same continuity problem, not an actively offered product.)

## Agent Orchestration

**Harness** is the live pattern: single-session autonomous work with quality gates and peer review (Security: Haiku, Architecture: Opus, Quality: Sonnet). Use Linear issues for single-issue work or Harness spec-driven features with checkpoints. See `.claude/rules/harness-patterns.md`.

For parallel independent work, use Claude Code subagents (Agent tool) or a Workflow when the user opts in. **Ralph** and **Gastown** are retired; their pattern files live in `docs/archive/claude-rules/` for reference only.

## Code Mode: Tools Should Recede

**Principle**: Prefer code-based operations over direct tool calls when composing multiple operations.

This follows Heidegger's distinction between Zuhandenheit (ready-to-hand) and Vorhandenheit (present-at-hand). Tools should recede into transparent use—the hammer disappears when hammering.

**Gestell Warning**: Automation that fills every gap is not efficiency but invasion. The question is not whether to use technology but whether our systems enable dwelling or merely accelerate consumption.

**Gelassenheit**: Neither rejection nor submission—full engagement without capture. The craftsman uses the hammer; the hammer does not use him.

**Zero Framework Cognition applies here**: Prefer code-based operations not because "that's how we do it" but because composed operations belong in code. The decision is domain-driven, not framework-driven.

### When to Use Code Mode (via Bash)

Use code-based operations when:
- **Composing multiple operations**: Reading, transforming, and writing data
- **Filtering or processing results**: Data transforms happen in code, not model context
- **Familiar patterns exist**: `fs.readFile()` is more natural than `<invoke name="Read">`

```typescript
// Zuhandenheit: Tool recedes into use
const content = await fs.readFile('src/config.ts', 'utf-8');
const exports = content.match(/export \w+/g);
console.log(`Found ${exports?.length ?? 0} exports`);
```

### When to Use Direct Tools

Use direct tool calls (Read, Write, Edit, Grep, Glob) when:
- **Single operations**: One read, one write
- **Claude Code's specialized tools are better**: Edit tool's surgical replacement
- **Visibility is needed**: User sees tool invocations in the UI
