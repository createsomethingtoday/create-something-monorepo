# Gastown Patterns

Gastown coordinates multiple Claude Code instances. Here's how to use it.

## What to Do This Week

| If you want to... | Run this |
|-------------------|----------|
| Start Gastown | `gt start` |
| Create a batch of work | `gt convoy create "Feature" cs-xxx cs-yyy` |
| Assign work to a worker | `gt sling cs-xxx csm` |
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

# 3. Assign work to workers
gt sling cs-login csm
gt sling cs-session csm
gt sling cs-middleware csm

# 4. Workers auto-spawn, execute, complete
# Watch progress:
gt convoy list
```

**What happens**: Each issue gets a worker. Workers run in parallel. When they finish, Refinery merges their changes.

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
gt status        # Check what's running
gt wake          # Wake sleeping town
```

### Working with Convoys

```bash
gt convoy create "Name" cs-xxx cs-yyy    # Batch issues
gt convoy list                            # See active convoys
gt convoy show <id>                       # Track progress
gt sling cs-xxx csm                       # Assign to rig
```

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

- [Harness Patterns](./harness-patterns.md) - Single-session orchestration
- [Beads Patterns](./beads-patterns.md) - Issue tracking
- [Dotfiles Conventions](./dotfiles-conventions.md) - tmux configuration

*Source: Steve Yegge's "Welcome to Gas Town" (January 2026)*
