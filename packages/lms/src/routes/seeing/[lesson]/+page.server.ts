import { error } from '@sveltejs/kit';
import { marked } from 'marked';
import type { PageServerLoad } from './$types';

// Lesson metadata - matches the seeing package
const SEEING_LESSONS = [
	{
		id: 'setting-up',
		title: 'Setting Up',
		description: 'Install Claude Code and verify your setup. Five minutes to your first practice.',
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
## What You'll Have When You're Done

By the end of this lesson, you'll have:
- Claude Code installed and authenticated
- Your development environment verified
- Ready to start learning systems thinking

Total time: about 5 minutes. Let's go.

---

## New to the Terminal?

Here's a secret: the terminal isn't scary. It's just a different way to talk to your computer.

Instead of clicking buttons and dragging windows, you type commands. That's it. The computer reads what you type, does something, and shows you the result. Same as clicking, just faster once you know the words.

### Opening the Terminal

**On macOS:**
1. Press **Cmd + Space** to open Spotlight
2. Type "Terminal"
3. Press Enter

Or find it in Applications → Utilities → Terminal.

**On Windows:**
1. Press **Win + X**
2. Click "Terminal" or "Windows PowerShell"

Or search for "Terminal" in the Start menu.

**On Linux:**
Press **Ctrl + Alt + T** (works on most distributions), or find Terminal in your applications menu.

### The Commands You'll Need

For this course, you only need a handful of commands:

| What you type | What it does |
|---------------|--------------|
| \`cd folder-name\` | Go into a folder |
| \`cd ..\` | Go up one folder |
| \`ls\` | List files (macOS/Linux) |
| \`dir\` | List files (Windows) |
| \`pwd\` | Show where you are (macOS/Linux) |
| \`cd\` | Show where you are (Windows) |

That's honestly most of what you need. When you see a command in this course, you'll copy it, paste it into your terminal, and press Enter.

### Pasting into the Terminal

This trips people up:

- **macOS Terminal**: Cmd + V (normal paste)
- **Windows Terminal**: Right-click (yes, really) or Ctrl + Shift + V
- **Linux**: Ctrl + Shift + V

If Ctrl + V doesn't work, try right-clicking. Terminals are quirky about paste.

### If You Want to Learn More

These are genuinely good resources for beginners:

- [Codecademy: Learn the Command Line](https://www.codecademy.com/learn/learn-the-command-line) — Interactive course, ~4 hours
- [freeCodeCamp: Command Line Tutorial](https://www.freecodecamp.org/news/command-line-commands-cli-tutorial/) — Free, covers all platforms
- [DigitalOcean: Learning to Love Your Terminal](https://www.digitalocean.com/community/conceptual-articles/learning-to-love-your-terminal) — Great conceptual intro

You don't need to master these before starting. Learn just enough to follow along, then pick up more as you go. That's how everyone learns.

### What You'll See When You Open Terminal

When you first open a terminal, you'll see something like this:

\`\`\`
username@computer ~ %
\`\`\`

Or maybe:

\`\`\`
C:\\Users\\YourName>
\`\`\`

That's called the **prompt**. It's the terminal saying "I'm ready. Type something."

The blinking cursor after the prompt is where your typing goes. Type a command, press Enter, and the terminal runs it. Then it shows you a new prompt, ready for the next command.

**One more thing**: If you ever get stuck — like the terminal seems frozen or won't take new commands — try pressing **Ctrl + C**. That cancels whatever's running and gives you your prompt back. It's the terminal equivalent of "never mind, let's start over."

Now let's get Claude Code installed.

---

## Before You Start: Get Claude Pro

Claude Code requires a Claude Pro subscription ($20/month). If you don't have one yet:

1. Go to [claude.ai/upgrade](https://claude.ai/upgrade)
2. Subscribe to Claude Pro
3. Come back here

**Why Pro?** Claude Code is included with Pro — no separate purchase. The ~45 messages every 5 hours is more than enough for learning. You'll complete this entire curriculum with plenty of headroom.

---

## Step 1: Install Claude Code

**On macOS or Linux**, run:

\`\`\`bash
curl -fsSL https://claude.ai/install.sh | bash
\`\`\`

**On Windows (PowerShell)**, run:

\`\`\`powershell
irm https://claude.ai/install.ps1 | iex
\`\`\`

**You should see**: Installation output with a success message.

**Verify it worked**:

\`\`\`bash
claude --version
\`\`\`

**You should see**: A version number.

### If "claude" isn't found

Close and reopen your terminal. The installer adds Claude to your PATH, but your current session may not see it yet.

On macOS/Linux, you can also run:
\`\`\`bash
source ~/.bashrc  # or source ~/.zshrc
\`\`\`

---

## Step 2: Authenticate with Anthropic

Start Claude Code:

\`\`\`bash
claude
\`\`\`

On first run, a browser window opens. Sign in with your Claude Pro account.

**You should see**: After signing in, return to your terminal. Claude Code is ready.

**If authentication fails**: Make sure your Claude Pro subscription is active. Run \`claude doctor\` to diagnose issues.

---

## Step 3: Verify Everything Works

Run the diagnostic:

\`\`\`bash
claude doctor
\`\`\`

**You should see**: All checks passing. Something like:

\`\`\`
✓ Authentication valid
✓ Network connection OK
✓ Version up to date
\`\`\`

**If checks fail**: The output tells you exactly what's wrong. Most common issues:
- Subscription not active — check [claude.ai/settings](https://claude.ai/settings)
- Network connectivity — check your internet connection
- Outdated version — reinstall with the command from Step 1

---

## You're Set Up

That's it. You have:
- ✓ Claude Code installed
- ✓ Anthropic authentication working
- ✓ Environment verified

Now the real work begins. Let's talk about what creation actually is.

---

## Why Claude Code for This Course?

Here's the thing: you could learn these concepts with any AI tool. But Claude Code has something others don't: it's designed for **systems thinking**.

Claude Code doesn't just answer questions — it works alongside you in your terminal, your editor, your codebase. It sees the whole context. That's exactly what you need for learning the Subtractive Triad.

When you ask "Have I built this before?" Claude Code can actually search your code. When you ask "Does this serve the whole?" it can see the whole system.

That's why we use it. The tool matches the philosophy.

---

## Resources

- [Claude Code Documentation](https://docs.anthropic.com/en/docs/claude-code) — Official docs
- [Claude Code Setup Guide](https://code.claude.com/docs/en/setup) — Installation and configuration
- [CLI Reference](https://docs.anthropic.com/en/docs/claude-code/cli-usage) — Command reference
- [Model Context Protocol](https://modelcontextprotocol.io/docs) — The protocol you'll learn to build with
`,
	'what-is-creation': `
> **First time here?** Start with [Setting Up](/seeing/setting-up) to get Claude Code running.

## Here's What Most Developers Do

They write code like this:

\`\`\`typescript
// user-service.ts
function validateEmail(email: string): boolean {
  const regex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
  return regex.test(email);
}

// auth-service.ts  
function isValidEmail(email: string): boolean {
  const pattern = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
  return pattern.test(email);
}

// newsletter-service.ts
function checkEmail(email: string): boolean {
  return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email);
}
\`\`\`

Three files. Three functions. Same regex. Same logic.

Now someone finds a bug in the email validation. They fix it in one place. The other two? Still broken. They just don't know it yet.

**This is what obscurity looks like in code.** The real function — the single source of truth — is hidden behind three redundant copies.

## The Paradox

Most people think creation is about adding. More features. More code. More options.

But look at those three functions. What would you do? You'd delete two of them. You'd remove 450 lines of noise to reveal the one function that actually matters.

**The paradox**: The most creative act here is removal.

## Michelangelo Understood This

When asked how he carved David, Michelangelo reportedly said:

> "I saw the angel in the marble and carved until I set him free."

He didn't add marble. He removed what wasn't David. The sculpture was always there, hidden in the stone.

Your code works the same way. The solution exists. Your job is to carve away everything that obscures it.

## The Meta-Principle

**Creation is the discipline of removing what obscures.**

This is the foundation of everything you'll learn here. It's not philosophy for philosophy's sake — it's a practical lens for every technical decision you make.

When you write code, ask: *Am I adding, or am I revealing?*

When you review code, ask: *What's hiding here that could be clearer?*

When you design systems, ask: *What's the minimum that actually works?*

---

## Three Things Obscure Code

Here's the framework you'll learn to see with:

| What Obscures | Where It Hides | The Question |
|---------------|----------------|--------------|
| **Duplication** | Implementation | "Have I built this before?" |
| **Excess** | Features | "Does this earn its existence?" |
| **Disconnection** | System | "Does this serve the whole?" |

That email example? That's duplication — Level 1. But there's more to see. We'll get there.

---

## Why This Matters for Automation

You're learning to build automation infrastructure — systems that work while you sleep.

Bad automation is bloated. Too many options. Too many edge cases. Too many ways to fail. It *adds* friction instead of removing it.

Good automation disappears. You say "add a task" and a task gets added. You don't think about the tool. You don't configure anything. It just works.

That disappearance? That's what happens when you remove everything that doesn't earn its place. The automation layer *recedes* into transparent use.

---

## The Breakdown Moment

Here's something worth noticing: the moment you *stop* seeing a tool is the moment it starts working.

Think about the last time you didn't notice your editor. You opened a file, typed, saved. The tool disappeared. You were writing, not using software.

Now think about the last time your editor crashed. Suddenly the editor is *all you think about.* Where's my cursor? Did my file save? Why did it do that?

That shift — from invisible to visible — is what philosophers call a **breakdown moment**. The tool was always there. You just stopped noticing it until it broke.

**Claude Code works the same way.**

When it's working well, you don't think about it. You describe what you want. The agent understands. Things happen.

When it struggles — context window fills, it edits the wrong file, it misunderstands your intent — suddenly you're thinking about the tool itself. "Why did it do that? How do I get it back on track?"

### What to Do When It Breaks

Three moves:

1. **Start fresh.** Open a new session. Context pollution is the most common cause of confusion.
2. **Be specific.** "Only modify files in src/lib/" gives the agent boundaries. Vague requests drift.
3. **Show, don't tell.** Paste the relevant code. Let the agent see what you mean.

The breakdown moment isn't a failure. It's information. It tells you where the automation layer needs better boundaries or clearer instructions.

That's what seeing means: noticing when tools stop working, understanding why, and making them disappear again.

---

## Try This Now

Think of automation you use daily that "just works." Calendar invites that auto-create video calls. Git commits that trigger deploys.

Now think of automation that constantly demands attention. Broken webhooks. Flaky integrations. Config files you never stop editing.

**What's the difference?** Usually: one removed friction. The other added complexity that didn't earn its place.

You're learning to tell them apart. That's what seeing means.

---

## What's Next

You've got the meta-principle: creation through removal. Now let's talk about what you're actually building — the automation layer that sits between intention and execution.
`,
	'automation-layer': `
## You've Probably Never Thought About This

When you tell an AI agent "add a task," something happens. A task appears. But *how*?

You didn't write it to a file. You didn't call an API. You just said the words, and somehow, somewhere, a task got saved.

Something sits between your words and that saved task. That something has a name: **the automation layer**.

---

## The Invisible Middle

Here's what's actually happening when you talk to an AI agent:

\`\`\`
Your words            Something happens           Result
──────────────       ──────────────────          ──────────
"Add a task"    →    [The automation layer]  →   Task saved
"Send email"    →    [The automation layer]  →   Email sent
"Deploy site"   →    [The automation layer]  →   Site live
\`\`\`

That middle part? That's what you're learning to build.

When it works well, you never think about it. You say "add a task" and a task appears. The layer is invisible.

When it breaks, suddenly you notice everything. Error messages. Config files. Permission issues. "Why did this stop working?" The layer becomes very visible, and not in a good way.

**Here's the goal**: Build automation layers that disappear. You think about what you want, not how it happens.

---

## Let's Make It Concrete

Say you want an AI agent to manage your tasks. Here's what the automation layer looks like:

\`\`\`
┌─────────────────────────────────────────────────────────┐
│                    YOUR AI AGENT                        │
│                    (Claude Code)                        │
│                                                         │
│  You say: "Add a task: review PR #42"                   │
└────────────────────────┬────────────────────────────────┘
                         │ The agent calls a tool
                         ▼
┌─────────────────────────────────────────────────────────┐
│               THE AUTOMATION LAYER                      │
│                 (This is what you build)                │
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │  task_add   │  │  task_list  │  │task_complete│     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
│         │                                               │
│         ▼                                               │
│  ┌─────────────────────────────────┐                   │
│  │  ~/.tasks/tasks.json            │                   │
│  │  (where tasks actually live)    │                   │
│  └─────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                       RESULT                            │
│  Task "review PR #42" saved to disk. Persists forever.  │
└─────────────────────────────────────────────────────────┘
\`\`\`

**You'll build this exact system in the capstone.**

---

## What Lives in This Layer?

Four things make an automation layer work:

| Component | What It Does | In Your Task Tracker |
|-----------|--------------|---------------------|
| **Tools** | Specific actions the agent can take | \`task_add\`, \`task_list\`, \`task_complete\` |
| **Memory** | State that survives between sessions | \`tasks.json\` on disk |
| **Boundaries** | What each tool can and can't do | \`task_add\` creates, doesn't delete |
| **Protocol** | How tools talk to agents | MCP (you'll learn this) |

Right now, these might seem abstract. By the end of this course, you'll have built all four.

---

## Why You Should Care

You're not just learning to code. You're learning to build **infrastructure that works while you sleep**.

The automation layer is:
- What runs when you're not at the keyboard
- What separates "automation that works" from "automation that breaks"
- What you'll deploy in the capstone

The difference between good and bad automation? The good stuff has a clean layer. The bad stuff is a mess of scripts, webhooks, and prayers.

---

## How This Course Fits Together

Everything you learn connects to this layer:

| Lesson | What It Teaches | How It Applies |
|--------|-----------------|----------------|
| **Subtractive Triad** | What belongs and what doesn't | Which tools earn their place in your layer |
| **External Memory** | How state persists | How your layer remembers things |
| **Agent-Native Tools** | How to design for AI | How your layer talks to agents |
| **Capstone** | Building the real thing | Your layer, working |

The philosophy isn't separate from the practice. It *serves* the practice.

---

## Why Context Limits Are a Feature

Here's something counterintuitive about Claude Code: **it has a finite context window.**

Every file it reads, every message you exchange, every tool call it makes — all of it consumes space. Eventually, the context fills. The session ends.

Most people treat this as a limitation. "I wish it remembered more."

But think about it through the Triad:

**Rams says**: Constraints force clarity. If your automation layer has to work within a limited context, it has to be *efficient*. You can't just pile everything in and hope the agent figures it out.

This is by design. Good automation keeps context lean:

| Bad Practice | Good Practice |
|--------------|---------------|
| "Here's my entire codebase, figure it out" | "Here are the 3 files relevant to this task" |
| Asking 5 questions in one prompt | One clear request at a time |
| Hoping the agent remembers yesterday | External memory (Lesson 5) |
| Keeping everything in conversation | Structured state on disk |

The context window is a **design constraint** — the same kind of constraint that makes Rams' minimalism work. Less is more. Leaner is better.

Your automation layer should be designed to work *within* these limits, not around them. That's the difference between good infrastructure and fragile infrastructure.

---

## Try This Now

Think of three automations you use daily:
1. Something that "just works" (calendar invites → video calls)
2. Something that works but you notice (CI pipelines)
3. Something that constantly breaks (that webhook you keep fixing)

**What's different about them?** Usually: the good ones have clean layers. The bad ones have layers held together with duct tape.

You're learning to build the good kind.
`,
	'subtractive-triad': `
## The Three Questions

Every technical decision you make — every feature, every tool, every line of code — can be evaluated with three questions. Ask them in order:

| # | Question | If the answer reveals a problem... |
|---|----------|-----------------------------------|
| 1 | "Have I built this before?" | **Unify** the duplicates |
| 2 | "Does this earn its existence?" | **Remove** what doesn't |
| 3 | "Does this serve the whole?" | **Reconnect** what fragments |

That's it. Three questions. They reveal duplication, excess, and disconnection — the three things that obscure code.

Let's break each one down.

---

## Question 1: DRY — "Have I built this before?"

You've heard of DRY (Don't Repeat Yourself). But most people misunderstand it.

**DRY is not**: "Never write similar code twice."  
**DRY is**: "Every piece of knowledge should have one authoritative source."

### The Quick Test

Ask: *If I change one instance, must I change the other?*

- **Yes** → That's duplication. Unify them.
- **No** → Not duplication. Leave them separate.

### Try This Now

Look at your current project. Find two functions that do similar things. Ask the question. If one has to change when the other does, you've found a DRY violation.

### In Automation

Before adding a tool to your automation layer:

\`\`\`typescript
// Someone suggests adding task_create()...
task_add()      // Already creates tasks
task_create()   // Would also create tasks (???)

// Ask: Have I built this before?
// Answer: Yes. task_add already does this.
// Action: Don't add task_create. One tool per capability.
\`\`\`

---

## Question 2: Rams — "Does this earn its existence?"

Named for Dieter Rams, the designer who said: *"Weniger, aber besser"* — Less, but better.

Every feature, every tool, every option must justify its presence. If it can't, remove it.

### The Existence Test

Four questions to ask about any proposed feature:

1. **What happens if I don't add this?** (Often: nothing bad)
2. **Who asked for this?** (Often: no one)
3. **When was this last needed?** (Often: never)
4. **What's the simplest version?** (Often: much simpler)

If the answers are "nothing," "no one," "never," and "simpler" — cut it.

### Try This Now

Look at a feature you're working on. Ask: *Who asked for this? When was it last needed?*

If you can't answer, the feature might not earn its existence.

### In Automation

\`\`\`typescript
// Proposed tools for a task tracker:
task_add         ✓ Essential — can't manage tasks without creating them
task_list        ✓ Essential — need to see what exists
task_complete    ✓ Essential — core workflow action
task_remove      ✓ Essential — need to clean up

task_archive     ✗ Who asked? (no one)
task_priority    ✗ When needed? (never came up)
task_color       ✗ Does it serve the workflow? (no)
\`\`\`

**Four tools.** That's enough. Every extra tool is complexity that must be justified.

---

## Question 3: Heidegger — "Does this serve the whole?"

The deepest question. Named for the philosopher who observed: you understand parts through the whole, and the whole through parts.

Zoom out. Does this feature, this tool, this code — does it serve the system's purpose?

### Signs of Disconnection

- **Orphaned code**: A function nothing calls
- **Misaligned naming**: Tool says "item" but the system says "task"
- **Wrong placement**: Business logic in the transport layer
- **Scope creep**: A tool that does something outside its system's purpose

### Try This Now

Pick a file in your project. Ask: *What system does this serve?* Then look at each function. Does every function serve that system?

If you find one that doesn't fit, you've spotted disconnection.

### In Automation

Your task tracker serves one workflow: "Manage tasks through conversation."

\`\`\`
Does task_add serve this?     → Yes, core workflow
Does task_list serve this?    → Yes, core workflow
Does export_csv serve this?   → No — that's a different workflow
\`\`\`

\`export_csv\` might be useful, but it doesn't serve *this* system. It belongs somewhere else (or nowhere).

---

## Why This Order?

**DRY is fastest.** Does it exist? Yes or no. Quick to check.

**Rams requires judgment.** You have to evaluate need vs. excess.

**Heidegger is deepest.** You have to understand the whole system.

Start shallow, spiral deeper. If DRY eliminates the decision, you don't need Rams. If Rams cuts the feature, you don't need Heidegger.

---

## A Complete Example

**Scenario**: Someone suggests adding \`task_archive\` to your Task Tracker.

**Question 1 (DRY)**: Have I built this before?
- \`task_complete\` already marks tasks done
- \`task_list\` can filter by status
- "Archive" might just be filtering, not a new capability

**Question 2 (Rams)**: Does \`task_archive\` earn its existence?
- What happens if I don't add it? Users filter completed tasks instead
- Who asked for this? The actual need was "hide completed tasks"
- What's the simplest version? Add a \`status\` filter to \`task_list\`

**Decision**: Don't add \`task_archive\`. Extend \`task_list\` with a filter parameter.

The Triad eliminated a feature before it was built. That's the point.

---

## Resources

If you want to go deeper:

- **DRY**: [*The Pragmatic Programmer*](https://pragprog.com/titles/tpp20/the-pragmatic-programmer-20th-anniversary-edition/) — Hunt & Thomas
- **Rams**: [Ten Principles of Good Design](https://rams-foundation.org/foundation/design-comprehension/theses/) — Rams Foundation
- **Heidegger**: [Stanford Encyclopedia entry](https://plato.stanford.edu/entries/heidegger/) — Academic but foundational
`,
	'external-memory': `
## The Problem: AI Agents Have No Memory

Here's something that surprised me when I started building with AI agents:

**Every conversation starts from zero.**

Yesterday you told Claude Code about your project structure. Today? Gone. You added three tasks to a todo list. Restart the session? Gone.

AI agents are stateless. They don't remember anything between sessions. All that context you built up? Evaporates the moment you close the terminal.

---

## The Solution: External Memory

External memory is how automation systems remember. Instead of asking the agent to remember, you store state *outside* the agent:

\`\`\`
Session 1:
  You: "Add a task: review PR #42"
  Agent: (calls task_add tool)
  Tool: (saves task to ~/.tasks/tasks.json)
  
  Session ends. Agent forgets everything.

Session 2 (next day):
  You: "What's on my task list?"
  Agent: (calls task_list tool)
  Tool: (reads from ~/.tasks/tasks.json)
  Agent: "You have one task: review PR #42"
\`\`\`

The agent didn't remember. The **automation layer** remembered. That's the key insight.

---

## The Pattern Is Simple

External memory works the same way everywhere:

\`\`\`typescript
// 1. Load state from storage
const tasks = loadTasks();

// 2. Modify state
tasks.push(newTask);

// 3. Save state back to storage
saveTasks(tasks);
\`\`\`

Load → Modify → Save. That's it.

Everything else is implementation details: where you store it, how you format it, how you handle edge cases.

---

## Start With JSON Files

Here's a controversial opinion: **for your first automation layer, use JSON files.**

| Storage | Complexity | When It Makes Sense |
|---------|------------|---------------------|
| **JSON file** | Low | Learning, prototypes, single-user tools |
| **SQLite** | Medium | Production, queries, multiple tools sharing state |
| **Cloud database** | High | Multi-user, team features, scale |

You can always migrate later. Don't over-engineer at the start.

---

## The Code You'll Use

Here's the complete external memory implementation for your Task Tracker:

\`\`\`typescript
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Where state lives
const TASKS_DIR = path.join(os.homedir(), '.tasks');
const TASKS_FILE = path.join(TASKS_DIR, 'tasks.json');

// Make sure the directory exists
function ensureDir() {
  if (!fs.existsSync(TASKS_DIR)) {
    fs.mkdirSync(TASKS_DIR, { recursive: true });
  }
}

// Load all tasks from disk
export function loadTasks(): Task[] {
  ensureDir();
  if (!fs.existsSync(TASKS_FILE)) return [];  // No file? Empty list.
  return JSON.parse(fs.readFileSync(TASKS_FILE, 'utf-8'));
}

// Save all tasks to disk
export function saveTasks(tasks: Task[]) {
  ensureDir();
  fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2));
}
\`\`\`

Notice three things:

1. **Location**: \`~/.tasks/\` in your home directory, not in the project folder
2. **Format**: JSON with pretty-printing — you can open it in any editor
3. **Safety**: Handle missing files gracefully (return empty array, not crash)

---

## Mistakes I've Made (So You Don't Have To)

### Mistake 1: Asking the agent to remember things

\`\`\`
❌ "Remember that I have a task called 'review PR'"

The agent will say "I'll remember that!" and then forget it 
completely the moment you end the session.
\`\`\`

**Fix**: Store state externally. The agent reads and writes files; it doesn't remember.

### Mistake 2: Over-engineering storage

\`\`\`
❌ "I need PostgreSQL with migrations and connection pooling"

For a learning project? That's weeks of setup for no benefit.
\`\`\`

**Fix**: Start with JSON files. Migrate when you hit actual limits.

### Mistake 3: Crashing on missing files

\`\`\`typescript
// ❌ This throws an error if the file doesn't exist
const tasks = JSON.parse(fs.readFileSync(TASKS_FILE, 'utf-8'));

// ✓ This handles the first run gracefully
if (!fs.existsSync(TASKS_FILE)) return [];
return JSON.parse(fs.readFileSync(TASKS_FILE, 'utf-8'));
\`\`\`

---

## How Production Systems Do It

Your Task Tracker uses JSON files. Production systems use the same pattern with different storage:

| System | What It Does | Storage Pattern |
|--------|--------------|-----------------|
| **Loom** | Task coordination | SQLite + periodic checkpoints |
| **Ground** | Code verification | JSON evidence files per run |
| **WORKWAY** | Workflow automation | Cloudflare D1 (SQLite at the edge) |

The pattern is identical. Only the backend changes.

---

## Two Kinds of External Memory

You've seen one kind: **data memory**. Tasks saved to \`tasks.json\`. State that persists between sessions.

There's a second kind: **spatial memory**. And it's just as important.

### Spatial Memory: CLAUDE.md

\`CLAUDE.md\` is a file that lives at the root of your project. Claude Code reads it automatically at the start of every session.

\`\`\`markdown
# My Project

## Architecture
- Frontend: SvelteKit at packages/web/
- API: Express at packages/api/
- Database: PostgreSQL

## Conventions
- Use TypeScript everywhere
- Test files go in __tests__/ next to the source
- Don't modify node_modules (obviously)
\`\`\`

This is external memory applied to the *agent's understanding*, not just task data.

Without \`CLAUDE.md\`: Every session starts from zero. You explain your project structure again and again.

With \`CLAUDE.md\`: Every session starts informed. The agent already knows your conventions, your file layout, your constraints.

Same Load → Modify → Save pattern. Same principle. Different target:

| Type | What It Stores | File | Who Reads It |
|------|---------------|------|--------------|
| **Data memory** | Task state | \`tasks.json\` | Your tools |
| **Spatial memory** | Project context | \`CLAUDE.md\` | The agent itself |

### The Session Handoff Pattern

Here's how production work survives session breaks:

\`\`\`
Session 1 (morning):
  - Work on auth feature
  - Make decisions (use JWT, not sessions)
  - Modify 3 files
  - Session ends (context limit, lunch, whatever)

Between sessions:
  - End-of-session notes saved to a checkpoint file
  - Key decisions documented
  - File modification summary written

Session 2 (afternoon):
  - Agent reads checkpoint
  - Already knows: "JWT chosen, 3 files modified, next step is tests"
  - Continues without re-explaining everything
\`\`\`

This isn't magic. It's the same external memory pattern, applied to the development workflow itself.

**The insight**: External memory isn't just for your tools. It's for your entire development process. Everything the next session needs to know should live on disk, not in someone's head.

---

## The Triad Applied

How does external memory pass the three questions?

| Question | Answer |
|----------|--------|
| **DRY** | One \`loadTasks()\` function, called everywhere. No duplication. |
| **Rams** | JSON file is the simplest storage that works. Nothing extra. |
| **Heidegger** | Storage serves the workflow (managing tasks). It belongs here. |

---

## Try This Now

Think about what would break if your daily tools forgot everything between sessions:

- Your terminal history? Gone.
- Your editor's recent files? Gone.
- Your browser's bookmarks? Gone.

Everything you thought of — that's what external memory prevents. Your automation layer needs the same thing.
`,
	'agent-native-tools': `
## What I Wish Someone Had Told Me

When I first built tools for AI agents, I made the same mistakes everyone makes. I designed them like CLI tools for humans:

- Friendly error messages ("Oops! Something went wrong!")
- Flexible input formats ("Enter a task title, or leave blank to cancel")
- Pretty formatted output ("✓ Task added successfully!")

**None of that helps an AI agent.** In fact, it makes things worse.

Here's what I learned the hard way.

---

## Agents Read Schemas, Not Documentation

When an AI agent sees your tool, it doesn't read a README. It reads the **schema** — the structured definition of what the tool accepts and returns.

\`\`\`typescript
// This schema IS your documentation
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

The agent looks at this and knows: "I need to pass an object with a \`title\` string property."

**If your schema is vague, the agent will guess.** And it will guess wrong.

### Bad Schema (Don't Do This)

\`\`\`typescript
{
  name: 'task_add',
  description: 'Add a task',  // What kind of task? What format?
  inputSchema: { type: 'object' }  // Properties? Required fields?
}
\`\`\`

The agent has no idea what to pass. It might try \`{ task: 'review PR' }\` or \`{ name: 'review PR' }\` or just \`'review PR'\`. All wrong.

---

## Return Data, Not Messages

Here's the biggest mistake I made: returning human-friendly messages instead of structured data.

### Bad Output (What I Used To Write)

\`\`\`typescript
return { content: [{ type: 'text', text: 'Task added!' }] };
\`\`\`

The agent sees "Task added!" but can't do anything with it. What's the task ID? What's the status? If the next step needs the ID, the agent is stuck.

### Good Output (What Actually Works)

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

Now the agent can parse the response and use the ID for follow-up operations.

**Rule**: Return JSON. Always. The agent needs to parse your response, not read it.

---

## Errors Are Data Too

When something goes wrong, your instinct is to throw an error:

\`\`\`typescript
// ❌ This is useless to an agent
throw new Error('Something went wrong');
\`\`\`

The agent gets a stack trace. It can't recover. It can't explain the failure to the user.

Instead, return structured error data:

\`\`\`typescript
// ✓ This helps the agent recover
return { 
  content: [{ 
    type: 'text', 
    text: JSON.stringify({ 
      error: 'Task not found',
      requestedId: id,
      suggestion: 'Use task_list to see available task IDs'
    }) 
  }] 
};
\`\`\`

Now the agent can tell the user exactly what went wrong and suggest a fix.

---

## One Tool, One Job

It's tempting to build a "do everything" tool:

\`\`\`typescript
// ❌ One tool that does too much
task_manage({ 
  action: 'add' | 'remove' | 'update' | 'list',
  title?: string,
  id?: string,
  status?: string
})
\`\`\`

This schema is confusing. The agent has to figure out which combination of parameters to use for each action. It will make mistakes.

Split it into separate tools:

\`\`\`typescript
// ✓ Four tools with clear purposes
task_add({ title })       // Create
task_list({ status? })    // Read
task_complete({ id })     // Update
task_remove({ id })       // Delete
\`\`\`

Each tool has one job. The agent picks the right tool for the task. Simple.

---

## Your Prompts Are an Interface Too

We've been talking about designing tools for agents. But there's another interface in this system: **the prompts you write**.

When you talk to Claude Code, your natural language prompt is an interface. And the same principles apply — in reverse.

### Apply the Same Rules

**Clear boundaries:**

\`\`\`
❌ "Fix the bugs"
✓ "Fix the type errors in src/lib/auth.ts — don't touch other files"
\`\`\`

**Structured expectations:**

\`\`\`
❌ "Do the thing"
✓ "Add the task_remove tool. Return the task ID so I can verify it worked."
\`\`\`

**One request at a time:**

\`\`\`
❌ "Add task_remove, update the README, write tests, and deploy"
✓ "Add task_remove. We'll do the rest after."
\`\`\`

### Why This Matters

A vague prompt is like a vague schema. The agent guesses. It guesses wrong.

A clear prompt is like a detailed schema. The agent knows exactly what you need. It delivers.

**The symmetry**: You design tools for agents to use. You design prompts for agents to understand. Same principles, same discipline, same results.

This is the Triad at work — not just in the code you write, but in how you collaborate with the automation layer itself.

---

## The Four Tools You'll Build

Here's the complete interface for your Task Tracker:

| Tool | Input | Output | What It Does |
|------|-------|--------|--------------|
| \`task_add\` | \`{ title: string }\` | \`{ task: Task }\` | Creates a new task |
| \`task_list\` | \`{ status?: string }\` | \`{ tasks: Task[] }\` | Lists tasks (optionally filtered) |
| \`task_complete\` | \`{ id: string }\` | \`{ task: Task }\` or \`{ error }\` | Marks a task done |
| \`task_remove\` | \`{ id: string }\` | \`{ success: boolean }\` | Deletes a task |

Notice the patterns:
- **Consistent output structure**: Always an object with named properties
- **Consistent error handling**: Errors are data, not exceptions
- **Clear boundaries**: Each tool does exactly one thing

---

## The MCP Pattern

MCP (Model Context Protocol) is the standard for how AI agents discover and use tools. You'll implement it in the capstone. Here's the shape:

\`\`\`typescript
// 1. Define your tool (the schema)
{
  name: 'task_add',
  description: 'Add a new task to the task list',
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

The agent reads the schema, understands the tool, and calls it correctly. That's the whole pattern.

---

## The Triad Applied

| Question | How It Applies |
|----------|----------------|
| **DRY** | One schema pattern across all tools. Consistent structure. |
| **Rams** | Four tools. No more. Each earns its existence. |
| **Heidegger** | Tools serve the agent's workflow: "manage tasks through conversation" |

---

## Summary: What Makes Tools Agent-Friendly

1. **Detailed schemas** — The agent reads these, not your docs
2. **Structured output** — Return JSON, not human messages
3. **Structured errors** — Errors are data the agent can use
4. **Clear boundaries** — One tool, one job

The best agent tools are invisible. The agent doesn't struggle with inputs or parse cryptic outputs. It just works.

That's what you're building in the capstone.
`,
	'capstone': `
## Time to Build

You've learned the philosophy. Now you apply it.

You're building **Simple Loom** — a Task Tracker MCP server. When you're done, you'll be able to tell an AI agent "add a task" and have it actually saved to disk, persisting between sessions.

This is the automation layer pattern from Lesson 3, made real.

---

## What You're Building

\`\`\`
Your words                 Your MCP Server              What happens
──────────────────        ─────────────────            ──────────────
"Add a task"         →    Simple Loom         →       Task saved to disk
"What's on my list?" →    (your code)         →       Tasks returned
"Mark it done"       →                        →       Status updated
\`\`\`

Four tools. One JSON file. That's the whole thing.

---

## Checkpoint 1: Create the Project

**What you're doing**: Setting up a Node.js project with TypeScript and the MCP SDK.

\`\`\`bash
mkdir ~/my-task-tracker
cd ~/my-task-tracker
npm init -y
npm install @modelcontextprotocol/sdk
npm install -D typescript @types/node
\`\`\`

**Create \`tsconfig.json\`**:

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

**Create the src directory**:

\`\`\`bash
mkdir src
\`\`\`

### Verify Checkpoint 1

Run \`ls\` in your project directory.

**You should see**:
\`\`\`
node_modules/
src/
package.json
package-lock.json
tsconfig.json
\`\`\`

**If something's missing**: Check that each command succeeded. Re-run any that failed.

---

## Checkpoint 2: Create the Storage Layer

**What you're doing**: Building external memory — the code that persists tasks to disk.

**Create \`src/tasks.ts\`**:

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

This is the external memory pattern from Lesson 5. Tasks live at \`~/.tasks/tasks.json\`.

### Verify Checkpoint 2

Try compiling:

\`\`\`bash
npx tsc
\`\`\`

**You should see**: No output (success means no errors).

**If you get errors**: Check for typos in \`src/tasks.ts\`. TypeScript errors usually point to the exact line and problem.

---

## Checkpoint 3: Create the MCP Server

**What you're doing**: Building the server that exposes your tools to AI agents.

**Create \`src/index.ts\`**:

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

// Define available tools (this is what agents read)
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'task_add',
      description: 'Add a new task to the task list',
      inputSchema: {
        type: 'object',
        properties: { 
          title: { type: 'string', description: 'The task title' } 
        },
        required: ['title'],
      },
    },
    {
      name: 'task_list',
      description: 'List all tasks, optionally filtered by status',
      inputSchema: {
        type: 'object',
        properties: {
          status: { 
            type: 'string', 
            enum: ['todo', 'doing', 'done'],
            description: 'Filter by status (optional)'
          },
        },
      },
    },
    {
      name: 'task_complete',
      description: 'Mark a task as done',
      inputSchema: {
        type: 'object',
        properties: { 
          id: { type: 'string', description: 'The task ID to complete' } 
        },
        required: ['id'],
      },
    },
    {
      name: 'task_remove',
      description: 'Remove a task permanently',
      inputSchema: {
        type: 'object',
        properties: { 
          id: { type: 'string', description: 'The task ID to remove' } 
        },
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
        return { content: [{ type: 'text', text: JSON.stringify({ error: 'Task not found', id }) }] };
      }
      return { content: [{ type: 'text', text: JSON.stringify({ task }) }] };
    }

    case 'task_remove': {
      const { id } = args as { id: string };
      const success = removeTask(id);
      return { content: [{ type: 'text', text: JSON.stringify({ success, id }) }] };
    }

    default:
      return { content: [{ type: 'text', text: JSON.stringify({ error: 'Unknown tool', name }) }] };
  }
});

// Start the server
const transport = new StdioServerTransport();
server.connect(transport);
\`\`\`

Notice the patterns from Lesson 6:
- **Detailed schemas**: Each property has a description
- **Structured output**: Always returning JSON
- **Structured errors**: Errors include context for recovery

### Verify Checkpoint 3

Compile again:

\`\`\`bash
npx tsc
\`\`\`

**You should see**: No output (success).

**If you get errors**: Most likely an import path issue. Make sure you're importing from \`'./tasks.js'\` (with \`.js\` extension — required for Node ESM).

---

## Checkpoint 4: Test the Server Manually

**What you're doing**: Verifying the server responds to MCP requests.

Run this:

\`\`\`bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node dist/index.js
\`\`\`

**You should see**: A JSON response listing your four tools. Something like:

\`\`\`json
{"jsonrpc":"2.0","id":1,"result":{"tools":[{"name":"task_add",...},...]}}
\`\`\`

**If you see an error**: Check that \`dist/index.js\` exists. If not, run \`npx tsc\` again.

---

## Checkpoint 5: Connect to Claude Code

**What you're doing**: Making your server available to Claude Code.

Get your full path:

\`\`\`bash
echo "$(pwd)/dist/index.js"
\`\`\`

Copy that path. Now configure Claude Code to use your server. Run:

\`\`\`bash
claude mcp add task-tracker node /YOUR/FULL/PATH/my-task-tracker/dist/index.js
\`\`\`

Replace \`/YOUR/FULL/PATH/\` with the actual path from the echo command.

Alternatively, you can add it to your project's \`.mcp.json\`:

\`\`\`json
{
  "mcpServers": {
    "task-tracker": {
      "command": "node",
      "args": ["/YOUR/FULL/PATH/my-task-tracker/dist/index.js"]
    }
  }
}
\`\`\`

### Verify Checkpoint 5

In Claude Code, ask:

> "What MCP tools do you have available?"

**You should see**: Claude Code lists your task-tracker tools (\`task_add\`, \`task_list\`, etc.).

**If it's not listed**: Check that the path to \`dist/index.js\` is correct and absolute. Run \`claude mcp list\` to see configured servers.

---

## Checkpoint 6: Use Your Tools

**What you're doing**: Testing the full flow — intention to execution.

In Claude Code, try these:

**Add a task**:
> "Add a task: review PR #42"

**You should see**: Claude Code uses \`task_add\` and confirms the task was created.

**List tasks**:
> "What's on my task list?"

**You should see**: The task you just added.

**Complete a task**:
> "Mark the PR review task as done"

**You should see**: Claude Code uses \`task_complete\` and confirms the status change.

### Verify the File

Check that tasks are actually persisted:

\`\`\`bash
cat ~/.tasks/tasks.json
\`\`\`

**You should see**: Your tasks in JSON format, with status reflecting your changes.

---

## Checkpoint 7: Reflect

Before marking the capstone complete, answer these questions. Write actual answers — this is part of the work.

**1. The Automation Layer**

Where does your MCP server sit in the flow from your words to saved tasks? What's above it (the agent)? What's below it (the file system)?

**2. The Subtractive Triad**

- **DRY**: Where would duplication have crept in if you weren't careful?
- **Rams**: Why four tools and not five or six? What didn't earn its existence?
- **Heidegger**: Does every tool serve the workflow "manage tasks through conversation"?

**3. External Memory**

Close Claude Code. Open it again. Ask about your tasks. Are they still there? What would break if \`tasks.json\` didn't exist?

**4. Agent-Native Tools**

How did you design for the agent instead of for humans? What makes your tools easy to use?

---

## What You Built

A working automation layer. An AI agent can now manage your tasks without you opening a todo app.

Look at what you have:
- Four tools with clear boundaries
- External memory that persists between sessions
- Structured I/O that agents can parse
- A system that serves one workflow well

This is **Simple Loom** — the same patterns that power production task coordination.

---

## What Comes Next

You've learned to see through the Subtractive Triad. You've built automation infrastructure.

When the three questions become automatic — when you catch yourself asking them without trying — you're ready for tools that execute what you now perceive.

That's the difference between Seeing and Dwelling.

---

## Resources

### MCP Documentation

- [Model Context Protocol](https://modelcontextprotocol.io/docs) — Official documentation
- [Building MCP Servers](https://modelcontextprotocol.io/docs/develop/build-server) — Server development guide
- [TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) — Official SDK

### Claude Code

- [Claude Code Documentation](https://docs.anthropic.com/en/docs/claude-code) — Official docs
- [Claude Code Settings](https://docs.anthropic.com/en/docs/claude-code/settings) — Configuration including MCP
- [CLI Reference](https://docs.anthropic.com/en/docs/claude-code/cli-usage) — Command reference

### The Subtractive Triad

- [The Pragmatic Programmer](https://pragprog.com/titles/tpp20/the-pragmatic-programmer-20th-anniversary-edition/) — DRY and more
- [Dieter Rams' Ten Principles](https://rams-foundation.org/foundation/design-comprehension/theses/) — "Less, but better"
- [Heidegger (Stanford Encyclopedia)](https://plato.stanford.edu/entries/heidegger/) — The philosophy behind Level 3
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
