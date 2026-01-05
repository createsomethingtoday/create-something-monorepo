# Beads Patterns

Track your work. Pick up where you left off.

Beads is issue tracking designed for AI agents. Work survives session restarts, context limits, even crashes.

## What to Do This Week

| When... | Do this |
|---------|---------|
| Starting a session | `bv --robot-priority` — see what matters most |
| You discover a task | `bd create "Fix auth bug"` — capture it now |
| Starting work | `bd update cs-abc --status in-progress` |
| Finishing work | `bd close cs-abc` |
| End of session | `bd sync` — push to Git |

**Example session:**

```bash
# Morning: What should I work on?
bv --robot-priority

# Found something while working
bd create "Add rate limiting to API" --priority P1 --label io

# Starting the auth work
bd update cs-a1b2 --status in-progress

# Done with auth
bd close cs-a1b2

# End of day
bd sync
```

---

## Commands

### See What's There

```bash
bd list                 # All open issues
bd ready                # Unblocked work only
bd show cs-abc          # Issue details
bd blocked              # What's stuck and why
bv --robot-priority     # AI-optimized ranking (JSON)
```

### Create and Update

```bash
bd create "Fix login bug"                    # Create issue
bd create "Add caching" --priority P1        # With priority
bd update cs-abc --status in-progress        # Start working
bd close cs-abc                              # Mark done
bd label add cs-abc agency                   # Add scope label
```

### Dependencies

```bash
# "Auth blocks Dashboard" — Dashboard can't start until Auth is done
bd dep add cs-auth blocks cs-dashboard

# Parent-child (hierarchical grouping)
bd dep add cs-child parent cs-parent

# Just related (no blocking)
bd dep add cs-abc related cs-xyz
```

---

## Labels

### Scope (which property)

| Label | Meaning |
|-------|---------|
| `agency` | Client work |
| `io` | Research, docs |
| `space` | Learning, tutorials |
| `ltd` | Philosophy, canon |

### Type (what kind)

| Label | Meaning |
|-------|---------|
| `feature` | New capability |
| `bug` | Something broken |
| `research` | Investigation |
| `refactor` | Structural improvement |

### Priority

| Level | Meaning |
|-------|---------|
| P0 | Drop everything |
| P1 | This week |
| P2 | This month |
| P3 | Someday |
| P4 | Maybe never |

---

## Workflows (Molecules)

Molecules are reusable work templates. Think of them as workflow recipes.

**The metaphor**: Chemistry phases.

| Phase | What It Is | Use For |
|-------|------------|---------|
| **Solid** (Proto) | Template you can reuse | Standard workflows |
| **Liquid** (Mol) | Active work, saved to Git | Real features |
| **Vapor** (Wisp) | Throwaway work, not saved | Experiments, scratch |

### Basic Usage

```bash
# See available templates
bd mol catalog

# Start a feature from a template
bd pour feature-workflow --var name=auth

# Check where you are in the workflow
bd mol current

# Close a step and move to next
bd close cs-step1 --continue
```

### Scratch Work (Wisps)

Wisps are temporary. They don't clutter your Git history.

```bash
bd wisp create experiment-proto        # Start throwaway work
bd wisp list                           # See all wisps
bd wisp gc                             # Clean up old ones
bd mol burn cs-wisp                    # Delete completely
bd mol squash cs-wisp                  # Keep as one-line summary
```

---

## Files

```
.beads/
├── issues.jsonl  # Your issues (committed to Git)
├── beads.db      # Local cache (gitignored)
└── config.yaml   # Settings

.beads-wisp/      # Temporary work (gitignored)
```

---

## Maintenance

```bash
bd doctor              # Check if everything works
bd sync                # Push/pull from Git
bd compact             # Clean up old closed issues
```

---

## With Gastown (Multi-Agent)

When you're running multiple Claude Code sessions:

```bash
gt convoy create "Feature" cs-xxx cs-yyy   # Batch issues
gt sling cs-xxx csm                        # Assign to a rig
gt hook                                    # What's assigned to me?
gt done                                    # Finish and sync
```

| Tool | What It Does |
|------|--------------|
| `bd` (Beads) | Issue tracking |
| `gt` (Gastown) | Agent coordination |

See [Gastown Patterns](./gastown-patterns.md) for multi-agent work.

---

## Why This Exists

Beads was built for AI agents, not humans typing at a terminal.

**The problem**: Claude Code sessions end. Context limits hit. Crashes happen. How do you pick up where you left off?

**The solution**: Issues live in Git. Any session can read them. Work survives restarts.

This is what "nondeterministic idempotence" means in plain English: **different paths, same outcome**. You might restart 5 times. The work still gets done.

---

## Related

- [Install Beads](/learn/lessons/getting-started/install-beads) — Setup walkthrough
- [Agent Orchestration](/learn/lessons/advanced/agent-orchestration) — Multi-agent patterns
- [Gastown Patterns](./gastown-patterns.md) — Full orchestration system
