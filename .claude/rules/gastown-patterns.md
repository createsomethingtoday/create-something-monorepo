# Gastown Patterns

Multi-agent orchestration built on Beads. Extends harness from single-session to multi-session coordination.

*Canonical source: Steve Yegge's "Welcome to Gas Town" (January 1, 2026)*

## Philosophy

### GUPP: Gastown Universal Propulsion Principle

**If there is work on your hook, YOU MUST RUN IT.**

This is Zuhandenheit applied to agent orchestration—agents execute without hesitation. The tool recedes into action; work happens.

All Gastown workers are prompted to follow "physics over politeness." They check their hook on startup. If their hook has work, they start working immediately without waiting for user input.

**The GUPP Nudge**: Claude Code is sometimes too polite—it waits for user input even when GUPP should apply. Gastown works around this with `gt nudge`, which sends a tmux notification to kick the worker into action. Workers receive a startup poke 30-60 seconds after session start if they haven't already begun working.

The nudge content doesn't matter—"hi", "do your job", anything works. The agent's prompting is strict about GUPP, so it ignores the nudge text and simply checks its hook.

### Nondeterministic Idempotence (NDI)

Work outcomes are guaranteed regardless of crashes, compactions, or restarts.

| Concept | Persistence |
|---------|-------------|
| Agent | Bead (persistent identity) |
| Session | Cattle (ephemeral) |
| Hook | Bead (persistent) |
| Molecule | Chain of Beads (persistent) |

Because everything lives in Beads (backed by Git), sessions can crash and new ones pick up where the old left off. The AI figures out where it was and continues. The path is nondeterministic; the outcome is guaranteed.

## Prerequisites

### The 8 Stages of Dev Evolution

| Stage | Description |
|-------|-------------|
| 1 | Zero/Near-Zero AI (maybe code completions) |
| 2 | Coding agent in IDE, permissions on |
| 3 | Agent in IDE, YOLO mode |
| 4 | In IDE, wide agent (code just for diffs) |
| 5 | CLI, single agent, YOLO |
| 6 | CLI, multi-agent (3-5 parallel) |
| 7 | 10+ agents, hand-managed |
| 8 | Building your own orchestrator |

**Requirement**: Stage 7+ to use Gastown effectively. If you're not already juggling 5+ Claude Code instances daily, Gastown will overwhelm you.

### Cost Warning

Gastown is expensive. Multiple Claude Code accounts may be needed to sustain high-velocity work. This is a cash guzzler by design—throughput over efficiency.

### tmux Requirement

Gastown uses tmux as its primary UI. Essential commands:

| Keys | Action |
|------|--------|
| `C-b s` | List sessions, switch to one |
| `C-b [` | Enter copy mode (scroll), ESC to exit |
| `C-b n/p` | Cycle to next/previous worker in group |
| `C-b a` | Activity feed view |

tmux is surprisingly powerful and stays out of your way. Better UIs will come; tmux is what works now.

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
| `Dogs` | Dogs | Keep - from Slow Horses |
| `Boot` | Boot | Keep - special dog role |
| `Crew` | Crew | Keep - per-rig workers |
| `Overseer` | Overseer | Keep - human operator |

When reading upstream Gastown docs, translate: Mayor→Coordinator, Polecat→Worker, Deacon→Steward.

### Shell Aliases

CREATE SOMETHING provides shell aliases for the renamed roles:

```bash
# Source aliases (automatic after running dotfiles installer)
source packages/dotfiles/shell/gastown-aliases.sh

# Now use canonical terminology:
coordinator attach    # equivalent to: gt mayor attach
worker list          # equivalent to: gt polecat list
steward health-check # equivalent to: gt deacon health-check
```

## Architecture

```
WezTerm
└── tmux (session persistence)
    ├── gt-coordinator    (you + Claude Code)
    ├── gt-witness-csm    (monitors workers per rig)
    ├── gt-refinery-csm   (merge queue per rig)
    ├── gt-steward        (town daemon)
    ├── gt-dog-N          (steward's helpers)
    ├── gt-crew-N         (your personal workers per rig)
    └── gt-worker-N       (ephemeral swarm workers)
```

### Role Descriptions

| Role | Purpose | Persistence | Scope |
|------|---------|-------------|-------|
| **Overseer** | Human operator (you), has identity in system | Persistent | Town |
| **Coordinator** | Global orchestrator, assigns work, your concierge | Persistent | Town |
| **Steward** | Background daemon, manages lifecycle, runs town plugins | Persistent | Town |
| **Dogs** | Steward's personal crew for handyman work | Persistent | Town |
| **Boot** | Special dog that checks Steward every 5 min | Persistent | Town |
| **Witness** | Monitors worker health, recovers stuck agents, runs rig plugins | Persistent | Rig |
| **Refinery** | Processes merge queue, handles conflicts | Persistent | Rig |
| **Crew** | Long-lived workers for Overseer (you), great for design work | Persistent | Rig |
| **Worker** | Ephemeral swarm workers for convoys | Ephemeral | Rig |

**Town-level roles** (Coordinator, Steward, Dogs) orchestrate across all rigs.
**Rig-level roles** (Witness, Refinery, Crew, Workers) operate within a single project.

### Pinned Beads (Agent Identities)

Gastown agents are not sessions—they're persistent identities backed by Beads:

| Bead Type | Description |
|-----------|-------------|
| **Role Bead** | Domain table describing the role (priming info, etc.) |
| **Agent Bead** | Persistent agent identity with singleton global address |
| **Hook Bead** | Where molecules hang for this agent |

All are "pinned beads"—they float like sticky notes, never get closed, don't show in `bd ready`. Sessions are cattle thrown at persistent work; agents persist across sessions.

### Two-Tier Beads Structure

```
Town Beads (~/gt/.beads/)
├── Orchestration workflows
├── Releases, reviews
├── Town-level patrols
└── Cross-rig coordination

Rig Beads (~/gt/csm/.beads/)
├── Project work (features, bugs)
├── Rig-level patrols
└── Convoy tracking
```

Cross-rig routing: `bd` commands route to the right database based on issue prefix (e.g., `bd-`, `wy-`, `cs-`). All commands work anywhere in Gastown.

## MEOW Stack (Molecular Expression of Work)

The algebra of work in Gastown:

```
Beads → Epics → Molecules → Protomolecules → Formulas → Wisps
```

| Layer | Description | Persistence |
|-------|-------------|-------------|
| **Beads** | Atomic work units (issues) | Git-synced |
| **Epics** | Beads with children (parallel by default, can add deps) | Git-synced |
| **Molecules** | Workflows as chained beads (arbitrary shapes, Turing-complete) | Git-synced |
| **Protomolecules** | Templates/classes for molecules, instantiated with variable substitution | Git-synced |
| **Formulas** | TOML source for workflows, "cooked" into protomolecules | Source files |
| **Wisps** | Ephemeral molecules (vapor phase), burned after completion | Gitignored |

### Formulas and Cooking

Formulas are TOML files that describe workflows with loops, gates, and composition:

```toml
[formula]
name = "feature-workflow"
steps = ["design", "plan", "implement", "review", "test"]

[step.design]
title = "Design {{name}}"
acceptance = ["Design doc exists", "Approved by reviewer"]

[step.implement]
depends_on = ["design", "plan"]
title = "Implement {{name}}"
```

"Cooking" converts formulas → protomolecules → instantiated wisps or mols.

### Wisps (Vapor Phase)

Wisps are ephemeral Beads—in the database with hash IDs, but not persisted to Git. Use for:

- High-velocity orchestration workflows
- Patrol runs (every patrol creates a wisp)
- Work that shouldn't pollute Git history

At completion, wisps are "burned" (destroyed) or optionally "squashed" into a single-line digest committed to Git.

## Command Reference

### Starting and Stopping

```bash
# Start Full Stack mode (launches tmux sessions)
gt start

# Stop all sessions
gt shutdown

# Check status
gt status

# Wake the town (after quiescence)
gt wake
```

### Coordinator Operations

```bash
# Enter coordinator session
gt prime
# Or attach directly
coordinator attach       # alias for: gt mayor attach

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

### Session Management

```bash
# Graceful handoff (or say "let's hand off" or /handoff)
gt handoff

# Nudge a worker to check its hook
gt nudge <worker>

# Nudge a whole channel
gt nudge --channel workers

# Communicate with predecessor session
gt seance
```

**gt handoff**: Worker optionally sends itself work, then restarts its session. GUPP ensures the successor picks up where you left off.

**gt seance**: Worker spins up Claude Code subprocess, uses `/resume` to find its predecessor's conversation, and asks "Where's my stuff?" Useful for recovering context that didn't transfer cleanly.

### Session Navigation

Using tmux keybindings (prefix is `Ctrl-a`):

| Keys | Action |
|------|--------|
| `Ctrl-a g c` | Attach to Coordinator |
| `Ctrl-a g w` | Attach to Witness |
| `Ctrl-a g r` | Attach to Refinery |
| `Ctrl-a g s` | Session picker |

Or via shell aliases:
```bash
coordinator attach   # gt mayor attach
gt witness attach
gt refinery attach
```

## Convoys and Swarms

### Convoys

Everything rolls up into a **Convoy**—Gastown's ticketing/work-order system:

```bash
# Create convoy
gt convoy create "Auth feature" cs-login cs-session cs-middleware

# View convoy dashboard
gt convoy list

# Track progress
gt convoy show <convoy-id>
```

A Convoy wraps work into a trackable delivery unit. It doesn't use Epic structure—tracked issues may already have parents. The convoy is the feature-level abstraction.

### Swarms

A **swarm** is ephemeral agent sessions attacking persistent work:

- Multiple swarms can attack the same convoy before completion
- Witness recycles workers, pushes them on issues
- Swarm workers produce Merge Requests, hand off to Refinery

```bash
# Assign to create swarm
gt sling cs-xxx csm
gt sling cs-yyy csm
gt sling cs-zzz csm
```

Workers auto-spawn, check hooks, execute, complete.

### Workflow: Feature Development

1. **Create Convoy**
   ```bash
   gt convoy create "Auth feature" cs-login cs-session cs-middleware
   ```

2. **Assign Work**
   ```bash
   gt sling cs-login csm
   gt sling cs-session csm
   gt sling cs-middleware csm
   ```

3. **Workers Execute**
   - Check hook: `gt hook`
   - Read molecule: `bd mol current`
   - Execute steps
   - Complete: `gt done`

4. **Refinery Merges**
   - Processes merge queue
   - Runs tests
   - Handles conflicts
   - Merges to main

5. **Convoy Lands**
   - Coordinator notified
   - Dashboard updated

## Patrols

**Patrols** are ephemeral workflows (wisps) that patrol agents run in loops. They have exponential backoff—agents sleep longer when finding no work.

### Refinery Patrol

1. Preflight: Clean up workspace
2. Process Merge Queue until empty (or session recycle needed)
3. Postflight: Prepare for handoff

### Witness Patrol

1. Check worker wellbeing
2. Check Refinery status
3. Peek at Steward (ensure not stuck)
4. Run rig-level plugins

### Steward Patrol

1. Run town-level plugins
2. Handle `gt handoff` protocol
3. Session recycling
4. Worker cleanup

The daemon pings the Steward every few minutes with an **Impetus** signal. Steward propagates this downward to other workers.

**Boot the Dog**: Special dog awakened every 5 minutes just to check on the Steward. Decides if Steward needs a heartbeat, nudge, restart, or to be left alone.

## Mail Protocol

Agent-to-agent communication:

| Message Type | From → To | Purpose |
|--------------|-----------|---------|
| `WORKER_DONE` | Worker → Witness | Work completed (upstream: `POLECAT_DONE`) |
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

## Plugins

A **plugin** is "coordinated or scheduled attention from an agent"—a step in a patrol that can run for extended time.

| Level | Runner | Examples |
|-------|--------|----------|
| Town-level | Steward (with Dogs) | Releases, reviews, new UIs |
| Rig-level | Witness | Quality gates, monitoring |

Dogs handle long-running work so Steward's patrol doesn't get blocked. Infrastructure is in place; formulas for plugins will be available in the **Mol Mall** (marketplace).

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
# Nudge the worker
gt nudge worker-1

# Check witness logs
gt witness attach
# Look for health check failures

# Manually restart worker
worker restart worker-1   # alias for: gt polecat restart worker-1
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

### GUPP Not Working

If workers sit idle instead of checking hooks:

```bash
# Manual nudge
gt nudge <worker>

# Check if town is awake
gt status

# Wake town if quiescent
gt wake
```

## Terminology Glossary

| Term | Meaning |
|------|---------|
| **Guzzoline** | Molecularized work—the sea of all work |
| **War Rig** | A rig's contribution to a cross-rig convoy |
| **Cattle vs Pets** | Sessions are cattle (ephemeral); agents are pets (persistent) |
| **Cooking** | Converting formulas → protomolecules |
| **Slinging** | `gt sling`—assign work to a worker's hook |
| **Burning** | Destroying a wisp after completion |
| **Squashing** | Compressing a wisp to a single-line digest in Git |
| **Impetus** | Heartbeat signal from daemon—triggers patrol check |

## Architectural Comparison

### Kubernetes Parallel

| Gastown | Kubernetes |
|---------|------------|
| Coordinator | kube-scheduler / controller-manager |
| Rig | Node |
| Witness | kubelet |
| Worker | Pod |
| Beads | etcd |

**Key difference**: Kubernetes asks "Is it running?" (uptime). Gastown asks "Is it done?" (completion). K8s reconciles toward continuous desired state; Gastown proceeds toward terminal goals.

### Temporal Parallel

Like Temporal's durable replay, Gastown achieves workflow durability—but through completely different machinery. Temporal uses deterministic replay; Gastown uses nondeterministic idempotence (NDI) with AI figuring out where it left off.

## When to Use Gastown vs Harness

| Scenario | Tool | Why |
|----------|------|-----|
| Single issue, sequential work | `harness` | Lower overhead |
| Spec with 3+ independent features | Gastown convoy | Parallel execution |
| Multi-property parallel work | Gastown | Workers per property |
| Background long-running task | Gastown worker | Survives session limits |
| Complex orchestration | Gastown | Witness monitors, Refinery merges |

**Rule of thumb**: Use harness for focused work, Gastown for distributed work.

## Canon Alignment

| Gastown Principle | Heideggerian Interpretation |
|-------------------|----------------------------|
| GUPP | Zuhandenheit — tool recedes into action |
| NDI | Work persists; sessions are replaceable |
| Hook-based assignment | Work persists; agent identity persists |
| Mail protocol | Structured coordination, not ad-hoc |
| Molecule workflow | Hermeneutic continuity across sessions |
| Cattle vs Pets | Sessions are thrown at persistent work |

**Gestell Warning**: Multi-agent orchestration can become Enframing—technology filling every gap. The question is whether Gastown enables dwelling (focused work) or accelerates consumption (work for work's sake).

**Test**: Does the convoy serve a coherent goal, or fragment attention? If the latter, use harness instead.

**Vibe Coding Acknowledgment**: Gastown embraces chaos. Work is fluid, slopped around like fish into barrels. Most work gets done; some gets lost. Fish fall out. More fish will come. The focus is throughput: creation and correction at the speed of thought.

---

## Related Documentation

- [Harness Patterns](./harness-patterns.md) — Single-session orchestration
- [Beads Patterns](./beads-patterns.md) — Issue tracking and MEOW stack
- [Dotfiles Conventions](./dotfiles-conventions.md) — tmux configuration
