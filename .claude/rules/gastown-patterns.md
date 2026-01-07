# Gastown Patterns

Gastown coordinates multiple Claude Code instances. Here's how to use it.

## What to Do This Week

| If you want to... | Run this |
|-------------------|----------|
| Start Gastown | `gt start` |
| Create a batch of work | `gt convoy create "Feature" cs-xxx cs-yyy` |
| Assign work to a worker | `gt-smart-sling cs-xxx csm` (smart routing) |
| Assign work manually | `gt sling cs-xxx csm --agent claude --model sonnet` |
| Check your current task | `gt hook` |
| Mark work complete | `gt done` |
| Stop everything | `gt shutdown` |

## The Core Principle: GUPP

**If there's work on your hook, do it. No waiting.**

Workers check their hook on startup. If work exists, they start immediately. No asking permission. No waiting for user input.

If a worker sits idle when it should be working:
```bash
gt nudge worker-1    # Pokes the worker to check its hook
```

## Quick Start: Your First Convoy

A convoy batches related work for parallel execution.

```bash
# 1. Start Gastown (launches tmux sessions)
gt start

# 2. Create a convoy with three issues
gt convoy create "Auth feature" cs-login cs-session cs-middleware

# 3. Assign work to workers (smart routing picks the right model)
gt-smart-sling cs-login csm
gt-smart-sling cs-session csm
gt-smart-sling cs-middleware csm

# 4. Workers auto-spawn with appropriate quality level, execute, complete
# Watch progress:
gt convoy list
```

**What happens**: Each issue gets a worker with the right model (based on labels/title). Workers run in parallel. When they finish, Refinery merges their changes.

**Cost optimization**: Smart routing automatically uses Haiku for simple tasks, Opus for complex work, saving ~18% on typical workloads.

## Roles

| Role | What it does | When you interact |
|------|--------------|-------------------|
| **Coordinator** | Assigns work, your concierge | `gt prime` to enter |
| **Worker** | Executes tasks | They work autonomously |
| **Witness** | Monitors worker health | Check if workers stuck |
| **Refinery** | Merges completed work | Handles conflicts |
| **Steward** | Background daemon | Rarely |

**You are the Overseer** - the human operator who creates convoys and monitors progress.

## Common Commands

### Starting and Stopping

```bash
gt start         # Launch all sessions
gt shutdown      # Stop everything
gt status        # Check what's running (compact format)
gt status --watch # Watch mode with auto-refresh (v0.2.2+)
gt wake          # Wake sleeping town
```

### Rig Operational State (v0.2.2+)

Control rig lifecycle without losing work:

```bash
gt rig park <rig>      # Pause daemon auto-start (preserves sessions)
gt rig unpark <rig>    # Resume daemon auto-start
gt rig dock <rig>      # Stop all sessions, prevent auto-start
gt rig undock <rig>    # Resume normal operation
gt rig status <rig>    # Show park/dock state
```

**Use cases**:
- `park`: Temporarily pause work while keeping sessions alive
- `dock`: Full stop for maintenance or debugging

### Working with Convoys

```bash
gt convoy create "Name" cs-xxx cs-yyy    # Batch issues
gt convoy list                            # See active convoys
gt convoy show <id>                       # Track progress
gt sling cs-xxx csm                       # Assign to rig (uses default model)
gt-smart-sling cs-xxx csm                # Assign with auto model routing
```

### Smart Slinging (Model Routing)

**NEW**: Use `gt-smart-sling` instead of `gt sling` for automatic model routing based on Beads labels.

```bash
# Smart routing based on issue labels/title
gt-smart-sling cs-abc123 csm

# With extra flags (passed through to gt sling)
gt-smart-sling cs-abc123 csm --force
gt-smart-sling cs-abc123 csm --message "Focus on performance"
```

**How it works**:
1. Reads Beads issue labels
2. Maps to Gastown agent override (v0.2.2+):
   - `model:haiku` or `complexity:trivial` → `--agent claude --model haiku` (Haiku ~$0.001)
   - `model:sonnet` or `complexity:simple/standard` → `--agent claude --model sonnet` (Sonnet ~$0.01)
   - `model:opus` or `complexity:complex` → `--agent claude --model opus` (Opus ~$0.10)
3. Pattern matches title (e.g., "rename" → haiku, "architect" → opus)
4. Calls `gt sling` with appropriate agent model override

**Note**: Gastown v0.2.2 removed the `--quality` flag. `gt-smart-sling` now uses `--agent claude --model <model>` pattern.

**Label your issues**:
```bash
# Explicit model override
bd create "Fix typo in README" --label model:haiku
bd create "Architect new system" --label model:opus

# Or use complexity labels (spec files)
bd create "Rename variable" --label complexity:trivial
bd create "Refactor auth system" --label complexity:complex
```

**Cost savings**: ~90% on trivial tasks (Haiku vs Sonnet), quality where it matters (Opus for complex work).

### Haiku Swarms (Advanced)

For parallelizable work with clear subtasks, deploy a **Haiku swarm**: Sonnet plans → multiple Haiku workers execute → Opus reviews.

**Pattern**: **Plan → Execute → Review** at scale.

```bash
# Create convoy with parallelizable work
gt convoy create "User Profile Feature" cs-component cs-api cs-tests cs-styles

# Option 1: Deploy Haiku swarm (automatic)
gt swarm deploy convoy-abc --planner=sonnet --executor=haiku --reviewer=opus
# Sonnet breaks down convoy → spawns Haiku worker per task → Opus final review

# Option 2: Manual Haiku slinging (more control)
for issue in cs-component cs-api cs-tests cs-styles; do
  gt-smart-sling $issue csm &  # Parallel execution
done
wait
```

**What happens**:
1. **Planning phase** (Sonnet): Analyzes convoy, identifies parallelizable subtasks
2. **Execution phase** (Haiku): Spawns one worker per subtask, all run in parallel
3. **Review phase** (Opus): Merges branches, reviews for security/architecture issues

**Cost comparison**:

| Approach | Models | Cost | Time |
|----------|--------|------|------|
| Sequential Sonnet | 4× Sonnet | $0.04 | 120 min |
| Parallel Sonnet | 4× Sonnet | $0.04 | 30 min |
| **Haiku Swarm** | 1× Sonnet + 4× Haiku + 1× Opus | **$0.114** | **30 min** |

**When to use Haiku swarms**:
- ✓ 4+ independent tasks (components, tests, endpoints)
- ✓ Each task is well-defined (clear file targets)
- ✓ Tasks don't depend on each other
- ✗ Tasks require coordination (use Sonnet throughout)
- ✗ Single complex architectural task (use Opus)

**Labeling for swarms**:

Tag convoy issues for automatic Haiku routing:

```bash
# Tag each subtask
bd label add cs-component model:haiku complexity:simple
bd label add cs-api model:haiku complexity:simple
bd label add cs-tests model:haiku complexity:trivial
bd label add cs-styles model:haiku complexity:trivial

# Now smart-sling automatically uses Haiku
gt-smart-sling cs-component csm  # → Haiku worker
gt-smart-sling cs-api csm        # → Haiku worker
```

**The insight**: Haiku achieves 90% of Sonnet's performance on bounded tasks. When work can be parallelized, Haiku swarms deliver massive cost savings (~70%) without sacrificing quality—because Opus still reviews the final result.

**See [Model Routing Optimization](./model-routing-optimization.md) for detailed swarm strategies.**

### Worker Operations

```bash
gt hook              # What's on my hook?
gt done              # Mark work complete
gt mail inbox        # Check messages
gt handoff           # Graceful session restart
```

### Session Navigation (tmux)

| Keys | Action |
|------|--------|
| `Ctrl-a g c` | Jump to Coordinator |
| `Ctrl-a g w` | Jump to Witness |
| `Ctrl-a g r` | Jump to Refinery |

## Before/After: Single Agent vs Gastown

**Before (single agent)**:
```bash
# Work issues one at a time
bd work cs-login
# Wait 30 min...
bd work cs-session
# Wait 30 min...
bd work cs-middleware
# Total: 90 minutes sequential
```

**After (Gastown)**:
```bash
gt convoy create "Auth" cs-login cs-session cs-middleware
gt sling cs-login csm && gt sling cs-session csm && gt sling cs-middleware csm
# Total: 30 minutes parallel
```

## Work Survives Restarts

Sessions crash. Context windows fill. Gastown handles it.

Everything lives in Beads (Git-synced). When a session dies, a new one picks up where the old left off. The AI figures out what was happening and continues.

| What persists | What doesn't |
|---------------|--------------|
| Issues (Beads) | Session state |
| Hooks (assignments) | In-memory context |
| Molecules (workflows) | Terminal history |

## Troubleshooting

### Worker sits idle

```bash
gt nudge worker-1    # Poke it
gt status            # Is town awake?
gt wake              # Wake it if sleeping
```

### Merge conflicts

```bash
gt mail inbox        # See REWORK_REQUEST
git fetch origin && git rebase origin/main
gt done              # Try again
```

### General health check

```bash
gt doctor            # Diagnose issues
bd sync --status     # Check Beads sync
```

## When to Use Gastown vs Harness

| Scenario | Tool |
|----------|------|
| Single issue, sequential | Harness |
| 3+ independent features | Gastown |
| Background long-running work | Gastown |
| Complex multi-step orchestration | Gastown |

**Rule of thumb**: Harness for focused work. Gastown for parallel work.

---

## Reference: Architecture

```
WezTerm
└── tmux (session persistence)
    ├── gt-coordinator    (you + Claude Code)
    ├── gt-witness-csm    (monitors per rig)
    ├── gt-refinery-csm   (merge queue per rig)
    ├── gt-steward        (background daemon)
    └── gt-worker-N       (ephemeral workers)
```

## Reference: Mail Protocol

Agents communicate via structured messages:

| Message | From → To | Meaning |
|---------|-----------|---------|
| `WORKER_DONE` | Worker → Witness | I'm finished |
| `MERGE_READY` | Witness → Refinery | Branch ready |
| `MERGE_FAILED` | Refinery → Worker | Fix needed |
| `HELP` | Any → Coordinator | I'm stuck |

## Reference: Molecules

Molecules chain tasks into workflows:

```bash
bd mol current              # Where am I?
bd close <id> --continue    # Complete step, advance
bd mol squash               # Compress to digest
```

## Reference: Shell Aliases

CREATE SOMETHING renames some Gastown terms:

| Upstream | Our term | Why |
|----------|----------|-----|
| Mayor | Coordinator | Describes function |
| Polecat | Worker | Tool recedes |
| Deacon | Steward | Serves the practice |

```bash
coordinator attach    # Same as: gt mayor attach
worker list          # Same as: gt polecat list
```

## Reference: Terminology

| Term | Meaning |
|------|---------|
| Convoy | Batch of related issues |
| Swarm | Workers attacking a convoy |
| Hook | Where work hangs for an agent |
| Rig | A project/monorepo |
| Slinging | `gt sling` - assigning work |

---

## Prerequisites

**Gastown requires experience.** If you're not already juggling 5+ Claude Code instances daily, start with [Harness Patterns](./harness-patterns.md).

**Cost warning**: Multiple parallel workers means multiple API calls. Budget accordingly.

**tmux basics**:
| Keys | Action |
|------|--------|
| `Ctrl-b s` | List sessions |
| `Ctrl-b [` | Scroll mode (ESC to exit) |
| `Ctrl-b n/p` | Next/previous window |

---

## Philosophy (Why This Works)

Work outcomes are guaranteed regardless of crashes or restarts. This is "nondeterministic idempotence" - the path varies, but the destination is certain.

| Concept | Persistence |
|---------|-------------|
| Agent identity | Persistent (Bead) |
| Session | Ephemeral (cattle) |
| Work assignment | Persistent (Hook) |
| Workflow state | Persistent (Molecule) |

**The test**: Does the convoy serve a coherent goal, or fragment attention? If work feels scattered, use harness instead.

---

## Related Documentation

- [Ralph Patterns](./ralph-patterns.md) - Iterative refinement (enables worker self-rescue)
- [Harness Patterns](./harness-patterns.md) - Single-session orchestration
- [Beads Patterns](./beads-patterns.md) - Issue tracking
- [Dotfiles Conventions](./dotfiles-conventions.md) - tmux configuration

*Source: Steve Yegge's "Welcome to Gas Town" (January 2026)*
