# @create-something/harness

Autonomous agent orchestration with Beads-based human oversight.

## Philosophy

The harness runs autonomously. Humans engage through **progress reports**—reactive steering rather than proactive management.

> *Zuhandenheit*: The harness recedes into transparent operation. When working, you don't think about the harness—you review progress and redirect when needed.

## Installation

```bash
pnpm add @create-something/harness
```

Or use directly from the monorepo:

```bash
cd packages/harness
pnpm build
node dist/cli.js start specs/my-project.md
```

## Quick Start

```bash
# 1. Write a spec (markdown PRD)
vim specs/my-project.md

# 2. Start the harness
harness start specs/my-project.md

# 3. Check progress when ready
bd progress

# 4. Redirect if needed
bd update cs-xyz --priority P0

# 5. Resume if paused
harness resume --harness-id <id>
```

## Commands

```bash
harness start <spec-file>        # Start from markdown PRD
harness pause                    # Pause after current session
harness resume --harness-id <id> # Resume from last checkpoint
harness status                   # Show current state
```

### Options

```bash
--checkpoint-every N    # Checkpoint every N sessions (default: 3)
--max-hours M           # Checkpoint every M hours (default: 4)
--reviewers <list>      # Peer reviewers: security,architecture,quality
--model <model>         # Default model: opus, sonnet, haiku
--dry-run               # Preview without executing
```

## Agent SDK Integration

The harness uses explicit tool permissions via `--allowedTools`:

```typescript
const HARNESS_ALLOWED_TOOLS = [
  // Core file operations
  'Read', 'Write', 'Edit', 'Glob', 'Grep', 'NotebookEdit',

  // Bash with granular patterns
  'Bash(git:*)', 'Bash(pnpm:*)', 'Bash(npm:*)', 'Bash(npx:*)',
  'Bash(node:*)', 'Bash(tsc:*)', 'Bash(wrangler:*)',
  'Bash(bd:*)', 'Bash(bv:*)',  // Beads CLI

  // Orchestration
  'Task', 'TodoWrite', 'WebFetch', 'WebSearch',

  // CREATE Something
  'Skill',

  // MCP Cloudflare
  'mcp__cloudflare__kv_*', 'mcp__cloudflare__d1_*',
  'mcp__cloudflare__r2_*', 'mcp__cloudflare__worker_*',
];
```

**Security improvement**: Replaces `--dangerously-skip-permissions` with explicit allowlist.

**Runaway prevention**: `--max-turns 100` prevents infinite loops.

## Spec Format

Write a markdown PRD. The harness parses `## Features` into Beads issues:

```markdown
# My Project

## Overview
Build a user dashboard with authentication.

## Features

### Phase 1: Authentication
- Login with email/password
- Magic link option
- Session management

### Phase 2: Dashboard
- Overview stats
- Recent activity feed
```

Each `### Phase N:` becomes a Beads issue with inferred dependencies.

## Peer Review Pipeline

The harness runs peer reviewers at checkpoint boundaries:

```bash
harness start specs/project.md --reviewers security,architecture,quality
```

| Reviewer | Focus | Model | Cost |
|----------|-------|-------|------|
| **Security** | Vulnerabilities, injection, auth issues | Haiku | ~$0.001 |
| **Architecture** | DRY violations, coupling, structural quality | Opus | ~$0.10 |
| **Quality** | Error handling, edge cases, test coverage | Sonnet | ~$0.01 |

**Model routing philosophy**: Security uses pattern detection (Haiku). Architecture requires deep reasoning (Opus). Quality balances both (Sonnet).

Reviews run in parallel. Critical findings can block advancement (configurable via `canBlock`).

### Prompt Engineering (Anthropic Best Practices)

Reviewers use advanced prompt engineering for accuracy:

- **Prefilled responses**: Forces JSON structure, eliminates parsing failures
- **Quote-based findings**: Architecture reviewer requires verbatim code quotes to prevent hallucinations
- **Chain-of-thought**: Opus reviewers show reasoning steps in `<thinking>` tags before conclusions
- **XML structure**: Test output wrapped in tags for better content extraction

**Expected accuracy**: 99% parsing success, 5% false positive rate (down from 15%).

## How It Works

1. **Initialize**: Parse spec → create Beads issues → create git branch
2. **Loop**: Select highest-priority issue → prime context → run Claude Code session
3. **Checkpoint**: After N sessions, create progress report and run peer reviews
4. **Redirect**: Watch for human changes (priority updates, new urgent issues)
5. **Complete**: All issues done, or human paused for review

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    HARNESS RUNNER                        │
│                                                          │
│  Spec Parser ──► Issue Creation ──► Session Loop         │
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │  Session 1 ──► Session 2 ──► Session 3 ──► ...  │    │
│  │      │             │             │               │    │
│  │      ▼             ▼             ▼               │    │
│  │  Checkpoint    Checkpoint    Checkpoint          │    │
│  │      │             │             │               │    │
│  │      ▼             ▼             ▼               │    │
│  │  Peer Review   Peer Review   Peer Review         │    │
│  └─────────────────────────────────────────────────┘    │
│                                                          │
└──────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│              BEADS (Human Interface)                     │
│                                                          │
│  bd progress - Review checkpoints                        │
│  bd update   - Redirect priorities                       │
│  bd create   - Inject work                               │
└─────────────────────────────────────────────────────────┘
```

## Redirecting

The harness watches Beads for changes between sessions:

```bash
bd update <id> --priority P0      # Make urgent (jumps to front)
bd create "Fix X" --priority P0   # Inject urgent work
bd close <id>                     # Stop work on issue
```

## Failure Handling

Configurable strategies per failure type:

| Failure Type | Default Action | Rationale |
|--------------|----------------|-----------|
| `context_overflow` | skip | Task too large, retrying won't help |
| `timeout` | retry | May be transient |
| `partial` | skip | Some work done, move on |
| `failure` | retry | Worth another attempt |

After 3 consecutive failures, the harness pauses for human review.

## Cost Tracking

Sessions capture cost metrics from JSON output:

```typescript
interface SessionResult {
  issueId: string;
  outcome: 'success' | 'partial' | 'failure' | 'timeout';
  sessionId: string | null;   // For --resume support
  costUsd: number | null;     // Per-session cost
  numTurns: number | null;    // Efficiency metric
}
```

Typical costs: CSS fix ~$0.02, component refactor ~$0.03-0.05.

## Checkpoints

Progress reports are Beads issues with:
- Summary of completed/failed/in-progress work
- Confidence score
- Git commit hash
- Peer review findings
- Redirect notes

View with `bd progress` or `bd show <checkpoint-id>`.

## Dynamic Confidence Thresholds

The harness adjusts pause thresholds based on detected model capabilities:

| Model | Threshold | Rationale |
|-------|-----------|-----------|
| Opus | 60% | More capable, can be trusted at lower confidence |
| Sonnet | 70% | Standard threshold (default) |
| Haiku | 80% | Less capable, requires higher confidence |
| Unknown | 70% | Conservative fallback |

**Philosophy**: Different models have different capabilities. Opus can be trusted to recover from failures more effectively than Haiku. The harness automatically detects which model is running and adjusts accordingly.

**Implementation**: Model detection happens via Claude Code JSON output. Each session's `model` field is parsed (e.g., `"claude-sonnet-4-5-20250929"`) and mapped to a family (`opus`, `sonnet`, `haiku`). The checkpoint system then uses family-specific thresholds when deciding whether to pause for low confidence.

**Verification**: Run `pnpm exec tsx verify-dynamic-thresholds.ts` to test threshold logic.

## References

- [Paper: Harness Agent SDK Migration](https://createsomething.io/papers/harness-agent-sdk-migration)
- [Harness Patterns](../../.claude/rules/harness-patterns.md)
- [Beads Patterns](../../.claude/rules/beads-patterns.md)

## License

MIT
