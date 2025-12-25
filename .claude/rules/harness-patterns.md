# Harness Patterns

Autonomous agent orchestration with Beads-based human oversight.

## Philosophy: Zuhandenheit

**The harness must be invisible.** The harness is not a tool you invoke—it's the way all work happens. When you switch between "direct work" and "use harness," the tool becomes visible. True Zuhandenheit means one workflow for everything.

```
User: "Fix the typo in README"
         │
         ▼
    bd work cs-xyz
         │
         ▼
    Harness detects: trivial
         │
         ▼
    haiku model, 0 overhead
         │
         ▼
    Metrics collected
```

```
User: "Update all components to Canon tokens"
         │
         ▼
    bd work (creates issues first)
         │
         ▼
    Harness detects: complex
         │
         ▼
    opus model, full orchestration
         │
         ▼
    Checkpoints, reviews, metrics
```

**Same entry point. Different overhead. The tool recedes. Only the work remains.**

### Core Constraints

| Constraint | Rationale | Enforcement |
|------------|-----------|-------------|
| **All work through harness** | Consistent data, model selection | `bd work` is the only entry |
| **One feature per session** | Prevents scope creep; enables clean commits | Scope guard |
| **Beads is the only progress system** | DRY—no separate progress files | Architecture |
| **Commit before close** | Work without commits is lost work | Close reason must include commit |
| **Two-stage completion** | Prevents premature victory | `code-complete` → `verified` labels |
| **E2E before verified** | Unit tests aren't enough | Puppeteer or manual check required |
| **Metrics on everything** | Learning requires data | All sessions log metrics |

## Quick Start

**The unified entry point:**

```bash
# Work on an existing issue
bd work cs-xyz

# Create and immediately work on a task
bd work --create "Fix login button alignment"

# Let harness break down large work
bd work --spec specs/feature.md
```

**What happens:**
1. Harness detects complexity from issue description + file analysis
2. Selects optimal model (haiku/sonnet/opus)
3. Applies appropriate overhead (none/light/full)
4. Executes work with structured close
5. Collects metrics for learning

**Claude's response:**
> "Working on cs-xyz (trivial → haiku). ETA: ~2 min."

or

> "Breaking cs-xyz into 5 subtasks (complex → opus). Check progress with `bd progress`."

## Universal Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      bd work <issue-id>                          │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              COMPLEXITY DETECTION                            ││
│  │                                                              ││
│  │  Inputs:                                                     ││
│  │  • Issue description (keywords, scope indicators)            ││
│  │  • File analysis (touched files, LOC delta estimate)         ││
│  │  • Dependency count (blocked/blocking issues)                ││
│  │  • Historical data (similar issues, avg duration)            ││
│  └──────────────────────┬──────────────────────────────────────┘│
│                         │                                        │
│         ┌───────────────┼───────────────┬───────────────┐       │
│         ▼               ▼               ▼               ▼       │
│    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    │
│    │ TRIVIAL │    │ SIMPLE  │    │STANDARD │    │ COMPLEX │    │
│    │  1 file │    │ 2-5 fls │    │ 5-15 fls│    │  15+ fls│    │
│    │ ~100 LOC│    │ ~500 LOC│    │~2000 LOC│    │ ~5000+  │    │
│    └────┬────┘    └────┬────┘    └────┬────┘    └────┬────┘    │
│         │              │              │              │          │
│         ▼              ▼              ▼              ▼          │
│    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    │
│    │  haiku  │    │  haiku  │    │ sonnet  │    │  opus   │    │
│    │ 0 ovhd  │    │ micro   │    │  auto   │    │  full   │    │
│    │ no ckpt │    │ review  │    │ review  │    │ harness │    │
│    └─────────┘    └─────────┘    └─────────┘    └─────────┘    │
│                                                                  │
│  Always: structured start → structured close → metrics logged   │
└─────────────────────────────────────────────────────────────────┘
```

## Complexity Detection

The harness analyzes each issue to determine appropriate resources.

### Detection Heuristics

```typescript
interface ComplexitySignals {
  // From issue content
  descriptionLength: number;      // Longer = more complex
  scopeKeywords: string[];        // "all", "every", "migrate", "refactor"
  acceptanceCriteria: number;     // More criteria = more complex

  // From codebase analysis
  estimatedFiles: number;         // Files likely to change
  estimatedLOC: number;           // Lines of code delta
  crossPackage: boolean;          // Touches multiple packages

  // From dependency graph
  blockedBy: number;              // Prerequisites
  blocks: number;                 // Dependents waiting

  // From history
  similarIssueAvgDuration: number;
  similarIssueAvgTokens: number;
}

function detectComplexity(signals: ComplexitySignals): ComplexityLevel {
  // Scope keywords are strong signals
  if (signals.scopeKeywords.length > 0) return 'complex';

  // Cross-package work is at least standard
  if (signals.crossPackage) return 'standard';

  // File count thresholds
  if (signals.estimatedFiles > 15) return 'complex';
  if (signals.estimatedFiles > 5) return 'standard';
  if (signals.estimatedFiles > 1) return 'simple';

  return 'trivial';
}
```

### Complexity Levels

| Level | Files | LOC | Model | Overhead | Review | Checkpoint |
|-------|-------|-----|-------|----------|--------|------------|
| **trivial** | 1 | ~100 | haiku | 0 | none | no |
| **simple** | 2-5 | ~500 | haiku | micro | self | no |
| **standard** | 5-15 | ~2000 | sonnet | auto | automated | optional |
| **complex** | 15+ | 5000+ | opus | full | human gate | yes |

### Override Flags

```bash
# Force complexity level
bd work cs-xyz --complexity=complex

# Force model
bd work cs-xyz --model=opus

# Disable overhead for quick iteration
bd work cs-xyz --minimal
```

## Model Routing

The harness selects the optimal model based on complexity and cost.

### Model Characteristics

| Model | Input Cost | Output Cost | Context | Best For |
|-------|------------|-------------|---------|----------|
| **haiku** | $0.25/M | $1.25/M | 200k | Trivial, simple tasks |
| **sonnet** | $3/M | $15/M | 200k | Standard tasks, balanced |
| **opus** | $15/M | $75/M | 200k | Complex, multi-file, architectural |

### Routing Rules

```typescript
function selectModel(complexity: ComplexityLevel, signals: ComplexitySignals): Model {
  // Complex always gets opus
  if (complexity === 'complex') return 'opus';

  // Standard gets sonnet (good balance)
  if (complexity === 'standard') return 'sonnet';

  // Simple/trivial get haiku (cost efficient)
  // Exception: if issue has many dependencies, upgrade
  if (signals.blockedBy > 3 || signals.blocks > 3) {
    return 'sonnet';
  }

  return 'haiku';
}
```

### Cost Optimization

Running all work through the harness with model selection **reduces cost**:

| Before (all opus) | After (routed) | Savings |
|-------------------|----------------|---------|
| 100 tasks × opus | 60 haiku + 30 sonnet + 10 opus | ~70% |

Most tasks are trivial or simple. Using haiku for these provides massive cost reduction while maintaining quality for complex work.

## The `bd work` Command

Unified entry point for all work.

### Synopsis

```bash
bd work [issue-id] [options]

Options:
  --create <title>      Create issue and immediately work on it
  --spec <path>         Parse spec file, create issues, work through them
  --complexity <level>  Override complexity detection (trivial|simple|standard|complex)
  --model <model>       Override model selection (haiku|sonnet|opus)
  --minimal             Skip overhead (no checkpoints, no review)
  --dry-run             Show what would happen without executing
```

### Examples

```bash
# Work on existing issue
bd work cs-xyz

# Quick fix (create + work)
bd work --create "Fix typo in footer"

# Large feature from spec
bd work --spec specs/user-auth.md

# Force complex handling for tricky bug
bd work cs-abc --complexity=complex

# Iterate quickly during development
bd work cs-xyz --minimal
```

### Workflow

```
bd work cs-xyz
     │
     ├──► Complexity detection
     │         │
     │         ▼
     ├──► Model selection
     │         │
     │         ▼
     ├──► bd update cs-xyz --status in_progress
     │         │
     │         ▼
     ├──► Execute work (with appropriate overhead)
     │         │
     │         ▼
     ├──► Structured close (commit + close with reason)
     │         │
     │         ▼
     └──► Log metrics
```

## Overhead Levels

Each complexity level has appropriate overhead.

### Zero Overhead (trivial)

```
Start → Work → Commit → Close → Metrics
```

No checkpoints, no review, no scope guards. Just structured start/close.

### Micro Overhead (simple)

```
Start → Work → Self-Review → Commit → Close → Metrics
```

Quick self-review before commit:
- Did I actually fix the issue?
- Any obvious regressions?

### Auto Overhead (standard)

```
Start → Work → Tests → Auto-Review → Commit → Close → Metrics
```

Automated review layer:
- Run relevant tests
- Check for common issues (type errors, lint)
- Verify issue acceptance criteria

### Full Overhead (complex)

```
Start → [Sessions with checkpoints] → Tests → E2E → Human Review → Commit → Close → Metrics
```

Full harness orchestration as documented in later sections.

## Metrics Collection

Every task generates metrics for learning.

### Metrics Schema

```typescript
interface TaskMetrics {
  // Identity
  issueId: string;
  timestamp: string;

  // Classification
  detectedComplexity: ComplexityLevel;
  overrideComplexity?: ComplexityLevel;
  model: Model;

  // Execution
  durationMs: number;
  tokensInput: number;
  tokensOutput: number;

  // Outcome
  success: boolean;
  failureReason?: string;
  commitHash?: string;

  // Quality signals
  testsRun: number;
  testsPassed: number;
  lintErrors: number;
  typeErrors: number;

  // Learning
  actualFiles: number;          // Compare to estimate
  actualLOC: number;            // Compare to estimate
  complexityAccuracy: boolean;  // Was detection correct?
}
```

### Storage

Metrics are stored in Beads as issue metadata:

```bash
# View metrics for an issue
bd show cs-xyz --metrics

# Aggregate metrics
bd metrics --since=7d
```

### Learning Loop

```
┌─────────────────────────────────────────────────────────────┐
│                    LEARNING LOOP                             │
│                                                              │
│  Metrics ──► Analysis ──► Heuristic Updates ──► Better      │
│     │                                           Detection    │
│     │                                              │         │
│     └──────────────────────────────────────────────┘         │
│                                                              │
│  Questions we can answer:                                    │
│  • Which complexity signals are most predictive?             │
│  • What's the optimal model for each complexity?             │
│  • Where does detection fail? (over/under-estimate)          │
│  • What patterns lead to failure?                            │
└─────────────────────────────────────────────────────────────┘
```

## Backward Compatibility

The old `harness start` command still works:

```bash
# Old way (still works)
harness start specs/feature.md

# New way (preferred)
bd work --spec specs/feature.md
```

Direct work without harness is **deprecated**:

```bash
# Deprecated (no metrics, no model selection)
bd update cs-xyz --status in_progress
# ... manual work ...
bd close cs-xyz

# Preferred
bd work cs-xyz
```

## Progress & Redirection (via Beads)

```bash
bd progress                       # View checkpoints
bd list --status=open             # Remaining work
bd blocked                        # What's stuck
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
│  Daemon Stop ──► Init ──► Sessions ──► Daemon Start │
│       │           │           │              │      │
│       ▼           ▼           ▼              ▼      │
│   Safety     Setup      Checkpoints     Restore     │
└───────┬───────────┬───────────┬──────────────┬─────┘
        │           │           │              │
        ▼           ▼           ▼              ▼
┌─────────────────────────────────────────────────────┐
│              BEADS (Human Interface)                │
│                                                     │
│  `bd progress` - Review checkpoints                 │
│  `bd update`   - Redirect priorities                │
│  `bd create`   - Inject work                        │
└─────────────────────────────────────────────────────┘
```

## Daemon Coordination

**Critical**: The Beads daemon's git sync can overwrite SQLite data, causing harness-created issues to vanish. The harness MUST coordinate with the daemon.

### Why This Matters

The bd daemon runs `bd sync` periodically, which:
1. Reads `issues.jsonl` from disk
2. Overwrites SQLite cache
3. Can destroy issues created since last sync

During harness operation, issues are created in SQLite. If the daemon syncs before harness commits, those issues vanish.

### Daemon Lifecycle

```
┌─────────────────────────────────────────────────────┐
│              HARNESS START                          │
├─────────────────────────────────────────────────────┤
│  1. Stop bd daemon (bd daemon --stop)               │
│  2. Kill orphan processes (pgrep -f "bd daemon")    │
│  3. Verify daemon stopped                           │
│  4. Begin harness sessions                          │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│              HARNESS RUNNING                        │
├─────────────────────────────────────────────────────┤
│  • Daemon is OFF                                    │
│  • bd commands work (direct SQLite + jsonl)         │
│  • Harness creates/updates issues safely            │
│  • No background sync interference                  │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│              HARNESS END                            │
├─────────────────────────────────────────────────────┤
│  1. Run bd sync (commit all changes)                │
│  2. Restart bd daemon (bd daemon --start)           │
│  3. Verify daemon running                           │
└─────────────────────────────────────────────────────┘
```

### Implementation

```typescript
// daemon.ts - Daemon coordination

import { execSync, exec } from 'child_process';

/**
 * Stop the bd daemon before harness operations
 * CRITICAL: Must be called before any harness session starts
 */
export async function stopBdDaemon(): Promise<void> {
  console.log('→ Stopping bd daemon...');

  try {
    // Try graceful stop first
    execSync('bd daemon --stop', { stdio: 'pipe' });
  } catch {
    // Daemon might not be running, that's OK
  }

  // Kill any orphan daemon processes
  try {
    const { stdout } = await execAsync('pgrep -f "bd daemon"');
    const pids = stdout.trim().split('\n').filter(Boolean);
    for (const pid of pids) {
      try {
        execSync(`kill ${pid}`, { stdio: 'pipe' });
        console.log(`  Killed orphan daemon process: ${pid}`);
      } catch {
        // Process might have already exited
      }
    }
  } catch {
    // No daemon processes found, good
  }

  // Verify daemon is stopped
  await sleep(500);
  const stillRunning = await isDaemonRunning();
  if (stillRunning) {
    throw new Error('Failed to stop bd daemon - harness cannot proceed safely');
  }

  console.log('✓ Daemon stopped');
}

/**
 * Restart the bd daemon after harness completes
 * Should be called in finally block or crash handler
 */
export async function startBdDaemon(): Promise<void> {
  console.log('→ Restarting bd daemon...');

  // Sync first to commit all harness changes
  try {
    execSync('bd sync', { stdio: 'pipe' });
    console.log('  Synced harness changes');
  } catch (err) {
    console.error('  Warning: bd sync failed:', err);
  }

  // Start daemon
  exec('bd daemon --start', (err) => {
    if (err) {
      console.error('  Warning: Failed to restart daemon:', err);
    }
  });

  // Verify daemon started
  await sleep(1000);
  const running = await isDaemonRunning();
  if (running) {
    console.log('✓ Daemon restarted');
  } else {
    console.error('⚠ Daemon may not have started - run "bd daemon --start" manually');
  }
}

async function isDaemonRunning(): Promise<boolean> {
  try {
    await execAsync('pgrep -f "bd daemon"');
    return true;
  } catch {
    return false;
  }
}

function execAsync(cmd: string): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) reject(err);
      else resolve({ stdout, stderr });
    });
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

### Shell Script Version

For use in init.sh:

```bash
#!/bin/bash
# daemon-control.sh - Daemon coordination utilities

stop_daemon() {
  echo "→ Stopping bd daemon..."

  # Graceful stop
  bd daemon --stop 2>/dev/null || true

  # Kill orphans
  for pid in $(pgrep -f "bd daemon" 2>/dev/null); do
    kill "$pid" 2>/dev/null && echo "  Killed orphan: $pid"
  done

  # Verify
  sleep 0.5
  if pgrep -f "bd daemon" > /dev/null 2>&1; then
    echo "✗ Failed to stop daemon"
    exit 1
  fi

  echo "✓ Daemon stopped"
}

start_daemon() {
  echo "→ Restarting bd daemon..."

  # Sync first
  bd sync 2>/dev/null && echo "  Synced changes"

  # Start
  bd daemon --start &

  # Verify
  sleep 1
  if pgrep -f "bd daemon" > /dev/null 2>&1; then
    echo "✓ Daemon restarted"
  else
    echo "⚠ Daemon may not have started"
  fi
}
```

### Harness Runner Integration

```typescript
// runner.ts - Main harness loop with daemon coordination

import { stopBdDaemon, startBdDaemon } from './daemon';

export async function runHarness(spec: string): Promise<void> {
  // CRITICAL: Stop daemon before any operations
  await stopBdDaemon();

  try {
    // ... harness sessions ...
    await runSessions(spec);
  } finally {
    // ALWAYS restart daemon, even on crash
    await startBdDaemon();
  }
}
```

### Crash Recovery

If harness crashes without restarting daemon:

```bash
# Manual recovery
bd daemon --start

# Or use recovery script
./scripts/harness-recover.sh
```

Recovery script:

```bash
#!/bin/bash
# harness-recover.sh - Recover from harness crash

echo "→ Harness crash recovery..."

# 1. Sync any uncommitted changes
bd sync 2>/dev/null && echo "✓ Synced uncommitted changes"

# 2. Restart daemon
bd daemon --start &
sleep 1

# 3. Verify
if pgrep -f "bd daemon" > /dev/null 2>&1; then
  echo "✓ Daemon restored"
else
  echo "✗ Failed to restore daemon - check bd installation"
  exit 1
fi

# 4. Show status
echo ""
echo "Current state:"
bd list --status=in_progress
```

## Property Modes

Each CREATE SOMETHING property has distinct character. The harness adapts priming and constraints to match.

### Mode Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    PROPERTY MODES                                │
├──────────┬──────────┬──────────┬──────────┬─────────────────────┤
│  .space  │   .io    │ .agency  │   .ltd   │       .lms          │
│ Practice │ Research │ Services │Philosophy│      Learning       │
├──────────┼──────────┼──────────┼──────────┼─────────────────────┤
│ Explore  │ Document │ Deliver  │  Canon   │      Educate        │
│ Iterate  │ Validate │ Serve    │  Guide   │      Scaffold       │
└──────────┴──────────┴──────────┴──────────┴─────────────────────┘
```

### Mode Definitions

| Property | Mode | Character | Session Constraints |
|----------|------|-----------|---------------------|
| `.space` | `practice` | Experimental, iterative | Allow exploration, looser scope |
| `.io` | `research` | Documented, validated | Require citations, test coverage |
| `.agency` | `services` | Client-focused, deliverable | Strict scope, client approval gates |
| `.ltd` | `philosophy` | Canonical, deliberate | Canon compliance required, slow is correct |
| `.lms` | `education` | Scaffolded, progressive | Learning path coherence, accessibility |

### Mode-Specific Priming

Each mode receives tailored context in session priming:

#### .space (Practice Mode)

```markdown
## Mode: PRACTICE (.space)

### Character
Experimental. This is where we explore ideas before they're proven.

### Constraints Relaxed
- Canon compliance encouraged but not enforced
- Multiple experimental approaches per session allowed
- Failure is learning—document what didn't work

### Session Directive
Explore the implementation. Try multiple approaches if needed.
Document what works and what doesn't in issue comments.
```

#### .io (Research Mode)

```markdown
## Mode: RESEARCH (.io)

### Character
Rigorous documentation. Every claim must be validated.

### Additional Constraints
- All new features require test coverage
- Public-facing content requires citations
- Papers must include methodology section

### Session Directive
Validate before documenting. Test coverage is mandatory.
Include references for technical claims.
```

#### .agency (Services Mode)

```markdown
## Mode: SERVICES (.agency)

### Character
Client deliverables. The work must serve external stakeholders.

### Additional Constraints
- Strict scope adherence—client approved this scope
- All changes require deployment verification
- Time-sensitive: check priority labels for deadlines

### Session Directive
Deliver what was scoped. No scope creep.
Verify deployment works before marking complete.
```

#### .ltd (Philosophy Mode)

```markdown
## Mode: PHILOSOPHY (.ltd)

### Character
Canonical truth. This defines what CREATE SOMETHING believes.

### Additional Constraints
- Canon compliance REQUIRED (run audit-canon)
- Changes must align with Subtractive Triad
- Deliberate pace—correctness over speed

### Session Directive
Ensure philosophical coherence. Run canon audit before completion.
Less is more. Remove what doesn't serve the whole.
```

#### .lms (Education Mode)

```markdown
## Mode: EDUCATION (.lms)

### Character
Scaffolded learning. Content must build understanding progressively.

### Additional Constraints
- Accessibility compliance (WCAG 2.1 AA)
- Learning path coherence—check prerequisites
- Progressive disclosure—simple before complex

### Session Directive
Build understanding progressively. Ensure accessibility.
Link to prerequisites and follow-up content.
```

### Mode Detection

The harness detects mode from the spec or issue labels:

```typescript
type PropertyMode = 'practice' | 'research' | 'services' | 'philosophy' | 'education';

function detectMode(issue: BeadsIssue): PropertyMode {
  const labels = issue.labels || [];

  // Explicit mode label
  if (labels.includes('mode:practice')) return 'practice';
  if (labels.includes('mode:research')) return 'research';
  if (labels.includes('mode:services')) return 'services';
  if (labels.includes('mode:philosophy')) return 'philosophy';
  if (labels.includes('mode:education')) return 'education';

  // Infer from property label
  if (labels.includes('space')) return 'practice';
  if (labels.includes('io')) return 'research';
  if (labels.includes('agency')) return 'services';
  if (labels.includes('ltd')) return 'philosophy';
  if (labels.includes('lms')) return 'education';

  // Default to research (most constrained)
  return 'research';
}
```

### Mode Constraints Matrix

| Constraint | practice | research | services | philosophy | education |
|------------|----------|----------|----------|------------|-----------|
| Canon audit | optional | required | required | **mandatory** | required |
| Test coverage | optional | **mandatory** | required | required | required |
| Scope guard | relaxed | standard | **strict** | standard | standard |
| E2E verification | optional | required | **mandatory** | required | required |
| Citations | optional | **mandatory** | optional | required | required |
| Accessibility | optional | required | required | required | **mandatory** |

### CLI Usage

```bash
# Explicit mode override
harness start specs/feature.md --mode=services

# Auto-detect from property label
harness start specs/feature.md  # Reads labels from spec

# Mode-specific commands
harness audit --mode=philosophy  # Run canon audit
harness verify --mode=services   # Run E2E verification
```

## Session Types

The harness distinguishes between **initializer** and **coding** sessions. Same tools, different responsibilities.

### Initializer Session (First Run)

The first session after `harness start` has setup responsibilities:

```bash
# Harness creates a setup issue that blocks all feature work
bd create "Setup: Initialize harness environment" \
  --type task \
  --priority P0 \
  --label harness:setup

# All feature issues get dependency on setup
bd dep add <feature-id> <setup-id>  # Feature blocked by setup
```

**Initializer Responsibilities**:

| Task | Beads Tracking |
|------|----------------|
| Parse spec → create issues | Issues created with `harness:<run-id>` label |
| Create `init.sh` script | Noted in setup issue description |
| Establish dependency graph | `bd dep add` for all blockers |
| First commit (baseline) | Close setup issue with commit ref |
| Verify environment runs | Test `./init.sh` before closing |

**Initializer Priming** (different from coding sessions):

```markdown
# Harness Initializer Session

## Mode: INITIALIZER (first session)

## Spec Location
/specs/my-project.md

## Responsibilities
1. Parse spec and create Beads issues for each feature
2. Create init.sh for environment setup
3. Establish dependency graph between features
4. Make initial commit with baseline
5. Close setup issue when environment verified

## Constraints
- Do NOT implement features—only setup
- Every feature issue MUST have clear acceptance criteria
- init.sh MUST be tested before closing setup issue
```

### Coding Sessions (Subsequent)

All sessions after initializer follow the standard Session Startup Protocol.

**Detection**: If `bd list --label harness:setup --status=open` returns results, this is still initializer phase.

```bash
# Check if still in setup phase
SETUP_OPEN=$(bd list --label harness:setup --status=open -q)
if [ -n "$SETUP_OPEN" ]; then
  echo "Initializer session: complete setup first"
else
  echo "Coding session: proceed with features"
fi
```

## Environment Initialization

The `init.sh` pattern ensures consistent environment setup across sessions.

### init.sh Template

Created by the initializer session, tracked in the setup issue:

```bash
#!/bin/bash
# init.sh - Harness environment initialization
# Created by: harness init session
# Tracked in: Beads setup issue

set -e  # Exit on error

# Configuration
PACKAGE="${1:-space}"           # Default package
PORT="${2:-5173}"               # Default port
TIMEOUT="${3:-30}"              # Startup timeout

echo "→ Initializing harness environment..."

# 1. Check dependencies
if ! command -v pnpm &> /dev/null; then
  echo "✗ pnpm not found"
  exit 1
fi

# 2. Install if needed
if [ ! -d "node_modules" ]; then
  echo "→ Installing dependencies..."
  pnpm install
fi

# 3. Generate types (if applicable)
if [ -f "packages/$PACKAGE/wrangler.jsonc" ]; then
  echo "→ Generating Cloudflare types..."
  pnpm --filter="$PACKAGE" exec wrangler types 2>/dev/null || true
fi

# 4. Start dev server in background
echo "→ Starting dev server for $PACKAGE..."
pnpm dev --filter="$PACKAGE" &
DEV_PID=$!

# 5. Wait for server
echo "→ Waiting for server (max ${TIMEOUT}s)..."
for i in $(seq 1 $TIMEOUT); do
  if curl -s "http://localhost:$PORT" > /dev/null 2>&1; then
    echo "✓ Server ready on port $PORT (PID: $DEV_PID)"
    echo "$DEV_PID" > .harness-dev-pid
    exit 0
  fi
  sleep 1
done

echo "✗ Server failed to start within ${TIMEOUT}s"
kill $DEV_PID 2>/dev/null || true
exit 1
```

### init.sh in Beads Workflow

```bash
# Initializer session creates init.sh and tracks it
bd update <setup-id> --description "$(cat <<EOF
Setup issue for harness run.

## Environment Script
Created: init.sh
- Installs dependencies
- Generates types
- Starts dev server
- Verifies startup

## Verification
Run \`./init.sh\` and confirm server starts.
EOF
)"

# Close setup when verified
./init.sh && bd close <setup-id> --reason "Environment verified, init.sh working"
```

### Cleanup Script

Companion to init.sh:

```bash
#!/bin/bash
# cleanup.sh - Stop harness environment

if [ -f ".harness-dev-pid" ]; then
  PID=$(cat .harness-dev-pid)
  if kill -0 "$PID" 2>/dev/null; then
    echo "→ Stopping dev server (PID: $PID)..."
    kill "$PID"
    rm .harness-dev-pid
    echo "✓ Server stopped"
  else
    echo "→ Server already stopped"
    rm .harness-dev-pid
  fi
else
  echo "→ No active harness server"
fi
```

### Session Startup with init.sh

The Session Startup Protocol uses init.sh when available:

```bash
# 4. Verify environment runs (updated)
if [ -f "init.sh" ]; then
  ./init.sh                      # Use harness init script
else
  pnpm dev --filter=<package> &  # Fallback
fi
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
| Code complete | `bd label add <id> code-complete` |
| E2E verified | `bd label add <id> verified && bd close <id>` |
| Session end | Checkpoint issue created automatically |

### Verification Status

**Problem**: Agents declare "done" when code compiles, but feature may be broken.

**Solution**: Two-stage completion using Beads labels.

```
┌─────────────┐     ┌──────────────┐     ┌────────────┐
│ in_progress │ ──► │ code-complete│ ──► │  verified  │
│             │     │ (tests pass) │     │ (E2E pass) │
└─────────────┘     └──────────────┘     └────────────┘
                           │                    │
                           │                    ▼
                           │              ┌──────────┐
                           └─────────────►│  closed  │
                                          └──────────┘
```

**Labels**:

| Label | Meaning | Gate |
|-------|---------|------|
| `code-complete` | Implementation done, unit tests pass | `pnpm test` passes |
| `verified` | E2E tested, feature works in browser | Manual or Puppeteer verification |

**Workflow**:

```bash
# After implementation + unit tests
pnpm test --filter=<package>
bd label add <id> code-complete
git commit -m "feat: <desc> [<id>]"

# After E2E verification
# (manual check or Puppeteer test)
bd label add <id> verified
bd close <id> --reason "Verified: commit $(git rev-parse --short HEAD)"
```

**Harness Enforcement**:

```bash
# Harness only counts issues with BOTH labels as truly complete
TRULY_DONE=$(bd list --status=closed --label verified --since=24h -q | wc -l)
CODE_ONLY=$(bd list --label code-complete --status=open -q | wc -l)

echo "Verified complete: $TRULY_DONE"
echo "Awaiting verification: $CODE_ONLY"
```

**Checkpoint Reporting**:

```
Overall progress: 35/42 features.

✓ Verified: cs-a1b2, cs-c3d4, cs-e5f6 (3)
◑ Code-complete: cs-g7h8, cs-i9j0 (2) ← awaiting E2E
◐ In Progress: cs-m3n4 (1)
✗ Failed: cs-k1l2 (1)
```

### One-Feature Enforcement

**Problem**: Agents touch multiple features, completing none properly.

**Solution**: Explicit scope guard in session priming + detection.

**Pre-Session Check**:

```bash
#!/bin/bash
# one-feature-guard.sh - Enforce single-feature sessions

# Check for multiple in-progress issues
IN_PROGRESS=$(bd list --status=in_progress -q)
COUNT=$(echo "$IN_PROGRESS" | grep -c . || echo 0)

if [ "$COUNT" -gt 1 ]; then
  echo "⚠ SCOPE VIOLATION: $COUNT issues in progress"
  echo "Issues: $IN_PROGRESS"
  echo ""
  echo "Resolution options:"
  echo "1. Close completed issues: bd close <id>"
  echo "2. Pause others: bd update <id> --status open"
  echo ""
  echo "Session blocked until exactly 1 issue in_progress."
  exit 1
fi

if [ "$COUNT" -eq 0 ]; then
  echo "→ No issue in progress. Select from bd ready:"
  bd ready | head -5
  echo ""
  echo "Start with: bd update <id> --status in_progress"
  exit 0
fi

echo "✓ Single issue in progress: $IN_PROGRESS"
bd show "$IN_PROGRESS"
```

**Session Priming Addition**:

```markdown
## Scope Guard
**Active Issue**: cs-xyz (user dashboard)
**Status**: ✓ Single issue in progress

⚠ CONSTRAINT: Do NOT run `bd update --status in_progress` on any other issue.
If you discover work, create it as a new issue but do NOT start it:
  bd create "Discovered: <task>" --priority P2
```

**Mid-Session Detection**:

```bash
# Run periodically during long sessions
check_scope() {
  COUNT=$(bd list --status=in_progress -q | wc -l)
  if [ "$COUNT" -gt 1 ]; then
    echo "⚠ SCOPE CREEP DETECTED"
    echo "Multiple issues now in_progress. Harness will pause."
    return 1
  fi
  return 0
}
```

**Violation Recovery**:

```bash
# If scope violation detected, agent must:
# 1. Identify the original issue
ORIGINAL=$(bd list --status=in_progress --label harness:active -q)

# 2. Reset others to open
bd list --status=in_progress -q | grep -v "$ORIGINAL" | \
  xargs -I{} bd update {} --status open

# 3. Continue with original
echo "Scope restored. Continuing with: $ORIGINAL"
```

**Configuration**:

```typescript
const scopeConfig = {
  maxConcurrentIssues: 1,          // Strict: exactly one
  allowDiscovery: true,            // Can create new issues
  discoveryStatus: 'open',         // New issues start as open, not in_progress
  violationAction: 'pause',        // Pause harness on violation
  graceTokens: 10000,              // Allow 10k tokens before checking
};
```

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

### Enabling Swarm Mode

Swarm mode is disabled by default for backward compatibility. Enable it with CLI flags:

```bash
# Enable swarm with default settings (max 5 agents, min 3 tasks)
harness start specs/project.md --swarm

# Customize swarm configuration
harness start specs/project.md --swarm --max-agents 10 --min-tasks 5
```

**Configuration**:
- `--swarm`: Enable parallel swarm orchestration
- `--max-agents N`: Maximum number of parallel agents (default: 5)
- `--min-tasks N`: Minimum independent tasks to trigger swarm (default: 3)

**How it works**:
1. At each iteration, the harness detects independent tasks (no blocking dependencies)
2. If count ≥ `minTasksForSwarm` and swarm is enabled, spawn parallel agents
3. Each agent runs a full Claude Code session for its assigned task
4. Results are aggregated and failures are handled per the failure config
5. A swarm checkpoint is created showing parallel execution metrics

**Independence Detection**:
Tasks are considered independent if they have no `blocks` dependencies on other pending tasks. The harness automatically analyzes the dependency graph from Beads to identify parallel-safe work.

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
│   ├── types.ts           # Type definitions (ComplexityLevel, TaskMetrics, etc.)
│   ├── complexity.ts      # Complexity detection heuristics
│   ├── model-router.ts    # Model selection (haiku/sonnet/opus)
│   ├── overhead.ts        # Overhead level application
│   ├── metrics.ts         # Metrics collection and storage
│   ├── spec-parser.ts     # Markdown PRD parsing
│   ├── beads.ts           # Beads integration
│   ├── session.ts         # Claude Code spawning
│   ├── checkpoint.ts      # Progress reports
│   ├── redirect.ts        # Change detection
│   ├── failure-handler.ts # Graceful failure handling
│   ├── runner.ts          # Main loop (universal entry point)
│   ├── cli.ts             # CLI entry point (bd work integration)
│   └── index.ts           # Exports
├── package.json
└── tsconfig.json
```

## Why This Works

### Subtractive Triad
- **DRY**: One workflow (`bd work`) for all tasks—no mode switching
- **Rams**: Overhead scales with complexity—trivial tasks get trivial overhead
- **Heidegger**: The harness recedes completely—you never think "should I use the harness?"

### Universal Entry Point
- **No bifurcation**: Same command for typo fixes and multi-week features
- **Automatic optimization**: Model and overhead selected for you
- **Data everywhere**: Every task contributes to learning
- **Cost reduction**: Haiku for trivial work saves ~70% vs always-opus

### Session Architecture
- **Initializer/Coding split**: Setup happens once, properly
- **One feature per session**: Enforced by scope guard script
- **Prescriptive startup**: Reduces context waste
- **Two-stage verification**: `code-complete` → `verified` labels
- **Scope detection**: Mid-session checks prevent creep

### Human Agency Preserved
You can always:
- Check progress (`bd progress`)
- Redirect priorities (`bd update`)
- Pause for review (`harness pause`)
- Resume when ready (`harness resume`)
- Override complexity (`bd work --complexity=complex`)
- Override model (`bd work --model=opus`)

The harness runs autonomously, but you remain in control.

### Metrics-Driven Evolution
Every task generates data:
- Complexity detection accuracy
- Model performance per task type
- Token usage patterns
- Failure modes and recovery

This data feeds back into better heuristics. The system learns.

### Anthropic Patterns Integrated
Based on [Effective Harnesses for Long-Running Agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents):

| Anthropic Pattern | Our Implementation |
|-------------------|-------------------|
| `claude-progress.txt` | Beads closed issues + `bd list --since` |
| `feature_list.json` with `passes: false` | Beads labels: `code-complete` → `verified` |
| Initializer agent | Initializer session with setup issue |
| `init.sh` script | Created by initializer, tracked in Beads |
| One-feature-per-session | `one-feature-guard.sh` + scope detection |
| E2E verification mandate | `verified` label requires Puppeteer/manual check |
| Failure mode docs | Failure Mode Reference table |
| Model selection | Complexity → haiku/sonnet/opus routing |
