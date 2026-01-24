# Capstone: Building Simple Loom

You're about to build your first piece of automation infrastructure.

Not a demo. Not a tutorial exercise. A working tool that Claude Code can use to manage your tasks.

## What You're Building

**Simple Loom** — a Task Tracker MCP server.

```
Your Intention                The Automation Layer              Execution
─────────────────            ─────────────────────             ──────────
"Add a task"         →       Your MCP Server          →        Task saved
"What's on my list?" →       (Simple Loom)            →        Tasks returned
"Mark it done"       →                                →        Status updated
```

The MCP server sits between intention and execution. That's The Automation Layer.

## Why This Matters

This isn't just a capstone exercise. You're learning the patterns behind real systems:

| What You Build | Production Version |
|----------------|-------------------|
| Task lifecycle (`todo` → `doing` → `done`) | Loom's task coordination |
| State persistence (`~/.tasks/tasks.json`) | Loom's SQLite + checkpoints |
| Agent-native tools | Ground's verification system |
| `/capstone check` validation | Ground's evidence-first architecture |

When you later see Loom and Ground, you'll recognize these patterns.

---

## Step 1: Get the Scaffold

Copy the scaffold to your working directory:

```bash
# From the seeing package
cp -r scaffold ~/my-task-tracker
cd ~/my-task-tracker

# Install dependencies
npm install

# Verify it builds (it will, but with TODO errors at runtime)
npm run build
```

The scaffold includes:
- `package.json` — Dependencies configured
- `tsconfig.json` — TypeScript ready
- `src/tasks.ts` — Storage layer (complete, don't modify)
- `src/index.ts` — Server skeleton (your work goes here)

---

## Step 2: Understand the Storage Layer

Open `src/tasks.ts`. This is provided complete.

It demonstrates **Loom's external memory pattern**:

```typescript
// Tasks persist to ~/.tasks/tasks.json
// They survive process restarts
// Claude Code can pick up where it left off
```

Key functions you'll use:
- `addTask(title)` — Creates a task, returns it
- `getTasks(status?)` — Returns tasks, optionally filtered
- `updateTaskStatus(id, status)` — Changes status
- `removeTask(id)` — Deletes permanently

You don't need to modify this file. Just use it.

---

## Step 3: Define Your Tools

Open `src/index.ts`. Find `TODO 1`.

You need four tools:

### task_add
- **Purpose**: Add a new task
- **Input**: `{ title: string }`
- **Returns**: The created task

### task_list
- **Purpose**: List tasks
- **Input**: `{ status?: 'todo' | 'doing' | 'done' }` (optional filter)
- **Returns**: Array of tasks

### task_complete
- **Purpose**: Mark a task as done
- **Input**: `{ id: string }`
- **Returns**: The updated task (or error if not found)

### task_remove
- **Purpose**: Delete a task
- **Input**: `{ id: string }`
- **Returns**: Success/failure

**Apply DRY**: Look at how tools are defined in other MCP servers. The pattern repeats.

**Apply Rams**: Four tools is enough. Resist the urge to add `task_archive`, `task_priority`, etc. Do those earn their existence right now?

---

## Step 4: Implement the Handlers

Find `TODO 2`. Each tool needs a handler in the switch statement.

Here's the pattern:

```typescript
case 'task_add': {
  const { title } = args as { title: string };
  const task = addTask(title);
  return {
    content: [{ type: 'text', text: JSON.stringify({ task }) }],
  };
}
```

Notice:
1. Extract args with type assertion
2. Call the storage function
3. Return wrapped in `{ content: [{ type: 'text', text: ... }] }`
4. Wrap data: `{ task }` not just `task`

**Apply Heidegger**: The return format serves Claude Code. It needs structured data it can parse and act on.

---

## Step 5: Handle Errors

Some operations can fail. `task_complete` and `task_remove` might not find the task.

```typescript
case 'task_complete': {
  const { id } = args as { id: string };
  const task = updateTaskStatus(id, 'done');
  
  if (!task) {
    return {
      content: [{ type: 'text', text: JSON.stringify({ error: 'Task not found' }) }],
    };
  }
  
  return {
    content: [{ type: 'text', text: JSON.stringify({ task }) }],
  };
}
```

**Apply Heidegger**: Errors are part of the workflow. Claude Code needs to know what failed.

---

## Step 6: Build and Test

```bash
npm run build
```

Fix any TypeScript errors. Then in Gemini CLI:

```
/capstone check
```

Gemini will:
1. Start your MCP server
2. Test each tool with sample inputs
3. Compare actual vs expected outputs
4. Guide you to fix any issues

This is **Simple Ground** in action — evidence-first verification.

---

## Step 7: Connect to Claude Code

Once all checks pass, add your server to Claude Code:

```json
// .mcp.json in your project
{
  "mcpServers": {
    "task-tracker": {
      "command": "node",
      "args": ["/Users/you/my-task-tracker/dist/index.js"]
    }
  }
}
```

Now you can say to Claude Code:
- "Add a task: review PR #42"
- "What's on my task list?"
- "Mark the PR review task as done"

Your automation layer is working.

---

## Step 8: Reflect

Before marking the capstone complete, answer these:

**1. What did you notice about the Triad while building?**

Where did DRY guide you? What didn't earn its existence? How did you think about Claude Code's workflow?

**2. What pattern do you see now that you didn't before?**

The task lifecycle. The external memory. The tool boundaries.

**3. What would you do differently next time?**

This is the hermeneutic spiral — each iteration deepens understanding.

---

## Completing the Capstone

Run:
```
/capstone complete
```

Record your findings and reflection. The capstone is marked done when:

1. All tools pass `/capstone check`
2. You've reflected on the Triad
3. Your server works with Claude Code

---

## What You Built

A local automation layer. Claude Code can now manage your tasks without you opening a todo app.

This is **Simple Loom** — the same patterns that power production task coordination.

### The Automotive Perspective

You've assembled your first vehicle:

| What You Built | Automotive Part | Function |
|----------------|-----------------|----------|
| MCP server | Engine | Where execution happens |
| State persistence | Fuel tank | What feeds the system |
| Tools (CRUD) | Drivetrain | Connects engine to wheels |
| CLI interface | Dashboard | What the driver sees |

**The automation layer = the automotive layer.**

The automotive layer consists of the parts of a vehicle: engine, transmission, fuel tank. Assembled together, they create motion.

The automation layer consists of Cloudflare products: Workers, Durable Objects, D1. Assembled together, they create outcomes.

You've learned to assemble parts. WORKWAY teaches you to build complete vehicles for clients.

## What Comes Next

Run `/graduate` to check your readiness for Dwelling.

You've learned to see through the Subtractive Triad. You've built your first engine. When the questions become automatic and the cockpit becomes second nature, you're ready for tools that execute what you now perceive.

---

## Going Deeper

**WORKWAY's Focus Workflow** does this at team scale — syncing Slack messages to Notion tasks. Same philosophy, production infrastructure.

**learn.createsomething.io** covers building production automation like Focus Workflow.

You're not done learning. But you've started building.

That's the difference between Seeing and Dwelling.

---

## Resources

### Model Context Protocol (MCP)

- **What is MCP?**: [Anthropic Announcement](https://www.anthropic.com/news/model-context-protocol) — The official introduction to MCP as an open standard for AI integration
- **Documentation**: [modelcontextprotocol.io](https://modelcontextprotocol.io) — Complete MCP documentation
- **Server Development**: [Build a Server](https://modelcontextprotocol.io/docs/develop/build-server) — Step-by-step guide to creating MCP servers
- **Quickstart**: [MCP Quickstart](https://modelcontextprotocol.info/docs/quickstart/quickstart/) — Build your first server tutorial
- **TypeScript SDK**: [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol) — Official SDK on GitHub

### Gemini CLI

- **Installation**: [geminicli.com/docs/get-started/installation](https://geminicli.com/docs/get-started/installation/)
- **Authentication**: [geminicli.com/docs/get-started/authentication](https://geminicli.com/docs/get-started/authentication/)
- **Documentation**: [geminicli.com/docs](https://geminicli.com/docs/)

### CREATE SOMETHING

- **Setup Guide**: [/seeing/setting-up](https://learn.createsomething.space/seeing/setting-up) — Complete environment setup
- **WORKWAY**: [workway.co](https://workway.co) — Production automation infrastructure
- **Learn More**: [learn.createsomething.io](https://learn.createsomething.io) — Advanced curriculum

### The Subtractive Triad

- **DRY**: [*The Pragmatic Programmer*](https://pragprog.com/titles/tpp20/the-pragmatic-programmer-20th-anniversary-edition/)
- **Rams**: [Ten Principles](https://rams-foundation.org/foundation/design-comprehension/theses/)
- **Heidegger**: [Stanford Encyclopedia](https://plato.stanford.edu/entries/heidegger/)
