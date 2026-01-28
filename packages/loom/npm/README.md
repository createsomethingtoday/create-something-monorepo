# @createsomething/loom-mcp

AI-native coordination layer. External memory for agents.

Multi-agent task routing, checkpointing, and crash recovery for Claude, Cursor, Codex, Gemini, and other AI coding assistants.

## Installation

### One-click (Cursor)

[Install in Cursor](cursor://anysphere.cursor-deeplink/mcp/install?name=loom&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyJAY3JlYXRlc29tZXRoaW5nL2xvb20tbWNwIl19)

### npm

```bash
npm install -g @createsomething/loom-mcp
```

### npx (no install)

```bash
npx @createsomething/loom-mcp
```

## Quick Start

```bash
# Initialize Loom in your project
lm init

# Start working on something (create + claim atomically)
lm work "Fix the authentication bug" --agent claude-code

# Checkpoint progress (crash recovery)
lm checkpoint "JWT validation complete"

# Get routing recommendation
lm route lm-abc --strategy cheapest

# Complete with evidence
lm done lm-abc --evidence "commit-abc123"
```

## MCP Integration

Add to your `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "loom": {
      "command": "loom-mcp",
      "args": ["--path", "."]
    }
  }
}
```

Or for Claude Desktop, add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "loom": {
      "command": "npx",
      "args": ["@createsomething/loom-mcp"]
    }
  }
}
```

## Available MCP Tools

### Task Management
- `loom_work` — Quick start: create and claim task atomically
- `loom_create` — Create task for multi-agent coordination
- `loom_claim`, `loom_complete`, `loom_cancel`
- `loom_spawn` — Create sub-tasks
- `loom_ready`, `loom_mine`, `loom_blocked`

### Smart Routing
- `loom_route` — Get agent recommendation (best/cheapest/fastest)
- `loom_agents` — List all configured agents
- `loom_analytics` — Execution analytics

### Sessions & Memory
- `loom_session_start`, `loom_session_end`
- `loom_checkpoint` — Save progress for crash recovery
- `loom_recover`, `loom_resume` — Resume from any point
- `loom_get_resume_brief` — Generate context for session continuity

### Formulas
- `loom_formulas` — List available workflow templates
- `loom_formula` — Get formula details

## MCP Apps (Interactive UIs)

Loom supports the [MCP Apps extension](https://modelcontextprotocol.io/docs/concepts/apps) for interactive task visualization directly in the conversation.

### Task Board UI

When you call task visibility tools (`loom_list`, `loom_ready`, `loom_summary`, `loom_mine`, `loom_blocked`), supported MCP clients can render an interactive Kanban-style task board:

- Drag-and-drop between columns (Ready, In Progress, Blocked, Done)
- One-click claim, complete, or release tasks
- Real-time status updates
- Filter by status, label, or agent

**Supported Clients**: Claude.ai, VS Code (Insiders), ChatGPT, Goose

The UI is served via `ui://loom/task-board` resource and communicates with the server via postMessage.

## Why Loom?

| Feature | Beads | Gas Town | Loom |
|---------|-------|----------|------|
| Multi-agent | ❌ | ❌ | ✅ |
| Smart routing | ❌ | Basic | ✅ |
| Session memory | ❌ | ✅ | ✅ |
| Crash recovery | ❌ | ✅ | ✅ |
| Git sync | ✅ | ❌ | ✅ |
| Ground integration | ❌ | ❌ | ✅ |
| Cost optimization | ❌ | ❌ | ✅ |

## Documentation

See the [full documentation](https://github.com/createsomethingtoday/create-something-monorepo/tree/main/packages/loom) for:

- Agent configuration
- Custom formulas
- Orchestrator (Ralph pattern)
- Library usage (Rust)

## License

MIT
