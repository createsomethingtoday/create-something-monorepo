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
- **Resume briefs**: Full context restoration

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

## Phase 1 Status (MVP)

**Implemented**:
- ✓ Session lifecycle (start, pause, resume, complete)
- ✓ Checkpoint storage (Git-based)
- ✓ Checkpoint policy (time/event/cost triggers)
- ✓ Resume brief generation
- ✓ Cost tracking with budget enforcement
- ✓ Harness baseline integration
- ✓ CLI commands (`orch session`)

**Not Yet Implemented** (Phase 2+):
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
