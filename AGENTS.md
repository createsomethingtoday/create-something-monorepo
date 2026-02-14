# Agent Principles & Workflow

This project uses **lm** (loom) for agent-native issue tracking and coordination. Run `lm init` to get started.

## Strategic Context: The Creation Moat

**MCP consumption is commoditized. MCP creation is not.**

CREATE SOMETHING builds the connectivity layer between tools and AI. All properties serve this thesis:

| Property | Focus |
|----------|-------|
| **.ltd** | Philosophy of automation infrastructure |
| **.io** | MCP patterns for builders |
| **.space** | MCP integration experiments |
| **.agency** | Custom MCP development for clients |

See `docs/MCP_FIRST_THESIS.md` for full strategic context.

### Framework Alignment: The Three-Tier Model

All work in this codebase maps to the Three-Tier Framework (Database, Automation, Judgment). When building or modifying systems, identify which tier each component serves:

| Tier | MCP Primitive | Control Model | Examples in This Repo |
|------|---------------|---------------|-----------------------|
| **Database** | Resources | Application-controlled | D1 databases, KV stores, Procore data, R2 storage |
| **Automation** | Tools | Model-controlled | MCP server tools, Workers, Skills |
| **Judgment** | Prompts | User-controlled | System prompts, CLAUDE.md policy, skill constraints |

**Integration connectivity**: For MCPs that need app connectivity (Gmail, Notion, Slack, etc.), prefer Composio via `@create-something/composio-bridge` unless the integration is deep or client-specific. See `docs/COMPOSIO_PATTERNS.md`.

**When debugging agent systems**, follow the causality heuristic:
1. **Database** — Is the data available and correct?
2. **Automation** — Did execution complete successfully?
3. **Judgment** — Was the right policy applied?

**When coordinating agents**, remember that policy is an artifact. Pass policy artifacts alongside task artifacts — agents share not just what to do, but how to behave.

See `docs/THREE_TIER_FRAMEWORK.md` for the full framework including sampling feedback loops and policy-as-artifact implications.

---

## Guiding Principle: The Work Must Remain Connected

The central discipline of our agent workflow is ensuring that all work remains connected to the whole. Stranded local changes, untracked tasks, and un-pushed commits represent a disconnection from the project's shared reality. They obscure the true state of the work.

The following workflow is designed to enforce this principle. Each step is an act of reconnection.

## Quick Reference

```bash
lm ready              # Find available work
lm ready --ranked     # Robot-priority with scores
lm show <id>          # View issue details
lm claim <id>         # Claim work
lm done <id>          # Complete work
lm sync               # Sync with git
```

## Session Completion: "Landing the Plane"

Ending a work session is a critical process of reconnection. The goal is to leave the project in a perfectly clear and understandable state for the next contributor (whether human or agent).

### The Workflow of Reconnection

1.  **File issues for remaining work**
    *   **Principle:** Remove obscurity.
    *   **Rationale:** All discovered tasks must be captured in the shared `loom` system. Ideas or follow-ups that exist only in a local context are disconnected and will be lost.

2.  **Run quality gates**
    *   **Principle:** Serve the whole.
    *   **Rationale:** Tests, linters, and builds ensure that your changes integrate correctly with the entire system. A change that breaks another part of the system is a form of disconnection.
    *   **Commands:**
        ```bash
        pnpm check              # TypeScript - catches invalid imports
        pnpm lint               # ESLint - catches canon violations
        pnpm test               # Vitest - catches regressions
        ```

3.  **Update issue status**
    *   **Principle:** Remove obscurity.
    *   **Rationale:** The `loom` system must accurately reflect the state of the work. Closing finished tasks and updating progress removes ambiguity about what has been done and what remains.

4.  **Push to remote**
    *   **Principle:** The work must remain connected.
    *   **Rationale:** This is the most critical act of reconnection. Work that exists only on your local machine is stranded. It is invisible to the rest of the project and effectively does not exist. You must push your changes and verify they are integrated with the remote.
    *   **Workflow:**
        ```bash
        git pull --rebase
        lm sync
        git push
        git status  # MUST show "up to date with origin"
        ```

5.  **Clean up**
    *   **Principle:** "Less, but better."
    *   **Rationale:** Remove unnecessary artifacts from your session, such as temporary stashes or remote branches. This reduces clutter and leaves a clean environment for the next session.

6.  **Hand off**
    *   **Principle:** Make the work understandable.
    *   **Rationale:** Provide clear context for the next contributor. This reconnects your completed work with the future of the project, ensuring a smooth continuation of the hermeneutic circle.

### Core Disciplines

-   **Work is only complete when it is pushed.**
    *   **Rationale:** An un-pushed change is a disconnected artifact. Connection is achieved only when the work is integrated with the `origin`.

-   **The agent must complete the push.**
    *   **Rationale:** To remove ambiguity, the agent responsible for the work is also responsible for reconnecting it. Handing off a push is a transfer of responsibility that can lead to disconnection.

-   **If a push fails, you must resolve it.**
    *   **Rationale:** A failed push is a clear signal of disconnection. You must diagnose the conflict (e.g., merge conflicts, failed checks) and resolve it to successfully reconnect your work to the whole.

## Grounding Discipline: Verify Before Use

The enemy of good work is hallucination. When you reference code that doesn't exist, you create disconnection—broken imports, undefined functions, phantom APIs.

### The Verify-Then-Use Protocol

Before using any symbol (function, component, type, constant) from this codebase:

1.  **Verify it exists** — Use `pnpm exports <package> <symbol>` or `Grep`/`Read` to confirm
2.  **Verify the import path** — Check `package.json` exports or the actual file path
3.  **If uncertain, say "unknown"** — Never guess. "I need to verify this exists" is always acceptable.

```bash
# Quick verification commands
pnpm exports                    # List all packages
pnpm exports components         # List exports from @create-something/components  
pnpm exports components Button  # Check if Button exists
```

### When Retrieval Returns Fragments

Semantic search may return conceptually related documents that don't contain the actual API you need. When this happens:

-   **Do not extrapolate** from examples to guess the real API
-   **Read the actual source file** — `src/lib/index.ts` or equivalent
-   **Check the package.json exports** — This is the authoritative source of what's public

### Failure Mode

```typescript
// BAD: Guessed from partial context
import { NonExistentThing } from '@create-something/components';

// GOOD: Verified by reading src/lib/index.ts
import { Button, Card } from '@create-something/components';
```

**Principle:** It is better to admit uncertainty than to create disconnection through hallucination.

## Tool Preferences

When working in this codebase, prefer these tools over manual approaches:

| Need | CLI | MCP (if available) |
|------|-----|-----|
| Code verification | `ground analyze`, `ground find-duplicates` | `ground_*` tools |
| Task coordination | `lm ready`, `lm create`, `lm done` | `loom_*` tools |
| Priority ranking | `lm ready --ranked` | `loom_priority` |

**Use CLI or MCP** - both work. CLI is always available; MCP is convenient in IDEs that support it.

**Loom replaces Beads**: Loom (`lm`) now handles both issue tracking and agent coordination. It includes robot-priority ranking, sessions, cost tracking, and crash recovery. Use `lm` for all task management.
