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
