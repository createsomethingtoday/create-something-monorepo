# Gastown Patterns

Multi-agent orchestration built on Beads. Extends harness from single-session to multi-session coordination.

## Philosophy

**Propulsion Principle**: "If your hook has work, RUN IT."

This is Zuhandenheit applied to agent orchestration—agents execute without hesitation. The tool recedes into action; work happens.

## Nomenclature Mapping

CREATE SOMETHING uses selective renaming for Canon alignment:

| Gastown Term | CREATE SOMETHING | Rationale |
|--------------|------------------|-----------|
| `Mayor` | **Coordinator** | Describes function; "Mayor" is arbitrary |
| `Polecat` | **Worker** | Tool recedes; "Polecat" demands attention |
| `Deacon` | **Steward** | Aligns with "serves the practice" |
| `Rig` | Rig | Keep - descriptive |
| `Convoy` | Convoy | Keep - describes batched work |
| `Witness` | Witness | Keep - mirrors/observes |
| `Refinery` | Refinery | Keep - aligns with Beads "distill" |
| `Hook` | Hook | Keep - functional term |
| `Mail` | Mail | Keep - describes communication |

When reading upstream Gastown docs, translate: Mayor→Coordinator, Polecat→Worker, Deacon→Steward.

## Architecture

```
WezTerm
└── tmux (session persistence)
    ├── gt-coordinator    (you + Claude Code)
    ├── gt-witness-csm    (monitors workers)
    ├── gt-refinery-csm   (merge queue)
    └── gt-worker-N       (ephemeral workers)
```

### Role Descriptions

| Role | Purpose | Persistence |
|------|---------|-------------|
| **Coordinator** | Global orchestrator, assigns work | Persistent |
| **Witness** | Monitors worker health, recovers stuck agents | Persistent per-rig |
| **Refinery** | Processes merge queue, handles conflicts | Persistent per-rig |
| **Worker** | Executes discrete tasks | Ephemeral |
| **Steward** | Background daemon, manages lifecycle | Persistent |

## Command Reference

### Starting and Stopping

```bash
# Start Full Stack mode (launches tmux sessions)
gt start

# Stop all sessions
gt shutdown

# Check status
gt status
```

### Coordinator Operations

```bash
# Enter coordinator session
gt prime
# Or attach directly
gt coordinator attach

# Create convoy (batched work)
gt convoy create "Feature name" cs-xxx cs-yyy

# Assign work to rig
gt sling cs-xxx csm

# List active convoys
gt convoy list
```

### Worker Operations

```bash
# Check what's on your hook
gt hook

# Navigate current molecule
bd mol current

# Complete work and notify
gt done

# Check mail
gt mail inbox
```

### Session Navigation

Using tmux keybindings (prefix is `Ctrl-a`):

| Keys | Action |
|------|--------|
| `Ctrl-a g c` | Attach to Coordinator |
| `Ctrl-a g w` | Attach to Witness |
| `Ctrl-a g r` | Attach to Refinery |
| `Ctrl-a g s` | Session picker |

Or via `gt`:
```bash
gt coordinator attach
gt witness attach
gt refinery attach
```

## When to Use Gastown vs Harness

| Scenario | Tool | Why |
|----------|------|-----|
| Single issue, sequential work | `harness` | Lower overhead |
| Spec with 3+ independent features | Gastown convoy | Parallel execution |
| Multi-property parallel work | Gastown | Workers per property |
| Background long-running task | Gastown worker | Survives session limits |
| Complex orchestration | Gastown | Witness monitors, Refinery merges |

**Rule of thumb**: Use harness for focused work, Gastown for distributed work.

## Workflow: Feature Development

### 1. Create Convoy

```bash
# In Coordinator session
gt convoy create "Auth feature" cs-login cs-session cs-middleware
```

### 2. Assign Work

```bash
# Assign to monorepo rig
gt sling cs-login csm
gt sling cs-session csm
gt sling cs-middleware csm
```

### 3. Workers Execute

Workers auto-spawn. Each:
1. Checks hook: `gt hook`
2. Reads molecule: `bd mol current`
3. Executes steps
4. Completes: `gt done`

### 4. Refinery Merges

Refinery auto-processes completed work:
- Runs tests
- Handles conflicts
- Merges to main

### 5. Monitor Progress

```bash
gt convoy list
gt status
```

## Mail Protocol

Agent-to-agent communication:

| Message Type | From → To | Purpose |
|--------------|-----------|---------|
| `POLECAT_DONE` | Worker → Witness | Work completed |
| `MERGE_READY` | Witness → Refinery | Branch ready |
| `MERGED` | Refinery → Witness | Successfully merged |
| `MERGE_FAILED` | Refinery → Worker | Needs remediation |
| `HELP` | Any → Coordinator | Escalation |
| `HANDOFF` | Worker → Worker | Context transfer |

```bash
# Check inbox
gt mail inbox

# Send message
gt mail send witness-csm "HELP" "Blocked on API change"
```

## Molecule Integration

Gastown uses Beads molecules for structured work:

```bash
# Check current molecule position
bd mol current

# Close step and advance (propulsion!)
bd close <step-id> --continue

# Squash completed molecule to digest
bd mol squash

# Burn ephemeral work (no trace)
bd mol burn
```

## Rig Configuration

The CREATE SOMETHING monorepo is configured as a single rig:

```bash
# Add rig (already done during setup)
gt rig add csm /path/to/create-something-monorepo

# Workers use pnpm --filter for package scope
# Example: Worker on packages/agency
cd ~/gt/csm/polecats/worker-1
pnpm --filter=agency test
```

## Troubleshooting

### Worker Stuck

```bash
# Check witness logs
gt witness attach
# Look for health check failures

# Manually restart worker
gt polecat restart worker-1
```

### Merge Conflicts

```bash
# Refinery notifies worker via REWORK_REQUEST
gt mail inbox

# Worker resolves conflict
git fetch origin
git rebase origin/main
# Re-run tests
gt done
```

### Connection Issues

```bash
# Doctor check
gt doctor

# Verify Beads sync
bd sync --status
```

## Canon Alignment

| Gastown Principle | Heideggerian Interpretation |
|-------------------|----------------------------|
| Propulsion Principle | Zuhandenheit — tool recedes into action |
| Hook-based assignment | Work persists; agent is replaceable |
| Mail protocol | Structured coordination, not ad-hoc |
| Molecule workflow | Hermeneutic continuity across sessions |

**Gestell Warning**: Multi-agent orchestration can become Enframing—technology filling every gap. The question is whether Gastown enables dwelling (focused work) or accelerates consumption (work for work's sake).

**Test**: Does the convoy serve a coherent goal, or fragment attention? If the latter, use harness instead.

---

## Related Documentation

- [Harness Patterns](./harness-patterns.md) — Single-session orchestration
- [Beads Patterns](./beads-patterns.md) — Issue tracking and molecules
- [Dotfiles Conventions](./dotfiles-conventions.md) — tmux configuration
