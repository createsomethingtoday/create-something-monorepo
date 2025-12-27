# Harness Patterns

**Use the `harness` subagent** for autonomous work orchestration.

```bash
bd work cs-xyz                   # Work on issue
bd work --create "Fix button"    # Create and work
bd work --spec specs/feature.md  # Parse spec (Markdown or YAML)
```

The harness subagent handles: complexity detection, model routing, session protocols, two-stage completion (`code-complete` → `verified`), and Beads integration.

Invoke explicitly or let Claude delegate when `bd work` or harness operations are needed.

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
