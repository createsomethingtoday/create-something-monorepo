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
		id: 'dry-implementation',
		title: 'DRY: Implementation',
		description: 'Level 1 — "Have I built this before?" Learn to see duplication.',
		duration: '15 min'
	},
	{
		id: 'rams-artifact',
		title: 'Rams: Artifact',
		description: 'Level 2 — "Does this earn its existence?" Learn to see excess.',
		duration: '15 min'
	},
	{
		id: 'heidegger-system',
		title: 'Heidegger: System',
		description: 'Level 3 — "Does this serve the whole?" Learn to see disconnection.',
		duration: '20 min'
	},
	{
		id: 'triad-application',
		title: 'Applying the Triad',
		description: 'Putting the three questions together. The framework becomes perception.',
		duration: '25 min'
	},
	{
		id: 'capstone',
		title: 'Capstone: Building Simple Loom',
		description: 'Build your first piece of automation infrastructure — a Task Tracker MCP server.',
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

When you write code, you're not building from nothing. You're revealing a solution that was always possible. The problem has a shape. The solution fits that shape. Your job is to remove everything that doesn't fit:

- Remove duplication until the concept is clear
- Remove excess until only the essential remains
- Remove disconnection until the system coheres

## What Obscures?

Three things obscure truth in code:

### 1. Duplication (Implementation Level)
When the same concept is expressed multiple times, the concept itself becomes obscured. Which version is canonical? Which is correct? The duplication creates noise that hides the signal.

### 2. Excess (Artifact Level)
When a feature has more than it needs, the essential purpose becomes obscured. What does this actually do? What's the core value? The excess creates confusion that hides clarity.

### 3. Disconnection (System Level)
When parts don't relate properly to the whole, the system's purpose becomes obscured. How does this fit? What does it serve? The disconnection creates fragmentation that hides coherence.

## Subtractive Creation in Practice

This isn't just philosophy. It's practical guidance.

**Before you add code, ask:**
- Am I adding, or am I revealing?
- What would I need to remove for this to be clearer?
- Is this creation, or is this obscuring?

**When you review code, ask:**
- What's hiding here that could be revealed through removal?
- What duplication, excess, or disconnection is obscuring the solution?
- What's the simplest form that still works?

---

## Reflection

Before moving on, sit with this:

**What's one thing in your current codebase that's obscured by duplication, excess, or disconnection?**

Don't fix it yet. Just see it.

Seeing comes before doing. That's why we're here.

---

## Resources

The Subtractive Triad draws from three foundational sources:

- **DRY**: From *The Pragmatic Programmer* by Andy Hunt and David Thomas (1999). [pragprog.com/titles/tpp20](https://pragprog.com/titles/tpp20/the-pragmatic-programmer-20th-anniversary-edition/)

- **Rams**: Dieter Rams' Ten Principles of Good Design. [rams-foundation.org](https://rams-foundation.org/foundation/design-comprehension/theses/)

- **Heidegger**: The concepts of Zuhandenheit (ready-to-hand) and Vorhandenheit (present-at-hand) from *Being and Time* (1927). [Stanford Encyclopedia of Philosophy](https://plato.stanford.edu/entries/heidegger/)

These sources inform each level of the Triad you'll learn in the following lessons.
`,
	'dry-implementation': `
## Level 1 of the Subtractive Triad

**Question**: "Have I built this before?"  
**Action**: Unify

This is the first question because it's the fastest filter. Either the code exists or it doesn't. Either you're duplicating or you're not.

## What DRY Really Means

DRY stands for "Don't Repeat Yourself." The principle was formally introduced in [*The Pragmatic Programmer*](https://pragprog.com/titles/tpp20/the-pragmatic-programmer-20th-anniversary-edition/) by Andy Hunt and David Thomas (1999).

**DRY is not**: "Never write similar code twice."  
**DRY is**: "Every piece of knowledge must have a single, unambiguous, authoritative representation in a system."

The difference matters.

### Bad DRY

\`\`\`typescript
// Someone read "DRY" and made this:
const BUTTON_COLOR = '#3b82f6';
const LINK_COLOR = '#3b82f6';  
const HEADER_COLOR = '#3b82f6';

// "They're all blue, so DRY says make one constant!"
const PRIMARY_COLOR = '#3b82f6';
\`\`\`

This is wrong. These aren't duplicated knowledge. They're three different concepts that happen to have the same value. If button color changes, link color might not.

### Good DRY

\`\`\`typescript
// The design system defines blue:
const colors = { blue: { 500: '#3b82f6' } };

// Components use the token:
const buttonStyles = { bg: colors.blue[500] };
const linkStyles = { color: colors.blue[500] };
\`\`\`

Now there's one authoritative representation of "blue-500". If it changes, it changes everywhere. That's DRY.

## The Question in Practice

When you're about to write code, ask: **"Have I built this before?"**

This question has layers:

### Layer 1: Exact Match
Have I literally written this function before? Is there a \`formatDate()\` somewhere?

### Layer 2: Conceptual Match
Have I built something that serves the same purpose? Different name, same concept?

### Layer 3: Library Match
Has someone else built this? Is there a well-tested solution?

## When Duplication Is OK

Not all repetition is duplication. Sometimes similar code serves different purposes:

- Two handlers that look similar but will evolve differently
- Test setup that could be shared but is clearer inline
- Validation rules that coincidentally match but serve different domains

**The test**: If one changes, must the other change? If yes, unify. If no, leave separate.

---

## Reflection

The DRY question becomes instinct when you ask it before writing, not after.

**What would change if you asked "Have I built this before?" every time you started typing?**

---

## Resources

- **Original Source**: [*The Pragmatic Programmer: 20th Anniversary Edition*](https://pragprog.com/titles/tpp20/the-pragmatic-programmer-20th-anniversary-edition/) — Andy Hunt and David Thomas

- **Key Insight**: "Duplication is far cheaper than the wrong abstraction" — Sandi Metz. This nuance is critical: don't unify prematurely.

- **The Test**: Code duplication ≠ knowledge duplication. Two functions with identical code that serve different purposes and will evolve differently are *not* DRY violations.
`,
	'rams-artifact': `
## Level 2 of the Subtractive Triad

**Question**: "Does this earn its existence?"  
**Action**: Remove

Named for [Dieter Rams](https://rams-foundation.org/homepage/), the legendary designer whose principle was:

**Weniger, aber besser** — Less, but better.

## The Rams Standard

Rams led design at Braun for over 30 years. Every button, every line, every element had to justify itself. If it didn't serve the essential purpose, it was removed.

His [Ten Principles of Good Design](https://rams-foundation.org/foundation/design-comprehension/theses/) include:

1. Good design is innovative
2. Good design makes a product useful
3. Good design is aesthetic
4. Good design makes a product understandable
5. Good design is unobtrusive
6. Good design is honest
7. Good design is long-lasting
8. Good design is thorough down to the last detail
9. Good design is environmentally friendly
10. **Good design is as little design as possible**

The tenth principle encapsulates the philosophy: concentrate on essential aspects, don't burden products with non-essentials, return to purity and simplicity.

This isn't minimalism for aesthetics. It's minimalism for function. Every element that doesn't earn its place actively harms the product by obscuring what matters.

## The Question in Practice

After you've checked for duplication (DRY), ask: **"Does this earn its existence?"**

This applies to:

### Features
Does this feature serve a real need, or an imagined one?
- "Users might want to..." → They haven't asked. Wait.
- "It would be cool if..." → Cool isn't useful. Remove.
- "Just in case..." → Cases that haven't happened don't need handling.

### Parameters
Does this parameter justify its complexity?
- Props with defaults that never change → Remove the prop
- Options that are always the same value → Make it a constant
- Flexibility that's never exercised → Simplify

### Code
Does this code earn its lines?
- Abstractions with one implementation → Inline them
- Helper functions used once → Inline them
- Comments that describe what code already says → Remove them

## The Existence Test

For anything you're about to add, ask:

1. **What happens if I don't add this?** — If "nothing much," don't add it.
2. **Who asked for this?** — If no one asked, why are you building it?
3. **When was this last needed?** — If you can't remember, it's probably not needed.
4. **What's the simplest version?** — Build that first. Add complexity only when forced.

---

## Reflection

The Rams question challenges our instinct to add. Building feels productive. Removing feels like giving up.

But removal is creation. Every feature you don't build is time for features that matter. Every line you don't write is clarity for lines that remain.

**What would you remove from your current project if you had to justify every feature's existence?**

---

## Resources

- **Rams Foundation**: [rams-foundation.org](https://rams-foundation.org/homepage/) — Official foundation preserving Rams' design legacy

- **Ten Principles**: [The Theses](https://rams-foundation.org/foundation/design-comprehension/theses/) — Original articulation of the principles

- **Design Museum Overview**: [What Is Good Design?](https://designmuseum.org/discover-design/all-stories/what-is-good-design-a-quick-look-at-dieter-rams-ten-principles) — Accessible introduction to Rams' principles

- **Digital Influence**: Jonathan Ive, Apple's former Chief Design Officer, translated Rams' principles into digital products. The iPhone calculator is a direct homage to Rams' Braun designs.
`,
	'heidegger-system': `
## Level 3 of the Subtractive Triad

**Question**: "Does this serve the whole?"  
**Action**: Reconnect

This is the deepest level. DRY looks at implementation. Rams looks at artifacts. Heidegger looks at systems.

Named for [Martin Heidegger](https://plato.stanford.edu/entries/heidegger/), the philosopher who explored how things exist in relation to their context in *Being and Time* (1927).

## The Hermeneutic Circle

Heidegger's key insight: **You understand the parts through the whole, and the whole through the parts.**

Reading a sentence: You understand words through the sentence's meaning, and the sentence's meaning through the words. Neither comes first. Understanding spirals between them.

The same applies to systems. You understand a function through the system it serves, and the system through its functions. A component makes sense only in context. A service exists only within an architecture.

## The Question in Practice

After checking for duplication (DRY) and excess (Rams), ask: **"Does this serve the whole?"**

This requires knowing what "the whole" is:

### Identify the System
What system does this belong to? What's the system's purpose?

### Map the Connections
How does this part connect to other parts? What does it depend on? What depends on it?

### Evaluate the Fit
Does this part strengthen or fragment the whole?

## Seeing Disconnection

Train yourself to notice:

**Orphaned code**: Functions nothing calls, components nothing renders

**Fragmented boundaries**: Imports that cross architectural lines, responsibilities split across modules

**Misaligned naming**: Code that says "user" when the system says "member"

**Wrong placement**: Logic in the UI that belongs in a service

---

## Key Concepts for Developers

Two Heideggerian concepts illuminate how we relate to tools:

### Zuhandenheit (Ready-to-hand)

When using a hammer, you don't think about the hammer—you think about the nail. The tool *withdraws* from attention and becomes an extension of your intention. Well-designed code works the same way: it recedes, letting you focus on the problem.

### Vorhandenheit (Present-at-hand)

When the hammer breaks, suddenly you notice it. It shifts from transparent use to explicit attention. Poorly designed code is always present-at-hand—you're constantly aware of the tool instead of the work.

**The goal**: Code that stays ready-to-hand. Systems that recede into transparent use.

---

## Reflection

The Heidegger question is the hardest because it requires perspective. You have to see the whole to evaluate whether parts serve it.

**What is the "whole" that your current project serves? Can you articulate it clearly?**

If you can't articulate the whole, you can't evaluate whether parts serve it. Sometimes the first step is clarifying purpose.

---

## Resources

- **Stanford Encyclopedia of Philosophy**: [Heidegger](https://plato.stanford.edu/entries/heidegger/) — Comprehensive overview of Heidegger's philosophy

- **Heideggerian Terminology**: [Wikipedia](https://en.wikipedia.org/wiki/Heideggerian_terminology) — Glossary of key concepts

- **Primary Source**: *Being and Time* (Sein und Zeit), 1927 — Heidegger's foundational work
`,
	'triad-application': `
## The Three Questions Together

You've learned the three levels separately. Now you use them together.

**The Subtractive Triad is a decision framework.** For any technical choice, ask three questions in sequence:

1. **DRY** (Implementation) → "Have I built this before?"
2. **Rams** (Artifact) → "Does this earn its existence?"
3. **Heidegger** (System) → "Does this serve the whole?"

## Why This Order?

**DRY is fastest** — You either have the code or you don't. Quick to check.  
**Rams requires judgment** — You must evaluate need vs. excess. Slower.  
**Heidegger is deepest** — You must understand the whole system. Slowest.

Start shallow, spiral deeper. If DRY eliminates the decision, you don't need Rams. If Rams eliminates the feature, you don't need Heidegger.

## A Complete Example

**Scenario**: "Add a dark mode toggle to user profiles."

### Level 1: DRY
**Ask**: Have I built this before?  
**Finding**: Yes! There's a theme switcher in settings.  
**Decision**: Reuse the existing \`useTheme()\` hook.

### Level 2: Rams
**Ask**: Does a profile-level toggle earn its existence?  
**Finding**: The settings toggle already serves this need.  
**Decision**: This feature doesn't earn its existence.

**The decision ends here.** Rams eliminated the feature.

## The Spiral

The triad isn't linear—it spirals. You'll revisit levels as understanding deepens.

\`\`\`
Design a feature (implementation)
↓
DRY: Is this duplicated? → No, continue
↓
Build the feature (artifact)
↓
Rams: Does this earn existence? → Yes, continue
↓
Test with users (system)
↓
Heidegger: Does this serve the workflow?
↓
Wait—users are confused by the flow!
↓
BACK TO RAMS: The boundaries are confusing
↓
Simplify the feature set
↓
Continue the spiral...
\`\`\`

## Mastery

You've mastered the triad when:

1. **The questions are unconscious** — You ask them without thinking about asking
2. **You catch issues early** — Problems surface during design, not after testing
3. **You spiral naturally** — Moving between levels feels fluid, not forced

---

## The Journey Ahead

You've learned the philosophy. Now it's time to apply it.

**Next: The Capstone Project**

You'll build a Task Tracker MCP server — your first piece of automation infrastructure. Apply the Triad to every decision: What patterns can you reuse? Does each tool earn its existence? Does your server serve the agent's workflow?

---

## Resources

### The Triad Sources

- **DRY**: [*The Pragmatic Programmer*](https://pragprog.com/titles/tpp20/the-pragmatic-programmer-20th-anniversary-edition/) — Hunt & Thomas
- **Rams**: [Ten Principles of Good Design](https://rams-foundation.org/foundation/design-comprehension/theses/) — Rams Foundation
- **Heidegger**: [Stanford Encyclopedia of Philosophy](https://plato.stanford.edu/entries/heidegger/)

### For Developers

The Triad applies to any technical decision:
- Feature requests → Does this earn its existence?
- Code review → Have I seen this pattern duplicated?
- Architecture → Does this serve the whole system?
`,
	'capstone': `
You're about to build your first piece of automation infrastructure.

Not a demo. Not a tutorial exercise. A working tool that AI agents can use to manage your tasks.

## What You're Building

**Simple Loom** — a Task Tracker MCP server.

\`\`\`
Your Intention                The Automation Layer              Execution
─────────────────            ─────────────────────             ──────────
"Add a task"         →       Your MCP Server          →        Task saved
"What's on my list?" →       (Simple Loom)            →        Tasks returned
"Mark it done"       →                                →        Status updated
\`\`\`

The MCP server sits between intention and execution. That's The Automation Layer.

## Why This Matters

This isn't just a capstone exercise. You're learning the patterns behind real systems:

| What You Build | Production Version |
|----------------|-------------------|
| Task lifecycle (\`todo\` → \`doing\` → \`done\`) | Loom's task coordination |
| State persistence (\`~/.tasks/tasks.json\`) | Loom's SQLite + checkpoints |
| Agent-native tools | Ground's verification system |

When you later see Loom and Ground, you'll recognize these patterns.

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

**1. What did you notice about the Triad while building?**

Where did DRY guide you? What didn't earn its existence? How did you think about the agent's workflow?

**2. What pattern do you see now that you didn't before?**

The task lifecycle. The external memory. The tool boundaries.

**3. What would you do differently next time?**

This is the hermeneutic spiral — each iteration deepens understanding.

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
