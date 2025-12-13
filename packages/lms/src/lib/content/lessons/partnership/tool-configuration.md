# Tool Configuration: Extending Claude Code

## The Principle

**Tools should extend capability without adding complexity.**

When a tool is properly configured, it recedes into use—Zuhandenheit. The infrastructure disappears; only the work remains. This lesson covers the four extension mechanisms in Claude Code:

1. **MCP Servers** - External context and capabilities
2. **Skills** - Reusable operations
3. **Hooks** - Event-triggered automation
4. **Slash Commands** - User-defined shortcuts

Each follows the Subtractive Triad: only add what earns its existence.

---

## MCP Servers: External Context

### What They Are

**Model Context Protocol (MCP)** servers provide external context and tools to Claude Code. They're standalone processes that Claude can query for:

- **Context**: Database schemas, API documentation, file listings
- **Tools**: Operations like "deploy to production" or "query analytics"
- **Resources**: Real-time data from external systems

### How They Work

MCP servers run as separate processes, communicating via standard I/O:

```
┌──────────────┐          ┌──────────────┐          ┌──────────────┐
│ Claude Code  │ ◄─JSON──► │  MCP Server  │ ◄─API──► │   Service    │
│              │           │  (Node/Go)   │          │ (Cloudflare) │
└──────────────┘          └──────────────┘          └──────────────┘
```

When you ask Claude to "deploy to staging," it:
1. Calls the MCP server's `deploy` tool
2. The server executes the deployment via Cloudflare API
3. Returns results to Claude
4. Claude reports back to you

### Examples

**Filesystem MCP** (built-in):
```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/project"]
    }
  }
}
```

**Cloudflare MCP** (custom):
```json
{
  "mcpServers": {
    "cloudflare": {
      "command": "node",
      "args": ["packages/cloudflare-sdk/dist/mcp-server.js"],
      "env": {
        "CLOUDFLARE_API_TOKEN": "${CLOUDFLARE_API_TOKEN}"
      }
    }
  }
}
```

**Airtable MCP**:
```json
{
  "mcpServers": {
    "airtable": {
      "command": "npx",
      "args": ["-y", "@airtable/mcp-server"],
      "env": {
        "AIRTABLE_API_KEY": "${AIRTABLE_API_KEY}"
      }
    }
  }
}
```

### Configuration in .mcp.json

The `.mcp.json` file lives at your project root:

```json
{
  "mcpServers": {
    "cloudflare": {
      "command": "node",
      "args": ["packages/cloudflare-sdk/dist/mcp-server.js"],
      "env": {
        "CLOUDFLARE_API_TOKEN": "${CLOUDFLARE_API_TOKEN}",
        "CLOUDFLARE_ACCOUNT_ID": "${CLOUDFLARE_ACCOUNT_ID}"
      }
    },
    "triad-audit": {
      "command": "node",
      "args": ["packages/triad-audit/dist/mcp-server.js"]
    }
  }
}
```

**Environment variables** are read from your shell. Use `${VAR_NAME}` syntax.

### When to Use MCP Servers

Create an MCP server when you need:
- **Real-time data** from external APIs
- **Complex operations** that require multiple API calls
- **Shared context** across multiple Claude sessions
- **Authentication** to external services

**Don't create** an MCP server for:
- Simple scripts (use bash directly)
- One-off operations (use tools or commands)
- File operations (use built-in tools)

---

## Skills: Reusable Capabilities

### What They Are

**Skills** are markdown files that teach Claude how to perform specific operations. They're like mini-instruction manuals that Claude consults when needed.

Unlike MCP servers (external processes), skills are **documentation-based**—they guide Claude's existing tools rather than adding new ones.

### How to Create Skills

Skills live in `.claude/skills/`:

```
.claude/skills/
├── canon-maintenance.md
├── motion-analysis.md
└── understanding-graphs.md
```

Each skill is a markdown file with:
1. **Purpose**: What the skill does
2. **When to use**: Trigger conditions
3. **How to use**: Step-by-step process
4. **Examples**: Concrete applications

### Example: canon-maintenance.md

```markdown
# Canon Maintenance Skill

## Purpose
Enforce CREATE SOMETHING design standards across the monorepo.

## When to Use
- Reviewing new components
- Migrating legacy code
- Auditing Tailwind usage

## Process

1. **Detect Violations**
   ```bash
   grep -r "rounded-lg\|bg-white\|text-gray" packages/*/src --include="*.svelte"
   ```

2. **Review Against Canon**
   - `rounded-lg` → `var(--radius-lg)`
   - `bg-white/10` → `var(--color-bg-surface)`
   - `text-gray-400` → `var(--color-fg-muted)`

3. **Apply Fixes**
   Use Edit tool to replace Tailwind classes with Canon tokens.

4. **Verify**
   Re-run detection to confirm all violations resolved.

## Examples

**Before**:
```svelte
<div class="rounded-lg bg-white/10 text-gray-400">
```

**After**:
```svelte
<div class="card">
<style>
  .card {
    border-radius: var(--radius-lg);
    background: var(--color-bg-surface);
    color: var(--color-fg-muted);
  }
</style>
```
```

### Skill Invocation

Users invoke skills with the `@` syntax:

```
@canon-maintenance Review the new Button component
```

Claude reads the skill file and follows its process.

### Skills vs MCP Servers

| Skills | MCP Servers |
|--------|-------------|
| Documentation-based | Code-based |
| Guide existing tools | Add new tools |
| No external process | Separate process |
| Instant updates | Requires restart |
| Examples: canon-maintenance, motion-analysis | Examples: cloudflare, airtable |

---

## Hooks: Event-Triggered Automation

### What They Are

**Hooks** are scripts that run automatically when certain events occur. They automate repetitive tasks without requiring manual invocation.

### Hook Types

| Hook | When It Runs | Use Case |
|------|--------------|----------|
| `session-start` | Claude Code starts | Load project context, check dependencies |
| `session-end` | Claude Code exits | Sync beads, cleanup temp files |
| `pre-commit` | Before git commit | Lint, format, run tests |
| `post-commit` | After git commit | Update changelog, notify team |
| `file-change` | File is modified | Regenerate types, update imports |

### Configuration in .claude/hooks/

Hooks live in `.claude/hooks/`:

```
.claude/hooks/
├── session-start.sh
├── session-end.sh
├── pre-commit.sh
└── file-change.sh
```

Each hook is an executable script (bash, node, python, etc.).

### Example: session-start.sh

```bash
#!/bin/bash
# .claude/hooks/session-start.sh

echo "🔧 Checking dependencies..."
pnpm install --frozen-lockfile

echo "📊 Loading project metrics..."
node scripts/project-stats.js

echo "🎯 Ready to create."
```

Make it executable:
```bash
chmod +x .claude/hooks/session-start.sh
```

### Example: session-end.sh (Beads Sync)

```bash
#!/bin/bash
# .claude/hooks/session-end.sh

echo "💾 Syncing beads..."

# Extract key decisions from this session
DECISIONS=$(cat .claude/memory/session-*.json | jq -r '.decisions[]')

# Append to beads
echo "## Session $(date +%Y-%m-%d)" >> .claude/beads.md
echo "$DECISIONS" >> .claude/beads.md

echo "✅ Beads synced."
```

### Example: pre-commit.sh

```bash
#!/bin/bash
# .claude/hooks/pre-commit.sh

echo "🔍 Running pre-commit checks..."

# Type check
pnpm exec tsc --noEmit || exit 1

# Lint
pnpm exec eslint . --ext .ts,.svelte || exit 1

# Format
pnpm exec prettier --check . || exit 1

echo "✅ Pre-commit checks passed."
```

### Use Cases

**Beads Sync**: Automatically save session context to beads on exit.

**Type Generation**: Regenerate Wrangler types when `wrangler.toml` changes.

**Lint Enforcement**: Block commits that fail linting.

**Notifications**: Post to Slack when deployments complete.

**Context Loading**: Pre-load relevant files when starting a session.

---

## Slash Commands: User-Defined Operations

### What They Are

**Slash commands** are shortcuts for common operations. Type `/command` and Claude expands it into the full operation.

They're not AI features—they're simple text expansion with optional arguments.

### Creating Commands

Commands live in `.claude/commands/`:

```
.claude/commands/
├── deploy.sh
├── audit-canon.sh
└── new-experiment.sh
```

Each command is a script that accepts arguments.

### Example: /deploy

```bash
#!/bin/bash
# .claude/commands/deploy.sh
# Usage: /deploy <package>

PACKAGE=$1

if [ -z "$PACKAGE" ]; then
  echo "Usage: /deploy <package>"
  echo "Available: space, io, agency, ltd"
  exit 1
fi

echo "🚀 Deploying $PACKAGE..."

cd "packages/$PACKAGE"
pnpm build
wrangler pages deploy .svelte-kit/cloudflare --project-name="createsomething-$PACKAGE"

echo "✅ Deployed to https://createsomething-$PACKAGE.pages.dev"
```

### Example: /audit-canon

```bash
#!/bin/bash
# .claude/commands/audit-canon.sh
# Usage: /audit-canon [package]

PACKAGE=${1:-"*"}

echo "🎨 Auditing Canon compliance in packages/$PACKAGE..."

# Detect Tailwind design utilities
grep -rn "rounded-\|bg-white\|bg-black\|text-gray\|shadow-" \
  packages/$PACKAGE/src \
  --include="*.svelte" \
  --color=always

echo ""
echo "Replace with Canon tokens (see .claude/rules/css-canon.md)"
```

### Example: /new-experiment

```bash
#!/bin/bash
# .claude/commands/new-experiment.sh
# Usage: /new-experiment <slug> <title>

SLUG=$1
TITLE=$2

if [ -z "$SLUG" ] || [ -z "$TITLE" ]; then
  echo "Usage: /new-experiment <slug> <title>"
  exit 1
fi

TEMPLATE="packages/io/src/routes/experiments/_template/+page.svelte"
TARGET="packages/io/src/routes/experiments/$SLUG/+page.svelte"

mkdir -p "packages/io/src/routes/experiments/$SLUG"
cp "$TEMPLATE" "$TARGET"

# Replace placeholders
sed -i '' "s/EXPERIMENT_TITLE/$TITLE/g" "$TARGET"
sed -i '' "s/EXPERIMENT_SLUG/$SLUG/g" "$TARGET"

echo "✅ Created experiment at $TARGET"
echo "Next: Edit the content and add to fileBasedExperiments.ts"
```

### Command Expansion and Arguments

Commands can accept arguments via `$1`, `$2`, etc.:

```bash
/deploy space              # $1 = "space"
/new-experiment my-exp "My Experiment"  # $1 = "my-exp", $2 = "My Experiment"
```

Claude expands the command and passes your arguments.

### Commands vs Skills

| Slash Commands | Skills |
|----------------|--------|
| Simple scripts | Complex guidance |
| No AI involved | AI-guided process |
| Immediate execution | Multi-step operations |
| Examples: /deploy, /audit-canon | Examples: @canon-maintenance, @motion-analysis |

---

## The Subtractive Approach

**Canon Principle**: Only add tools that earn their existence.

### Questions to Ask Before Adding a Tool

1. **DRY (Implementation)**: Can existing tools handle this?
2. **Rams (Artifact)**: Does this tool simplify or complicate?
3. **Heidegger (System)**: Does this serve the whole workflow?

### Tool Selection Matrix

| Need | Use |
|------|-----|
| Query external API | MCP Server |
| Reusable multi-step process | Skill |
| Automated event response | Hook |
| Quick shortcut | Slash Command |
| One-off operation | Direct bash/tools |

### Anti-Patterns

**Don't create an MCP server** for file operations (use built-in Read/Write).

**Don't create a skill** for simple operations (use slash commands).

**Don't create a hook** for manual operations (use slash commands).

**Don't create a slash command** for complex processes (use skills).

---

## Configuration Organization

### .claude/ Directory Structure

```
.claude/
├── agents/                  # Custom agent configurations
├── commands/                # Slash commands (*.sh)
├── experiments/             # Experimental features
├── hooks/                   # Event hooks (*.sh)
├── memory/                  # Session memory (gitignored)
├── rules/                   # Project-specific rules (*.md)
├── scripts/                 # Utility scripts
├── skills/                  # Reusable capabilities (*.md)
├── beads.md                 # Accumulated context
└── settings.json            # Claude Code settings
```

### .mcp.json at Project Root

```
create-something-monorepo/
├── .claude/                 # Claude Code config
├── .mcp.json               # MCP server config
├── packages/
└── CLAUDE.md
```

### File Naming Conventions

- **Skills**: `kebab-case.md` (e.g., `canon-maintenance.md`)
- **Hooks**: `event-name.sh` (e.g., `session-start.sh`)
- **Commands**: `action.sh` (e.g., `deploy.sh`)
- **Rules**: `topic.md` (e.g., `css-canon.md`)

### What to Gitignore

```gitignore
# .claude/.gitignore
memory/          # Session-specific memory
*.log            # Hook logs
```

**Do commit**:
- Skills, rules, commands, hooks
- settings.json (shared config)
- beads.md (accumulated knowledge)

**Don't commit**:
- Session memory (ephemeral)
- Logs (noise)
- API tokens (secrets)

---

## Practical Examples from CREATE SOMETHING

### MCP Server: Cloudflare SDK

```json
{
  "mcpServers": {
    "cloudflare": {
      "command": "node",
      "args": ["packages/cloudflare-sdk/dist/mcp-server.js"],
      "env": {
        "CLOUDFLARE_API_TOKEN": "${CLOUDFLARE_API_TOKEN}",
        "CLOUDFLARE_ACCOUNT_ID": "${CLOUDFLARE_ACCOUNT_ID}"
      }
    }
  }
}
```

**Usage**: "Deploy createsomething.space to production"

### Skill: canon-maintenance

```markdown
# Canon Maintenance Skill

Enforce CREATE SOMETHING design standards.

**Process**:
1. Detect Tailwind design utilities
2. Replace with Canon tokens
3. Verify compliance
```

**Usage**: `@canon-maintenance Review Button component`

### Hook: session-end (Beads Sync)

```bash
#!/bin/bash
# .claude/hooks/session-end.sh

echo "💾 Syncing beads..."
# Append session decisions to beads.md
```

**Runs**: Automatically when Claude Code exits

### Command: /audit-canon

```bash
#!/bin/bash
# .claude/commands/audit-canon.sh

grep -rn "rounded-\|bg-white" packages/*/src --include="*.svelte"
```

**Usage**: `/audit-canon space`

---

## Reflection Questions

1. **DRY**: Which of your repetitive tasks could become skills or commands?

2. **Rams**: Review your current tools. Which ones have you never used? Can they be removed?

3. **Heidegger**: Do your tools serve your workflow, or have you adapted your workflow to serve your tools?

4. **Zuhandenheit**: When was the last time you noticed your tools? What broke the transparent use?

5. **Gelassenheit**: Which automated hooks feel helpful vs. invasive? What's the difference?

6. **MCP vs Skills**: For your next complex operation, which would serve better: an MCP server or a skill? Why?

7. **Hook Triggers**: What events in your workflow would benefit from automation? What would suffer from it?

8. **Command Shortcuts**: What do you type repeatedly that could become a slash command?

---

## Summary

**Tools extend capability without adding complexity when they:**

1. **Serve a clear need** (not speculative)
2. **Recede into use** (Zuhandenheit, not Vorhandenheit)
3. **Integrate with the whole** (Hermeneutic circle)

**The four mechanisms:**

- **MCP Servers**: External context and operations
- **Skills**: Reusable AI-guided processes
- **Hooks**: Event-triggered automation
- **Slash Commands**: Simple shortcuts

**The Canon question**: Does this tool earn its existence?

If the infrastructure is visible, it's not yet infrastructure—it's still a tool. The goal is transparent use: the hammer disappears when hammering.
