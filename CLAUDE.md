# CREATE SOMETHING Monorepo

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

## The Life's Work: Automation Infrastructure

**Automation Infrastructure** is the layer between human intention and system execution. It's what makes outcomes possible while you sleep—not automation that fills every gap (Gestell), but automation that enables dwelling (Gelassenheit).

### The Two-Layer Model

```
┌─────────────────────────────────────────────────────────────┐
│                   INTELLIGENCE LAYER                        │
│        Skills, Agents, Automations (the upsell)            │
│   "Draft this RFI" · "Summarize daily logs" · "Flag risk"  │
├─────────────────────────────────────────────────────────────┤
│                    AUTOMATION LAYER                         │
│              MCP Servers (the entry point)                  │
│        Connect your tools to AI with trust boundaries       │
└─────────────────────────────────────────────────────────────┘
                            ↓
                   Edge Infrastructure
                  (Cloudflare Workers)
                            ↓
                 Outcomes While You Sleep
```

**The MCP-First Thesis**: The entry point to automation is *connectivity*, not intelligence. Users grant folder/API access to an MCP server first. Trust is established. Then intelligence layers on top.

This inverts the common assumption that you build an AI agent first, then add integrations. The pattern emerging from Claude Cowork, Codex App, and industry adoption (100M+ monthly MCP downloads) is:

1. **MCP servers establish trust** (controlled, permissioned access)
2. **Skills provide capabilities** (reusable, portable across platforms)
3. **Agents produce outcomes** (the monetizable layer)

### WORKWAY

[WORKWAY](https://workway.co) is where this philosophy becomes code—**The Automation Layer for Construction**.

| Layer | What It Is | WORKWAY Implementation |
|-------|------------|------------------------|
| **Automation Layer** | MCP servers that connect tools to AI | Open-source Procore MCP Server |
| **Intelligence Layer** | Skills + Agents that produce outcomes | Premium construction Skills (RFI drafting, daily log synthesis, compliance checks) |

**Why Construction**: 98% of projects face delays/overruns. 35% of worker time lost to non-productive tasks. $30-40B annual US inefficiency. Only 4% of construction companies use AI. The pain is massive, the adoption is early, and Procore is the dominant platform.

**Key principle**: Users don't want "workflow automation"—they want outcomes. RFIs that draft themselves. Daily logs that synthesize themselves. The tool should disappear.

### How CREATE SOMETHING Supports WORKWAY

| Property | Role |
|----------|------|
| **.ltd** | Defines the MCP-first thesis and philosophical foundation |
| **.io** | Researches MCP patterns, publishes reference implementations |
| **.space** | Teaches developers how to build MCP servers and Skills |
| **.agency** | Delivers MCP-based automation to clients |

The hermeneutic circle: Philosophy informs research. Research validates practice. Practice serves clients. Client outcomes test and evolve the philosophy.

**CREATE SOMETHING stays horizontal** (the MCP-first thesis applies to any vertical). **WORKWAY goes vertical** (construction via Procore).

### Shared Vocabulary: AI Interaction Atlas

We adopt the [AI Interaction Atlas](https://github.com/quietloudlab/ai-interaction-atlas) from [quietloudlab](https://quietloudlab.com/) as shared vocabulary for AI interaction design. The Atlas provides six dimensions that map to our architecture:

| Atlas Dimension | Our Implementation |
|-----------------|-------------------|
| **Touchpoints** | MCP Servers |
| **System Tasks** | Cloudflare Workers infrastructure |
| **AI Tasks** | Skills |
| **Human Tasks** | Intelligence Layer oversight |
| **Data Artifacts** | What flows through MCP |
| **Constraints** | Trust boundaries, permissions |

See `docs/MCP_FIRST_THESIS.md` for full strategic context and partnership opportunity.

### The Automotive Framework

**The automation layer = the automotive layer.**

The automotive layer consists of the parts of a vehicle: engine, transmission, fuel tank. Assembled together, they create motion.

The automation layer consists of Cloudflare products + MCP: Workers, Durable Objects, D1, MCP servers. Assembled together, they create outcomes.

| Vehicle Part | Technology | Function |
|--------------|------------|----------|
| **Chassis** | MCP Servers | The frame that connects everything—tools, data, AI |
| **Engine** | Workers | Where execution happens |
| **Transmission** | Durable Objects | State coordination |
| **Fuel Tank** | D1 | Data persistence |
| **Turbocharger** | Workers AI / LLMs | Intelligence boost |
| **Cockpit** | Glass UI | Where the driver controls the machine |
| **Instrument Cluster** | Analytics/Logs | At-a-glance telemetry |
| **Ignition** | Triggers | What starts the engine |

**The Chassis Principle**: MCP is the chassis—the structural frame that holds everything together. Without the chassis, you have a pile of parts. Without MCP, you have disconnected tools. The chassis is invisible when driving, but essential. That's MCP: the connectivity layer that recedes into transparent use.

**The Cockpit Principle**: The 930's cockpit is driver-centric—tachometer center-mounted, controls angled toward you, minimal decoration. Our Glass design system follows the same philosophy: the interface recedes, and you focus on your destination. That's Zuhandenheit applied to UI.

**"The Parts, Assembled"**: Every workflow is a vehicle built from precision parts. The outcome is motion toward the destination.

### Cornering the Terms

CREATE SOMETHING and WORKWAY together establish ownership of:
- **The Automation Layer** — MCP servers that connect tools to AI
- **The Intelligence Layer** — Skills and Agents that produce outcomes
- **The Automotive Framework** — the explanatory metaphor (MCP as chassis)

This is the life's work: building systems that work while you sleep.

## Architecture

```
packages/
  space/    → createsomething.space  (Practice: experiments, learning)
  io/       → createsomething.io     (Research: tools, documentation)
  agency/   → createsomething.agency (Services: client work)
  ltd/      → createsomething.ltd    (Philosophy: canon, ethos)
```

All packages use **SvelteKit** with **Cloudflare Pages** deployment. Shared D1 databases, KV namespaces, and Workers per package.

## Languages

The Language Triad maps to the Subtractive Triad:

| Language | Domain | When to Use |
|----------|--------|-------------|
| **TypeScript** | Frontend, APIs, Workers | UI components, server routes, edge functions |
| **Python** | LLM orchestration | Agent workflows, provider integration, rapid iteration |
| **Rust** | Infrastructure tooling | Code analysis, verification, performance-critical computation |

**Quick Decision**: If the bottleneck is *network latency* (LLM calls), use Python. If the bottleneck is *correctness* or *computation*, use Rust. Everything else is TypeScript.

See `STANDARDS.md` §3.4 for full language philosophy, including WebAssembly bridging for edge computation.

## Your Domain: Creation

Claude Code excels at:
- Writing new features and components
- Refactoring existing code
- Understanding unfamiliar code paths
- Creating and debugging tests
- Architecture planning and documentation
- Code review and optimization

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

## Task Management: Loom

Agent-native issue tracking that persists across sessions. The tool recedes; the work remains.

```bash
# Session Start: Surface highest-impact work
lm ready --ranked             # Robot-priority with PageRank + Critical Path

# During Work
lm create "Task"              # Capture discovered work
lm block X --by Y             # Record dependencies
lm update X --status claimed

# Session End
lm done X                     # Mark completed
```

**Labels**: `agency`, `io`, `space`, `ltd` (scope) + `feature`, `bug`, `research`, `refactor` (type)

**Issue Types**: `bug`, `feature`, `task`, `epic`, `chore` (set via `lm create --type`)

**Why Loom**: Multi-agent coordination with sessions, routing, cost tracking, and crash recovery. Absorbs Beads functionality with richer analytics.

See `.claude/rules/loom-patterns.md` for full reference.

## Agent Orchestration

Three patterns for different work scopes:

| Pattern | Scope | Use When |
|---------|-------|----------|
| **Ralph** | Single session iteration | Tests failing, refinement loops, fix-until-green |
| **Harness** | Single session workflow | Sequential multi-step features, spec-driven work |
| **Gastown** | Multi-session parallel | 3+ independent features, background work |

**Ralph**: Iterative refinement through self-referential feedback loops. The prompt never changes—your work does. Use `/ralph-loop` for test-fix loops and refinement until criteria met.

**Harness**: Autonomous work sessions with quality gates and peer review. Uses Anthropic prompt engineering best practices (prefilled responses, quote-based findings, chain-of-thought) for 99% parsing accuracy and <5% false positive rate. Reviewers: Security (Haiku), Architecture (Opus), Quality (Sonnet). Use `lm work` for single issues or Harness spec-driven features with checkpoints.

**Gastown**: Multi-agent orchestration via tmux. Use `gt convoy create` to batch work, `gt sling` to assign to workers, parallel execution at scale.

See pattern files for detailed usage:
- `.claude/rules/ralph-patterns.md` - Iterative refinement
- `.claude/rules/harness-patterns.md` - Workflow orchestration
- `.claude/rules/gastown-patterns.md` - Multi-agent coordination

## Development Commands

```bash
# Start dev server (your domain)
pnpm dev --filter=space

# Type checking (your domain)
pnpm --filter=space exec tsc --noEmit

# Generate types (your domain)
pnpm --filter=space exec wrangler types
```

## Deployment Commands

Execute directly via Bash. The tool recedes; deployment happens.

```bash
# Deploy to Cloudflare Pages (use exact project names - see .claude/rules/cloudflare-patterns.md)
pnpm --filter=space build && wrangler pages deploy packages/space/.svelte-kit/cloudflare --project-name=create-something-space

# Deploy Workers
pnpm --filter=identity-worker deploy

# Database migrations
wrangler d1 migrations apply DB_NAME

# Tail production logs (WezTerm - interactive)
wrangler pages deployment tail --project-name=create-something-space
```

## File Conventions

Key paths (see `.claude/rules/sveltekit-conventions.md` for full patterns):
- Routes: `src/routes/[path]/+page.svelte`
- API: `src/routes/api/[endpoint]/+server.ts`
- Components: `src/lib/components/`

## CSS Architecture

**Tailwind for structure, Canon for aesthetics.** When doing UI/design work, use the `css-canon` skill for full token reference, Glass Design System details, and animation patterns.

**Key Principle**: Use Tailwind for layout/structure (`flex`, `grid`, `gap-*`, `p-*`). Use Canon tokens for aesthetics (colors, typography, borders, shadows, motion).

**Glass Design System**: CREATE SOMETHING and WORKWAY share a unified Glass Design System. Glass conveys "The Automation Layer"—the transparent interface between user and outcome. Use `.glass-*` classes for navigation, modals, and workflow cards. Invoke `css-canon` skill for full reference when needed.

**Migration Strategy**: New code follows Canon. Existing code migrates incrementally when touched. Priority: `packages/components/` first.

**Spacing Guidance**: The golden ratio scale produces impractical values at the upper end (`--space-2xl` = 110px, `--space-3xl` = 177px). Use Tailwind for layout spacing:
- **Page padding**: Tailwind utilities (`py-16`, `py-24`, `px-6`)
- **Section gaps**: Tailwind utilities (`gap-8`, `space-y-12`)
- **Nav offset**: Use `calc(var(--header-height) + var(--space-md))` for fixed nav padding
- **Component internals**: Canon tokens are acceptable (`--space-xs` through `--space-xl`)
- **Avoid for page layout**: `--space-2xl` and `--space-3xl` are too large for most padding use cases

## Cloudflare Resources

D1 databases and KV namespaces per package. See `.claude/rules/cloudflare-patterns.md` for queries, SDK usage, and **exact project names** for deployment.

## Skills Available

- `css-canon`: Canon design tokens, Glass system, animation patterns (use when doing UI/design work)
- `motion-analysis`: Analyze CSS animations from URLs
- `canon-maintenance`: Enforce CREATE SOMETHING design standards
- `audit-paper`: Validate paper styling against standard template patterns (proactive + manual)

## UI Preview System

Visual feedback for UI component development. See live animated changes as you edit.

**MCP Tools** (if ui-preview server enabled):
```
ui_preview_start({ watchDir: "./src/lib/components" })  # Start watching
ui_preview_status()                                      # Check status
ui_preview_stop()                                        # Stop
```

**CLI Commands** (always available):
```bash
pnpm ui:start ./src/lib/components  # Start preview
pnpm ui:status                       # Check status (JSON)
pnpm ui:stop                         # Stop preview
```

**Workflow**:
1. Start preview before UI changes
2. Edit components—changes animate in viewer
3. Stop when done

**Copy for Agent**: Users can click elements in the viewer and copy context for precise targeting.

See `docs/guides/UI_PREVIEW_SYSTEM.md` for architecture details.

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

### LSP MCP for Code Navigation

For TypeScript code navigation, prefer LSP over Grep when precision matters:

**Use LSP (via MCP) when:**
- Finding actual usages vs string matches (`lsp_find_references`)
- Getting type information (`lsp_hover`)
- Renaming symbols across packages (`lsp_rename_symbol`)
- Checking TypeScript errors (`lsp_diagnostics`)

**Use Grep when:**
- Searching CSS, HTML, Markdown (non-TypeScript)
- Pattern matching string literals
- Quick filename searches

**The win**: 77% noise reduction, 60% faster exploration.

See `.claude/rules/lsp-mcp-patterns.md` for full integration guide.

### Cloudflare SDK

For composed Cloudflare operations, use `@create-something/cloudflare-sdk`:

```typescript
import { cf } from '@create-something/cloudflare-sdk';

// KV operations
const namespaces = await cf.kv.listNamespaces();
const value = await cf.kv.get('namespace-id', 'key');

// D1 queries
const users = await cf.d1.query('my-db', 'SELECT * FROM users');

// Pages deployment
const url = await cf.pages.deploy('project', './dist');
```

**Reference**: [Code Mode Hermeneutic Analysis](https://createsomething.io/papers/code-mode-hermeneutic-analysis)

## The Hermeneutic Circle

CREATE SOMETHING operates as an interconnected system where each property serves the whole:

```
.ltd (Philosophy) → provides criteria for →
.io (Research)    → validates →
.space (Practice) → applies to →
.agency (Services) → tests and evolves →
.ltd (Philosophy)
```

Your contributions enter this circle. Code changes on .space eventually influence the philosophical foundation on .ltd. This is the Subtractive Triad's third level—Heidegger—applied to the organization itself: every property must serve the whole, or be reconnected until it does.
