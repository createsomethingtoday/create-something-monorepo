# MCP Setup: Configuring Claude Code Tools

## Objective

Configure MCP servers, skills, hooks, and commands for a CREATE SOMETHING project. Apply the subtractive principle: only add tools that earn their existence.

## Context

You're setting up Claude Code tooling for a new CREATE SOMETHING project. The project needs:
- Cloudflare resource management (D1, KV, Pages)
- Canon enforcement during development
- Automated validation hooks
- Workflow shortcuts for common tasks

**Heideggerian Framing**: Tools should recede into transparent use (Zuhandenheit). If you notice the tool, it's present-at-hand (Vorhandenheit)—failing.

## Starter Files

Your project starts with minimal configuration:

**Current `.mcp.json`:**
```json
{
  "mcpServers": {}
}
```

**Current `.claude/` structure:**
```
.claude/
├── skills/     (empty)
├── commands/   (empty)
└── hooks/      (empty)
```

## Task Parts

### Part 1: MCP Server Configuration

**Goal**: Add Cloudflare MCP server to manage infrastructure.

**Steps**:

1. Identify required environment variables:
   - Cloudflare Account ID
   - Cloudflare API Token (with appropriate permissions)

2. Add the Cloudflare MCP server to `.mcp.json`:

```json
{
  "mcpServers": {
    "cloudflare": {
      "command": "npx",
      "args": ["-y", "@cloudflare/mcp-server-cloudflare"],
      "env": {
        "CLOUDFLARE_ACCOUNT_ID": "your-account-id",
        "CLOUDFLARE_API_TOKEN": "your-api-token"
      }
    }
  }
}
```

3. Test the integration:
   - Restart Claude Code session
   - Ask Claude to list available MCP tools
   - Verify Cloudflare operations are available

**Validation**:
```bash
# Claude should be able to execute these via MCP:
# - List KV namespaces
# - Query D1 databases
# - Check Pages deployment status
```

**Subtractive Question**: Do you need this MCP server, or can you use `wrangler` CLI commands directly?

**Answer**: MCP servers earn existence when they enable *composed operations*. If you're frequently chaining Cloudflare API calls (e.g., "list namespaces, then get keys from namespace X"), MCP reduces friction. For one-off commands, `wrangler` CLI is simpler.

---

### Part 2: Create a Custom Skill

**Goal**: Build a skill that scaffolds new experiments following CREATE SOMETHING patterns.

**Steps**:

1. Create `.claude/skills/experiment-scaffold.md`

2. Define the skill structure:

```markdown
# Experiment Scaffold

Scaffold new experiments following CREATE SOMETHING patterns.

## Philosophy

Every experiment must teach a **principle**, not just a technique. (See .space standards)

## When to Use

- User requests "create a new experiment about [topic]"
- User wants to scaffold experiment structure
- User mentions "new experiment" or "experiment template"

## Workflow

1. **Clarify the principle**: What concept does this experiment teach?
2. **Check for duplication**: Has this been built before? (DRY)
3. **Minimal viable interface**: What's the least UI needed? (Rams)
4. **System connection**: How does it link to .io papers or .ltd patterns? (Heidegger)

## Scaffold Structure

Create these files:

```
packages/space/src/routes/experiments/[slug]/
├── +page.svelte          # Main experiment UI
├── +page.server.ts       # Data loading (if needed)
└── README.md             # Experiment documentation
```

## Template Content

### +page.svelte
```svelte
<script lang="ts">
  import { InteractiveExperimentCTA } from '$lib/components';

  // Experiment state
  let step = $state(0);

  // Minimal state, maximum teaching
</script>

<div class="experiment-container">
  <h1>{experimentTitle}</h1>
  <p class="principle">{principleStatement}</p>

  <!-- Minimal interactive UI -->

  <InteractiveExperimentCTA
    paperSlug="{relatedPaper}"
    principleTitle="{principleTitle}"
  />
</div>

<style>
  .experiment-container {
    max-width: var(--space-2xl);
    margin: 0 auto;
    padding: var(--space-lg);
  }

  .principle {
    color: var(--color-fg-secondary);
    font-size: var(--text-body-lg);
  }
</style>
```

### README.md
```markdown
# [Experiment Title]

## Principle

[One sentence: what does this teach?]

## Implementation

[How it works]

## Connection

- **Paper**: [link to related .io paper]
- **Pattern**: [link to .ltd pattern]
```

## Validation Checklist

Before completing scaffold:
- [ ] Experiment teaches a clear principle
- [ ] No duplication with existing experiments
- [ ] Uses Canon tokens (not Tailwind design utilities)
- [ ] Links to .io paper or .ltd pattern
- [ ] README explains the "why"

## Integration

Links to:
- `canon-maintenance` — Validates Canon compliance
- `.space` standards — Experiment criteria
- `.ltd/patterns` — Philosophical grounding
```

3. Test the skill by asking Claude: "Create a new experiment about hermeneutic debugging"

**Validation**:
- Claude should reference the skill during scaffolding
- Generated code should follow Canon conventions
- Files should include proper cross-property links

---

### Part 3: Set Up a Hook

**Goal**: Create a post-tool-use hook that enforces Canon compliance.

**Steps**:

1. Create `.claude/hooks/canon-enforcement.sh`

2. Implement the hook:

```bash
#!/bin/bash
# Canon Enforcement Hook
# Trigger: PostToolUse (after Write/Edit)
# Purpose: Detect Tailwind design utilities that should use Canon tokens

set -e

# Read tool execution context from stdin
INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# Only check Write and Edit tools
if [[ "$TOOL_NAME" != "Write" && "$TOOL_NAME" != "Edit" ]]; then
  exit 0
fi

# Only check Svelte/CSS files
if [[ ! "$FILE_PATH" =~ \.(svelte|css|tsx)$ ]]; then
  exit 0
fi

# Skip build directories
if [[ "$FILE_PATH" =~ node_modules|\.svelte-kit|dist|build ]]; then
  exit 0
fi

# Check if file exists
if [[ ! -f "$FILE_PATH" ]]; then
  exit 0
fi

# Detect Canon violations
VIOLATIONS=""

# Tailwind design utilities (should be Canon tokens)
if grep -qE 'class="[^"]*rounded-(sm|md|lg|xl)[^"]*"' "$FILE_PATH"; then
  VIOLATIONS="$VIOLATIONS\n• rounded-* classes: Use var(--radius-*)"
fi

if grep -qE 'class="[^"]*(bg-white|bg-black|bg-gray-)[^"]*"' "$FILE_PATH"; then
  VIOLATIONS="$VIOLATIONS\n• bg-[color] classes: Use var(--color-bg-*)"
fi

if grep -qE 'class="[^"]*(text-white|text-gray-)[^"]*"' "$FILE_PATH"; then
  VIOLATIONS="$VIOLATIONS\n• text-[color] classes: Use var(--color-fg-*)"
fi

if grep -qE 'class="[^"]*shadow-(sm|md|lg)[^"]*"' "$FILE_PATH"; then
  VIOLATIONS="$VIOLATIONS\n• shadow-* classes: Use var(--shadow-*)"
fi

# If violations found, exit with code 2 to trigger Claude self-correction
if [[ -n "$VIOLATIONS" ]]; then
  echo -e "Canon violation in $FILE_PATH:$VIOLATIONS\n\nFix: Use Tailwind for layout (flex, grid, p-*, m-*) but Canon tokens for design (colors, radius, shadows)." >&2
  exit 2
fi

exit 0
```

3. Make the hook executable:

```bash
chmod +x .claude/hooks/canon-enforcement.sh
```

4. Test by having Claude write a component with `rounded-lg` class

**Validation**:
- Hook should trigger after Write/Edit operations
- Claude should receive feedback about Canon violations
- Claude should self-correct by moving design utilities to `<style>` block

**Exit Code Reference**:
- `0`: Success, continue
- `1`: Hard error, stop execution
- `2`: Soft error, feed back to Claude for correction

---

### Part 4: Create a Slash Command

**Goal**: Add a `/audit` command that runs the Subtractive Triad audit.

**Steps**:

1. Create `.claude/commands/audit.md`

2. Define the command:

```markdown
---
description: Run Subtractive Triad audit on a package or component
allowed-tools: Read, Bash, Grep, Glob
---

# Audit Command

Apply the Subtractive Triad (DRY → Rams → Heidegger) to a target.

## Usage

```
/audit <package|component|path>
```

Examples:
- `/audit packages/space` — Audit entire package
- `/audit src/lib/components/Button.svelte` — Audit component
- `/audit .` — Audit entire monorepo

## What It Does

Applies three levels of analysis:

### Level 1: DRY (Implementation)
- Detects code duplication
- Identifies repeated patterns
- Suggests unification opportunities

### Level 2: Rams (Artifact)
- Finds unused exports
- Detects dead code
- Questions prop/config bloat

### Level 3: Heidegger (System)
- Maps circular dependencies
- Identifies orphaned components
- Checks cross-property links

## Execution

```bash
# If triad-audit package exists
pnpm --filter=triad-audit exec npm run audit -- <target>

# Otherwise, manual analysis
# 1. DRY: Use Grep to find duplicate patterns
# 2. Rams: Read and evaluate each prop/feature
# 3. Heidegger: Check imports/exports for connections
```

## Output Format

```markdown
## Triad Audit: [Target]

### DRY Findings
- **Duplication**: [description]
  - Location 1: [file:line]
  - Location 2: [file:line]
  - **Action**: Extract to [location]

### Rams Findings
- **Unused Export**: `functionName` in [file]
  - **Action**: Remove
- **Unnecessary Prop**: `showArrow` in [component]
  - **Reasoning**: Should be default behavior
  - **Action**: Remove prop, always show arrow

### Heidegger Findings
- **Orphaned Component**: [ComponentName]
  - Not imported anywhere
  - **Action**: Remove or connect to system
- **Circular Dependency**: [file1] ↔ [file2]
  - **Action**: Extract shared logic to new module

### Summary
- **Keep / Refactor / Remove**: [recommendation]
- **Priority**: [High / Medium / Low]
```

## Success Criteria

- [ ] All three levels applied
- [ ] Actionable recommendations provided
- [ ] File paths are absolute
- [ ] Reasoning traces to Subtractive Triad principles

## Integration

References:
- `canon-maintenance` skill — Full triad methodology
- `triad-audit` package — Automated tooling
- `.claude/rules/css-canon.md` — Design token standards
```

3. Test the command: `/audit packages/components/src/lib/components/Button.svelte`

**Validation**:
- Command should execute all three audit levels
- Output should include specific file paths and line numbers
- Recommendations should reference Subtractive Triad principles

---

## Validation Steps

### MCP Server Test
```bash
# In Claude Code session:
# "List all KV namespaces in my Cloudflare account"
# Claude should use the MCP server, not ask for manual wrangler commands
```

### Skill Test
```bash
# "Create a new experiment about constraint as liberation"
# Claude should:
# 1. Reference the experiment-scaffold skill
# 2. Ask about the principle being taught
# 3. Check for duplication
# 4. Generate minimal viable UI
# 5. Link to .ltd pattern
```

### Hook Test
```bash
# Ask Claude to create a component with this code:
# <div class="rounded-lg bg-white text-gray-600">Test</div>
#
# Hook should trigger and Claude should self-correct to:
# <div class="component">Test</div>
# <style>
#   .component {
#     border-radius: var(--radius-lg);
#     background: var(--color-bg-surface);
#     color: var(--color-fg-secondary);
#   }
# </style>
```

### Command Test
```bash
# "/audit packages/components/src/lib/components/Card.svelte"
# Should output structured findings across DRY, Rams, Heidegger levels
```

---

## Success Criteria

### MCP Configuration
- [ ] Server added to `.mcp.json`
- [ ] Environment variables configured
- [ ] Claude can invoke MCP tools
- [ ] Reduces need for manual CLI commands

### Skill Creation
- [ ] Skill file follows template structure
- [ ] Clear "When to Use" triggers
- [ ] Validates against Subtractive Triad
- [ ] Includes integration references

### Hook Implementation
- [ ] Hook executes on appropriate tool calls
- [ ] Filters by file type correctly
- [ ] Provides actionable feedback
- [ ] Uses exit code 2 for soft errors
- [ ] Claude self-corrects based on feedback

### Command Definition
- [ ] Clear usage syntax
- [ ] Allowed tools specified
- [ ] Structured output format
- [ ] References canonical standards

---

## Reflection Questions

### On Tool Design

1. **Does this tool recede?**
   - Can you use it without thinking about it?
   - Or does it interrupt your flow?

2. **What does this tool make easier?**
   - Is it worth the configuration overhead?
   - Could a simpler approach work?

3. **Does it strengthen the hermeneutic circle?**
   - Does it reinforce CREATE SOMETHING principles?
   - Or does it exist in isolation?

### On the Subtractive Principle

4. **What did you choose NOT to add?**
   - Which MCP servers did you reject?
   - Which hooks would be over-engineering?

5. **When do tools become Gestell?**
   - At what point does automation invade rather than assist?
   - How do you maintain Gelassenheit (releasement)?

### On System Coherence

6. **How do these tools connect?**
   - Does the skill reference the hook?
   - Does the command use the MCP server?
   - Or are they isolated utilities?

7. **What would break if you removed one?**
   - Is each tool independently valuable?
   - Or are they interdependent?

---

## Anti-Patterns to Avoid

### Over-Automation
**Symptom**: Hooks that trigger on every file save, checking everything.
**Fix**: Target hooks narrowly. Only check what needs checking.

### Skill Proliferation
**Symptom**: 20 skills for minor variations of the same task.
**Fix**: One skill with clear conditional logic. Weniger, aber besser.

### Command Redundancy
**Symptom**: `/deploy-space`, `/deploy-io`, `/deploy-agency`, `/deploy-ltd` as separate commands.
**Fix**: One `/deploy <target>` command with parameter.

### MCP Server Sprawl
**Symptom**: Adding every available MCP server "just in case".
**Fix**: Only add servers when a clear, repeated workflow emerges.

---

## Extension Exercise

Once you've completed the basic setup, extend it:

### Advanced Hook: Type Checking
Create a `session-start` hook that runs type checking and reports issues.

### Advanced Skill: Migration Assistant
Build a skill that helps migrate Tailwind utilities to Canon tokens, using the hook's detection patterns.

### Advanced Command: Cross-Property Audit
Extend `/audit` to check hermeneutic circle connections across all four properties (.space, .io, .agency, .ltd).

### Advanced MCP: Custom Server
Build a custom MCP server for CREATE SOMETHING-specific operations (e.g., querying the .ltd canon database).

---

## Reference

### File Locations
- MCP config: `/.mcp.json` (repo root)
- Skills: `/.claude/skills/*.md`
- Commands: `/.claude/commands/*.md`
- Hooks: `/.claude/hooks/*.sh` (must be executable)

### Canon Documents
- `.claude/rules/css-canon.md` — Design token standards
- `.claude/skills/canon-maintenance.md` — Subtractive Triad methodology
- `CLAUDE.md` — Overall monorepo philosophy

### Hook Triggers
- `session-start`: Beginning of Claude Code session
- `session-stop`: End of session
- `pre-tool-use`: Before tool execution
- `post-tool-use`: After tool execution

### Exit Codes
- `0`: Success
- `1`: Hard error (stop execution)
- `2`: Soft error (feed back to Claude for correction)

---

## Final Checklist

Before considering this exercise complete:

- [ ] MCP server successfully integrated and tested
- [ ] Custom skill created with clear triggers
- [ ] Hook implements Canon enforcement
- [ ] Slash command provides structured audit output
- [ ] Each tool serves a distinct, valuable purpose
- [ ] Tools reference each other (hermeneutic coherence)
- [ ] Reflection questions answered
- [ ] At least one tool was considered and rejected (subtractive discipline)

---

**Remember**: Tools are only good when they disappear. If you find yourself thinking about the tool instead of the work, you've failed. Zuhandenheit over Vorhandenheit. Always.
