# Using Learn MCP: The Recursive Tool

## The Principle

**You are using the tool to learn the tool.**

This is not a paradox but a demonstration of Heidegger's hermeneutic circle: understanding emerges through engagement, not observation. You cannot learn Learn MCP by reading about it—you learn it by dwelling within it.

The tool you're using right now (Claude Code + Learn MCP) is teaching you how to use itself. This recursive structure is intentional: if the tool can teach itself, it has achieved Zuhandenheit—it recedes into transparent use.

---

## Installation: Crossing the Threshold

### Prerequisites

- **Claude Code** installed and configured
- **Node.js** 18+ (for running the MCP server)
- **Email access** (for magic link authentication)

### Step 1: Add Learn MCP to Claude Code

Add to your Claude Code settings (`~/.config/claude-code/settings.json` or project `.mcp.json`):

```json
{
  "mcpServers": {
    "learn": {
      "command": "npx",
      "args": ["-y", "@create-something/learn"]
    }
  }
}
```

Or install globally for faster startup:

```bash
npm install -g @create-something/learn
```

Then configure:

```json
{
  "mcpServers": {
    "learn": {
      "command": "learn-mcp"
    }
  }
}
```

### Step 2: Restart Claude Code

After adding the configuration, restart Claude Code. The Learn MCP server will start automatically.

### Expected Result

When properly configured, you can ask Claude:

> "What's my learning status?"

Claude will invoke `learn_status` and either:
- Prompt you to authenticate (first time)
- Show your current progress (already authenticated)

**If nothing happens**: Check that the MCP server is configured correctly in settings. Claude Code shows active MCP servers in its status.

---

## Authentication: The Magic Link

### How It Works

Learn MCP uses passwordless authentication via magic link:

1. You provide your email
2. We send a magic link to that email
3. You click the link in your browser
4. Claude Code detects verification and stores tokens locally

No passwords. No accounts to create. Just your email.

### The Authentication Flow

Ask Claude:

> "Help me authenticate with Learn MCP using my-email@example.com"

Claude invokes `learn_authenticate`:

```
┌─────────────────────────────────────────────────────────────────┐
│ AUTHENTICATING                                                  │
│                                                                 │
│ A magic link has been sent to: my-email@example.com            │
│                                                                 │
│ Please:                                                         │
│ 1. Check your email inbox (and spam folder)                    │
│ 2. Click the "Verify Email" link                               │
│ 3. Return here - I'll detect when you're verified              │
│                                                                 │
│ Waiting for verification... (polling every 2 seconds)          │
└─────────────────────────────────────────────────────────────────┘
```

After clicking the link:

```
┌─────────────────────────────────────────────────────────────────┐
│ AUTHENTICATED                                                   │
│                                                                 │
│ Welcome, Your Name!                                             │
│                                                                 │
│ Email: my-email@example.com                                    │
│ Tier: free                                                      │
│                                                                 │
│ Your authentication is saved locally at:                        │
│ ~/.create-something/auth.json                                   │
│                                                                 │
│ Next steps:                                                     │
│ • Use learn_status to see your progress                        │
│ • Use learn_lesson to start learning                           │
└─────────────────────────────────────────────────────────────────┘
```

### Expected Results

| Scenario | What Happens |
|----------|--------------|
| First time | Magic link sent, polling starts |
| Already authenticated | Shows current user info |
| Link clicked | Tokens saved, welcome message |
| Link expired | Prompts to retry |
| Wrong email | Check spam, or retry with correct email |

### Token Storage

Tokens are stored at `~/.create-something/auth.json` with secure permissions (0600). They persist across sessions.

To log out:

```bash
npx @create-something/learn clear
```

---

## The Learning Tools

Learn MCP provides five tools. Here's what each does and what to expect.

### learn_status: Where Am I?

**Purpose**: See your current progress across all paths.

**When to use**:
- Starting a session ("Where did I leave off?")
- Deciding what to learn next
- Checking overall progress

**Invocation**:

> "Show my learning status"

**Expected Result**:

```
┌─────────────────────────────────────────────────────────────────┐
│ LEARNING PROGRESS                                               │
│                                                                 │
│ Paths: 1/8 completed                                           │
│ Lessons: 5/38 completed                                        │
│ Time: 2h 15m total                                             │
│                                                                 │
│ RECOMMENDED NEXT:                                               │
│ → craft/sveltekit-philosophy                                   │
│   "SvelteKit Philosophy" (20 min)                              │
│                                                                 │
│ PATH PROGRESS:                                                  │
│ ✓ foundations       100% ████████████████████                  │
│ → craft              0% ░░░░░░░░░░░░░░░░░░░░                  │
│ ○ infrastructure     0% ░░░░░░░░░░░░░░░░░░░░                  │
│ ○ agents             0% ░░░░░░░░░░░░░░░░░░░░                  │
│ ...                                                             │
└─────────────────────────────────────────────────────────────────┘
```

**Icons**:
- `✓` = completed
- `→` = in progress
- `○` = not started

### learn_lesson: Show Me

**Purpose**: Fetch and display lesson content.

**When to use**:
- Starting a new lesson
- Reviewing previous material
- Following a recommendation from `learn_status`

**Invocation**:

> "Show me the lesson on SvelteKit philosophy"

or more precisely:

> "Fetch the lesson craft/sveltekit-philosophy"

**Expected Result**:

```
┌─────────────────────────────────────────────────────────────────┐
│ LESSON: SvelteKit Philosophy                                    │
│ Path: Craft | Duration: 20 min                                 │
│                                                                 │
│ TABLE OF CONTENTS                                               │
│ 1. The Compiler Advantage                                       │
│ 2. Reactivity Without Runtime                                   │
│ 3. File-Based Routing                                           │
│ 4. Zuhandenheit in Framework Design                             │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ # SvelteKit Philosophy                                          │
│                                                                 │
│ ## The Compiler Advantage                                       │
│                                                                 │
│ Most frameworks ship a runtime to the browser...                │
│                                                                 │
│ [Full markdown content continues...]                            │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ NEXT STEPS                                                      │
│ When you've finished reading, use learn_complete with a        │
│ reflection of at least 50 characters.                          │
└─────────────────────────────────────────────────────────────────┘
```

**What happens behind the scenes**:
1. Lesson fetched from LMS (or local cache if offline)
2. Progress marked as "started" on the server
3. Visit count incremented (hermeneutic spiral)

### learn_complete: I Understand

**Purpose**: Mark a lesson complete with reflection.

**When to use**: After finishing a lesson and reflecting on what you learned.

**Requirement**: Reflection must be at least 50 characters. This is intentional—completion requires genuine engagement, not just clicking "done."

**Invocation**:

> "Mark the SvelteKit philosophy lesson complete. My reflection: The compiler-first approach eliminates the runtime overhead that makes React feel heavy. This aligns with Rams' principle—the framework should be invisible."

**Expected Result**:

```
┌─────────────────────────────────────────────────────────────────┐
│ LESSON COMPLETED                                                │
│                                                                 │
│ craft/sveltekit-philosophy marked complete.                    │
│                                                                 │
│ YOUR REFLECTION:                                                │
│ "The compiler-first approach eliminates the runtime overhead   │
│ that makes React feel heavy. This aligns with Rams'            │
│ principle—the framework should be invisible."                   │
│                                                                 │
│ Time recorded: 10 minutes                                       │
│                                                                 │
│ NEXT:                                                           │
│ Use learn_status to see recommendations, or continue to        │
│ the next lesson: craft/canon-tokens                            │
└─────────────────────────────────────────────────────────────────┘
```

**If path is completed**:

```
┌─────────────────────────────────────────────────────────────────┐
│ PATH COMPLETED: Craft                                          │
│                                                                 │
│ You've completed all lessons in the Craft path.                │
│                                                                 │
│ "The interface disappears; the content remains."               │
│                                                                 │
│ The hermeneutic spiral continues—you may return to these       │
│ lessons anytime. Each visit deepens understanding.             │
│                                                                 │
│ UNLOCKED:                                                       │
│ → systems (Templates + Automations)                            │
└─────────────────────────────────────────────────────────────────┘
```

### learn_praxis: Now Apply It

**Purpose**: Execute hands-on exercises with code audits.

**When to use**: When a lesson has an associated praxis exercise (shown in lesson output).

**Requirement**: Reflection must be at least 100 characters (more substantial than lesson completion).

**Invocation**:

> "Run the token-migration praxis exercise on packages/space. My reflection: I identified several Tailwind color utilities that should use Canon tokens. The pattern bg-white/10 appears 15 times and maps directly to --color-bg-surface. This migration will improve consistency across the design system."

**Expected Result**:

```
┌─────────────────────────────────────────────────────────────────┐
│ PRAXIS: token-migration                                         │
│                                                                 │
│ TRIAD AUDIT RESULTS                                             │
│ ─────────────────────────────────────────────────────────────── │
│ DRY Score:       72/100  ████████░░                            │
│ Rams Score:      68/100  ███████░░░                            │
│ Heidegger Score: 81/100  █████████░                            │
│ ─────────────────────────────────────────────────────────────── │
│ Overall:         74/100                                         │
│                                                                 │
│ HIGH PRIORITY VIOLATIONS (5):                                   │
│ • packages/space/src/lib/Button.svelte:12 - bg-white/10        │
│ • packages/space/src/lib/Card.svelte:8 - rounded-lg            │
│ • packages/space/src/lib/Card.svelte:15 - shadow-md            │
│ • packages/space/src/routes/+page.svelte:45 - text-gray-400    │
│ • packages/space/src/routes/+page.svelte:67 - bg-black         │
│                                                                 │
│ YOUR REFLECTION:                                                │
│ "I identified several Tailwind color utilities that should     │
│ use Canon tokens. The pattern bg-white/10 appears 15 times     │
│ and maps directly to --color-bg-surface..."                    │
│                                                                 │
│ Score: 78/100 | Status: PASSED                                 │
└─────────────────────────────────────────────────────────────────┘
```

**If triad-audit not installed**:

```
┌─────────────────────────────────────────────────────────────────┐
│ PRAXIS: token-migration                                         │
│                                                                 │
│ Note: triad-audit not found. Reflection recorded without       │
│ automated audit. Consider installing:                          │
│ npm install -g @create-something/triad-audit                   │
│                                                                 │
│ YOUR REFLECTION:                                                │
│ [Your reflection text...]                                      │
│                                                                 │
│ Score: 70/100 | Status: PASSED                                 │
└─────────────────────────────────────────────────────────────────┘
```

### learn_praxis (Coming Soon): Ethos Construction

Future enhancement: `learn_ethos` will allow you to define your own principles derived from the canon. Your ethos becomes a living document that Claude Code references during your work.

---

## The Hermeneutic Flow

The tools work together in a cycle:

```
┌──────────────┐
│ learn_status │ ← "Where am I?"
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ learn_lesson │ ← "Show me"
└──────┬───────┘
       │
       ▼ (read, reflect)
       │
┌────────────────┐
│ learn_complete │ ← "I understand"
└──────┬─────────┘
       │
       ▼ (if praxis exists)
       │
┌──────────────┐
│ learn_praxis │ ← "Now apply it"
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ learn_status │ ← "What's next?"
└──────────────┘
```

This is the hermeneutic spiral: each pass through the cycle deepens understanding. Returning to a lesson you've completed isn't repetition—it's the circle turning again.

---

## When the Tool Recedes

You'll know Learn MCP has achieved Zuhandenheit when:

1. **You stop thinking about the tool**: Instead of "use learn_lesson," you think "show me the next lesson."

2. **Requests become natural**: "What should I learn next?" works as well as "invoke learn_status."

3. **The infrastructure disappears**: You're focused on the content, not the mechanism.

4. **Reflection becomes habit**: You naturally articulate what you've learned without being prompted.

This is the goal: the tool teaches you, then recedes. What remains is understanding.

---

## Troubleshooting

### "Tool not found"

The MCP server isn't configured or running. Check:
- `.mcp.json` or Claude Code settings
- Restart Claude Code after configuration changes

### "Not authenticated"

Tokens expired or not set. Run authentication again:

> "Authenticate me with Learn MCP using my@email.com"

### "Lesson not found"

Check the path and lesson IDs:

> "Show my learning status"

Use the exact IDs shown (e.g., `foundations/what-is-creation`).

### "Reflection too short"

Lessons require 50+ characters; praxis requires 100+. This is intentional—completion means engagement.

### "Network error" / Offline

Learn MCP caches lessons for 24 hours. Recent lessons work offline. New lessons require network.

---

## Offline Learning

Lessons are cached locally at `~/.create-something/cache/lessons/` with a 24-hour TTL.

Once you've fetched a lesson, you can review it offline. Progress syncs when you're back online.

This enables learning on planes, trains, and disconnected environments—dwelling doesn't require constant connection.

---

## Reflection Questions

1. **Recursion**: You're using Learn MCP to learn Learn MCP. What does this recursive structure reveal about the tool's design?

2. **Authentication**: Why magic link instead of passwords? How does passwordless authentication align with "removing what obscures"?

3. **Reflection Gates**: Why require minimum character counts for completion? What would be lost without this requirement?

4. **Caching**: How does offline capability reflect the principle "infrastructure disappears; work remains"?

5. **The Spiral**: When you return to a completed lesson, what's different? What does the visit counter represent?

6. **Zuhandenheit**: Describe a moment when you stopped noticing the tool. What were you focused on instead?

---

## Summary

**Learn MCP is the tool that teaches itself.**

Five tools, one flow:
- `learn_authenticate` → Enter
- `learn_status` → Orient
- `learn_lesson` → Engage
- `learn_complete` → Reflect
- `learn_praxis` → Apply

Expected results are predictable because the tool earns its existence through clarity. When you know what will happen, attention shifts from mechanism to meaning.

The goal is not to master the tool but to have it recede into transparent use. The hammer disappears when hammering; Learn MCP disappears when learning.

---

## Cross-Property References

> **Canon Reference**: The recursive self-teaching structure demonstrates [Tool Complementarity](https://createsomething.ltd/patterns/tool-complementarity)—the tool and user complete each other.
>
> **Research Reference**: The hermeneutic recursion is explored in [From Learning About to Dwelling Within](https://createsomething.io/papers/ethos-transfer-agentic-engineering).
>
> **Practice**: Use Learn MCP to complete this lesson, then reflect on the experience of using the tool to learn the tool.
