# Harness Patterns

Harness runs autonomous work sessions. Here's how to use it.

```bash
bd work cs-xyz                   # Work on an existing issue
bd work --create "Fix button"    # Create issue and start work
bd work --spec specs/feature.md  # Parse spec into issues and work
```

The harness handles the rest: picking the right model, running tests, creating checkpoints, resuming after crashes.

---

## What to Do This Week

| Situation | Do This |
|-----------|---------|
| Single issue to fix | `bd work cs-xyz` |
| New feature idea | `bd work --create "Add dark mode toggle"` |
| Spec file ready | `bd work --spec specs/auth.yaml` |
| Complex work (architecture, refactors) | `run harness in the background: ultrathink` |
| Multi-file parallel work | Use [Gastown](./gastown-patterns.md) instead |

---

## Invocation Examples

```bash
# Work on specific issue
run harness on cs-abc123

# Background mode for long work (frees your conversation)
run harness in the background: ultrathink

# Parse spec file
run harness on specs/auth-feature.yaml

# Create and work immediately
run harness: create and work on "Add user settings page"
```

### Thinking Modes

| Mode | When to Use | Command |
|------|-------------|---------|
| Default | Quick fixes, mixed complexity | `run harness` |
| Ultrathink | Deep architecture work | `run harness in the background: ultrathink` |

**Ultrathink** uses Opus for everything. Good for genuinely complex work. Wasteful for simple tasks.

### Model Routing (Default Mode)

When you don't specify ultrathink, harness uses the **Plan → Execute → Review** pattern:

**Sonnet plans → Haiku executes → Opus reviews (when critical)**

| Complexity | Model | Cost | Example |
|------------|-------|------|---------|
| trivial | Haiku | ~$0.001 | Typo fix, rename variable |
| simple | Haiku | ~$0.001 | Single-file edit, CRUD scaffolding |
| standard | Sonnet | ~$0.01 | Multi-file feature, business logic |
| complex | Opus | ~$0.10 | Architecture design, security-critical |

**Key insight**: Haiku achieves 90% of Sonnet's performance on well-defined execution tasks while costing 10x less.

#### When Haiku Executes

Haiku is ideal for bounded, well-defined tasks:
- Single-file edits with clear instructions
- CRUD endpoint scaffolding
- Test file creation
- Linting and formatting fixes
- Component generation from templates
- Simple refactors (rename, extract)

#### When Sonnet Plans

Sonnet handles coordination and complexity:
- Multi-file feature implementation
- API design and contracts
- Task decomposition
- Integration work

#### When Opus Reviews

Opus provides deep analysis for critical paths:
- Security-critical code (auth, payments)
- Architecture audits
- Performance optimization

**See [Model Routing Optimization](./model-routing-optimization.md) for detailed routing strategies.**

---

## Spec Formats

Two formats. YAML is better.

### YAML (Recommended)

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

| Field | Required | Description |
|-------|----------|-------------|
| `title` | Yes | Project name |
| `features` | Yes | List of features |
| `property` | No | Target: `space`, `io`, `agency`, `ltd` |
| `complexity` | No | Override model routing |
| `requirements` | No | Technical constraints |
| `success` | No | Project-level criteria |

**Feature Fields:**

| Field | Required | Description |
|-------|----------|-------------|
| `title` | Yes | Feature name |
| `acceptance` | No | Done criteria (string or `{test, verify}`) |
| `depends_on` | No | Feature titles this blocks on |
| `files` | No | Expected files to touch |
| `priority` | No | P0-P4 (default: P2) |

### Markdown (Legacy)

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

---

## Quality Gates

Three checkpoints ensure work quality:

### Gate 1: Session Completion

Before marking work done:

| Requirement | Status Label |
|-------------|--------------|
| Tests pass | `code-complete` |
| E2E verified | `verified` |
| Commit exists | `close` |

```bash
bd update cs-xyz --status code-complete  # Tests pass
bd update cs-xyz --status verified       # E2E confirmed
bd close cs-xyz                          # Done
```

### Gate 2: Checkpoint Review

Runs every 3 sessions (or on failure):

| Review | Focus | Blocks Work? |
|--------|-------|--------------|
| Security | Auth, injection, secrets | If critical |
| Architecture | DRY violations (3+ files) | If critical |
| Quality | Testing, conventions | No |

### Gate 3: Work Extraction

Findings become tracked issues:

```bash
bd create "Extract shared validation logic" \
  --priority P2 \
  --label harness:supervisor \
  --label refactor
```

---

## Reviewer Model Routing

Harness automatically selects the most cost-effective model for each reviewer type:

| Reviewer Type | Model | Cost | Rationale |
|---------------|-------|------|-----------|
| **Security** | Haiku | ~$0.001 | Pattern detection (known vulnerabilities, secrets) |
| **Architecture** | Opus | ~$0.10 | Deep analysis (DRY violations, coupling, design) |
| **Quality** | Sonnet | ~$0.01 | Balanced review (conventions, tests) |
| **Custom** | Sonnet | ~$0.01 | Safe default for user-defined reviewers |

### Cost Savings

**Before** (all Sonnet):
- 3 reviewers × $0.01 = $0.03 per checkpoint

**After** (routed):
- Security (Haiku): $0.001
- Architecture (Opus): $0.10
- Quality (Sonnet): $0.01
- **Total**: ~$0.11 per checkpoint

**But**: Architecture reviews now catch issues that Sonnet would miss, reducing expensive rework.

### Overriding Model Selection

If you need to force a specific model for a reviewer:

```yaml
# harness.config.yaml
reviewers:
  reviewers:
    - id: security
      type: security
      enabled: true
      model: opus  # Force Opus for thorough security review
```

**When to override**:
- Security review of critical auth code → Force Opus
- Architecture review of simple refactor → Force Sonnet to save cost
- Custom reviewer for complex domain logic → Force Opus

### Reviewer Escalation (Self-Healing)

Reviewers automatically escalate to more capable models when they fail, implementing the same self-healing pattern as main tasks:

**Escalation thresholds**:
| Reviewer Type | Initial Model | After 1 Failure | After 2 Failures |
|---------------|---------------|-----------------|------------------|
| Security | Haiku (~$0.001) | Sonnet (~$0.01) | Opus (~$0.10) |
| Quality | Sonnet (~$0.01) | Sonnet (no escalation yet) | Opus (~$0.10) |
| Architecture | Opus (~$0.10) | Opus (already maximum) | Opus |

**Example flow** (Security review):
```
Attempt 1: Haiku → fails (pattern detection missed something)
Attempt 2: Auto-escalates to Sonnet → succeeds
```

**Philosophy**: When cheaper models fail, escalate to opus rather than giving up. The system repairs itself by using more capable tools when simpler ones fail.

**Heideggerian framing**: The tool (cheaper model) has broken down, becoming present-at-hand. Escalation returns the system to ready-to-hand operation.

**Cost impact**: Escalation only happens on failure. If Haiku succeeds (most security reviews), you save 90% vs always using Sonnet. The occasional escalation is cheaper than running everything on Opus.

---

## Discovered Work Labels

When harness finds new work during a session:

| Label | Meaning | Priority |
|-------|---------|----------|
| `harness:blocker` | Blocks current work | +1 boost |
| `harness:supervisor` | Review found concern | Normal |
| `harness:related` | Can schedule later | Normal |
| `harness:self-heal` | Baseline fix needed | Normal |

---

## Work Survives Restarts

Sessions can crash, hit limits, or be interrupted. Harness saves context so the next session picks up where you left off.

### What Gets Saved

```typescript
interface AgentContext {
  filesModified: FileModification[];  // What changed
  currentTask: TaskProgress | null;   // Where you are
  testState: TestState | null;        // Test results
  agentNotes: string;                 // Observations
  blockers: string[];                 // Problems hit
  decisions: Decision[];              // Choices made
}
```

### Recording Context

```typescript
import { createCheckpointTracker, recordFileModification, recordDecision } from '@create-something/harness';

const tracker = createCheckpointTracker();

recordFileModification(tracker, {
  path: 'src/lib/auth.ts',
  summary: 'Added JWT validation',
  changeType: 'modified',
});

recordDecision(tracker, {
  decision: 'Use RS256 for JWT',
  rationale: 'Better for distributed systems',
});
```

### Resuming

```typescript
import { loadAgentContext, generateResumeBrief, hasResumableContext } from '@create-something/harness';

if (hasResumableContext(lastCheckpoint)) {
  const context = loadAgentContext(lastCheckpoint);
  const brief = generateResumeBrief(context);
  // Brief goes into next session's prompt
}
```

---

## Self-Healing Baseline

Before starting new work, harness checks if existing tests pass. Broken baseline = broken signal.

### Gate Types

| Gate | Command | Auto-Fix? |
|------|---------|-----------|
| typecheck | `tsc --noEmit` | No |
| lint | `eslint .` | Yes |
| tests | `pnpm test` | No |
| build | `pnpm build` | Off by default |

### Configuration

```typescript
import { runBaselineCheck } from '@create-something/harness';

const result = await runBaselineCheck({
  gates: { tests: true, typecheck: true, lint: true, build: false },
  autoFix: true,
  createBlockers: true,
}, cwd);
```

### What Happens When Gates Fail

```
Gate fails → Can auto-fix?
             ├── Yes → Fix, re-run gate
             │         ├── Pass → Continue
             │         └── Fail → Create blocker issue
             └── No → Create blocker issue
```

Blocker issues look like:

```
csm-xyz: [Self-Heal] Fix failing typecheck baseline
Priority: P1
Labels: harness:self-heal
```

---

## Harness vs Gastown

| Scenario | Use |
|----------|-----|
| Single issue, sequential work | **Harness** |
| Spec with 3+ independent features | Gastown |
| Multi-property parallel work | Gastown |
| Work exceeding session limits | Gastown |

**Harness** = one Claude Code session with subagents.
**Gastown** = multiple Claude Code instances via tmux.

```bash
# Harness (single session)
bd work cs-xxx
bd work --spec spec.yaml

# Gastown (multi-session)
gt start
gt convoy create "Feature" cs-xxx cs-yyy
gt sling cs-xxx csm
```

See [Gastown Patterns](./gastown-patterns.md) for distributed work.

---

## Related

- [Ralph Patterns](./ralph-patterns.md) - Iterative refinement loops (complements harness for test-fix scenarios)
- [Agent Orchestration](/learn/lessons/advanced/agent-orchestration)
- [Agent Philosophy](/learn/lessons/agents/agent-philosophy)
- [Gastown Patterns](./gastown-patterns.md)
