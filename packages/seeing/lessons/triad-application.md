# Applying the Triad

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

**Scenario**: "Add a `task_archive` tool to your Task Tracker MCP server."

Your Task Tracker has four tools: `task_add`, `task_list`, `task_complete`, `task_remove`. Someone asks: "What about archiving completed tasks instead of removing them?"

### Level 1: DRY

**Ask**: Have I built this before?

**Investigation**: Look at your existing tools. Does anything already handle "keeping tasks but hiding them"?

**Finding**: `task_complete` marks tasks as `done`. `task_list` shows all tasks. `task_remove` deletes permanently.

**DRY Decision**: No existing tool does archiving. But wait—could `task_list` be extended to filter by status?

```typescript
// Current: shows all tasks
task_list()

// Could become: filter by status
task_list({ status: 'active' })  // hides done tasks
task_list({ status: 'done' })    // shows only done tasks
task_list({ status: 'all' })     // current behavior
```

**What DRY reveals**: Maybe we don't need a new tool. Maybe we need a parameter on an existing tool.

**DRY passes with a suggestion.** Move to Rams.

### Level 2: Rams

**Ask**: Does `task_archive` earn its existence?

**Investigation**:
- What problem does archiving solve? (Keeping completed tasks but not seeing them)
- Could filtering solve the same problem? (Yes)
- What's the difference between "archived" and "done"? (Maybe nothing)

**Finding**: The request was really "I want to hide completed tasks." That's filtering, not archiving.

**Rams Decision**: `task_archive` doesn't earn its existence. A filter parameter on `task_list` serves the same need with less complexity.

**What we removed**: A tool that would duplicate functionality.

**Recommendation**: Add a `status` filter to `task_list` instead of a new `task_archive` tool.

**The decision ends here.** Rams shaped the solution.

## Another Example

**Scenario**: "Should task storage be a separate module or inline in the server?"

Your MCP server reads and writes tasks to `~/.tasks/tasks.json`. The code is inline in your tool handlers. Should you extract it?

### Level 1: DRY

**Ask**: Is there duplication?

**Finding**: Yes. Every tool handler has similar code:

```typescript
case 'task_add': {
  const tasks = JSON.parse(fs.readFileSync(TASKS_FILE, 'utf-8'));
  // ... do work
  fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks));
}

case 'task_complete': {
  const tasks = JSON.parse(fs.readFileSync(TASKS_FILE, 'utf-8'));
  // ... do work
  fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks));
}
```

The file reading/writing pattern repeats in every handler.

**DRY Decision**: Extract storage into a module to eliminate duplication.

**DRY passes.** Move to Rams.

### Level 2: Rams

**Ask**: Does a separate storage *module* earn its existence?

**Investigation**:
- What's the benefit? (Cleaner handlers, single place to change storage logic)
- What's the cost? (One more file, one more import)
- Could it become a separate *service*? (No—that would be overkill)

**Rams Decision**: A storage module earns its existence. A separate service doesn't.

**What we kept**: A simple module with `loadTasks()` and `saveTasks()`.

**What we removed**: The idea of over-engineering into a separate service.

**Rams passes.** Move to Heidegger.

### Level 3: Heidegger

**Ask**: Does this serve the whole?

**Investigation**:
- How does this connect to the MCP server's purpose?
- Does the naming match system vocabulary?
- Where should this file live?

**Finding**: The storage module serves Claude Code's workflow—it's how the agent remembers tasks across sessions. It belongs in `src/tasks.ts`, named after the domain concept.

**Heidegger Decision**: The module serves the whole. Name it `tasks.ts`, not `storage.ts` or `db.ts`—because the system is about tasks, not storage.

**What we reconnected**: The module name to the system's purpose.

## The Questions in Real Time

As you build automation tools, the triad becomes automatic:

### Adding a Tool

```
❶ DRY: Have I built this before?
   → Search: Do any existing tools do something similar?
   → Found: Yes, task_complete already changes status
   → Question: Is this really a new capability?

❷ Rams: Does this tool earn its existence?
   → Question: What problem does it solve?
   → Answer: Users want to archive tasks
   → Counter: Could an existing tool serve this need?
   
❸ Heidegger: Does this serve the workflow?
   → Question: How would Claude Code use this?
   → Answer: It would need to decide between complete, archive, and remove
   → Insight: Three ways to "finish" a task is confusing
```

### Designing Tool Parameters

```
❶ DRY: Is this parameter duplicated elsewhere?
   → Look for: Similar parameters on other tools

❷ Rams: Does this parameter earn existence?
   → Look for: Will it ever be used? Is the default always correct?

❸ Heidegger: Does this serve Claude Code's workflow?
   → Look for: Can the agent make good decisions with this parameter?
```

### Structuring Returns

```
❶ DRY: Are return formats consistent?
   → Before: task_add returns { task }, task_list returns []
   → After: Both return { tasks: [...] } for consistency

❷ Rams: Is anything in the return unused?
   → Remove: Fields the agent never reads

❸ Heidegger: Does the format serve the workflow?
   → Question: Can Claude Code easily process this?
```

## The Spiral

The triad isn't linear. It spirals:

```
Design a tool (implementation)
↓
DRY: Is this duplicated? → No, continue
↓
Build the tool (artifact)
↓
Rams: Does this earn existence? → Yes, continue
↓
Test with Claude Code (system)
↓
Heidegger: Does this serve the workflow?
↓
Wait—the agent keeps calling the wrong tool!
↓
BACK TO RAMS: The tool boundaries are confusing
↓
Simplify the tool set
↓
Continue the spiral...
```

You'll revisit levels as understanding deepens. That's the hermeneutic circle in action.

## Mastery

You've mastered the triad when:

1. **The questions are unconscious** — You ask them without thinking about asking
2. **You catch issues early** — Problems surface during design, not after testing
3. **You spiral naturally** — Moving between levels feels fluid, not forced

---

## Where the Triad Leads

You've learned to see duplication, question existence, and consider the whole.

These questions become most powerful when building **The Automation Layer** — the infrastructure between human intention and system execution.

In the capstone, you'll build a Task Tracker MCP server. You'll create **Simple Loom** (task coordination) verified by **Simple Ground** (evidence-first testing).

Every decision will use the Triad:
- **DRY**: What patterns can you reuse from the scaffold?
- **Rams**: Does each tool earn its existence?
- **Heidegger**: Does your server serve Claude Code's workflow?

The capstone isn't just practice. It's your first piece of automation infrastructure.

---

## Reflection

The Triad is a lens, not a checklist.

The goal isn't to ask the questions forever. It's to internalize them until they become perception, not process.

When you look at a tool and automatically see duplication, excess, and disconnection—when removal feels as creative as addition—when the questions ask themselves:

**You've learned to see.**

Now you're ready to build.

---

## Resources

### The Triad Sources

- **DRY**: [*The Pragmatic Programmer*](https://pragprog.com/titles/tpp20/the-pragmatic-programmer-20th-anniversary-edition/) — Hunt & Thomas
- **Rams**: [Ten Principles of Good Design](https://rams-foundation.org/foundation/design-comprehension/theses/) — Rams Foundation
- **Heidegger**: [Stanford Encyclopedia of Philosophy](https://plato.stanford.edu/entries/heidegger/)

### MCP Server Development

The capstone builds on the Model Context Protocol (MCP):

- **Official Announcement**: [Anthropic MCP Introduction](https://www.anthropic.com/news/model-context-protocol)
- **Documentation**: [modelcontextprotocol.io](https://modelcontextprotocol.io)
- **Server Development Guide**: [Build a Server](https://modelcontextprotocol.io/docs/develop/build-server)
- **Quickstart Tutorial**: [MCP Quickstart](https://modelcontextprotocol.info/docs/quickstart/quickstart/)

### Environment Setup

If you haven't configured your environment yet, visit [/seeing/setting-up](https://learn.createsomething.space/seeing/setting-up) for complete setup instructions.

## Next Steps

Continue to [Capstone: Building Simple Loom](/seeing/capstone) to build your first piece of automation infrastructure.
