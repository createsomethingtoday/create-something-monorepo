# Loom

**AI-native coordination layer. External memory for agents.**

Loom is Create Something's answer to Steve Yegge's Beads and Gas Town - but optimized for multi-agent workflows with Claude Code, Cursor, Codex, Gemini, and any other AI coding assistant.

## Why Loom?

| Feature | Beads | Gas Town | Loom |
|---------|-------|----------|------|
| Multi-agent | ❌ | ❌ (Claude-only) | ✅ First-class |
| Smart routing | ❌ | Basic | ✅ Cost + capability |
| Session memory | ❌ | ✅ | ✅ With checkpoints |
| Crash recovery | ❌ | ✅ | ✅ Resume any point |
| Formulas | ❌ | ✅ Polecats | ✅ Flexible workflows |
| Git sync | ✅ | ❌ | ✅ Native |
| Ground integration | ❌ | ❌ | ✅ Verified completions |
| Cost optimization | ❌ | ❌ | ✅ Arlington economics |

## Quick Start

```bash
# Install (if you have Rust)
cargo install --path packages/loom

# Or use npm wrapper
npm install @create-something/loom

# Initialize in your project
lm init

# Create and work on tasks
lm create "Fix authentication bug"
lm ready      # See what's ready to work on
lm claim lm-abc --agent claude-code
lm done lm-abc --evidence "commit 123abc"

# Use smart routing
lm route lm-abc --strategy best
lm route lm-abc --strategy cheapest
```

## Core Concepts

### Tasks

Tasks are units of work with:
- **ID**: Auto-generated (e.g., `lm-abc123`)
- **Status**: `ready`, `claimed`, `blocked`, `done`, `cancelled`
- **Labels**: For routing and filtering (e.g., `planning`, `ui`, `refactor`)
- **Dependencies**: Tasks can be blocked by other tasks
- **Evidence**: Completion proof (commit hash, Ground verification)

### Smart Routing

Loom considers multiple factors when routing tasks:
- **Capabilities**: Claude is best for planning, Cursor for UI, Gemini for large context
- **Quality history**: Agents learn from past success/failure
- **Cost**: Route to cheapest agent that can do the job
- **Availability**: Balance load across agents

```bash
# Get routing recommendation
lm route lm-abc

# Routing Decision
# ================
# Agent:      claude-code
# Reason:     Best match for labels [planning, architecture] (score: 0.85)
# Cost:       $0.1234
# Confidence: 85%
# Alternatives: [cursor, codex]
```

### Session Memory

Agents can remember context across tasks:

```bash
# Start a session
lm session start lm-abc --agent claude-code

# Create checkpoints (crash recovery points)
lm checkpoint "Initial analysis complete"
lm checkpoint "Implementation 50% done"

# If something goes wrong
lm recover              # List recoverable sessions
lm resume ses-xyz789    # Resume from last checkpoint
```

### Rich Session Context

Sessions track detailed context for pause/resume (unified from Harness):

```rust
use loom::{SessionContext, FileModification, ChangeType, Decision, TestState};

// Track file modifications with line counts
context.add_file_modified(FileModification {
    path: "src/auth.rs".to_string(),
    summary: "Added JWT validation".to_string(),
    change_type: ChangeType::Modified,
    lines_added: Some(45),
    lines_removed: Some(12),
});

// Record decisions with rationale
context.add_decision(
    "Use RS256 for JWT",
    "Better for distributed systems, supports key rotation"
);

// Track test state
context.record_test_state(TestState {
    passed: 42,
    failed: 2,
    skipped: 1,
    failing_tests: vec!["test_auth_timeout".to_string()],
    duration_ms: 3500,
});

// Generate resume brief for next session
let brief = context.generate_resume_brief();
// Returns markdown summary of current state for priming prompts
```

### Formulas

Repeatable workflows for common patterns:

```bash
# List available formulas
lm formula list
#   basic-task     - Simple, mechanical task with clear scope
#   feature        - Implement a new feature with planning and testing
#   bug-fix        - Diagnose and fix a bug
#   refactor       - Refactor code with DRY verification

# Show formula details
lm formula show feature

# Run a formula
lm formula run feature --vars feature_name=dark-mode --vars package=io
```

### Ground Verification

Complete tasks with verified evidence:

```rust
// Tasks with labels like "dry" or "refactor" trigger Ground checks
loom.complete_with_verification("lm-abc")?;

// Ground Verification Results:
//   ✓ duplicates: 0 issues
//   ✓ duplicate_functions: 0 issues  
// Overall: PASSED
```

## CLI Reference

### Task Management

```bash
lm init                          # Initialize Loom
lm create "title"                # Create task
lm create "title" -l planning    # With labels
lm claim ID --agent NAME         # Claim task
lm release ID                    # Release task
lm done ID --evidence "..."      # Complete task
lm cancel ID                     # Cancel task
lm spawn PARENT "title"          # Create sub-task
```

### Queries

```bash
lm ready                         # Tasks ready to work on
lm mine --agent NAME             # Tasks claimed by agent
lm list                          # All tasks
lm list --status done            # By status
lm list --label planning         # By label
lm show ID                       # Task details
lm summary                       # Work overview
```

### Dependencies

```bash
lm block TASK --by OTHER         # Add dependency
lm unblock TASK --by OTHER       # Remove dependency
```

### Routing

```bash
lm route ID                      # Best agent recommendation
lm route ID --strategy cheapest  # Cheapest capable agent
lm route ID --strategy fastest   # Fastest available agent
lm route ID --max-cost 0.50      # With cost constraint
lm agents                        # List all agents
lm agent claude-code             # Agent details
```

### Sessions

```bash
lm session start TASK --agent NAME    # Start session
lm session current TASK               # Current session
lm session end --status completed     # End session
lm checkpoint "summary"               # Create checkpoint
lm recover                            # List recoverable sessions
lm resume SESSION_ID                  # Resume session
```

### Formulas

```bash
lm formula list                  # List formulas
lm formula show NAME             # Show formula details
lm formula run NAME --vars k=v   # Execute formula
```

### Git Sync

```bash
lm sync                          # Full sync
lm push                          # Export and push
lm pull                          # Fetch and import
```

## MCP Integration

Loom exposes all functionality via MCP (Model Context Protocol):

```json
// .cursor/mcp.json
{
  "mcpServers": {
    "loom": {
      "command": "loom-mcp",
      "args": ["--path", "."]
    }
  }
}
```

Available MCP tools:

**Task Management:**
- `loom_work` - Quick start: create and claim in one call
- `loom_create`, `loom_claim`, `loom_complete`, `loom_cancel`
- `loom_spawn` - Create sub-tasks
- `loom_ready`, `loom_mine`, `loom_blocked`, `loom_get`, `loom_list`, `loom_summary`
- `loom_block`, `loom_unblock`

**Smart Routing:**
- `loom_route`, `loom_agents`
- `loom_record_execution` - Learning from past executions

**Sessions & Memory:**
- `loom_session_start`, `loom_session_end`, `loom_checkpoint`, `loom_recover`, `loom_resume`
- `loom_update_context` - Rich session context (files modified, decisions, test state)
- `loom_get_resume_brief` - Generate resume context for session continuity

**GSD-Inspired Pre-Planning:**
- `loom_discuss` - Capture implementation preferences before planning
- `loom_verify_plan` - Validate plans before execution

**Formulas:**
- `loom_formulas`, `loom_formula`

## Library Usage

```rust
use loom::{Loom, CreateTask, RoutingStrategy, RoutingConstraints};

// Open or initialize
let mut loom = Loom::open_or_init(".")?;

// Create task
let task = loom.create_task(CreateTask {
    title: "Implement dark mode".to_string(),
    labels: vec!["feature".to_string(), "ui".to_string()],
    ..Default::default()
})?;

// Route to best agent
let decision = loom.route(&task)?;
println!("Route to: {} ({})", decision.agent_id, decision.reason);

// Start session with checkpoint support
let session = loom.start_session(&task.id, &decision.agent_id)?;
loom.checkpoint(&session.id, "Planning complete")?;

// Complete with verification
loom.complete_with_verification(&task.id)?;
```

## Directory Structure

```
.loom/
├── work.db           # Tasks (SQLite)
├── agents.db         # Agent profiles and history
├── memory.db         # Sessions and checkpoints
├── run.sock          # Daemon socket
├── dispatch.toml     # Agent configuration
├── formulas/         # Custom formulas (TOML)
├── tasks.jsonl       # Git sync export
└── log/              # Daemon logs
```

## Agent Configuration

Edit `.loom/dispatch.toml`:

```toml
[agents.claude]
path = "claude"
max_concurrent = 5
cost_per_1k = 0.015

[agents.cursor]
path = "cursor"
max_concurrent = 2
cost_per_1k = 0.020

[agents.codex]
path = "codex"
max_concurrent = 3
cost_per_1k = 0.008

[agents.gemini]
path = "gemini"
max_concurrent = 3
cost_per_1k = 0.001

[routing]
default = "claude"
labels = { ui = "cursor", api = "codex", planning = "claude" }
```

## Custom Formulas

Create `.loom/formulas/my-formula.toml`:

```toml
name = "code-review"
description = "Review code for quality issues"
quality = "premium"
agent = "claude-code"

[[variables]]
name = "target"
description = "File or directory to review"
required = true

[[steps]]
id = "analyze"
title = "Analyze code"
description = "Review for patterns, anti-patterns, and issues"
checkpoint = true

[[steps]]
id = "report"
title = "Generate report"
description = "Create actionable recommendations"

[success_criteria]
criteria = ["All issues documented", "Recommendations provided"]
ground_checks = ["duplicates", "dead_exports"]
```

## Orchestrator (Ralph Pattern)

Loom includes an autonomous orchestrator that implements the Ralph pattern:
**fresh context per task, multi-backend support**.

```bash
# Start the daemon for autonomous task processing
lm daemon start

# Or run programmatically
use loom::{Orchestrator, OrchestratorConfig};

let mut loom = Loom::open(".")?;
let orchestrator = Orchestrator::with_config(OrchestratorConfig {
    backends: vec![AgentBackend::ClaudeCode, AgentBackend::GeminiPro],
    notifications: true,
    ..Default::default()
});

orchestrator.run_loop(&mut loom)?;
```

### Multi-Backend Support

| Backend | Command | Best For |
|---------|---------|----------|
| Claude Code | `claude --print -p` | Planning, architecture, complex reasoning |
| Gemini Pro | `gemini --yolo -m gemini-2.5-pro` | Large codebase, 1M+ context |
| Gemini Flash | `gemini --yolo -m gemini-2.5-flash` | Mechanical tasks, cost optimization |

Tasks are automatically routed to the best backend based on:
- **Complexity**: Architecture → Claude Code, Typo fix → Gemini Flash
- **Priority**: Critical → Claude Code, Low → Gemini Flash
- **Labels**: `planning` → Claude Code, `refactor` → depends on scope

### System Notifications

The orchestrator sends system notifications for task events:
- macOS: via `osascript`
- Linux: via `notify-send`

```rust
use loom::send_notification;

send_notification("Task Complete", "Fixed authentication bug")?;
```

## Architecture

Loom uses SQLite for persistence with three databases:
- **work.db**: Task management (status, dependencies, evidence)
- **agents.db**: Agent profiles, capabilities, and execution history
- **memory.db**: Sessions, checkpoints, and context

The daemon (`lm daemon start`) provides:
- Unix socket for IPC
- Background task processing
- Agent dispatch and monitoring
- Autonomous orchestration via the Orchestrator module

## License

MIT
