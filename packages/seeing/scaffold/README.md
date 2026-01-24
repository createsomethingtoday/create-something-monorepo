# Task Tracker MCP Server — Simple Loom

Your capstone project for the Seeing curriculum.

You're building **Simple Loom** — a task coordination system that teaches the patterns behind CREATE SOMETHING's automation infrastructure.

## What You're Learning

| Pattern | How It Appears Here |
|---------|---------------------|
| **Task Lifecycle** | `status: 'todo' \| 'doing' \| 'done'` |
| **State Persistence** | Tasks saved to `~/.tasks/tasks.json` |
| **External Memory** | Tasks survive process restarts |
| **Agent-Native** | Claude Code calls your tools directly |

This is **The Automation Layer** — the infrastructure between human intention and system execution.

## Setup

```bash
# 1. Copy this scaffold to your working directory
cp -r scaffold ~/my-task-tracker
cd ~/my-task-tracker

# 2. Install dependencies
npm install

# 3. Build
npm run build
```

## Your Task

Complete the TODOs in `src/index.ts`:

1. **TODO 1**: Define your tools (task_add, task_list, task_complete, task_remove)
2. **TODO 2**: Handle tool calls (implement each case in the switch statement)
3. **TODO 3**: Format returns (follow the expected formats in comments)

The storage layer (`src/tasks.ts`) is provided complete. You don't need to modify it.

## Testing

After completing your implementation:

```bash
# Build your changes
npm run build

# In Gemini CLI, run:
/capstone check
```

Gemini will test your server and help you fix any issues.

## Expected Tool Behavior

| Tool | Input | Expected Output |
|------|-------|-----------------|
| `task_add` | `{ title: "Test" }` | `{ task: { id, title, status: "todo", created } }` |
| `task_list` | `{}` or `{ status: "todo" }` | `{ tasks: [...] }` |
| `task_complete` | `{ id: "abc" }` | `{ task: { ... status: "done" } }` |
| `task_remove` | `{ id: "abc" }` | `{ removed: true }` |

## Connecting to Claude Code

Once your server works, add it to your MCP configuration:

```json
// .mcp.json or Claude Code settings
{
  "mcpServers": {
    "task-tracker": {
      "command": "node",
      "args": ["/path/to/my-task-tracker/dist/index.js"]
    }
  }
}
```

Then Claude Code can manage your tasks directly.

## The Triad Applied

As you build, apply the Subtractive Triad:

- **DRY**: The storage layer is provided — don't duplicate its logic
- **Rams**: Four tools is enough — resist adding more
- **Heidegger**: Return formats serve Claude Code's workflow — wrap data consistently

## What's Next

After completing the capstone, run `/graduate` to check your readiness for Dwelling.

You've built your first piece of automation infrastructure. The patterns you learned here — task lifecycle, state persistence, agent-native tools — are the foundation of WORKWAY's Focus Workflow.

**Want to go deeper?** [learn.createsomething.io](https://learn.createsomething.io) covers production automation.
