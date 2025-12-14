# Custom Hooks: Automation as Dwelling

## The Question

**"What should happen without asking?"**

Hooks are not about automating everything. They're about automating the **repetitive validation** so you can dwell in the **creative work**. This is Heidegger's Gelassenheit applied to development: neither rejection nor submission—full engagement without capture.

## The Gestell Warning

**Gestell** (enframing): When automation fills every gap, it becomes not efficiency but invasion. Every decision automated is a decision you stop making consciously.

Hooks can become Gestell if they:
- Fire on every action (constant interruption)
- Make decisions without transparency
- Prevent you from understanding what's happening
- Enforce rules you didn't consciously adopt

**The discipline**: Hooks should validate, not decide. They should surface violations, not silently "fix" them.

## Hook Philosophy

### Zuhandenheit: Validation Recedes

Good hooks are invisible when things are right:

```
✓ Write component with Canon tokens → Hook silent
✓ Commit with proper message format → Hook silent
✓ Deploy passing tests → Hook silent

✗ Write component with Tailwind colors → Hook surfaces: "Use Canon tokens"
✗ Commit without co-author → Hook surfaces: "Add Co-Authored-By"
✗ Deploy failing tests → Hook blocks: "Tests must pass"
```

**When you're doing it right, the hook disappears.**

### The Four Trigger Points

Claude Code hooks fire at four lifecycle events:

| Hook | When | Purpose |
|------|------|---------|
| `session-start` | Claude Code starts | Initialize environment, check dependencies |
| `session-stop` | Claude Code ends | Cleanup, save state, report summary |
| `pre-tool-use` | Before tool execution | Validate inputs, check permissions |
| `post-tool-use` | After tool execution | Validate outputs, enforce standards |

## Hook Anatomy

```bash
#!/bin/bash
# Hook: post-tool-use/canon-enforcement.sh
# Trigger: After Write/Edit tools
# Purpose: Enforce Canon design tokens

set -e  # Exit on error

# 1. Read context from stdin
INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# 2. Filter: only check relevant tools and files
if [[ "$TOOL_NAME" != "Write" && "$TOOL_NAME" != "Edit" ]]; then
  exit 0  # Not our concern
fi

if [[ ! "$FILE_PATH" =~ \.(svelte|css|tsx)$ ]]; then
  exit 0  # Not a style file
fi

# 3. Validate
VIOLATIONS=$(detect_canon_violations "$FILE_PATH")

# 4. Return appropriate exit code
if [[ -n "$VIOLATIONS" ]]; then
  echo "$VIOLATIONS" >&2
  exit 2  # Soft error: feed back to Claude
fi

exit 0  # Success
```

### Exit Code Semantics

| Code | Meaning | Claude Behavior |
|------|---------|-----------------|
| `0` | Success | Continue normally |
| `1` | Hard error | Stop execution, show error to user |
| `2` | Soft error | Feed error to Claude for self-correction |

**Exit code 2 is powerful**: Claude sees the error message and automatically attempts to fix the issue.

## Hook Types

### Validation Hooks (Post-Tool-Use)

Enforce standards after actions:

```bash
#!/bin/bash
# post-tool-use/type-check.sh

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')

# Only after code modifications
if [[ "$TOOL_NAME" != "Write" && "$TOOL_NAME" != "Edit" ]]; then
  exit 0
fi

FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# Only TypeScript files
if [[ ! "$FILE_PATH" =~ \.(ts|tsx)$ ]]; then
  exit 0
fi

# Run type check on modified file
if ! pnpm exec tsc --noEmit "$FILE_PATH" 2>&1; then
  echo "Type error in $FILE_PATH. Fix before continuing." >&2
  exit 2
fi

exit 0
```

### Initialization Hooks (Session-Start)

Set up environment, check prerequisites:

```bash
#!/bin/bash
# session-start/check-environment.sh

ERRORS=""

# Check Node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [[ "$NODE_VERSION" -lt 20 ]]; then
  ERRORS="$ERRORS\n• Node.js 20+ required (found v$NODE_VERSION)"
fi

# Check pnpm
if ! command -v pnpm &> /dev/null; then
  ERRORS="$ERRORS\n• pnpm not installed"
fi

# Check environment variables
if [[ -z "$CLOUDFLARE_API_TOKEN" ]]; then
  ERRORS="$ERRORS\n• CLOUDFLARE_API_TOKEN not set"
fi

if [[ -n "$ERRORS" ]]; then
  echo -e "Environment check failed:$ERRORS" >&2
  exit 1  # Hard error: can't proceed
fi

# Success: show summary
echo "Environment ready: Node v$(node -v), pnpm $(pnpm -v)"
exit 0
```

### Cleanup Hooks (Session-Stop)

Save state, report metrics:

```bash
#!/bin/bash
# session-stop/save-session.sh

# Capture session metadata
SESSION_FILE=".claude/sessions/$(date +%Y%m%d-%H%M%S).json"
mkdir -p .claude/sessions

cat > "$SESSION_FILE" <<EOF
{
  "ended": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "branch": "$(git branch --show-current)",
  "files_modified": $(git status --porcelain | wc -l),
  "duration_seconds": $SECONDS
}
EOF

echo "Session saved to $SESSION_FILE"
exit 0
```

### Pre-Validation Hooks (Pre-Tool-Use)

Check before destructive operations:

```bash
#!/bin/bash
# pre-tool-use/prevent-main-branch.sh

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')

# Only check Bash commands (for git operations)
if [[ "$TOOL_NAME" != "Bash" ]]; then
  exit 0
fi

COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# Detect dangerous git operations on main
CURRENT_BRANCH=$(git branch --show-current)

if [[ "$CURRENT_BRANCH" == "main" || "$CURRENT_BRANCH" == "master" ]]; then
  if [[ "$COMMAND" =~ git\ push\ --force ]]; then
    echo "Blocked: Force push to $CURRENT_BRANCH not allowed" >&2
    exit 1  # Hard error
  fi

  if [[ "$COMMAND" =~ git\ reset\ --hard ]]; then
    echo "Warning: Hard reset on $CURRENT_BRANCH. Proceed carefully." >&2
    exit 2  # Soft error: let Claude decide
  fi
fi

exit 0
```

## Real-World Examples

### Canon Enforcement

```bash
#!/bin/bash
# post-tool-use/canon-enforcement.sh

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# Filter
if [[ "$TOOL_NAME" != "Write" && "$TOOL_NAME" != "Edit" ]]; then
  exit 0
fi

if [[ ! "$FILE_PATH" =~ \.(svelte|css)$ ]]; then
  exit 0
fi

# Skip generated files
if [[ "$FILE_PATH" =~ node_modules|\.svelte-kit|dist ]]; then
  exit 0
fi

# Detect violations
VIOLATIONS=""

# Tailwind border-radius (should use Canon)
if grep -qE 'rounded-(sm|md|lg|xl)' "$FILE_PATH"; then
  VIOLATIONS="$VIOLATIONS\n• rounded-* classes detected"
  VIOLATIONS="$VIOLATIONS\n  Fix: Use var(--radius-*) in <style> block"
fi

# Tailwind colors (should use Canon)
if grep -qE '(bg|text)-(white|black|gray-)' "$FILE_PATH"; then
  VIOLATIONS="$VIOLATIONS\n• Tailwind color classes detected"
  VIOLATIONS="$VIOLATIONS\n  Fix: Use var(--color-*) in <style> block"
fi

# Tailwind shadows (should use Canon)
if grep -qE 'shadow-(sm|md|lg)' "$FILE_PATH"; then
  VIOLATIONS="$VIOLATIONS\n• shadow-* classes detected"
  VIOLATIONS="$VIOLATIONS\n  Fix: Use var(--shadow-*) in <style> block"
fi

if [[ -n "$VIOLATIONS" ]]; then
  echo -e "Canon violations in $FILE_PATH:$VIOLATIONS\n\nPattern: Tailwind for structure (flex, grid, p-*), Canon for design." >&2
  exit 2
fi

exit 0
```

### Commit Message Validation

```bash
#!/bin/bash
# pre-tool-use/commit-validation.sh

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')

if [[ "$TOOL_NAME" != "Bash" ]]; then
  exit 0
fi

COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# Only check git commit commands
if [[ ! "$COMMAND" =~ git\ commit ]]; then
  exit 0
fi

# Extract commit message
MESSAGE=$(echo "$COMMAND" | sed -n "s/.*-m ['\"]\\(.*\\)['\"]/\\1/p")

# Validate conventional commit format
if [[ ! "$MESSAGE" =~ ^(feat|fix|docs|style|refactor|test|chore)(\(.+\))?:\ .+ ]]; then
  echo "Invalid commit format. Use: type(scope): description" >&2
  echo "Types: feat, fix, docs, style, refactor, test, chore" >&2
  exit 2
fi

# Validate co-author
if [[ ! "$COMMAND" =~ Co-Authored-By ]]; then
  echo "Missing Co-Authored-By line for Claude contribution" >&2
  exit 2
fi

exit 0
```

### Import Validation

```bash
#!/bin/bash
# post-tool-use/import-validation.sh

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [[ "$TOOL_NAME" != "Write" && "$TOOL_NAME" != "Edit" ]]; then
  exit 0
fi

if [[ ! "$FILE_PATH" =~ \.(ts|tsx|js|jsx)$ ]]; then
  exit 0
fi

ISSUES=""

# Check for relative imports crossing package boundaries
if grep -qE "import .* from ['\"]\.\.\/\.\./\.\." "$FILE_PATH"; then
  ISSUES="$ISSUES\n• Deep relative import detected"
  ISSUES="$ISSUES\n  Fix: Use package imports (@create-something/...)"
fi

# Check for direct node_modules imports
if grep -qE "import .* from ['\"].*node_modules" "$FILE_PATH"; then
  ISSUES="$ISSUES\n• Direct node_modules import detected"
  ISSUES="$ISSUES\n  Fix: Import from package name"
fi

# Check for missing .js extensions (ESM)
if grep -qE "import .* from ['\"]\.\/.+['\"]" "$FILE_PATH"; then
  if ! grep -qE "import .* from ['\"]\.\/.+\.js['\"]" "$FILE_PATH"; then
    ISSUES="$ISSUES\n• Missing .js extension in ESM import"
    ISSUES="$ISSUES\n  Fix: Add .js to relative imports"
  fi
fi

if [[ -n "$ISSUES" ]]; then
  echo -e "Import issues in $FILE_PATH:$ISSUES" >&2
  exit 2
fi

exit 0
```

## Hook Context

Hooks receive JSON on stdin with this structure:

```json
{
  "tool_name": "Write",
  "tool_input": {
    "file_path": "/Users/you/project/src/components/Button.svelte",
    "content": "..."
  },
  "tool_output": {
    "success": true
  },
  "session_id": "abc123",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

### Parsing Context

```bash
# Extract fields
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')
SUCCESS=$(echo "$INPUT" | jq -r '.tool_output.success // false')

# Check if tool succeeded
if [[ "$SUCCESS" != "true" ]]; then
  exit 0  # Don't validate failed operations
fi
```

## Hook Organization

```
.claude/
└── hooks/
    ├── session-start/
    │   ├── check-environment.sh
    │   └── load-context.sh
    ├── session-stop/
    │   ├── save-session.sh
    │   └── cleanup-temp.sh
    ├── pre-tool-use/
    │   ├── commit-validation.sh
    │   └── prevent-main-branch.sh
    └── post-tool-use/
        ├── canon-enforcement.sh
        ├── type-check.sh
        └── import-validation.sh
```

**All hooks must be executable**:
```bash
chmod +x .claude/hooks/**/*.sh
```

## Testing Hooks

### Unit Testing

```bash
# test-canon-hook.sh
#!/bin/bash

# Create test file
TEST_FILE="/tmp/test-component.svelte"
cat > "$TEST_FILE" <<'EOF'
<div class="rounded-lg bg-white text-gray-600">Test</div>
EOF

# Simulate hook input
INPUT=$(cat <<EOF
{
  "tool_name": "Write",
  "tool_input": {
    "file_path": "$TEST_FILE"
  },
  "tool_output": {
    "success": true
  }
}
EOF
)

# Run hook
OUTPUT=$(echo "$INPUT" | .claude/hooks/post-tool-use/canon-enforcement.sh 2>&1)
EXIT_CODE=$?

# Assertions
if [[ $EXIT_CODE -ne 2 ]]; then
  echo "FAIL: Expected exit code 2, got $EXIT_CODE"
  exit 1
fi

if [[ ! "$OUTPUT" =~ "Canon violation" ]]; then
  echo "FAIL: Expected violation message"
  exit 1
fi

echo "PASS: Hook correctly detected violations"
```

### Integration Testing

```bash
# Start Claude Code session
# Ask Claude: "Create a component with class='rounded-lg bg-white'"
# Observe: Hook triggers, Claude self-corrects
```

## Performance Considerations

### Fast Filters

Filter early, validate late:

```bash
# Good: Filter before expensive operations
if [[ "$TOOL_NAME" != "Write" ]]; then
  exit 0
fi

if [[ ! "$FILE_PATH" =~ \.svelte$ ]]; then
  exit 0
fi

# Now do expensive validation
run_expensive_check "$FILE_PATH"

# Bad: Check everything regardless
run_expensive_check "$FILE_PATH"  # Runs on every tool call!

if [[ "$TOOL_NAME" != "Write" ]]; then
  exit 0
fi
```

### Caching

Cache validation results:

```bash
# Check cache
CACHE_FILE=".claude/cache/$(echo -n "$FILE_PATH" | md5).json"

if [[ -f "$CACHE_FILE" ]]; then
  CACHED_HASH=$(jq -r '.hash' "$CACHE_FILE")
  CURRENT_HASH=$(md5sum "$FILE_PATH" | cut -d' ' -f1)

  if [[ "$CACHED_HASH" == "$CURRENT_HASH" ]]; then
    # File unchanged, skip validation
    exit 0
  fi
fi

# Validate and cache result
validate_file "$FILE_PATH"
echo "{\"hash\": \"$CURRENT_HASH\", \"validated\": true}" > "$CACHE_FILE"
```

### Async Hooks

For expensive operations, run in background:

```bash
# Start validation in background
{
  expensive_validation "$FILE_PATH"
  echo "Validation complete" >> .claude/validation.log
} &

# Return immediately
exit 0
```

**Trade-off**: Faster response, but delayed feedback.

## Hook Composition

Hooks can call other hooks:

```bash
#!/bin/bash
# post-tool-use/master-validation.sh

# Run all validation hooks
.claude/hooks/post-tool-use/canon-enforcement.sh
.claude/hooks/post-tool-use/type-check.sh
.claude/hooks/post-tool-use/import-validation.sh

# Aggregate results
if [[ $? -ne 0 ]]; then
  exit 2
fi

exit 0
```

## The Discipline

### When NOT to Hook

Don't create hooks for:
- One-off validations (just review manually)
- Subjective standards (let humans decide)
- Operations that need context (hooks are stateless)
- Slow validations (use CI instead)

**Anti-pattern**: A hook that runs full test suite after every file write. This is Gestell—automation that invades rather than assists.

### When TO Hook

Create hooks for:
- Objective, mechanical validations
- Standards you've already decided on
- Fast checks (< 1 second)
- Violations you keep making accidentally

**Pattern**: "I keep forgetting to [X]" → Hook candidate.

## Gelassenheit: The Middle Way

Neither automation maximalism nor manual toil—**selective, conscious automation**.

Ask before creating a hook:
1. **Is this mechanical?** (Can a script check it objectively?)
2. **Is this fast?** (< 1 second response time?)
3. **Does this recede?** (Will I forget it exists when it's working?)
4. **Is this freeing?** (Does it let me focus on creative work?)

If all four are yes, build the hook.

## Praxis Integration

This lesson pairs with:
- **Praxis**: Build a custom hook suite for your workflow
- **Skill**: `hook-development` — guides hook creation
- **Paper**: Dwelling in Tools — Heideggerian grounding

---

## Reflection

Before the praxis exercise:

1. What rules do you repeatedly enforce manually?
2. Which of these are objective enough for automation?
3. What creative work would you do if validation was automatic?

**The goal isn't automation—it's dwelling.**

When the tool recedes, the craft reveals itself.

---

## Cross-Property References

> **Canon Reference**: See [Dwelling in Tools](https://createsomething.ltd/patterns/dwelling-in-tools) for the Heideggerian foundation of tools that recede into use.
>
> **Research Depth**: Read [Code Mode Hermeneutic Analysis](https://createsomething.io/papers/code-mode-hermeneutic-analysis) for research on when automation enables vs. invades.
>
> **Practice**: See the CREATE SOMETHING [hooks directory](https://github.com/create-something/create-something-monorepo/tree/main/.claude/hooks) for real examples of Canon enforcement hooks.
