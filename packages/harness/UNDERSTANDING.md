# Understanding: @create-something/harness

> **The autonomous orchestrator—Being-as-Work that runs Claude Code sessions in loops with human oversight through Beads.**

## Ontological Position

**Mode of Being**: Harness — Being-as-Work

This is where AI agents gain autonomy with accountability. The harness doesn't just run one task—it orchestrates complex projects through multiple Claude Code sessions, with humans steering via progress reports rather than micromanaging. It's the manifestation of "the tool recedes": when working well, you don't think about the harness—you review checkpoints and redirect when needed.

## Depends On (Understanding-Critical)

| Dependency | Why It Matters |
|------------|----------------|
| **Beads** | Human-agent interface for work tracking and redirection |
| **Claude Code Agent SDK** | Runs autonomous sessions with explicit tool permissions |
| `ajv` | JSON Schema validation for spec files |
| `yaml` | YAML spec parsing |
| Git | Version control for checkpoint commits |

## Enables Understanding Of

| Consumer | What This Package Clarifies |
|----------|----------------------------|
| **Developers** | How to run multi-session autonomous work |
| **Project managers** | How to steer AI work without micromanaging |
| **AI researchers** | Quality gates and self-healing patterns |
| **The field** | Nondeterministic idempotence in agent workflows |

## Internal Structure

```
src/
├── cli.ts                    → Entry point (harness CLI)
├── runner.ts                 → Main orchestration loop
├── session.ts                → Single Claude Code session execution
├── checkpoint.ts             → Progress tracking and context capture
├── beads.ts                  → Beads integration (issue creation, updates)
├── spec-parser.ts            → Markdown spec → Beads issues
├── yaml-spec-parser.ts       → YAML spec → Beads issues (preferred)
├── review-pipeline.ts        → Peer review orchestration
├── reviewer.ts               → Individual reviewer execution
├── reviewer-prompts.ts       → Reviewer system prompts
├── review-beads.ts           → Beads-specific review logic
├── self-heal.ts              → Baseline health checks and auto-fix
├── failure-handler.ts        → Failure mode handling
├── redirect.ts               → Human redirection detection
├── model-detector.ts         → Model family detection for thresholds
├── test-patterns.ts          → Test command detection
├── types.ts                  → TypeScript interfaces
└── config/
    └── allowed-tools.ts      → Agent SDK tool permissions
```

## Core Concepts

| Concept | Definition | Where to Find |
|---------|------------|---------------|
| **Harness Session** | One run of the orchestration loop | `runner.ts` |
| **Claude Code Session** | Single autonomous task execution | `session.ts` |
| **Checkpoint** | Progress report every N sessions or M hours | `checkpoint.ts` |
| **Peer Review** | Security/Architecture/Quality gates at checkpoints | `review-pipeline.ts` |
| **Self-Healing** | Pre-work baseline health check | `self-heal.ts` |
| **Redirection** | Human steering via Beads priority changes | `redirect.ts` |
| **Nondeterministic Idempotence** | Same outcome regardless of pause/resume points | Philosophy |

## To Understand This Package, Read

**For Core Orchestration**:
1. **`src/runner.ts`** — Main loop: init → session → checkpoint → repeat
2. **`src/session.ts`** — How a single Claude Code session executes
3. **`src/checkpoint.ts`** — Progress tracking and context preservation

**For Quality Gates**:
1. **`src/review-pipeline.ts`** — How peer reviews run at checkpoints
2. **`src/self-heal.ts`** — Baseline health checks before starting work
3. **`src/failure-handler.ts`** — Failure mode strategies

**For Human Oversight**:
1. **`src/redirect.ts`** — How human priority changes affect the loop
2. **`src/beads.ts`** — Beads integration for issue tracking

**For Spec Parsing**:
1. **`src/yaml-spec-parser.ts`** — YAML spec → Beads issues (recommended)
2. **`src/spec-parser.ts`** — Markdown spec → Beads issues (legacy)

## Critical Paths

### Path 1: Start from Spec
```
harness start specs/project.yaml
  ↓
1. Parse spec (YAML or Markdown)
   ├─ Extract features
   ├─ Infer dependencies
   └─ Create Beads issues
  ↓
2. Initialize harness session
   ├─ Create git branch
   ├─ Label issues with harness:setup
   └─ Run baseline health check
  ↓
3. Enter main loop (runner.ts)
   ├─ Select highest priority issue (bd ready --robot-priority)
   ├─ Run Claude Code session
   ├─ Mark issue code-complete or in-progress
   └─ Commit changes
  ↓
4. Checkpoint (every 3 sessions or 4 hours)
   ├─ Capture context (files modified, decisions, blockers)
   ├─ Run peer reviewers (security, architecture, quality)
   ├─ Create checkpoint issue in Beads
   ├─ Check confidence threshold
   └─ Pause if confidence < threshold or critical findings
  ↓
5. Repeat loop until:
   ├─ All issues closed
   ├─ Human paused
   └─ Confidence too low
```

### Path 2: Resume from Checkpoint
```
harness resume --harness-id <id>
  ↓
1. Load last checkpoint
   ├─ Find harness:checkpoint issue
   ├─ Extract agent context (files, decisions, blockers)
   └─ Load failure state
  ↓
2. Prime context with resume brief
   ├─ Current task progress
   ├─ Files modified this session
   ├─ Test state (passing/failing tests)
   └─ Key decisions made
  ↓
3. Continue main loop from last state
   ├─ Respects priority changes since pause
   ├─ Incorporates new urgent issues
   └─ AI figures out where it left off
```

### Path 3: Self-Healing Baseline
```
Before claiming new work
  ↓
1. Run baseline gates
   ├─ typecheck (tsc --noEmit)
   ├─ lint (eslint .)
   ├─ tests (pnpm test)
   └─ build (optional, expensive)
  ↓
2. For each failed gate
   ├─ Attempt auto-fix (eslint --fix)
   ├─ Re-run gate
   └─ If still fails → create blocker issue
  ↓
3. Check if work can proceed
   ├─ Pass: Continue to feature work
   └─ Fail: Work on blocker issues first
```

## Agent SDK Integration

The harness uses explicit tool permissions instead of `--dangerously-skip-permissions`:

```typescript
const HARNESS_ALLOWED_TOOLS = [
  // Core file operations
  'Read', 'Write', 'Edit', 'Glob', 'Grep',

  // Granular Bash patterns
  'Bash(git:*)', 'Bash(pnpm:*)', 'Bash(bd:*)', 'Bash(bv:*)',
  'Bash(tsc:*)', 'Bash(wrangler:*)',

  // Orchestration
  'Task', 'TodoWrite', 'WebFetch', 'WebSearch',

  // CREATE Something skills
  'Skill',

  // MCP Cloudflare
  'mcp__cloudflare__kv_*', 'mcp__cloudflare__d1_*',
];
```

**Security**: Blocks dangerous commands (`rm -rf`, `sudo`, etc.)
**Runaway prevention**: `--max-turns 100` prevents infinite loops

## Quality Gates (Upstream from VC)

The harness implements Steve Yegge's VC quality gate pattern:

### Gate 1: Session Completion
Each session must pass before marking work complete:
- Tests pass → `code-complete` label
- E2E passes → `verified` label
- Commit exists → close with commit hash

### Gate 2: Checkpoint Review
Every 3 sessions, 4 hours, on failure, or redirect:

| Reviewer | Focus | Blocking |
|----------|-------|----------|
| Security | Auth, injection, secrets | Critical only |
| Architecture | DRY violations (3+ files) | Critical only |
| Quality | Testing, conventions | Non-blocking |

### Gate 3: Work Extraction
Findings become new Beads issues:

```bash
# Critical finding → blocker
bd create "Fix auth bypass" --priority P1 --label harness:blocker

# Medium finding → supervisor discovery
bd create "Extract validation logic" --priority P2 --label harness:supervisor

# Info finding → related work
bd create "Add JSDoc" --priority P3 --label harness:related
```

## Discovered Work Taxonomy

Discovery source labels inform priority and handling:

| Label | Source | Priority Impact |
|-------|--------|-----------------|
| `harness:blocker` | Blocks current work | +1 boost, immediate |
| `harness:supervisor` | Checkpoint review finding | None, batch review |
| `harness:self-heal` | Baseline health check | Special handling, auto-fix attempts |
| `harness:related` | Related discovery | None, defer to future |
| `harness:discovered` | Manual during session | None, standard |

## Pause/Resume with Context

**Nondeterministic Idempotence**: Workflows can be interrupted anywhere and resume cleanly.

When paused, the harness captures:

```typescript
interface AgentContext {
  filesModified: FileModification[];      // What changed
  issuesUpdated: IssueUpdate[];           // Issue transitions
  currentTask: TaskProgress | null;       // Where we are
  testState: TestState | null;            // Pass/fail state
  agentNotes: string;                     // Observations
  blockers: string[];                     // Problems encountered
  decisions: Decision[];                  // Choices + rationale
  capturedAt: string;                     // Timestamp
}
```

On resume:
1. Load context from last checkpoint
2. Generate resume brief (markdown summary)
3. Prime Claude Code session with brief
4. AI figures out where work left off

## Dynamic Confidence Thresholds

Different models have different capabilities. The harness adjusts pause thresholds:

| Model | Threshold | Rationale |
|-------|-----------|-----------|
| Opus | 60% | More capable, trusted at lower confidence |
| Sonnet | 70% | Standard (default) |
| Haiku | 80% | Less capable, needs higher confidence |

**Detection**: Parse `model` field from Claude Code JSON output
**Mapping**: `"claude-sonnet-4-5-*"` → `sonnet` family → 70% threshold

## Spec Format: YAML (Recommended)

Machine-validatable with JSON Schema:

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
```

**YAML advantages**:
- Schema validation (clear errors)
- Explicit dependencies (`depends_on`)
- Verify commands (`acceptance.verify`)
- File tracking (`files`)
- Complexity hints

**Alternative**: Markdown still supported but less structured.

## Failure Handling

| Failure Type | Default Action | Rationale |
|--------------|----------------|-----------|
| `context_overflow` | skip | Task too large, retrying won't help |
| `timeout` | retry | May be transient |
| `partial` | skip | Some work done, move on |
| `failure` | retry (max 2) | Worth another attempt |

After 3 consecutive failures → pause for human review.

## Cost Tracking

Sessions capture metrics:

```typescript
interface SessionResult {
  issueId: string;
  outcome: 'success' | 'partial' | 'failure' | 'timeout';
  sessionId: string | null;       // For --resume
  costUsd: number | null;          // Per-session cost
  numTurns: number | null;         // Efficiency
}
```

**Typical costs**:
- CSS fix: ~$0.02
- Component refactor: ~$0.03-0.05
- Feature implementation: ~$0.10-0.50

## Redirection Patterns

Humans steer via Beads:

```bash
# Make urgent (jumps to front)
bd update <id> --priority P0

# Inject urgent work
bd create "Fix production bug" --priority P0

# Stop work on issue
bd close <id>

# View what's queued
bd ready
```

The harness detects changes between sessions and re-plans.

## Checkpoints

Progress reports are Beads issues (`harness:checkpoint` label) with:
- Summary: completed/failed/in-progress counts
- Confidence: score based on success rate
- Git commit hash: traceability
- Peer review findings: security/architecture/quality
- Redirect notes: priority changes detected

View with:
```bash
bd progress                  # All checkpoints
bd show <checkpoint-id>      # Specific checkpoint
```

## Hermeneutic Function

```
.ltd (Canon) ──────────────────────────────────────┐
    │                                               │
    ▼                                               │
.io (Research) ────────────────────────┐            │
    │                                   │            │
    ▼                                   ▼            │
harness (Work) ◄── "How do we automate this?"       │
    │                                               │
    ├──► Orchestrates agency client work            │
    ├──► Validates io research patterns             │
    ├──► Tests space experiments                    │
    │                                               │
    └──► Discovers orchestration gaps → returns ───┘
```

**The loop**:
1. `.ltd` defines quality standards
2. `.io` documents patterns
3. `harness` automates implementation
4. Failures reveal automation gaps
5. Gaps feed back to `.io` for pattern refinement
6. Refined patterns return to `.ltd` as canon

## Common Commands

| Command | Purpose |
|---------|---------|
| `harness start <spec>` | Initialize from spec |
| `harness resume --harness-id <id>` | Continue from checkpoint |
| `harness pause` | Gracefully stop after current session |
| `harness status` | View current state |
| `bd progress` | View checkpoints |
| `bd ready` | View queued work |
| `bd update <id> --priority P0` | Redirect |

## Integration with Beads

The harness is Beads-native:

| Harness Action | Beads Effect |
|----------------|--------------|
| Parse spec | Create issues with `harness:setup` label |
| Start session | Update issue to `in_progress` |
| Session success | Label issue `code-complete` |
| E2E pass | Label issue `verified` |
| Close work | Close issue with commit hash |
| Checkpoint | Create `harness:checkpoint` issue |
| Review finding | Create issue with discovery source label |
| Baseline failure | Create `harness:self-heal` blocker |

## Zero Framework Cognition

Following VC's principle: let the AI reason, don't constrain with hardcoded heuristics.

**What this means**:
- AI selects appropriate patterns for the task
- No rigid "always do X" rules
- Quality gates verify outcomes, not processes
- Context determines approach

**What this doesn't mean**:
- AI does whatever it wants (quality gates enforce standards)
- No structure (specs and checkpoints provide scaffolding)
- Human-free (progress reports enable steering)

## References

- **[Harness Patterns](../../.claude/rules/harness-patterns.md)** — Usage patterns
- **[Beads Patterns](../../.claude/rules/beads-patterns.md)** — Issue tracking
- **[Paper: Harness Agent SDK Migration](https://createsomething.io/papers/harness-agent-sdk-migration)** — Architecture evolution
- **[VC (VibeCoder)](https://github.com/steveyegge/vc)** — Quality gate inspiration

---

*Last validated: 2025-12-29*

**This UNDERSTANDING.md follows the "Less, but better" principle—document what's critical to understand, not every detail. When you need deeper knowledge, follow the references to source files.**
