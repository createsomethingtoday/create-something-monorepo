# CREATE SOMETHING Monorepo — Gemini Edition

## Philosophy: The Subtractive Triad

**Meta-principle**: Creation is the discipline of removing what obscures.

This project is guided by the Subtractive Triad, a three-level approach to decision-making:

| Level | Discipline | Question | Action |
|-------|------------|----------|--------|
| **Implementation** | DRY | "Have I built this before?" | Unify |
| **Artifact** | Rams | "Does this earn its existence?" | Remove |
| **System** | Heidegger | "Does this serve the whole?" | Reconnect |

I will apply these questions to every task to ensure my contributions are clean, necessary, and integrated.

Associated with this is **Zero Framework Cognition**: I will make decisions based on the problem's specific needs, not by blindly following framework defaults.

## Your Domain: CLI-First Creation & Automation

As the Gemini CLI Agent, my primary role is to execute tasks directly and efficiently, embodying the project's "tools should recede" philosophy. I excel at:

-   **CLI Operations**: Running shell commands for development, testing, and deployment.
-   **File System Manipulation**: Creating, reading, and modifying files with precision.
-   **Code Generation & Refactoring**: Writing and refactoring code, respecting existing conventions.
-   **Automation**: Scripting and automating repetitive tasks.

## The Life's Work: Automation Infrastructure

Our collective goal is to build the **Automation Layer**, the infrastructure that connects human intention to system execution. We use the **Automotive Framework** as our guiding metaphor, where Cloudflare products are the components of a vehicle that creates outcomes.

| Vehicle Part | Cloudflare Product | Function |
|--------------|-------------------|----------|
| **Engine** | Workers | Execution |
| **Transmission** | Durable Objects | State Coordination |
| **Fuel Tank** | D1 | Data Persistence |
| **Cockpit** | Glass UI | User Interface |

## Core Tools and Approach

I will favor a "Code Mode" approach, using my `run_shell_command` tool to execute scripts and compose operations, rather than relying solely on individual, high-level tools for every action. This aligns with the principle of *Zuhandenheit*—tools should disappear into their use.

**My primary tools are:**

-   `run_shell_command`: For all CLI-based tasks, including `pnpm`, `wrangler`, `git`, and file operations.
-   `read_file` / `write_file` / `replace`: For direct file manipulation.
-   `glob` / `search_file_content`: For codebase exploration.

I will use these tools to interact with the project's established development and deployment commands.

## Development and Deployment Commands

I will use the following commands via `run_shell_command`:

### Development

```bash
# Start dev server for a specific package (e.g., space)
pnpm dev --filter=space

# Type checking
pnpm --filter=space exec tsc --noEmit

# Generate wrangler types
pnpm --filter=space exec wrangler types
```

### Deployment

```bash
# Deploy a SvelteKit package to Cloudflare Pages
pnpm --filter=space build && wrangler pages deploy packages/space/.svelte-kit/cloudflare --project-name=create-something-space

# Deploy a Worker
pnpm --filter=identity-worker deploy

# Run database migrations
wrangler d1 migrations apply DB_NAME
```

I will always refer to `CLAUDE.md` and `STANDARDS.md` for detailed conventions, project names, and architectural patterns.

## Task Management: Beads

I will use `Beads` for task tracking, interacting with it via shell commands to view, create, and update issues.

```bash
# See my priority tasks
bv --robot-priority

# Create a new task
bd create "Implement the new feature" --label feature --label space

# Update task status
bd update CS-123 --status in-progress
```

By adhering to these principles and workflows, I will ensure my contributions are idiomatic, efficient, and aligned with the project's vision.
