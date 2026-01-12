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

## Architecture

```
packages/
  space/    → createsomething.space  (Practice: experiments, learning)
  io/       → createsomething.io     (Research: tools, documentation)
  agency/   → createsomething.agency (Services: client work)
  ltd/      → createsomething.ltd    (Philosophy: canon, ethos)
```

All packages use **SvelteKit** with **Cloudflare Pages** deployment. Shared D1 databases, KV namespaces, and Workers per package.

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

## Task Management: Beads

Agent-native issue tracking that persists across sessions. The tool recedes; the work remains.

```bash
# Session Start: Surface highest-impact work
bv --robot-priority

# During Work
bd create "Task"              # Capture discovered work
bd dep add X blocks Y         # Record dependencies
bd update X --status in-progress

# Session End
bd close X                    # Mark completed
```

**Labels**: `agency`, `io`, `space`, `ltd` (scope) + `feature`, `bug`, `research`, `refactor` (type)

**Why Beads**: Designed for AI agents. Taskwarrior was human-first; Beads speaks machine to machine via `--robot-priority`.

See `.claude/rules/beads-patterns.md` for full reference.

## Agent Orchestration

Three patterns for different work scopes:

| Pattern | Scope | Use When |
|---------|-------|----------|
| **Ralph** | Single session iteration | Tests failing, refinement loops, fix-until-green |
| **Harness** | Single session workflow | Sequential multi-step features, spec-driven work |
| **Gastown** | Multi-session parallel | 3+ independent features, background work |

**Ralph**: Iterative refinement through self-referential feedback loops. The prompt never changes—your work does. Use `/ralph-loop` for test-fix loops and refinement until criteria met.

**Harness**: Autonomous work sessions with quality gates and peer review. Uses Anthropic prompt engineering best practices (prefilled responses, quote-based findings, chain-of-thought) for 99% parsing accuracy and <5% false positive rate. Reviewers: Security (Haiku), Architecture (Opus), Quality (Sonnet). Use `bd work` for single issues or `bd work --spec` for spec-driven features with checkpoints.

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

**Tailwind for structure, Canon for aesthetics.** See `.claude/rules/css-canon.md` for tokens.

**Migration Strategy**: New code follows Canon. Existing code migrates incrementally when touched. Priority: `packages/components/` first.

## Cloudflare Resources

D1 databases and KV namespaces per package. See `.claude/rules/cloudflare-patterns.md` for queries, SDK usage, and **exact project names** for deployment.

## Skills Available

- `motion-analysis`: Analyze CSS animations from URLs
- `canon-maintenance`: Enforce CREATE SOMETHING design standards
- `audit-paper`: Validate paper styling against standard template patterns (proactive + manual)

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
