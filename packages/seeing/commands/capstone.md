# /capstone — Build Simple Loom

Your capstone project: build a Task Tracker MCP server.

## Usage

```
/capstone           # Start the capstone, get setup instructions
/capstone check     # Test your implementation (Simple Ground)
/capstone complete  # Mark capstone done, record reflection
```

## Prompt Template

### When Starting (`/capstone`)

Guide the user through setup:

```
# Capstone: Building Simple Loom

You're about to build your first piece of automation infrastructure.

**Simple Loom** is a Task Tracker MCP server that Claude Code can use to manage tasks. You'll learn the patterns behind Loom (task coordination) and Ground (evidence-first verification).

## Setup

1. Copy the scaffold:
   ```bash
   cp -r [seeing-package]/scaffold ~/my-task-tracker
   cd ~/my-task-tracker
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Open `src/index.ts` and complete the TODOs

4. Build and test:
   ```bash
   npm run build
   ```

5. When ready, run `/capstone check` and I'll test your implementation.

## What You're Building

Four tools:
- `task_add` — Add a new task
- `task_list` — List tasks (with optional status filter)
- `task_complete` — Mark a task as done
- `task_remove` — Delete a task

The storage layer (`src/tasks.ts`) is provided complete.

Would you like me to walk through the scaffold structure, or are you ready to start building?
```

Update progress: `capstone.status = 'in_progress'`

### When Checking (`/capstone check`)

This is **Simple Ground** — agent-native verification.

```
Let me test your Task Tracker MCP server...

[Call seeing_capstone_check tool with user's server path]
```

The tool returns structured diagnostics. Interpret them for the user:

**If server doesn't start:**
```
Your server didn't start. Here's the error:

[error message]

Common causes:
- TypeScript compilation errors (run `npm run build`)
- Missing imports
- Syntax errors in tool definitions

Fix the issue and run `/capstone check` again.
```

**If tools are missing:**
```
I found [N] of 4 expected tools:

✓ task_add
✗ task_list (missing)
✓ task_complete
✗ task_remove (missing)

Check your TOOLS array in `src/index.ts`. Each tool needs a name, description, and inputSchema.
```

**If tools fail:**
```
Testing your tools...

✓ task_add — works correctly
✗ task_list — returns wrong format
  
  Expected: { tasks: [...] }
  Got: [...]
  
  In your handler, wrap the array:
  ```typescript
  return { content: [{ type: 'text', text: JSON.stringify({ tasks }) }] };
  ```
  
  Not:
  ```typescript
  return { content: [{ type: 'text', text: JSON.stringify(tasks) }] };
  ```

✓ task_complete — works correctly
✓ task_remove — works correctly

Fix task_list and run `/capstone check` again.
```

**If all pass:**
```
All checks pass! Your Simple Loom is working.

✓ Server starts correctly
✓ task_add — returns { task: {...} }
✓ task_list — returns { tasks: [...] }
✓ task_complete — returns { task: {...} } or { error: '...' }
✓ task_remove — returns { removed: true/false }

Ready to connect to Claude Code?

Add this to your .mcp.json:
```json
{
  "mcpServers": {
    "task-tracker": {
      "command": "node",
      "args": ["/path/to/my-task-tracker/dist/index.js"]
    }
  }
}
```

When you're ready to complete the capstone, run `/capstone complete`.
```

### When Completing (`/capstone complete`)

Guide reflection:

```
# Completing Your Capstone

Before marking this done, let's reflect on what you learned.

**1. Where did the Triad guide you?**

Think about:
- DRY: What patterns did you reuse?
- Rams: What didn't earn its existence?
- Heidegger: How did you think about Claude Code's workflow?

**2. What pattern do you see now?**

The task lifecycle. The external memory. The tool boundaries.

**3. What would you do differently?**

Share your thoughts. This reflection becomes part of your progress.
```

Wait for their response. Then:

```
# Capstone Complete

You've built Simple Loom — your first automation infrastructure.

**What you learned:**
- Task lifecycle patterns (todo → doing → done)
- State persistence (external memory for agents)
- Agent-native tool design
- Evidence-first verification (Simple Ground)

**What's next:**
Run `/graduate` to check your readiness for Dwelling.

Your Task Tracker works. You can keep using it with Claude Code. You've built something real.
```

Update progress:
```json
{
  "capstone": {
    "status": "completed",
    "completedAt": Date.now(),
    "triadFindings": { ... from reflection },
    "reflection": "..."
  }
}
```

## Diagnostics Structure

The `seeing_capstone_check` tool returns:

```typescript
interface CapstoneCheckResult {
  serverStarts: boolean;
  serverError?: string;
  tools: {
    name: string;
    exists: boolean;
    works: boolean;
    error?: string;
    expected?: string;
    actual?: string;
  }[];
  ready: boolean;
}
```

Always interpret this for the user. Don't show raw JSON. Provide actionable guidance.

## Expected Tool Behavior

| Tool | Input | Expected Output |
|------|-------|-----------------|
| `task_add` | `{ title: "Test" }` | `{ task: { id, title, status: "todo", created } }` |
| `task_list` | `{}` | `{ tasks: [...] }` |
| `task_list` | `{ status: "todo" }` | `{ tasks: [... filtered] }` |
| `task_complete` | `{ id: "valid" }` | `{ task: { ... status: "done" } }` |
| `task_complete` | `{ id: "invalid" }` | `{ error: "Task not found" }` |
| `task_remove` | `{ id: "valid" }` | `{ removed: true }` |
| `task_remove` | `{ id: "invalid" }` | `{ removed: false }` or `{ error: "..." }` |
