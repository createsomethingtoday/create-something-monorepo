# Harness Patterns

Autonomous agent orchestration with Beads-based human oversight.

## Philosophy

The harness runs autonomously. Humans engage through **progress reports**—reactive steering rather than proactive management.

**Heideggerian alignment**: The harness recedes into transparent operation. When working, you don't think about the harness—you review progress and redirect when needed.

**Canon alignment**: As little infrastructure as possible. Checkpoints ARE Beads issues. No new systems.

### Core Constraints

| Constraint | Rationale |
|------------|-----------|
| **One feature per session** | Prevents scope creep; enables clean commits |
| **Beads is the only progress system** | DRY—no separate progress files |
| **Commit before close** | Work without commits is lost work |
| **Verify before declaring complete** | Prevents premature victory |

## Quick Start

```bash
# 1. Write a spec (markdown PRD)
vim specs/my-project.md

# 2. Start the harness
harness start specs/my-project.md

# 3. Walk away—check progress when ready
bd progress

# 4. Redirect if needed
bd update cs-xyz --priority P0

# 5. Resume if paused
harness resume
```

## Spec Format

Free-form markdown. The harness parses it into Beads issues.

```markdown
# Project Title

## Overview
Description of what we're building...

## Features

### Authentication
- Login with email/password
- Magic link option
- Session management

### Dashboard
- Overview stats
- Recent activity feed
- Quick actions
```

## Commands

### Harness Control

```bash
harness start <spec>              # Start from spec
harness start <spec> --dry-run    # Preview without executing
harness pause                     # Stop after current session
harness resume                    # Continue from checkpoint
harness status                    # Show current state
```

### Progress & Redirection (via Beads)

```bash
bd progress                       # View checkpoints
bd update <id> --priority P0      # Urgent redirect
bd create "Fix X" --priority P0   # Inject urgent work
bd close <id>                     # Stop work on issue
```

## Checkpoint Policy

| Trigger | Default | Description |
|---------|---------|-------------|
| `--checkpoint-every` | 3 | Checkpoint every N sessions |
| `--max-hours` | 4 | Checkpoint every M hours |
| On error | true | Checkpoint on task failure |
| Low confidence | 0.7 | Pause if confidence < 70% |

## Failure Handling

The harness handles partial failures gracefully with configurable strategies.

### Failure Actions

| Action | Description |
|--------|-------------|
| `retry` | Retry the task (up to maxRetries) |
| `skip` | Skip the task and continue |
| `pause` | Pause harness for human review |
| `escalate` | Pause with escalation flag |

### Default Strategies by Failure Type

| Failure Type | Default Action | Rationale |
|--------------|---------------|-----------|
| `context_overflow` | skip | Task may be too large, retrying won't help |
| `timeout` | retry | May be transient |
| `partial` | skip | Some work done, move on |
| `failure` | retry | Worth another attempt |

### Configuration

```typescript
const failureConfig: FailureHandlingConfig = {
  maxRetries: 2,           // Retry up to 2 times
  retryDelayMs: 5000,      // Wait 5s between retries
  continueOnFailure: true, // Keep running on individual failures
  maxConsecutiveFailures: 3, // Pause after 3 consecutive failures
  annotateFailures: true,  // Record failure reasons in Beads
  strategies: {
    contextOverflow: 'skip',
    timeout: 'retry',
    partial: 'skip',
    failure: 'retry',
  },
};
```

### Failure Tracking

The harness tracks:
- **Per-issue history**: Attempt count, errors, durations
- **Consecutive failures**: Resets on success
- **Retry success rate**: How often retries help
- **Skipped issues**: Tasks that couldn't complete

### Recovery from Failures

When the harness pauses due to failures:
1. Review the checkpoint summary
2. Check failed issue annotations in Beads
3. Address root causes (task too large? dependencies missing?)
4. Adjust failure config if needed
5. Resume with `harness resume`

### Failure Mode Reference

Explicit mapping of failure patterns to solutions (learned from production use):

| Failure Mode | Symptom | Root Cause | Solution |
|--------------|---------|------------|----------|
| **Premature completion** | Agent says "done" but feature broken | No verification step | Require E2E test pass before `bd close` |
| **Context sprawl** | Multiple features touched, none complete | Scope creep | Enforce ONE issue per session in priming |
| **Environment discovery** | Wasted tokens on setup commands | No init script | Add `init.sh` or document startup in issue |
| **Lost progress** | Agent re-implements completed work | Context not recovered | Use Session Startup Protocol strictly |
| **Shallow testing** | Only unit tests, integration broken | E2E not mandated | Add Puppeteer/browser verification step |
| **Dependency cascade** | Blocked issues pile up | Poor dependency graph | Run `bd blocked` before session, resolve blockers first |
| **Victory declaration** | "Project complete" with open issues | No source of truth check | Always verify against `bd list --status=open` |
| **Commit amnesia** | Work done but not committed | No commit discipline | Commit after each logical unit, include issue ID |

### Prevention Patterns

```bash
# Before marking ANY issue complete:
1. Run tests:        pnpm test --filter=<package>
2. Verify E2E:       pnpm test:e2e (if applicable)
3. Check issue:      bd show <id>  # Confirm this is the right issue
4. Commit:           git commit -m "feat(<scope>): <desc> [<issue-id>]"
5. Close with ref:   bd close <id> --reason "Commit: $(git rev-parse --short HEAD)"

# Before declaring session/project complete:
bd list --status=open            # Any remaining work?
bd blocked                       # Any blocked issues?
git status                       # Uncommitted changes?
```

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                 HARNESS RUNNER                       │
│                                                     │
│  Session 1 ──► Session 2 ──► Session 3 ──► ...     │
│      │             │             │                  │
│      ▼             ▼             ▼                  │
│  Checkpoint    Checkpoint    Checkpoint             │
└──────┬─────────────┬─────────────┬──────────────────┘
       │             │             │
       ▼             ▼             ▼
┌─────────────────────────────────────────────────────┐
│              BEADS (Human Interface)                │
│                                                     │
│  `bd progress` - Review checkpoints                 │
│  `bd update`   - Redirect priorities                │
│  `bd create`   - Inject work                        │
└─────────────────────────────────────────────────────┘
```

## Session Startup Protocol

Each session follows a **prescriptive startup sequence** to minimize context waste on environment discovery. All progress tracking uses Beads—no separate progress files.

### Startup Sequence

```bash
# 1. Verify environment
pwd                              # Confirm working directory
git status --short               # Check for uncommitted changes

# 2. Recover context from Beads (single source of truth)
bd show $(bd list --status=in_progress --limit=1 -q)  # Current work
bd list --status=closed --limit=5                      # Recent completions
git log --oneline -10                                  # Recent commits

# 3. Select work for this session
bd ready | head -5               # Available unblocked work
# Select ONE issue for this session

# 4. Verify environment runs
pnpm dev --filter=<package> &    # Or: ./init.sh if exists
```

### Session Priming Template

The harness generates this context from Beads:

```markdown
# Harness Session Context

## Current Task (from `bd ready`)
**Issue**: cs-xyz - Implement user dashboard
**Priority**: P1
**Blocked by**: None
**Description**: [Full issue description from Beads]

## Session Log (from closed issues, last 5)
- cs-abc: Add login endpoint (closed 2h ago, commit abc123)
- cs-def: Add session management (closed 4h ago, commit def456)
- cs-ghi: Create user model (closed 6h ago, commit ghi789)

## Recent Git Commits (last 10)
- abc123: feat: add login endpoint
- def456: feat: add session management

## Redirect Notes (priority changes since last session)
- cs-xyz: P2 → P0 (human escalated)

## Session Goal
Complete ONE feature: cs-xyz (user dashboard).
Commit when tests pass. Update issue status in Beads.

## Constraints
- Do NOT start other features
- Do NOT mark complete without verification
- Commit after each logical unit of work
```

### Progress Tracking via Beads

**DRY Principle**: Beads IS the progress log. No separate files.

| Progress Event | Beads Action |
|----------------|--------------|
| Start work | `bd update <id> --status in_progress` |
| Partial progress | Add comment: `bd comment <id> "Completed X, starting Y"` |
| Blocker found | `bd create "Blocker: X" && bd dep add <new> blocks <current>` |
| Work complete | `bd close <id> --reason "Commit: abc123"` |
| Session end | Checkpoint issue created automatically |

### Session Log Query

To view session history (replaces separate progress file):

```bash
# Recent session activity
bd list --status=closed --since=24h --format=log

# Output:
# 2025-12-22T14:00 cs-xyz closed "feat: dashboard layout" (abc123)
# 2025-12-22T13:00 cs-abc closed "feat: login endpoint" (def456)
# 2025-12-22T12:00 cs-def closed "feat: session mgmt" (ghi789)
```

## Redirecting

The harness watches Beads for changes between sessions:

| Action | Effect |
|--------|--------|
| `bd update <id> --priority P0` | Issue jumps to front of queue |
| `bd create "..." --priority P0` | New work added at top priority |
| `bd close <id>` | Harness stops working on issue |
| Create issue with `pause` label | Harness pauses for review |

## Checkpoints

Progress reports are Beads issues (type: `checkpoint`):

```
═══════════════════════════════════════════════════════════════
  CHECKPOINT #12
  2025-12-18T14:00:00Z
═══════════════════════════════════════════════════════════════

Completed 5 of 6 tasks in this checkpoint period.
1 task(s) failed and may need attention.

Overall progress: 35/42 features.

✓ Completed: cs-a1b2, cs-c3d4, cs-e5f6, cs-g7h8, cs-i9j0
✗ Failed: cs-k1l2
◐ In Progress: cs-m3n4

Confidence: 85%
Git Commit: abc123def
═══════════════════════════════════════════════════════════════
```

### Swarm Checkpoints

When running in parallel (swarm) mode, checkpoints include additional metrics:

```
═══════════════════════════════════════════════════════════════
  SWARM CHECKPOINT #5
  2025-12-18T14:00:00Z
═══════════════════════════════════════════════════════════════

Parallel Execution: 5 agents

Completed 4 of 5 tasks in this checkpoint period.
1 task(s) failed and may need attention.

Overall progress: 20/42 features.

✓ Completed: cs-a1b2, cs-c3d4, cs-e5f6, cs-g7h8
✗ Failed: cs-k1l2

Confidence: 80%
Parallelism Efficiency: 80%
Git Commit: abc123def

── Agent Failures ──
  agent-001 → cs-k1l2: Context overflow after 50k tokens
═══════════════════════════════════════════════════════════════
```

**Swarm-specific metrics**:
- **Parallel Execution**: Number of agents in the batch
- **Parallelism Efficiency**: Ratio of successful to total parallel tasks
- **Agent Failures**: Per-agent error breakdown for debugging

## When to Pause

The harness auto-pauses when:
- Confidence drops below threshold (default 70%)
- Human creates issue with `pause` label
- Too many consecutive failures

Resume with `harness resume` after investigating.

## Integration

### With Beads
- Issues created with `harness:<id>` label
- Checkpoints are issues (type: `checkpoint`)
- Uses `bv --robot-priority` for work selection

### With Git
- Creates branch per harness run
- Each successful session commits
- Checkpoints include commit hash

### With Hooks
- Existing hooks run during sessions
- Hook failures = task failure = checkpoint

## Files

```
packages/harness/
├── src/
│   ├── types.ts          # Type definitions
│   ├── spec-parser.ts    # Markdown PRD parsing
│   ├── beads.ts          # Beads integration
│   ├── session.ts        # Claude Code spawning
│   ├── checkpoint.ts     # Progress reports
│   ├── redirect.ts       # Change detection
│   ├── failure-handler.ts # Graceful failure handling
│   ├── runner.ts         # Main loop
│   ├── cli.ts            # CLI entry point
│   └── index.ts          # Exports
├── package.json
└── tsconfig.json
```

## Why This Works

### Subtractive Triad
- **DRY**: One system (Beads) for all tracking
- **Rams**: Only essential components
- **Heidegger**: Serves the work, not itself

### Human Agency Preserved
You can always:
- Check progress (`bd progress`)
- Redirect priorities (`bd update`)
- Pause for review (`harness pause`)
- Resume when ready (`harness resume`)

The harness runs autonomously, but you remain in control.
