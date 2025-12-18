# Harness Patterns

Autonomous agent orchestration with Beads-based human oversight.

## Philosophy

The harness runs autonomously. Humans engage through **progress reports**—reactive steering rather than proactive management.

**Heideggerian alignment**: The harness recedes into transparent operation. When working, you don't think about the harness—you review progress and redirect when needed.

**Canon alignment**: As little infrastructure as possible. Checkpoints ARE Beads issues. No new systems.

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

## Session Priming

Each session receives context:

```markdown
# Harness Session Context

## Current Task
**Issue**: cs-xyz - Implement user dashboard
**Priority**: P1

## Recent Git Commits
- abc123: Add login endpoint
- def456: Add session management

## Last Checkpoint Summary
Completed auth flow. 8/42 features done.

## Redirect Notes
Human updated cs-ghi from P2 → P0.

## Session Goal
Complete the dashboard layout. Commit if tests pass.
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
