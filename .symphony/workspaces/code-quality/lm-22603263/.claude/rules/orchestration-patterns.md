# Orchestration Patterns

Multi-session work with checkpoint/resume and cost tracking. The infrastructure recedes; the work continues.

## What to Do This Week

| When... | Do this |
|---------|---------|
| Starting long-running work | `orch session start --epic feature-001 --budget 10.00` |
| Work interrupted | Auto-checkpoints every 15 minutes |
| Session crashes | `orch session start --epic feature-001 --resume` |
| Check progress | `orch session status --epic feature-001` |
| Manual checkpoint | `orch session pause --epic feature-001 --reason "End of day"` |

**Example session:**

```bash
# Morning: Start work with budget
orch session start --epic auth-refactor --budget 10.00

# Work continues... auto-checkpoint at 15min
# Crash happens (Ctrl+C or context limit)

# Resume afternoon: Full context restored
orch session start --epic auth-refactor --resume
# ↳ Sees: files modified, decisions made, budget remaining

# Evening: Check status
orch session status --epic auth-refactor
# Shows: checkpoints created, cost consumed, budget remaining
```

---

## Core Principle: Nondeterministic Idempotence

Work outcomes are guaranteed regardless of the path taken. Sessions may crash, restart, or split—the work still completes.

**The mechanism**: Git-committed checkpoints every 15 minutes preserve full context. Any session can resume from any checkpoint.

---

## When to Use Orchestration

### Good For

| Scenario | Why Orchestration Works |
|----------|-------------------------|
| **Long-running implementation** | Survives crashes, context limits |
| **Work > 2 hours** | Auto-checkpoints every 15 minutes |
| **Budget-critical work** | Warns at 80%, stops at 100% |
| **Multi-day features** | Resume tomorrow with full context |

### Use Harness Instead

| Scenario | Use |
|----------|-----|
| Single-session work (<2 hours) | Harness |
| Sequential multi-step with clear phases | Harness with spec |
| One issue, no interruptions | Harness `bd work` |

### Use Gastown Instead (Not Recommended)

Orchestration is designed to **replace Gastown** once stable. During transition:

| Scenario | Current | Future |
|----------|---------|--------|
| Parallel independent work | Gastown | Orchestration Phase 2 (convoy) |
| Multi-agent coordination | Gastown | Orchestration Phase 3 (background) |

---

## Commands

### Session Management

```bash
# Start new session
orch session start --epic <id> --budget <amount>

# Resume from checkpoint
orch session start --epic <id> --resume

# Check status
orch session status --epic <id>

# Manual checkpoint (pause)
orch session pause --epic <id> --reason "Reason"

# List all checkpoints
orch session list --epic <id>
```

### Options

| Option | Description | Example |
|--------|-------------|---------|
| `--epic <id>` | Epic identifier (groups sessions) | `--epic auth-refactor` |
| `--resume` | Resume from latest checkpoint | `--resume` |
| `--budget <amount>` | Budget in USD | `--budget 10.00` |
| `--background` | Run in background (Phase 3) | `--background` |
| `--cwd <path>` | Working directory | `--cwd ~/project` |

---

## Checkpoints

### When Checkpoints Happen

**Default policy** (every 15 minutes):

| Trigger | When |
|---------|------|
| Time | Every 15 minutes |
| Session start | Initial checkpoint |
| Session pause | Manual checkpoint |
| Error | On failure (preserves context) |

### Checkpoint Storage

```
.orchestration/checkpoints/{epicId}/
├── ckpt-abc123.json    # Checkpoint data
├── ckpt-def456.json
└── ckpt-latest.json    # Symlink to most recent
```

**Committed to Git**: Checkpoints survive across machines and sessions.

### Checkpoint Contents

```typescript
interface StoredCheckpoint {
  id: string;                          // ckpt-abc123
  epicId: string;                      // auth-refactor
  sessionId: string;                   // sess-xyz789
  sessionNumber: number;               // 1, 2, 3...
  timestamp: string;                   // ISO timestamp
  gitCommit: string;                   // Git SHA at checkpoint
  context: OrchestrationContext;       // Full session context
  summary: string;                     // Human-readable summary
  reason: string;                      // Why checkpoint created
}
```

### Resume Briefs

When resuming, orchestration generates a **resume brief** from the last checkpoint:

```markdown
# Session Resume: auth-refactor

**Epic**: auth-refactor
**Previous Session**: sess-xyz789 (Session 1)
**Checkpoint**: ckpt-abc123
**Checkpoint Reason**: Auto-checkpoint (15 minutes elapsed)

## Budget Status
- Initial: $10.0000
- Consumed: $2.3400 (23%)
- Remaining: $7.6600

---

## Orchestration Context

**Session Number**: 2
**Parent Session**: sess-xyz789
**Checkpoint Created**: 2026-01-09T14:15:00.000Z

---

## Session Resume Brief

*Context captured at: 2026-01-09T14:15:00.000Z*

### Files Modified This Session
- `src/auth/jwt.ts` (+120/-30): Refactored JWT validation
- `src/auth/session.ts` (+45/-12): Added session expiry

### Issues Updated
- cs-abc123: Updated status to in-progress

### Decisions Made
- Use RS256 for JWT signing (better for distributed systems)
- Session TTL set to 24 hours

### Agent Notes
Refactored auth module to use new JWT library. All tests passing. Need to update documentation next.

---

*Resume from this context. The AI should figure out where work left off.*
```

---

## Cost Tracking

### Budget Enforcement

| Budget % | Action |
|----------|--------|
| 0-79% | Normal operation |
| 80-99% | ⚠️ Warning logged |
| 100% | 🛑 Hard stop (no further work) |

**Example:**

```bash
orch session start --epic feature --budget 5.00

# After $4.00 consumed (80%)
# ⚠️ Warning: Budget 80% consumed ($1.00 remaining)

# After $5.00 consumed (100%)
# 🛑 Error: Budget exhausted. Increase budget or complete session.
```

### Cost Tracking Across Sessions

Costs accumulate across all sessions in an epic:

| Session | Session Cost | Cumulative | Remaining |
|---------|--------------|------------|-----------|
| 1 | $2.34 | $2.34 | $7.66 |
| 2 | $1.87 | $4.21 | $5.79 |
| 3 | $3.12 | $7.33 | $2.67 |

**Resume inherits budget**: When you resume, `budgetRemaining` continues from where you left off.

---

## Quality Gates

### Baseline Check at Session Start

Before starting work, orchestration runs **baseline quality gates** (from harness):

| Gate | Command | Blocks? |
|------|---------|---------|
| Typecheck | `tsc --noEmit` | Yes |
| Lint | `eslint .` | No (auto-fix) |
| Tests | `pnpm test` | Yes |

**If baseline fails**: Session won't start. Fix the baseline first.

```bash
orch session start --epic feature --budget 5.0

# 🔍 Running baseline quality gates...
#   ❌ typecheck failed (3 errors)
#
# ❌ Failed to start session: Baseline check failed
# Fix issues: bd work cs-baseline-123
```

### Integration with Harness

Orchestration **extends harness**, not replaces it:

| Harness | Orchestration Extension |
|---------|------------------------|
| `AgentContext` | `OrchestrationContext` adds epic, session, cost |
| Checkpoints | Git-committed for cross-session continuity |
| Baseline checks | Wrapped into session lifecycle |
| Resume briefs | Extended with orchestration context |

---

## Programmatic Usage

```typescript
import {
  startSession,
  pauseSession,
  resumeSession,
  type SessionConfig,
} from '@create-something/orchestration';

// Start session
const config: SessionConfig = {
  epicId: 'auth-refactor',
  resume: false,
  budget: 10.0,
  background: false,
  cwd: process.cwd(),
};

const { session, context, resumeBrief } = await startSession(config);

console.log(`Session started: ${session.id}`);
console.log(`Budget: $${context.budgetRemaining.toFixed(4)}`);

// Do work...
context.agentNotes = 'Implemented JWT validation';
context.filesModified.push({
  path: 'src/auth/jwt.ts',
  summary: 'Refactored validation',
  changeType: 'modified',
  linesAdded: 120,
  linesRemoved: 30,
});

// Pause (creates checkpoint)
const checkpoint = await pauseSession(session, context, 'End of day');

console.log(`Checkpoint: ${checkpoint.id}`);

// Resume later
const resumed = await resumeSession('auth-refactor');

if (resumed) {
  console.log(`Resumed session ${resumed.session.sessionNumber}`);
  console.log(`Budget remaining: $${resumed.context.budgetRemaining.toFixed(4)}`);
  console.log(`Resume brief:\n${resumed.resumeBrief}`);
}
```

---

## Examples

### Example 1: Long-Running Refactor

**Scenario**: Refactoring auth system, expect 4-6 hours of work.

```bash
# Monday morning
orch session start --epic auth-refactor --budget 15.00

# Work continues...
# Auto-checkpoint at 10:15am (15 min)
# Auto-checkpoint at 10:30am (30 min)
# Lunch break at 12:00pm (90 min total)

orch session pause --epic auth-refactor --reason "Lunch break"

# Monday afternoon
orch session start --epic auth-refactor --resume
# ↳ Context: 2 checkpoints, $3.45 consumed, $11.55 remaining

# Work continues...
# Context window fills at 3:00pm

# Automatic: Session ends, checkpoint created

# Tuesday morning
orch session start --epic auth-refactor --resume
# ↳ Full context from Monday: files, decisions, budget
```

**Cost**: $3.45 (Monday) + $4.23 (Tuesday) = $7.68 total

### Example 2: Budget-Critical Work

**Scenario**: Client budget is $10, can't exceed.

```bash
orch session start --epic client-feature --budget 10.00

# After 6 hours...
# ⚠️ Warning: Budget 82% consumed ($1.80 remaining)

# After 7 hours...
# 🛑 Error: Budget exhausted

orch session status --epic client-feature
# Shows: $10.00 consumed, 8 checkpoints, 2 sessions

# Option 1: Increase budget
orch session start --epic client-feature --resume --budget 15.00

# Option 2: Complete with what's done
orch session pause --epic client-feature --reason "Budget limit reached"
```

### Example 3: Multi-Day Feature

**Scenario**: Complex feature spanning 3 days.

```bash
# Day 1: Planning and initial implementation
orch session start --epic payment-flow --budget 20.00
# ... work 4 hours ...
orch session pause --epic payment-flow --reason "EOD Day 1"

# Day 2: Integration and testing
orch session start --epic payment-flow --resume
# ... work 5 hours ...
orch session pause --epic payment-flow --reason "EOD Day 2"

# Day 3: Refinement and completion
orch session start --epic payment-flow --resume
# ... work 3 hours ...
orch session pause --epic payment-flow --reason "Feature complete"

# Check total
orch session status --epic payment-flow
# Shows: $14.35 total, 18 checkpoints, 3 sessions
```

---

## Architecture

### OrchestrationContext

Extends `AgentContext` from harness:

```typescript
interface OrchestrationContext extends AgentContext {
  // From AgentContext (harness)
  filesModified: FileModification[];
  issuesUpdated: IssueUpdate[];
  currentTask: TaskProgress | null;
  testState: TestState | null;
  agentNotes: string;
  blockers: string[];
  decisions: Decision[];
  capturedAt: string;

  // Orchestration extensions
  convoyId: string | null;           // Phase 2: convoy coordination
  workerId: string | null;            // Phase 2: worker assignment
  assignedIssues: string[];           // Phase 2: issues in convoy
  sessionNumber: number;              // 1, 2, 3...
  epicId: string;                     // Groups related sessions
  parentSessionId: string | null;     // Previous session ID
  sessionCost: number;                // Cost this session
  cumulativeCost: number;             // Total cost across sessions
  budgetRemaining: number | null;     // Remaining budget
  backgroundPid: number | null;       // Phase 3: background execution
  backgroundStarted: string | null;   // Phase 3: when backgrounded
}
```

### Session Lifecycle

```
START → [work] → CHECKPOINT (auto 15min) → [work] → PAUSE → RESUME → [work] → COMPLETE
                      ↓                         ↓
                   (crash)                  (manual)
                      ↓                         ↓
                   RESUME ←─────────────────────┘
```

**States**:
- `active`: Currently working
- `paused`: Checkpointed, can resume
- `completed`: Work finished
- `crashed`: Unclean exit (resume possible)

---

## What's Not Implemented Yet

**Phase 2** (Convoy):
- Multi-issue coordination (`orch convoy create`)
- Worker pool with Task subagents
- Per-convoy cost tracking
- Issue-to-convoy labeling (Beads)

**Phase 3** (Background):
- Background execution (`--background`)
- Worker health monitoring (witness pattern)
- Model routing at orchestrator level

**Phase 4** (Optimization):
- Performance tuning
- Migration guide from Gastown
- Deprecation of Gastown

---

## Troubleshooting

### Session won't start (baseline failed)

**Symptom**: `❌ typecheck failed` or `❌ tests failed`

**Fix**: Run baseline checks manually and fix issues:

```bash
# Check what failed
pnpm --filter=<package> exec tsc --noEmit
pnpm --filter=<package> test

# Fix issues, then start session
orch session start --epic <id> --budget <amount>
```

### Checkpoint not found when resuming

**Symptom**: `No checkpoints found for this epic`

**Diagnosis**: Epic ID mismatch or checkpoints not committed to Git.

**Fix**:

```bash
# List all checkpoints
ls -la .orchestration/checkpoints/

# Check Git status
git status .orchestration/

# If not committed, commit them
git add .orchestration/checkpoints/
git commit -m "Add orchestration checkpoints"
```

### Budget exhausted mid-work

**Symptom**: `🛑 Budget exhausted`

**Fix**: Resume with increased budget:

```bash
orch session start --epic <id> --resume --budget 15.00
```

---

## Integration with Harness and Gastown

### Orchestration vs Harness

| Feature | Harness | Orchestration |
|---------|---------|---------------|
| Session continuity | Single session | Multi-session |
| Checkpoint frequency | End of session | Every 15 minutes |
| Cost tracking | Per task | Across sessions |
| Resume | After task completion | After crash/pause |
| Baseline | At task start | At session start |

**Use harness for**: Single-session work (<2 hours)
**Use orchestration for**: Long-running, multi-session work

### Orchestration vs Gastown

| Feature | Gastown | Orchestration |
|---------|---------|---------------|
| Coordination | tmux sessions | Claude Code Task subagents |
| Persistence | Beads + Git | Checkpoints + Git |
| Cost tracking | None | Built-in |
| Quality gates | External | Integrated (harness) |
| Reliability | Can be unreliable | Designed for stability |

**Gastown replacement timeline**:
- **Now**: Both available, orchestration Phase 1 only
- **Phase 2**: Orchestration gets convoy support
- **Phase 3**: Orchestration gets background execution
- **Phase 4**: Gastown deprecated, migration guide provided

---

## Philosophy

### DRY (Implementation)
- ✓ Extends `AgentContext` from harness (not duplicated)
- ✓ Reuses harness baseline checks (wrapped)
- ✓ Follows Beads Git persistence pattern

### Rams (Artifact)
- ✓ Checkpoints earn existence: prevent data loss
- ✓ Budget tracking earns existence: prevent runaway costs
- ✓ CLI minimal: only essential commands

### Heidegger (System)
- ✓ Extends harness (serves the whole)
- ✓ When working correctly: you think about work, not sessions
- ✓ The tool recedes; only the work remains

**Zuhandenheit moment**: When a session crashes and you resume seamlessly, you don't notice the infrastructure—you continue working as if nothing happened. The checkpoint system has receded into transparent use.

---

## Related Documentation

- [Harness Patterns](./harness-patterns.md) - Single-session orchestration
- [Gastown Patterns](./gastown-patterns.md) - Multi-agent coordination (to be replaced)
- [Beads Patterns](./beads-patterns.md) - Issue tracking
- [Ralph Patterns](./ralph-patterns.md) - Iterative refinement

---

## Implementation Status

**Phase 1** (MVP): ✅ Complete
- Session lifecycle (start/pause/resume/complete)
- Checkpoint storage (Git-based, 15min intervals)
- Cost tracking (budget warnings, hard stops)
- Quality gates (baseline integration)
- CLI (`orch session` commands)
- Tests passing (4/4)

**Phase 2** (Convoy): 🚧 Not started
**Phase 3** (Background): 🚧 Not started
**Phase 4** (Optimization): 🚧 Not started

See `/Users/micahjohnson/.claude/plans/crispy-chasing-mist.md` for full implementation plan.
