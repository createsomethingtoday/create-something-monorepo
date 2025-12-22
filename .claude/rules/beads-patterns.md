# Beads Patterns

Agent-native task management. The tool recedes; the work remains.

## Session Workflow

```bash
# Session Start: What's highest impact?
bv --robot-priority

# During Work: Capture and track
bd create "Discovered task"
bd update <id> --status in-progress
bd dep add <id> blocks <other>

# Session End: Close and verify
bd close <id>
bd sync
```

## Command Reference

### View Commands
```bash
bd list                 # All open issues
bd ready                # Unblocked work
bd show <id>            # Issue details
bd blocked              # Blocked issues with reasons
bv --robot-priority     # AI-optimized priority output
bv --robot-insights     # Graph analysis
```

### Mutation Commands
```bash
bd create "Task"                         # Create issue
bd create "Task" --priority P1           # With priority
bd update <id> --status in-progress      # Update status
bd close <id>                            # Mark done
bd label add <id> agency                 # Add label
bd dep add <id> blocks <other>           # Add dependency
```

## Molecules & Chemistry (v0.34.0)

The molecule system uses a chemistry metaphor for work templates:

| Phase | Type | Persistence | Use Case |
|-------|------|-------------|----------|
| **Solid** | Proto | Template (reusable) | Workflow patterns |
| **Liquid** | Mol | Persistent (git-synced) | Feature work |
| **Vapor** | Wisp | Ephemeral (gitignored) | Scratch work, experiments |

### Protos (Templates)
```bash
# Create a proto from an existing epic
bd label add <epic-id> template

# View available protos
bd mol catalog

# Show proto structure
bd mol show <proto-id>

# Extract proto from ad-hoc work (reverse engineering)
bd mol distill <epic-id> --name "workflow-name"
```

### Spawning Molecules
```bash
# Create persistent mol from proto (solid → liquid)
bd pour <proto-id> --var name=auth

# Create ephemeral wisp from proto (solid → vapor)
bd wisp create <proto-id> --var name=experiment

# Full syntax with options
bd mol spawn <proto-id> --var key=value --assignee agent
```

### Wisps (Ephemeral Molecules)
Wisps live in `.beads-wisp/` (gitignored). Use for:
- Scratch work during exploration
- Experiments that may not pan out
- Session-scoped tasks

```bash
# Create wisp from proto
bd wisp create <proto-id>

# List all wisps with staleness
bd wisp list

# Garbage collect orphaned wisps
bd wisp gc

# Compress wisp to permanent digest
bd mol squash <wisp-id>

# Delete wisp without trace
bd mol burn <wisp-id>
```

### Bonding (Combining Work)
```bash
# Attach proto to existing mol
bd mol bond <mol-id> <proto-id>

# Force spawn as wisp when attaching
bd mol bond <mol-id> <proto-id> --wisp

# Force spawn as persistent mol
bd mol bond <wisp-id> <proto-id> --pour
```

## Label Conventions

### Properties (scope)
| Label | Purpose |
|-------|---------|
| `agency` | Client service work |
| `io` | Research, documentation, experiments |
| `space` | Practice, learning, tutorials |
| `ltd` | Canon, philosophy, patterns |

### Types (what)
| Label | Purpose |
|-------|---------|
| `feature` | New capability |
| `bug` | Something broken |
| `research` | Investigation, analysis |
| `refactor` | Structural improvement |

### Priority
Use `--priority P0-P4`:
- **P0**: Drop everything
- **P1**: This week
- **P2**: This month
- **P3**: Someday
- **P4**: Maybe never

## Dependency Patterns

```bash
# X blocks Y (Y cannot start until X completes)
bd dep add <X> blocks <Y>

# Parent-child (hierarchical)
bd dep add <child> parent <parent>

# Related (informational)
bd dep add <X> related <Y>

# Discovered-from (audit trail)
bd dep add <new> discovered-from <source>
```

### Cross-Project Dependencies (v0.34.0)
Reference issues across multiple Beads repositories:

```bash
# Configure additional repos
bd repo add /path/to/other/repo

# Add cross-project dependency
bd dep add <id> external:<repo>:<capability>

# Ship capability to satisfy external deps
bd ship <capability>

# bd ready filters by external dependency satisfaction
bd ready
```

## Robot Mode Flags

For AI agent consumption:

| Flag | Output |
|------|--------|
| `--robot-priority` | PageRank + Critical Path ranking |
| `--robot-insights` | Bottleneck and keystone detection |
| `--robot-plan` | Suggested execution sequence |

These provide machine-readable JSON output.

## Files

```
.beads/
├── beads.db      # Local SQLite cache (gitignored)
├── issues.jsonl  # Source of truth (Git-synced)
└── config.yaml   # Repository configuration

.beads-wisp/      # Ephemeral molecules (gitignored)
└── wisp.db       # Wisp-only SQLite database
```

## Maintenance

```bash
# Check installation health
bd doctor

# Sync with remote
bd sync

# Garbage collect wisps
bd wisp gc

# Compact old closed issues
bd compact

# Migrate tombstones (if warned by doctor)
bd migrate-tombstones
```

## Git Sync

```bash
# Sync issues with remote
bd sync

# Issues are stored in issues.jsonl and committed to Git
# Collision-resistant hash IDs (cs-a1b2) enable multi-agent work
```

## Integration with Claude Code

When starting a session:
1. Run `bv --robot-priority` to see highest-impact work
2. Use output to select focus area
3. Create issues for discovered tasks as you work
4. Close issues when completing work

The goal: **Hermeneutic continuity across context boundaries.**
