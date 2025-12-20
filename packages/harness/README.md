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

| Reviewer | Focus | Model |
|----------|-------|-------|
| security | Vulnerabilities, injection, auth issues | haiku |
| architecture | Token consistency, pattern adherence | haiku |
| quality | Code quality, test coverage | haiku |

Reviews run in parallel. Findings are logged but don't block progress (first-pass analysis philosophy).

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

## References

- [Paper: Harness Agent SDK Migration](https://createsomething.io/papers/harness-agent-sdk-migration)
- [Harness Patterns](.claude/rules/harness-patterns.md)
- [Beads Issue Tracker](../beads/)

## License

MIT
