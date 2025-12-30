---
title: Install Beads
description: Agent-native task tracking via Claude Code.
duration: 15 min
praxis: beads-setup
---

# Install Beads

Beads is agent-native task management. While Taskwarrior was built for humans, Beads was built for AI agents—including Claude Code.

## Why Beads?

The problem: How does an AI agent remember what it was working on across sessions?

Context windows have limits. Conversations get summarized. But work continues.

Beads solves this by:
1. **Storing issues in Git**: Your tasks travel with your code
2. **Providing machine-readable output**: `--robot-priority` for agent consumption
3. **Tracking dependencies**: Which tasks block which
4. **Persisting across sessions**: Claude Code can resume work

## The Core Workflow

```bash
# Session Start: What's highest impact?
bd ready

# During Work: Capture discovered tasks
bd create "Fix the authentication bug"

# Track Dependencies
bd dep add <id> blocks <other-id>

# Session End: Close and sync
bd close <id>
bd sync
```

That's it. Four commands cover 90% of use.

## Installation via Claude Code

You'll use Claude Code to install Beads. This continues the bootstrap pattern—tools installing tools.

Start Claude Code in any project directory:

```bash
claude
```

Then use the praxis prompt to have Claude Code walk you through installation.

## Key Commands

After installation, these are your essential commands:

| Command | Purpose |
|---------|---------|
| `bd ready` | Show unblocked work (start here) |
| `bd create "..."` | Create a new issue |
| `bd close <id>` | Mark issue complete |
| `bd sync` | Sync with git remote |
| `bd list` | Show all open issues |
| `bd show <id>` | Detailed issue view |

## The .beads Directory

Beads stores everything in `.beads/`:

```
.beads/
├── beads.db      # Local SQLite cache (gitignored)
├── issues.jsonl  # Source of truth (git-tracked)
└── config.yaml   # Repository settings
```

The `issues.jsonl` file commits with your code. This is intentional—issues and code travel together.

## Robot Mode

For Claude Code consumption:

```bash
bv --robot-priority    # Ranked by PageRank + Critical Path
bv --robot-insights    # Bottleneck detection
bv --robot-plan        # Suggested execution order
```

Claude Code uses these flags to understand what matters most.

## Label Conventions

We use consistent labels across CREATE SOMETHING:

**Scope** (where):
- `agency` — Client work
- `io` — Research, documentation
- `space` — Practice, learning
- `ltd` — Philosophy, canon

**Type** (what):
- `feature` — New capability
- `bug` — Something broken
- `research` — Investigation
- `refactor` — Structural improvement

## Philosophy Note

Beads enables hermeneutic continuity. When Claude Code starts a session, it can run `bd ready` and immediately understand the state of work.

This isn't just convenience—it's a different model of human-agent collaboration. Work persists. Context transfers. The conversation continues.

## Next Step

With Beads installed, you have the core trifecta: terminal (WezTerm), partner (Claude Code), memory (Beads).

One more tool remains: Neomutt for terminal email.

---

## See Also

- [Beads Patterns](/.claude/rules/beads-patterns.md) — Complete command reference, molecules/chemistry system, and robot mode flags
- [Harness Patterns](/.claude/rules/harness-patterns.md) — Multi-session autonomous work orchestration using Beads

---

*Complete the praxis exercise to install Beads and create your first task.*
