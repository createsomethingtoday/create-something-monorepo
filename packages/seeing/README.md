# @createsomething/seeing

> Learn to see through the Subtractive Triad

**Seeing** teaches the philosophical foundation before you graduate to [Dwelling](https://learn.createsomething.space/dwelling) (Claude Code). A Gemini CLI extension that develops your perception of duplication, excess, and disconnection.

## The Journey: Seeing → Dwelling

| Tier | Tool | Focus | Cost |
|------|------|-------|------|
| **Seeing** | Gemini CLI | Philosophy & perception | Free |
| **Dwelling** | Claude Code | Execution & mastery | Subscription |

**Seeing** teaches you to perceive duplication, excess, and disconnection.
**Dwelling** teaches you to work with tools that recede into transparent use.

## Installation

### Via Gemini CLI

```bash
gemini extensions install @createsomething/seeing
```

### Via npm

```bash
npm install -g @createsomething/seeing
seeing init
```

## The Subtractive Triad

Every creation exists at three levels. For any decision, ask three questions in order:

| Level | Question | Action |
|-------|----------|--------|
| **DRY** | "Have I built this before?" | Unify |
| **Rams** | "Does this earn its existence?" | Remove |
| **Heidegger** | "Does this serve the whole?" | Reconnect |

**Meta-principle**: Creation is the discipline of removing what obscures.

## Commands

In Gemini CLI:

```bash
# Triad Analysis
/triad [target]       # Run a full Subtractive Triad audit
/dry [target]         # Level 1: Check for duplication
/rams [target]        # Level 2: Question existence
/heidegger [target]   # Level 3: Evaluate system fit

# Learning
/lesson [name]        # Read a lesson from the curriculum
/reflect              # Record a learning reflection
/progress             # View your journey

# Capstone
/capstone             # Start the capstone project
/capstone check       # Test your implementation
/capstone complete    # Mark capstone done

# Graduation
/graduate             # Check if you're ready for Dwelling
```

## Lessons

0. **[Setting Up](/seeing/setting-up)** — Install Gemini CLI and the Seeing extension
1. **What Is Creation** — The meta-principle: creation as subtraction
2. **DRY: Implementation** — The question of duplication
3. **Rams: Artifact** — The question of existence
4. **Heidegger: System** — The question of the whole
5. **Applying the Triad** — Putting the three questions together
6. **Capstone: Building Simple Loom** — Build a Task Tracker MCP server

## Capstone: Simple Loom

The capstone teaches **The Automation Layer** through building. You create a Task Tracker MCP server that Claude Code can use to manage tasks.

### What You Learn

| Pattern | How It Appears |
|---------|----------------|
| **Task Lifecycle** | `status: 'todo' \| 'doing' \| 'done'` |
| **State Persistence** | Tasks saved to `~/.tasks/tasks.json` |
| **External Memory** | Tasks survive process restarts |
| **Agent-Native** | Claude Code calls your tools directly |

### Verification: Simple Ground

`/capstone check` tests your implementation using evidence-first patterns:

- Server starts correctly
- All four tools exist
- Tools return expected formats
- Gemini guides you to fix issues

### Connection to Production

| What You Build | Production Version |
|----------------|-------------------|
| Task Tracker | Loom (task coordination) |
| /capstone check | Ground (verification) |
| Your workflow | WORKWAY Focus Workflow |

## Graduation

To graduate, you need:

- All 7 lessons completed (including setup and capstone)
- 10+ Triad applications
- 3+ reflections recorded
- Capstone completed

```bash
/graduate
```

If ready, you'll receive instructions to continue with Claude Code.

## Philosophy

Seeing prepares you for Dwelling.

In Heidegger's terms:
- **Seeing** = Vorhandenheit (present-at-hand) — You notice the tools, study them
- **Dwelling** = Zuhandenheit (ready-to-hand) — Tools recede into transparent use

The goal isn't to think about the Triad forever. It's to internalize it until it becomes perception, not process.

## Progress Storage

Your progress is stored locally at `~/.seeing/progress.json`. This is self-assessed learning—your reflections matter.

## External Resources

**Gemini CLI**
- [Gemini CLI GitHub](https://github.com/google-gemini/gemini-cli) — Source code and documentation
- [Gemini CLI Installation Guide](https://geminicli.com/docs/get-started/installation/) — Official setup instructions
- [MCP Server Integration](https://github.com/google-gemini/gemini-cli#using-mcp-servers) — How to configure extensions

**MCP (Model Context Protocol)**
- [MCP Documentation](https://modelcontextprotocol.io/docs) — Protocol specification
- [Build an MCP Server](https://modelcontextprotocol.io/docs/develop/build-server) — Server development guide

**CREATE SOMETHING**
- [Seeing Documentation](https://learn.createsomething.space/seeing) — Full curriculum
- [Dwelling (Claude Code)](https://learn.createsomething.space/dwelling) — Next tier
- [WORKWAY](https://workway.co) — Production automation platform

## License

MIT

---

*The tool recedes; seeing emerges.*
