# @create-something/orchestration

Multi-session orchestration layer with quality gates and cost tracking.

## Philosophy

Extends harness patterns with multi-session durability. Sessions can crash, restart, or be paused—work survives.

**Nondeterministic idempotence**: Different paths, same outcome. The infrastructure recedes; only the work remains.

## Features

- **Multi-session continuity**: Checkpoint and resume across crashes
- **Cost tracking**: Budget enforcement with warnings
- **Quality gates**: Baseline checks at session start
- **Git-based persistence**: Checkpoints committed for durability
- **Resume briefs**: Full context restoration with "what didn't work" sections
- **Agent reflection**: Extract learnings from completed convoys (RoboDev-inspired)
- **Postmortem pipeline**: Capture incident learnings into prevention rules
- **Work metrics**: Track cycle time, iterations, and reviewer efficacy

## Installation

```bash
pnpm add @create-something/orchestration
```

## Usage

### Start a Session

```bash
# New session
orch session start --epic my-feature --budget 5.00

# Resume from checkpoint
orch session start --epic my-feature --resume
```

### Check Status

```bash
orch session status --epic my-feature
```

### Pause Session

```bash
orch session pause --epic my-feature --reason "End of day"
```

### List Checkpoints

```bash
orch session list --epic my-feature
```

### Agent Reflection (RoboDev-Inspired)

After completing work, reflect on what was learned:

```bash
# Reflect on a convoy
orch reflect convoy <convoy-id> --epic <epic-id>

# Reflect on an entire epic
orch reflect epic <epic-id>

# Apply learnings to rule files
orch reflect apply <reflection-id>

# View pending learnings
orch reflect pending
```

### Postmortem Pipeline

Capture incident learnings as prevention rules:

```bash
# Create postmortem from incident issue
orch postmortem create <issue-id> --auto-analyze --auto-rules

# Review generated rules
orch postmortem show <postmortem-id>

# Approve and apply rules
orch postmortem approve <postmortem-id>
orch postmortem apply <postmortem-id>
```

### Work Metrics

Track cycle time, iterations, and reviewer efficacy:

```bash
# Collect metrics for a convoy
orch metrics convoy <convoy-id> --epic <epic-id> --save

# Collect metrics for an epic
orch metrics epic <epic-id> --save

# Generate report
orch metrics report <target-id>

# Compare two targets
orch metrics compare <target-a> <target-b>

# View summary
orch metrics summary
```

## Programmatic API

```typescript
import {
  startSession,
  pauseSession,
  resumeSession,
  completeSession,
  type SessionConfig,
} from '@create-something/orchestration';

// Start session
const config: SessionConfig = {
  epicId: 'my-feature',
  resume: false,
  budget: 5.0,
  background: false,
};

const { session, context, resumeBrief } = await startSession(config);

// Pause session (creates checkpoint)
const checkpoint = await pauseSession(
  session,
  context,
  'Manual pause'
);

// Resume later
const resumed = await resumeSession('my-feature');
```

## Architecture

### Session Lifecycle

```
initializing → running → paused → completed
                      ↓
                   failed
```

### Checkpoint Storage

Checkpoints are stored in Git at:
```
.orchestration/checkpoints/{epicId}/ckpt-{id}.json
```

Each checkpoint is committed with metadata for audit trail.

### Cost Tracking

Automatic budget enforcement:
- **Warning at 80%**: Alert when budget is low
- **Hard stop at 100%**: Prevent runaway costs

### Quality Gates

Baseline checks at session start:
- Tests
- TypeScript
- Linting
- Build (optional)

## Configuration

### Checkpoint Policy

```typescript
interface CheckpointPolicy {
  intervalMinutes: number;      // Auto-checkpoint every N minutes
  events: {
    onSessionStart: boolean;    // Checkpoint at start
    onIssueComplete: boolean;   // Checkpoint per issue
    onError: boolean;           // Checkpoint on failure
    onCostThreshold: number;    // Checkpoint at % of budget
  };
}
```

**Default**: 15-minute intervals with session start and error checkpoints.

## Harness Integration

Orchestration extends harness types and patterns:

```typescript
import type { AgentContext } from '@create-something/harness';

interface OrchestrationContext extends AgentContext {
  epicId: string;
  sessionNumber: number;
  cumulativeCost: number;
  budgetRemaining: number | null;
  // ... orchestration-specific fields
}
```

## Phase Status

**Phase 1 (MVP) - Complete**:
- ✓ Session lifecycle (start, pause, resume, complete)
- ✓ Checkpoint storage (Git-based)
- ✓ Checkpoint policy (time/event/cost triggers)
- ✓ Resume brief generation
- ✓ Cost tracking with budget enforcement
- ✓ Harness baseline integration
- ✓ CLI commands (`orch session`)

**Phase 2 (RoboDev-Inspired) - Complete**:
- ✓ Agent reflection (`orch reflect`) - Extract learnings from completed work
- ✓ Postmortem pipeline (`orch postmortem`) - Incident → prevention rules
- ✓ Work metrics (`orch metrics`) - Cycle time, iterations, reviewer efficacy
- ✓ "What didn't work" sections in checkpoint reports
- ✓ Full context mode (`harness work --full-context`)

**Phase 3 (Planned)**:
- Convoy support (multi-issue coordination)
- Worker pool management
- Background execution via Task subagents
- Witness pattern (health monitoring)

## Testing

```bash
pnpm test
```

Tests verify checkpoint/resume flow works across session boundaries.

## Subtractive Triad

| Level | Application |
|-------|-------------|
| **DRY** | Reuses harness AgentContext, review pipeline, Beads functions |
| **Rams** | Only essential features; checkpoints earn their existence (prevent data loss) |
| **Heidegger** | The tool recedes; when it works, you think about work, not sessions |

## Related Documentation

- [Harness Patterns](../../.claude/rules/harness-patterns.md)
- [Orchestration Plan](../../.claude/plans/crispy-chasing-mist.md)
- [Beads Patterns](../../.claude/rules/beads-patterns.md)

## License

MIT
