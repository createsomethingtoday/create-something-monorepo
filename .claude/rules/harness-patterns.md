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

When you don't specify ultrathink, harness picks the model:

| Complexity | Model | Cost | Example |
|------------|-------|------|---------|
| trivial | Haiku | ~$0.001 | Typo fix |
| simple | Sonnet | ~$0.01 | Bug fix |
| standard | Sonnet | ~$0.01 | Normal feature |
| complex | Opus | ~$0.10 | Multi-file refactor |

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

- [Agent Orchestration](/learn/lessons/advanced/agent-orchestration)
- [Agent Philosophy](/learn/lessons/agents/agent-philosophy)
- [Gastown Patterns](./gastown-patterns.md)
