import { error } from '@sveltejs/kit';
import { marked } from 'marked';
import type { PageServerLoad } from './$types';

// Lesson metadata - matches the seeing package
const SEEING_LESSONS = [
	{
		id: 'setting-up',
		title: 'Setting Up',
		description: 'Install Gemini CLI and the Seeing extension. Five minutes to your first practice.',
		duration: '5 min'
	},
	{
		id: 'what-is-creation',
		title: 'What Is Creation?',
		description: 'The meta-principle: creation as the discipline of removing what obscures.',
		duration: '10 min'
	},
	{
		id: 'automation-layer',
		title: 'The Automation Layer',
		description: 'What sits between intention and execution. The infrastructure you\'re learning to build.',
		duration: '15 min'
	},
	{
		id: 'subtractive-triad',
		title: 'The Subtractive Triad',
		description: 'Three questions that guide every decision: DRY, Rams, Heidegger.',
		duration: '20 min'
	},
	{
		id: 'external-memory',
		title: 'External Memory',
		description: 'How automation systems remember. Persistence patterns for agents.',
		duration: '15 min'
	},
	{
		id: 'agent-native-tools',
		title: 'Agent-Native Tools',
		description: 'Designing tools for AI agents, not humans. Different inputs, different outputs.',
		duration: '15 min'
	},
	{
		id: 'capstone',
		title: 'Capstone: Simple Loom',
		description: 'Build a Task Tracker MCP server. Apply everything you\'ve learned.',
		duration: '60 min'
	}
] as const;

type LessonId = (typeof SEEING_LESSONS)[number]['id'];

// Lesson content - embedded for now, could be moved to @createsomething/seeing package
const LESSON_CONTENT: Record<LessonId, string> = {
	'setting-up': `
## Prerequisites

- **Node.js 20 or higher** — Check with \`node -v\`
- **A Google account** — For free tier access

If you need Node.js, download it from [nodejs.org](https://nodejs.org/).

---

## Step 1: Install Gemini CLI

Choose one method:

### Option A: npm (Recommended)

\`\`\`bash
npm install -g @google/gemini-cli
\`\`\`

### Option B: Homebrew (macOS/Linux)

\`\`\`bash
brew install gemini-cli
\`\`\`

### Option C: Run without installing

\`\`\`bash
npx @google/gemini-cli
\`\`\`

Verify installation:

\`\`\`bash
gemini --version
\`\`\`

**Source**: [geminicli.com/docs/get-started/installation](https://geminicli.com/docs/get-started/installation/)

---

## Step 2: Authenticate

Start Gemini CLI:

\`\`\`bash
gemini
\`\`\`

On first run, you'll see an authentication menu. Choose **Login with Google** (recommended).

1. A browser window opens
2. Sign in with your Google account
3. Authorize Gemini CLI
4. Return to your terminal — you're authenticated

### Free Tier Limits

With a personal Google account:
- **1,000 requests per day**
- **60 requests per minute**
- **1M token context window** (Gemini 2.5 Pro)

These limits are generous for learning.

**Source**: [geminicli.com/docs/get-started/authentication](https://geminicli.com/docs/get-started/authentication/)

---

## Step 3: Install the Seeing Extension

Add to \`~/.gemini/settings.json\`:

\`\`\`json
{
  "mcpServers": {
    "seeing": {
      "command": "npx",
      "args": ["@createsomething/seeing"]
    }
  }
}
\`\`\`

Create the directory if needed:

\`\`\`bash
mkdir -p ~/.gemini
\`\`\`

Restart Gemini CLI after adding the configuration.

**Source**: [geminicli.com/docs/tools/mcp-server](https://geminicli.com/docs/tools/mcp-server/)

---

## Step 4: Verify

Test that everything works:

\`\`\`bash
/lesson what-is-creation
\`\`\`

If you see the lesson content, you're ready.

---

## Troubleshooting

**"Command not found: gemini"** — npm's bin directory isn't in your PATH. Use \`npx @google/gemini-cli\` instead, or add npm's bin to your PATH.

**Authentication fails** — Try running \`gemini\` again and selecting a different auth method.

**Extension not loading** — Check \`~/.gemini/settings.json\` syntax (must be valid JSON), then restart Gemini CLI.

**Node.js version too old** — Gemini CLI requires Node.js 20+. Upgrade via [nodejs.org](https://nodejs.org/).

---

## Resources

- [Gemini CLI Installation](https://geminicli.com/docs/get-started/installation/) — Official guide
- [Gemini CLI Authentication](https://geminicli.com/docs/get-started/authentication/) — All auth methods
- [MCP Server Configuration](https://geminicli.com/docs/tools/mcp-server/) — Extension setup
- [Model Context Protocol](https://modelcontextprotocol.io) — MCP documentation

---

## Ready

You have Gemini CLI. You have the Seeing extension.

Now let's learn what creation actually is.
`,
	'what-is-creation': `
> **First time here?** If you haven't set up Gemini CLI yet, start with [Setting Up](/seeing/setting-up).

## The Paradox

Most people think creation is about adding.

More features. More code. More options. More complexity. The instinct runs deep: to create is to produce, to generate, to add to the world.

But consider this question: When you simplify code, are you creating or destroying?

When you refactor a 500-line file into a clear 50-line abstraction, have you created something? Most developers would say yes. But you removed 450 lines. You subtracted.

**The paradox**: Some of the most creative acts are acts of removal.

## Michelangelo's Insight

When asked how he carved David, Michelangelo reportedly said:

> "I saw the angel in the marble and carved until I set him free."

He didn't add marble to create David. He removed what wasn't David.

The sculpture was always there, hidden in the stone. Creation was the act of revealing it.

## The Meta-Principle

**Creation is the discipline of removing what obscures.**

This is the foundation of everything in CREATE SOMETHING. Every principle, every practice, every pattern builds on this insight.

When you write code, you're not building from nothing. You're revealing a solution that was always possible. The problem has a shape. The solution fits that shape. Your job is to remove everything that doesn't fit.

## Why This Matters for Automation

You're learning to build **automation infrastructure** — systems that work while you sleep. The layer between human intention and system execution.

Bad automation is bloated: too many features, too much configuration, too many failure modes. It obscures instead of reveals.

Good automation is subtractive: it removes the friction between what you want and what happens. The automation layer *disappears* into transparent use.

The philosophy you're learning isn't abstract. It's the lens that separates automation that works from automation that fails.

---

## What Obscures?

Three things obscure truth in code (and automation):

| Obscurity | Level | Question |
|-----------|-------|----------|
| **Duplication** | Implementation | Have I built this before? |
| **Excess** | Artifact | Does this earn its existence? |
| **Disconnection** | System | Does this serve the whole? |

These three questions form the **Subtractive Triad** — the evaluation framework you'll learn soon.

---

## Reflection

Before moving on:

**Think of an automation you've used that felt invisible** — it just worked. Now think of one that constantly demanded your attention.

What's the difference? Usually: the good one removed friction. The bad one added complexity that didn't earn its place.

Seeing comes before building. That's why we're here.
`,
	'automation-layer': `
## What Is The Automation Layer?

Every time you use an AI agent to accomplish a task, something sits between your intention and the execution.

\`\`\`
Your Intention          The Automation Layer          Execution
──────────────         ─────────────────────         ──────────
"Add a task"     →     [Something happens here]  →   Task saved
"Send the email" →     [Something happens here]  →   Email sent
"Deploy to prod" →     [Something happens here]  →   Site live
\`\`\`

That middle part — **The Automation Layer** — is what you're learning to build.

## The Layer Nobody Sees

When automation works, you don't notice it. You say "add a task" and a task appears. The layer is invisible.

When automation fails, suddenly you notice everything: error messages, configuration files, permission issues, missing dependencies. The layer becomes very visible.

**Good automation infrastructure recedes into transparent use.** You think about what you want, not how it happens.

## What Lives in This Layer?

| Component | Purpose | Example |
|-----------|---------|---------|
| **Tools** | Discrete capabilities an agent can invoke | \`task_add\`, \`send_email\`, \`deploy\` |
| **Memory** | State that persists between sessions | Tasks stored in \`~/.tasks/tasks.json\` |
| **Boundaries** | What each tool can and can't do | \`task_add\` creates tasks, doesn't delete them |
| **Protocols** | How tools communicate with agents | MCP (Model Context Protocol) |

## Why This Matters

You're not just learning to code. You're learning to build **infrastructure that works while you sleep**.

The Automation Layer is:
- What WORKWAY provides to businesses
- What you'll build in the capstone
- What separates "automation that works" from "automation that breaks"

## A Concrete Example

You want an AI agent to manage your tasks. Here's the automation layer:

\`\`\`
┌─────────────────────────────────────────────────────────┐
│                    YOUR AI AGENT                        │
│            (Gemini CLI, Claude Code, etc.)              │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│               THE AUTOMATION LAYER                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │  task_add   │  │  task_list  │  │task_complete│     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
│                         │                               │
│              ┌──────────┴──────────┐                   │
│              │   tasks.json        │                   │
│              │   (persistence)     │                   │
│              └─────────────────────┘                   │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                     EXECUTION                           │
│                Tasks saved to disk                      │
└─────────────────────────────────────────────────────────┘
\`\`\`

**You'll build this exact layer in the capstone.**

---

## The Pattern Behind Everything

This course teaches one thing: **how to build automation layers that work**.

- The Subtractive Triad → How to evaluate what belongs in the layer
- External Memory → How the layer remembers
- Agent-Native Tools → How to design tools for AI agents
- The Capstone → How to build an actual layer

Everything connects. The philosophy serves the practice.

---

## Reflection

**What automation do you use daily that "just works"?** Calendar invites that create video calls. Git commits that trigger deploys. Emails that create tickets.

Now: **What layer makes that possible?** Someone built it. You're learning how.
`,
	'subtractive-triad': `
## Three Questions for Every Decision

The Subtractive Triad is your evaluation framework. For any technical choice, ask these three questions in sequence:

| Level | Question | Action |
|-------|----------|--------|
| **DRY** | "Have I built this before?" | Unify |
| **Rams** | "Does this earn its existence?" | Remove |
| **Heidegger** | "Does this serve the whole?" | Reconnect |

---

## Level 1: DRY (Implementation)

**Question**: Have I built this before?

DRY means "Don't Repeat Yourself" — but it's commonly misunderstood.

**DRY is not**: "Never write similar code twice."  
**DRY is**: "Every piece of knowledge must have a single, authoritative representation."

### The Test

If one instance changes, must the other change too?
- **Yes** → Unify them (DRY violation)
- **No** → Leave them separate (not a violation)

### In Automation

Before adding a tool to your automation layer, ask: Does this capability already exist?

\`\`\`typescript
// BAD: Separate tools that duplicate knowledge
task_add()      // Creates a task
task_create()   // Also creates a task (???)

// GOOD: One authoritative tool per capability
task_add()      // The only way to create tasks
\`\`\`

---

## Level 2: Rams (Artifact)

**Question**: Does this earn its existence?

Named for [Dieter Rams](https://rams-foundation.org/homepage/): *"Weniger, aber besser"* — Less, but better.

### The Existence Test

1. What happens if I don't add this?
2. Who asked for this?
3. When was this last needed?
4. What's the simplest version?

If the answers are "nothing much," "no one," "never," and "much simpler" — remove it.

### In Automation

Every tool in your automation layer must earn its place:

\`\`\`typescript
// Proposed tools for a task tracker:
task_add         ✓ Essential
task_list        ✓ Essential
task_complete    ✓ Essential
task_remove      ✓ Essential
task_archive     ✗ Does this earn existence? (filtering serves same need)
task_priority    ✗ Does this earn existence? (not requested)
task_color       ✗ Does this earn existence? (definitely not)
\`\`\`

**Four tools is enough.** Every extra tool is complexity that must be justified.

---

## Level 3: Heidegger (System)

**Question**: Does this serve the whole?

Named for [Martin Heidegger](https://plato.stanford.edu/entries/heidegger/), who observed: **You understand parts through the whole, and the whole through parts.**

### Seeing Disconnection

- **Orphaned code**: Tools nothing uses
- **Fragmented boundaries**: Responsibilities split illogically
- **Misaligned naming**: Tool says "item" when system says "task"
- **Wrong placement**: Business logic in the transport layer

### In Automation

Your automation layer serves a workflow. Does each tool serve that workflow?

\`\`\`
User's workflow: "Manage my tasks through conversation"

Does task_add serve this?     → Yes, essential to the workflow
Does task_list serve this?    → Yes, essential to the workflow
Does export_csv serve this?   → No, serves a different workflow
\`\`\`

---

## Why This Order?

**DRY is fastest** — Code exists or it doesn't. Quick to check.  
**Rams requires judgment** — You must evaluate need vs. excess.  
**Heidegger is deepest** — You must understand the whole system.

Start shallow, spiral deeper. If DRY eliminates the decision, you don't need Rams. If Rams eliminates the feature, you don't need Heidegger.

---

## A Complete Example

**Scenario**: "Add a \`task_archive\` tool to the Task Tracker."

### Level 1: DRY
**Ask**: Have I built this before?  
**Finding**: \`task_complete\` marks tasks done. \`task_list\` can filter by status.  
**Insight**: "Archive" might be filtering, not a new capability.

### Level 2: Rams
**Ask**: Does \`task_archive\` earn its existence?  
**Finding**: The user wants to "hide completed tasks" — that's filtering.  
**Decision**: Add a \`status\` parameter to \`task_list\` instead of a new tool.

**Decision ends here.** Rams eliminated the proposed tool.

---

## Resources

- **DRY**: [*The Pragmatic Programmer*](https://pragprog.com/titles/tpp20/the-pragmatic-programmer-20th-anniversary-edition/) — Hunt & Thomas
- **Rams**: [Ten Principles](https://rams-foundation.org/foundation/design-comprehension/theses/) — Rams Foundation
- **Heidegger**: [Stanford Encyclopedia](https://plato.stanford.edu/entries/heidegger/)
`,
	'external-memory': `
## Why Memory Matters

AI agents are stateless. Every conversation starts fresh. Without external memory, your agent forgets everything the moment the session ends.

**External memory is what lets automation persist.**

\`\`\`
Session 1: "Add a task: review PR #42"
           → Task saved to ~/.tasks/tasks.json

Session 2: "What's on my task list?"
           → Agent reads from ~/.tasks/tasks.json
           → "You have one task: review PR #42"
\`\`\`

The agent didn't remember. The **automation layer** remembered.

---

## The Pattern

External memory follows a simple pattern:

\`\`\`typescript
// 1. Load state from persistent storage
const tasks = loadTasks();  // Read from disk/database

// 2. Modify state
tasks.push(newTask);

// 3. Save state back to persistent storage
saveTasks(tasks);  // Write to disk/database
\`\`\`

That's it. Load → Modify → Save.

---

## Storage Options

| Storage | Complexity | When to Use |
|---------|------------|-------------|
| **JSON file** | Low | Learning, simple tools, single-user |
| **SQLite** | Medium | Production, queries, multiple tools |
| **Database** | High | Multi-user, cloud, scale |

For your first automation layer, **JSON files are enough**. Don't over-engineer.

---

## The Task Tracker Pattern

Here's the complete external memory implementation you'll use:

\`\`\`typescript
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Where state lives
const TASKS_DIR = path.join(os.homedir(), '.tasks');
const TASKS_FILE = path.join(TASKS_DIR, 'tasks.json');

// Ensure directory exists
function ensureDir() {
  if (!fs.existsSync(TASKS_DIR)) {
    fs.mkdirSync(TASKS_DIR, { recursive: true });
  }
}

// Load state
export function loadTasks(): Task[] {
  ensureDir();
  if (!fs.existsSync(TASKS_FILE)) return [];
  return JSON.parse(fs.readFileSync(TASKS_FILE, 'utf-8'));
}

// Save state
export function saveTasks(tasks: Task[]) {
  ensureDir();
  fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2));
}
\`\`\`

**Key decisions:**

1. **Location**: \`~/.tasks/\` — User's home directory, not the project
2. **Format**: JSON — Human-readable, easy to debug
3. **Atomic operations**: Load all, modify, save all — Simple and safe

---

## What Production Systems Use

Your Task Tracker uses JSON files. Here's how production systems scale up:

| System | Memory Pattern |
|--------|----------------|
| **Loom** (task coordination) | SQLite + checkpoints |
| **Ground** (verification) | Evidence stored as JSON per run |
| **WORKWAY** (workflows) | Cloudflare D1 (SQLite at edge) |

The pattern is the same. Only the storage backend changes.

---

## Common Mistakes

### Mistake 1: Storing state in the agent's context

\`\`\`
❌ "Remember that I have a task called 'review PR'"
   → Agent forgets next session

✓  Use external memory
   → Task persists forever
\`\`\`

### Mistake 2: Over-engineering storage

\`\`\`
❌ "I need PostgreSQL with proper migrations"
   → You're building a learning project

✓  Start with JSON files
   → Migrate when you hit real limits
\`\`\`

### Mistake 3: Not handling missing files

\`\`\`typescript
// ❌ Crashes if file doesn't exist
const tasks = JSON.parse(fs.readFileSync(TASKS_FILE, 'utf-8'));

// ✓ Returns empty array if file doesn't exist
if (!fs.existsSync(TASKS_FILE)) return [];
return JSON.parse(fs.readFileSync(TASKS_FILE, 'utf-8'));
\`\`\`

---

## The Triad Applied

| Question | Application |
|----------|-------------|
| **DRY** | One \`loadTasks()\` function, used everywhere |
| **Rams** | JSON file is the simplest storage that works |
| **Heidegger** | Storage serves the workflow (task management) |

---

## Reflection

External memory is what makes automation *useful*. Without it, every session starts from zero.

**What would break in your daily workflow if your tools forgot everything between sessions?**

Everything you thought of — that's what external memory prevents.
`,
	'agent-native-tools': `
## Designing for Agents, Not Humans

When you build a CLI tool for humans, you optimize for:
- Helpful error messages
- Interactive prompts
- Flexible input formats
- Colorful output

When you build a tool for AI agents, you optimize for:
- **Structured input** (JSON schemas)
- **Structured output** (parseable responses)
- **Clear affordances** (what can this tool do?)
- **Predictable errors** (machine-readable failure modes)

---

## The MCP Pattern

MCP (Model Context Protocol) is how AI agents discover and use tools.

\`\`\`typescript
// 1. Define what the tool does (schema)
{
  name: 'task_add',
  description: 'Add a new task',
  inputSchema: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Task title' }
    },
    required: ['title']
  }
}

// 2. Handle the tool call
case 'task_add': {
  const { title } = args as { title: string };
  const task = addTask(title);
  return { content: [{ type: 'text', text: JSON.stringify({ task }) }] };
}
\`\`\`

**The agent reads the schema to understand what it can do.** Good schemas = good tool use.

---

## Input: JSON Schemas

Agents need to know exactly what input is valid.

### Bad Schema

\`\`\`typescript
{
  name: 'task_add',
  description: 'Add a task',  // Vague
  inputSchema: { type: 'object' }  // No properties defined
}
\`\`\`

Agent doesn't know what to pass.

### Good Schema

\`\`\`typescript
{
  name: 'task_add',
  description: 'Add a new task to the task list',
  inputSchema: {
    type: 'object',
    properties: {
      title: { 
        type: 'string', 
        description: 'The task title (required)' 
      }
    },
    required: ['title']
  }
}
\`\`\`

Agent knows exactly what to pass.

---

## Output: Structured Responses

Agents need to parse your responses. Always return structured data.

### Bad Output

\`\`\`typescript
return { content: [{ type: 'text', text: 'Task added!' }] };
\`\`\`

Agent can't extract the task ID for follow-up operations.

### Good Output

\`\`\`typescript
return { 
  content: [{ 
    type: 'text', 
    text: JSON.stringify({ 
      task: { id: 'abc123', title: 'Review PR', status: 'todo' } 
    }) 
  }] 
};
\`\`\`

Agent can parse the response and use the ID.

---

## Error Handling for Agents

Agents need to know when things fail — and why.

### Bad Error

\`\`\`typescript
throw new Error('Something went wrong');
\`\`\`

Agent can't recover or explain the failure.

### Good Error

\`\`\`typescript
return { 
  content: [{ 
    type: 'text', 
    text: JSON.stringify({ 
      error: 'Task not found',
      id: requestedId,
      suggestion: 'Use task_list to see available tasks'
    }) 
  }] 
};
\`\`\`

Agent can explain the failure and suggest recovery.

---

## Tool Boundaries

Each tool should do one thing well.

### Bad Boundaries

\`\`\`typescript
// One tool that does too much
task_manage({ action: 'add' | 'remove' | 'update' | 'list', ... })
\`\`\`

Confusing for agents. Complex schema. Hard to describe.

### Good Boundaries

\`\`\`typescript
// Separate tools with clear purposes
task_add({ title })
task_list({ status? })
task_complete({ id })
task_remove({ id })
\`\`\`

Each tool has one job. Clear schemas. Easy to choose.

---

## The Four Task Tracker Tools

| Tool | Input | Output | Purpose |
|------|-------|--------|---------|
| \`task_add\` | \`{ title: string }\` | \`{ task: Task }\` | Create a task |
| \`task_list\` | \`{ status?: string }\` | \`{ tasks: Task[] }\` | List tasks |
| \`task_complete\` | \`{ id: string }\` | \`{ task: Task }\` or \`{ error }\` | Mark done |
| \`task_remove\` | \`{ id: string }\` | \`{ success: boolean }\` | Delete |

**Notice**: Consistent patterns. Structured I/O. Clear boundaries.

---

## The Triad Applied

| Question | Application |
|----------|-------------|
| **DRY** | One schema pattern used across all tools |
| **Rams** | Four tools — no more. Each earns its existence. |
| **Heidegger** | Tools serve the agent's workflow |

---

## Reflection

The best agent tools are invisible. The agent doesn't struggle with input formats or parse cryptic outputs. It just uses the tool and gets structured results.

**What makes a tool easy for an agent to use?** The answer is always: clarity. Clear inputs, clear outputs, clear boundaries.
`,
	'capstone': `
## Apply Everything You've Learned

You've learned:
- **The Automation Layer** — what sits between intention and execution
- **The Subtractive Triad** — how to evaluate what belongs
- **External Memory** — how systems persist state
- **Agent-Native Tools** — how to design for AI agents

Now you build.

## What You're Building

**Simple Loom** — a Task Tracker MCP server.

\`\`\`
Your Intention                The Automation Layer              Execution
─────────────────            ─────────────────────             ──────────
"Add a task"         →       Your MCP Server          →        Task saved
"What's on my list?" →       (Simple Loom)            →        Tasks returned
"Mark it done"       →                                →        Status updated
\`\`\`

This is the automation layer pattern from Lesson 3, made real.

## Why This Matters

| What You Build | Lesson | Production Version |
|----------------|--------|-------------------|
| Task lifecycle | Automation Layer | Loom's task coordination |
| \`tasks.json\` persistence | External Memory | Loom's SQLite + checkpoints |
| Four MCP tools | Agent-Native Tools | Ground's verification system |
| Tool boundaries | Subtractive Triad | Every tool earns its place |

---

## Step 1: Get the Scaffold

Create a new project directory and set up the scaffold:

\`\`\`bash
mkdir ~/my-task-tracker
cd ~/my-task-tracker
npm init -y
npm install @modelcontextprotocol/sdk
npm install -D typescript @types/node
\`\`\`

Create \`tsconfig.json\`:

\`\`\`json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
\`\`\`

---

## Step 2: Create the Storage Layer

Create \`src/tasks.ts\` — this handles persistence:

\`\`\`typescript
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface Task {
  id: string;
  title: string;
  status: 'todo' | 'doing' | 'done';
  createdAt: string;
}

const TASKS_DIR = path.join(os.homedir(), '.tasks');
const TASKS_FILE = path.join(TASKS_DIR, 'tasks.json');

function ensureDir() {
  if (!fs.existsSync(TASKS_DIR)) {
    fs.mkdirSync(TASKS_DIR, { recursive: true });
  }
}

export function loadTasks(): Task[] {
  ensureDir();
  if (!fs.existsSync(TASKS_FILE)) return [];
  return JSON.parse(fs.readFileSync(TASKS_FILE, 'utf-8'));
}

export function saveTasks(tasks: Task[]) {
  ensureDir();
  fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2));
}

export function addTask(title: string): Task {
  const tasks = loadTasks();
  const task: Task = {
    id: Date.now().toString(36),
    title,
    status: 'todo',
    createdAt: new Date().toISOString(),
  };
  tasks.push(task);
  saveTasks(tasks);
  return task;
}

export function getTasks(status?: Task['status']): Task[] {
  const tasks = loadTasks();
  return status ? tasks.filter(t => t.status === status) : tasks;
}

export function updateTaskStatus(id: string, status: Task['status']): Task | null {
  const tasks = loadTasks();
  const task = tasks.find(t => t.id === id);
  if (!task) return null;
  task.status = status;
  saveTasks(tasks);
  return task;
}

export function removeTask(id: string): boolean {
  const tasks = loadTasks();
  const index = tasks.findIndex(t => t.id === id);
  if (index === -1) return false;
  tasks.splice(index, 1);
  saveTasks(tasks);
  return true;
}
\`\`\`

This demonstrates **Loom's external memory pattern** — tasks persist across sessions.

---

## Step 3: Define Your Tools

Create \`src/index.ts\`. You need four tools:

### task_add
- **Purpose**: Add a new task
- **Input**: \`{ title: string }\`
- **Returns**: The created task

### task_list
- **Purpose**: List tasks
- **Input**: \`{ status?: 'todo' | 'doing' | 'done' }\` (optional filter)
- **Returns**: Array of tasks

### task_complete
- **Purpose**: Mark a task as done
- **Input**: \`{ id: string }\`
- **Returns**: The updated task (or error if not found)

### task_remove
- **Purpose**: Delete a task
- **Input**: \`{ id: string }\`
- **Returns**: Success/failure

**Apply Rams**: Four tools is enough. Resist the urge to add \`task_archive\`, \`task_priority\`, etc. Do those earn their existence right now?

---

## Step 4: Implement the Server

Here's the complete \`src/index.ts\`:

\`\`\`typescript
#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { addTask, getTasks, updateTaskStatus, removeTask, Task } from './tasks.js';

const server = new Server(
  { name: 'task-tracker', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// Define available tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'task_add',
      description: 'Add a new task',
      inputSchema: {
        type: 'object',
        properties: { title: { type: 'string', description: 'Task title' } },
        required: ['title'],
      },
    },
    {
      name: 'task_list',
      description: 'List tasks, optionally filtered by status',
      inputSchema: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['todo', 'doing', 'done'] },
        },
      },
    },
    {
      name: 'task_complete',
      description: 'Mark a task as done',
      inputSchema: {
        type: 'object',
        properties: { id: { type: 'string', description: 'Task ID' } },
        required: ['id'],
      },
    },
    {
      name: 'task_remove',
      description: 'Remove a task permanently',
      inputSchema: {
        type: 'object',
        properties: { id: { type: 'string', description: 'Task ID' } },
        required: ['id'],
      },
    },
  ],
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'task_add': {
      const { title } = args as { title: string };
      const task = addTask(title);
      return { content: [{ type: 'text', text: JSON.stringify({ task }) }] };
    }

    case 'task_list': {
      const { status } = args as { status?: Task['status'] };
      const tasks = getTasks(status);
      return { content: [{ type: 'text', text: JSON.stringify({ tasks }) }] };
    }

    case 'task_complete': {
      const { id } = args as { id: string };
      const task = updateTaskStatus(id, 'done');
      if (!task) {
        return { content: [{ type: 'text', text: JSON.stringify({ error: 'Task not found' }) }] };
      }
      return { content: [{ type: 'text', text: JSON.stringify({ task }) }] };
    }

    case 'task_remove': {
      const { id } = args as { id: string };
      const success = removeTask(id);
      return { content: [{ type: 'text', text: JSON.stringify({ success }) }] };
    }

    default:
      return { content: [{ type: 'text', text: JSON.stringify({ error: 'Unknown tool' }) }] };
  }
});

// Start server
const transport = new StdioServerTransport();
server.connect(transport);
\`\`\`

**Apply Heidegger**: The return format serves the AI agent. It needs structured data it can parse and act on.

---

## Step 5: Build and Test

\`\`\`bash
npx tsc
\`\`\`

Fix any TypeScript errors. Then test manually:

\`\`\`bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node dist/index.js
\`\`\`

You should see your four tools listed.

---

## Step 6: Connect to Your AI Agent

Add your server to your AI agent's MCP configuration.

### For Gemini CLI

Add to \`~/.gemini/settings.json\`:

\`\`\`json
{
  "mcpServers": {
    "task-tracker": {
      "command": "node",
      "args": ["/Users/you/my-task-tracker/dist/index.js"]
    }
  }
}
\`\`\`

### For Claude Code

Add to \`.mcp.json\` in your project:

\`\`\`json
{
  "mcpServers": {
    "task-tracker": {
      "command": "node",
      "args": ["/Users/you/my-task-tracker/dist/index.js"]
    }
  }
}
\`\`\`

Now you can say:
- "Add a task: review PR #42"
- "What's on my task list?"
- "Mark the PR review task as done"

Your automation layer is working.

---

## Step 7: Reflect

Before marking the capstone complete, answer these:

**1. The Automation Layer** — Where does your MCP server sit in the flow from intention to execution? What does it connect?

**2. The Subtractive Triad** — Where did DRY guide you? What didn't earn its existence? Does your server serve the workflow?

**3. External Memory** — What would break if \`tasks.json\` didn't exist? What does persistence enable?

**4. Agent-Native Tools** — How did you design for the agent, not for humans? What makes your tools easy to use?

These aren't rhetorical questions. Write your answers. The capstone isn't complete until you've reflected.

---

## What You Built

A local automation layer. AI agents can now manage your tasks without you opening a todo app.

This is **Simple Loom** — the same patterns that power production task coordination.

## What Comes Next

You've learned to see through the Subtractive Triad. You've built automation infrastructure. When the questions become automatic, you're ready for tools that execute what you now perceive.

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
- **TypeScript SDK**: [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol) — Official SDK on GitHub

### Gemini CLI

- **Installation**: [geminicli.com/docs/get-started/installation](https://geminicli.com/docs/get-started/installation/)
- **Authentication**: [geminicli.com/docs/get-started/authentication](https://geminicli.com/docs/get-started/authentication/)
- **MCP Configuration**: [geminicli.com/docs/tools/mcp-server](https://geminicli.com/docs/tools/mcp-server/)

### CREATE SOMETHING

- **Setup Guide**: [/seeing/setting-up](/seeing/setting-up) — Complete environment setup
- **WORKWAY**: [workway.co](https://workway.co) — Production automation infrastructure
- **Learn More**: [learn.createsomething.io](https://learn.createsomething.io) — Advanced curriculum

### The Subtractive Triad

- **DRY**: [*The Pragmatic Programmer*](https://pragprog.com/titles/tpp20/the-pragmatic-programmer-20th-anniversary-edition/)
- **Rams**: [Ten Principles](https://rams-foundation.org/foundation/design-comprehension/theses/)
- **Heidegger**: [Stanford Encyclopedia](https://plato.stanford.edu/entries/heidegger/)
`
};

export const load: PageServerLoad = async ({ params }) => {
	const lessonId = params.lesson as LessonId;
	const lessonIndex = SEEING_LESSONS.findIndex((l) => l.id === lessonId);

	if (lessonIndex === -1) {
		throw error(404, 'Lesson not found');
	}

	const lesson = SEEING_LESSONS[lessonIndex];
	const markdownContent = LESSON_CONTENT[lessonId];

	if (!markdownContent) {
		throw error(404, 'Lesson content not found');
	}

	// Parse markdown to HTML
	const content = await marked(markdownContent);

	// Get prev/next lessons
	const prev = lessonIndex > 0 ? SEEING_LESSONS[lessonIndex - 1] : null;
	const next = lessonIndex < SEEING_LESSONS.length - 1 ? SEEING_LESSONS[lessonIndex + 1] : null;

	return {
		lesson,
		content,
		prev,
		next,
		lessonIndex,
		totalLessons: SEEING_LESSONS.length
	};
};
