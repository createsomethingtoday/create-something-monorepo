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
# Architecture finding → P2 discovered issue
bd create "Extract shared validation logic" \
  --priority P2 \
  --label harness:discovered \
  --label refactor

# Link to originating checkpoint
bd dep add <new-id> discovered-from <checkpoint-id>
```

**Labels for discovered work:**
- `harness:discovered` — Created by harness from review findings
- `harness:escalated` — Created from model escalation pattern

### Why Quality Gates Matter

VC's "Zero Framework Cognition" principle means no hardcoded heuristics—AI reasons about quality. But verification gates ensure reasoning has observable checkpoints:

1. **Tests as contracts**: Code claims are verified by tests
2. **E2E as integration**: Component claims are verified end-to-end
3. **Reviews as reflection**: Architectural claims are verified by reviewers

The gates don't replace AI judgment—they make AI judgment auditable.
