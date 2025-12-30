# Harness Patterns

**Use the `harness` subagent** for autonomous work orchestration.

```bash
bd work cs-xyz                   # Work on issue
bd work --create "Fix button"    # Create and work
bd work --spec specs/feature.md  # Parse spec (Markdown or YAML)
```

The harness subagent handles: complexity detection, model routing, session protocols, two-stage completion (`code-complete` → `verified`), and Beads integration.

Invoke explicitly or let Claude delegate when `bd work` or harness operations are needed.

## Invocation Patterns

### Background Execution

For long-running work, run the harness in background mode:

```
run harness in the background: ultrathink
```

This:
1. Frees the main conversation for other work
2. Enables extended thinking for complex reasoning
3. Allows parallel workstreams

**When to use background**:
- Multi-file refactors
- Feature implementation from specs
- Work expected to exceed 10+ minutes

### Thinking Modes

| Mode | Use Case | Invocation |
|------|----------|------------|
| Default | Quick fixes, simple tasks | `run harness` |
| Ultrathink | Complex planning, architecture | `run harness in the background: ultrathink` |

**Ultrathink** enables extended reasoning—more thorough analysis, better decomposition, deeper consideration of edge cases. Use for non-trivial work.

> **Warning: Ultrathink bypasses model routing**
>
> When you specify `ultrathink`, the harness uses Opus for ALL tasks regardless of complexity.
> This is ideal for truly complex architectural work but wastes resources on simple tasks.
>
> **Prefer default mode** when:
> - Spec has mixed complexity (trivial, simple, standard, complex tasks)
> - You want cost-efficient model selection
> - Tasks are independent and don't require deep reasoning chains
>
> **Use ultrathink** when:
> - All tasks are genuinely complex (architecture, multi-file refactors)
> - Extended thinking chains add clear value
> - You're debugging a specific issue that needs thorough analysis

### Model Routing (Default Mode)

When invoked without `ultrathink`, the harness routes to models based on complexity:

| Complexity | Model | Cost/Session | Use Case |
|------------|-------|--------------|----------|
| `trivial` | Haiku | ~$0.001 | Typo fixes, single-line changes |
| `simple` | Sonnet | ~$0.01 | Small features, bug fixes |
| `standard` | Sonnet | ~$0.01 | Normal development work |
| `complex` | Opus | ~$0.10 | Architecture, multi-file refactors |

To test model routing, create specs with mixed complexity features (see `specs/harness-optimizations.yaml`).

### Example Invocations

```
# Simple: Work on a specific issue
run harness on cs-abc123

# Background with thinking: Complex feature work
run harness in the background: ultrathink

# With spec file
run harness on specs/auth-feature.yaml

# Create and work in one command
run harness: create and work on "Add user settings page"
```

## Spec Formats

The harness supports two spec formats (auto-detected):

### YAML (Recommended)

Machine-validatable with JSON Schema. Schema: https://createsomething.ltd/schemas/harness-spec.json

```yaml
title: User Authentication
property: agency
complexity: standard

features:
  - title: Login endpoint
    priority: 1
    files:
      - src/routes/api/auth/login/+server.ts
    acceptance:
      - test: Returns JWT on valid credentials
        verify: pnpm test --filter=agency
      - User session created in KV

  - title: Session middleware
    depends_on:
      - Login endpoint
    acceptance:
      - Validates JWT on protected routes

requirements:
  - All endpoints use HTTPS
  - Passwords hashed with bcrypt

success:
  - All auth tests pass
  - No security vulnerabilities
```

**YAML Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Project title (required) |
| `property` | enum | Target property: `space`, `io`, `agency`, `ltd` |
| `complexity` | enum | Override: `trivial`, `simple`, `standard`, `complex` |
| `overview` | string | Brief description |
| `features` | array | List of features (required) |
| `requirements` | array | Technical requirements for all features |
| `success` | array | Project-level success criteria |

**Feature Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Feature title (required) |
| `description` | string | Detailed description |
| `priority` | int | P0-P4 (0=critical, default: 2) |
| `files` | array | Expected files to modify |
| `depends_on` | array | Feature titles this depends on |
| `acceptance` | array | Acceptance criteria (string or `{test, verify}`) |
| `labels` | array | Additional Beads labels |

### Markdown (Legacy)

Still supported but less structured:

```markdown
# Project Title

## Overview
Description...

## Features

### Feature Name
Description of feature.
- Acceptance criterion 1
- Acceptance criterion 2
```

### Migrating Markdown → YAML

Use the `generateYamlFromMarkdown` helper:

```typescript
import { parseSpec, generateYamlFromMarkdown } from '@create-something/harness';

const markdown = fs.readFileSync('spec.md', 'utf-8');
const parsed = parseSpec(markdown);
const yaml = generateYamlFromMarkdown(parsed);
fs.writeFileSync('spec.yaml', yaml);
```

Or manually convert using the field mapping above. YAML provides:
- Schema validation (clear error messages)
- Explicit dependencies (`depends_on`)
- Verify commands (`acceptance: [{test, verify}]`)
- File tracking (`files`)
- Model routing hints (`complexity`)

## Quality Gates (Upstream from VC)

The harness implements three quality gate phases aligned with Steve Yegge's VC patterns. VC achieves 90.9% pass rate through automated verification gates.

### Gate 1: Session Completion

Each session must pass before marking work complete:

| Requirement | Label | Notes |
|-------------|-------|-------|
| Tests pass | `code-complete` | Unit/integration tests |
| E2E passes | `verified` | End-to-end validation |
| Commit exists | `close` | Commit hash required |

```bash
# Session completes with passing tests
bd update cs-xyz --status code-complete

# E2E verified (manual or automated)
bd update cs-xyz --status verified

# Close with commit reference
bd close cs-xyz
```

### Gate 2: Checkpoint Review

Triggered: every 3 sessions, every 4 hours, on failure, on redirect.

| Reviewer | Focus | Blocking |
|----------|-------|----------|
| Security | Auth, injection, secrets | Critical findings |
| Architecture | DRY violations (3+ files) | Critical findings |
| Quality | Testing, conventions | Non-blocking |

Checkpoint pauses work if confidence drops below threshold or critical findings exist.

### Gate 3: Work Extraction

After checkpoint review, actionable findings become issues. This closes the hermeneutic loop: work creates findings → findings create work.

```bash
# Architecture finding → discovered issue with appropriate label
bd create "Extract shared validation logic" \
  --priority P2 \
  --label harness:supervisor \
  --label refactor

# Link to originating checkpoint
bd dep add <new-id> discovered-from <checkpoint-id>
```

## Discovered Work Taxonomy (Upstream from VC)

The discovery source taxonomy categorizes *how* work was found. This informs priority and resolution strategy:

| Label | Discovery Source | Priority Impact | Use Case |
|-------|------------------|-----------------|----------|
| `harness:blocker` | `blocker` | +1 boost | Blocks current work, must address immediately |
| `harness:related` | `related` | None | Related work discovered, can be scheduled separately |
| `harness:supervisor` | `supervisor` | None | AI supervisor (checkpoint review) identified concern |
| `harness:self-heal` | `self-heal` | None | Self-healing baseline discovered issue |
| `harness:discovered` | `manual` | None | Manually created during session (fallback) |

### Automatic Classification

`extractWorkFromFindings()` automatically classifies findings:

- **Critical findings** → `harness:blocker` (blocks advancement)
- **High/medium findings** → `harness:supervisor` (standard review finding)
- **Low/info findings** → `harness:related` (can defer)

### Convenience Functions

```typescript
import {
  createBlockerIssue,
  createSelfHealIssue,
  createIssueFromFinding,
} from '@create-something/harness';

// Create a blocker that must be resolved before continuing
await createBlockerIssue(
  'Fix broken import in AuthService',
  'Import path changed in upstream dependency',
  { severity: 'high', checkpointId: 'chk-123' }
);

// Create a self-heal issue for baseline fix
await createSelfHealIssue(
  'Self-heal: Fix failing test in user.test.ts',
  'Test started failing after dependency update',
  { checkpointId: 'chk-123' }
);

// Create with explicit discovery source
await createIssueFromFinding(
  finding,
  checkpointId,
  { discoverySource: 'related' }
);
```

### Why Taxonomy Matters

Knowing *how* work was discovered enables smarter prioritization:

1. **Blockers** interrupt current work immediately
2. **Supervisor findings** batch into review sessions
3. **Related work** schedules into future sprints
4. **Self-heal issues** get special handling (auto-fix attempts)

This is Zero Framework Cognition in action—the taxonomy encodes *meaning*, not just labels. The harness uses these semantics to make intelligent decisions about work ordering and interruption.

### Why Quality Gates Matter

VC's "Zero Framework Cognition" principle means no hardcoded heuristics—AI reasons about quality. But verification gates ensure reasoning has observable checkpoints:

1. **Tests as contracts**: Code claims are verified by tests
2. **E2E as integration**: Component claims are verified end-to-end
3. **Reviews as reflection**: Architectural claims are verified by reviewers

The gates don't replace AI judgment—they make AI judgment auditable.

## Pause/Resume with Context (Upstream from VC)

**Nondeterministic Idempotence**: Workflows can be interrupted and resumed anywhere. The AI figures out where it left off.

### AgentContext Schema

When a session pauses or creates a checkpoint, it captures:

```typescript
interface AgentContext {
  filesModified: FileModification[];  // What files were changed
  issuesUpdated: IssueUpdate[];       // Issue status transitions
  currentTask: TaskProgress | null;   // Where we are in current work
  testState: TestState | null;        // Test results at pause time
  agentNotes: string;                 // Free-form observations
  blockers: string[];                 // Problems encountered
  decisions: Decision[];              // Choices made and rationale
  capturedAt: string;                 // When context was saved
}
```

### Recording Context During Work

```typescript
import {
  createCheckpointTracker,
  recordFileModification,
  recordDecision,
  addAgentNotes,
  recordTestState,
} from '@create-something/harness';

const tracker = createCheckpointTracker();

// Record file changes
recordFileModification(tracker, {
  path: 'src/lib/auth.ts',
  summary: 'Added JWT validation middleware',
  changeType: 'modified',
  linesAdded: 45,
  linesRemoved: 12,
});

// Record decisions
recordDecision(tracker, {
  decision: 'Use RS256 for JWT signing',
  rationale: 'Better security for distributed systems',
  alternatives: ['HS256', 'ES256'],
});

// Add notes for context
addAgentNotes(tracker, 'Auth middleware working. Need to add refresh token logic next.');

// Record test state
recordTestState(tracker, {
  passed: 12,
  failed: 2,
  skipped: 1,
  failingTests: ['auth.test.ts: refresh token', 'auth.test.ts: token expiry'],
  durationMs: 3400,
});
```

### Resuming from Context

```typescript
import {
  loadAgentContext,
  generateResumeBrief,
  hasResumableContext,
} from '@create-something/harness';

// Check if checkpoint has context
if (hasResumableContext(lastCheckpoint)) {
  // Load context
  const context = loadAgentContext(lastCheckpoint);

  // Generate resume brief for priming prompt
  const brief = generateResumeBrief(context);

  // Brief is markdown that goes into session priming:
  // ## Session Resume Brief
  // ### Current Task
  // **Issue**: csm-123 - Add auth middleware
  // **Progress**: 60%
  // ...
}
```

### Resume Brief Format

The `generateResumeBrief()` function produces markdown suitable for session priming:

```markdown
## Session Resume Brief

*Context captured at: 2025-12-27T12:30:00Z*

### Current Task
**Issue**: csm-123 - Add auth middleware
**Progress**: 60%
**Current Step**: Implementing refresh token logic
**Remaining**: Token expiry handling, tests

### Files Modified This Session
- `src/lib/auth.ts` (+45/-12): Added JWT validation middleware
- `src/routes/api/auth/+server.ts` (+20/-0): Created auth endpoint

### Test State
- Passed: 12
- Failed: 2
- **Failing tests**:
  - auth.test.ts: refresh token
  - auth.test.ts: token expiry

### Key Decisions Made
- **Use RS256 for JWT signing**: Better security for distributed systems

### Notes
Auth middleware working. Need to add refresh token logic next.

---
*Resume from this context. The AI should figure out where work left off.*
```

### Why This Matters

Without context preservation, each session starts fresh and must rediscover:
- What files were being modified
- What decisions were made and why
- What tests are failing
- What blockers were encountered

With context preservation, sessions can resume mid-task, enabling:
1. **Longer autonomous runs** (work survives context limits)
2. **Crash recovery** (interrupted sessions resume cleanly)
3. **Multi-session continuity** (complex work spans sessions)

This is "nondeterministic idempotence"—the same outcome regardless of when/where the workflow was interrupted.

## Self-Healing Baseline (Upstream from VC)

**Principle**: Run quality gates before starting new work to prevent the "broken windows" problem.

VC achieves 90.9% quality gate pass rate by checking baseline health at session start. If existing tests/lint/typecheck are broken, fix them before adding new code—otherwise failures accumulate and mask regressions.

### Configuration

```typescript
import { runBaselineCheck, DEFAULT_BASELINE_CONFIG } from '@create-something/harness';

// Run all gates
const result = await runBaselineCheck(DEFAULT_BASELINE_CONFIG, cwd);

// Custom configuration
const result = await runBaselineCheck({
  enabled: true,
  gates: {
    tests: true,      // Run test suite
    typecheck: true,  // Run tsc --noEmit
    lint: true,       // Run eslint
    build: false,     // Skip build (expensive)
  },
  autoFix: true,        // Attempt eslint --fix
  createBlockers: true, // Create issues for failures
  maxAutoFixAttempts: 1,
  gateTimeoutMs: 5 * 60 * 1000, // 5 minutes
  packageFilter: 'harness', // Monorepo package filter
}, cwd);
```

### Gate Types

| Gate | Command | Auto-Fix | Notes |
|------|---------|----------|-------|
| `typecheck` | `tsc --noEmit` | No | Type errors require manual fix |
| `lint` | `eslint .` | Yes | `eslint --fix` for auto-fix |
| `tests` | `pnpm test` | No | Failing tests require investigation |
| `build` | `pnpm build` | No | Expensive, off by default |

### Auto-Fix Flow

```
Gate fails → Auto-fix enabled?
              ├── No → Create blocker issue
              └── Yes → Run fix command
                         ├── Re-run gate
                         │    ├── Pass → Continue (fixed)
                         │    └── Fail → Create blocker issue
```

### Blocker Issue Creation

When a gate fails and can't be auto-fixed, a self-heal blocker issue is created:

```bash
# Auto-created issue
bd show csm-xyz

csm-xyz: [Self-Heal] Fix failing typecheck baseline
Priority: P1
Labels: harness:self-heal

Gate: typecheck
Command: pnpm --filter=harness exec tsc --noEmit
Exit Code: 1

Output:
src/lib/auth.ts:45:3 - error TS2322: Type 'string' is not assignable...
```

### Baseline Health Tracking

Track pass rate over time to identify systemic issues:

```typescript
import {
  createBaselineHealth,
  updateBaselineHealth,
  formatBaselineHealth,
} from '@create-something/harness';

const health = createBaselineHealth();

// After each baseline check
const updatedHealth = updateBaselineHealth(health, result);

console.log(formatBaselineHealth(updatedHealth));
// ┌────────────────────────────────────────────────────────────────┐
// │  BASELINE HEALTH                                               │
// ├────────────────────────────────────────────────────────────────┤
// │  Total Checks:    15                                           │
// │  Pass Rate:     90.0%                                          │
// ├────────────────────────────────────────────────────────────────┤
// │  Passed First:    12                                           │
// │  After Fix:        2                                           │
// │  Failed:           1                                           │
// │  Common Failures:                                              │
// │    lint           3 times                                      │
// └────────────────────────────────────────────────────────────────┘
```

### Integration with Harness

The harness can run baseline checks before claiming work:

```typescript
import { runBaselineCheck, canProceedWithWork, getBaselineBlockers } from '@create-something/harness';

// Before starting new work
const baseline = await runBaselineCheck(config, cwd);

if (!canProceedWithWork(baseline, config)) {
  console.log('Baseline failed - work on blockers first');
  const blockers = getBaselineBlockers(baseline);
  // Focus on blocker issues before new features
}
```

### Why Self-Healing Matters

1. **Prevents broken windows**: Small failures don't accumulate into chaos
2. **Maintains signal**: Test failures indicate *new* regressions, not old ones
3. **Enables confidence**: AI can trust that passing tests mean working code
4. **Closes the loop**: Baseline issues become tracked work, not ignored debt

**Philosophy**: The baseline is the foundation. Weak foundations collapse under pressure. Self-healing ensures the foundation stays solid.

---

## Related Lessons

- [Agent Orchestration](/learn/lessons/advanced/agent-orchestration) — Multi-agent patterns for complex work decomposition
- [Agent Philosophy](/learn/lessons/agents/agent-philosophy) — Philosophical grounding for autonomous agents
- [Hierarchical Telos](/learn/lessons/agents/hierarchical-telos) — Multi-level purpose coordination in agent systems
