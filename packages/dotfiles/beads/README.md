# Beads - Agent-Native Task Management

> *"Tools should be designed for their actual users."*

Beads replaces Taskwarrior because the primary user changed: Claude Code agents need cross-session memory. Taskwarrior was designed for humans; Beads is designed for AI agents.

## Why Beads

| Principle | Application |
|-----------|-------------|
| **Rams #2** (Useful) | Designed for actual users—AI agents in Claude Code sessions |
| **Rams #5** (Unobtrusive) | Tool recedes; `bv --robot-priority` speaks machine to machine |
| **Rams #10** (As little as possible) | One system replaces Taskwarrior + session-local tracking |
| **Zuhandenheit** | Ready-to-hand; the tool disappears into the work |

## Installation

```bash
# Install via the CREATE SOMETHING dotfiles installer
cd packages/dotfiles
./scripts/install.sh

# Or install Beads directly
curl -sSL https://raw.githubusercontent.com/steveyegge/beads/main/scripts/install.sh | bash
```

## Commands

### View
```bash
bd list                 # All open issues
bd ready                # Ready work (no blockers)
bd show <id>            # Issue details
bd blocked              # What's blocked and why
bv --robot-priority     # AI-optimized priority output
```

### Create
```bash
bd create "Task"
bd create "Task" --description="Details"
bd create "Task" --priority P1
```

### Update
```bash
bd update <id> --status in-progress
bd update <id> --status done
bd close <id>
```

### Dependencies
```bash
bd dep add <id> blocks <other>
bd dep add <id> parent <other>
bd dep list <id>
```

### Labels
```bash
bd label add <id> <label>
bd label remove <id> <label>
```

## Session Workflow

```
Session Start ──► bv --robot-priority ──► Work ──► bd close ──► Session End
                       │                    │
                       │                    └── bd create (discovered tasks)
                       │                    └── bd dep add (dependencies)
                       │
                       └── Surface highest-impact work
```

## Label Conventions

### Properties (scope)
- `agency` — Client service work
- `io` — Research, documentation, experiments
- `space` — Practice, learning, tutorials
- `ltd` — Canon, philosophy, patterns

### Types (what)
- `feature` — New capability
- `bug` — Something broken
- `research` — Investigation, analysis
- `refactor` — Structural improvement

### Priority
Use `--priority P0-P4`:
- **P0**: Drop everything
- **P1**: This week
- **P2**: This month
- **P3**: Someday
- **P4**: Maybe never

## Files

```
.beads/
├── beads.db      # Local cache (gitignored)
├── issues.jsonl  # Source of truth (Git-synced)
└── config.yaml   # Symlinked from dotfiles
```

## Robot Mode

For AI agents, use structured output flags:

```bash
bv --robot-priority    # PageRank + Critical Path analysis
bv --robot-insights    # Graph-theoretic bottleneck detection
bv --robot-plan        # Suggested execution sequence
```

These provide machine-readable output optimized for agent consumption.

## Graph Analysis

Beads models issues as a directed acyclic graph (DAG). This enables:

- **PageRank**: Which issues are most connected?
- **Critical Path**: What's blocking the most work?
- **HITS**: Hub vs authority issues
- **Betweenness**: Which issues are chokepoints?

Run `bv --robot-insights` to surface this analysis.

---

*Beads: The tool recedes; the work remains.*
