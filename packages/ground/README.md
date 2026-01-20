# Ground

Grounded claims for code.

---

## The Problem

AI agents are confident. Too confident.

They'll tell you two files are "95% similar" without ever comparing them. They'll declare code "dead" without checking who uses it. They'll claim a module is "disconnected" while it's serving thousands of requests.

This is hallucination dressed up as analysis.

---

## The Solution

You can't claim something until you've checked it.

```bash
# First, compare the files
ground compare utils.ts helpers.ts

# Then, make a claim (only works if you've compared)
ground claim duplicate utils.ts helpers.ts "same validation logic"
```

If you try to claim without checking first, Ground blocks you:

```
✗ Claim blocked

  You need to compare these files first:
  ground compare utils.ts helpers.ts
```

---

## Installation

### npm (recommended)

```bash
npm install -g ground-mcp
```

This downloads pre-built binaries for your platform.

### Cargo (from source)

```bash
cargo install --git https://github.com/createsomethingtoday/create-something-monorepo --path packages/ground
```

### Manual build

```bash
cd packages/ground
cargo build --release
```

The binary is at `target/release/ground`.

---

## Commands

### Check Commands (do these first)

```bash
# Compare two files for similarity
ground compare file_a.ts file_b.ts

# Count how many times something is used
ground count uses MyFunction ./src

# Check if a module is connected
ground check connections ./module
```

### Find Commands (scan for problems)

```bash
# Find duplicate code
ground find duplicates ./packages

# Find duplicate functions (catches fine-grained copies)
ground find duplicate-functions ./packages --min-lines 5 --exclude-tests

# Find orphaned modules (nothing imports them)
ground find orphans ./packages/sdk/src

# Find unused exports in a module
ground find dead-exports ./utils.ts --scope ./src

# With CREATE SOMETHING monorepo suggestions
ground find duplicates ./packages --monorepo --beads
```

### Claim Commands (need to check first)

```bash
# Claim files are duplicates
ground claim duplicate file_a.ts file_b.ts "same validation"

# Claim code is dead
ground claim dead-code OldFunction "not used since migration"

# Claim module is orphaned
ground claim orphan ./old-module "nothing imports it"
```

---

## CREATE SOMETHING Monorepo Mode

Ground knows our codebase. When you use `--monorepo`, it:

- Suggests where to put shared code (`@create-something/components`)
- Gives you the import statement to use
- Generates a beads command to file the issue

```bash
ground find duplicates ./packages --monorepo --beads
```

Output:

```
Found 1 duplicate:

1. 96.1% similar
   design/+page.server.ts ↔ docs/+page.server.ts
   ┌──────────────────────────────────────────
   │ 📋 Create shared design page loader
   │ 📁 packages/components/src/lib/auth/handlers.ts
   │ 🎯 P1
   └──────────────────────────────────────────

Beads commands:
bd create "Extract shared design loader (96% duplicate)" --priority P1 --label refactor
```

---

## MCP Integration

Ground exposes tools via the Model Context Protocol:

| Tool | What it does |
|------|--------------|
| `ground_compare` | Compare two files |
| `ground_count_uses` | Count symbol uses (distinguishes definitions vs actual uses) |
| `ground_check_connections` | Check module connections (understands Workers) |
| `ground_find_duplicate_functions` | Find copied functions (`min_lines`, `exclude_tests`) |
| `ground_find_orphans` | Find modules nothing imports |
| `ground_find_dead_exports` | Find exports never imported elsewhere |
| `ground_check_environment` | Detect Workers/Node.js API leakage |
| `ground_claim_duplicate` | Claim files are duplicates |
| `ground_claim_dead_code` | Claim code is dead |
| `ground_claim_orphan` | Claim module is orphaned |
| `ground_suggest_fix` | Get fix suggestions (works with any pnpm monorepo) |
| `ground_status` | Show status |

Add to your `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "ground": {
      "command": "ground-mcp"
    }
  }
}
```

If installed via npm globally, just use `"command": "ground-mcp"`. For local project installs, use:

```json
{
  "mcpServers": {
    "ground": {
      "command": "npx",
      "args": ["ground-mcp"]
    }
  }
}
```

---

## Pre-commit Hook

Ground includes a pre-commit hook that catches >90% duplicates:

```bash
# Already set up in .husky/pre-commit
git commit -m "my changes"  # Ground checks automatically
```

---

## Philosophy

Ground is based on a simple principle from Heidegger: nothing exists without *Grund* (ground, foundation, reason).

Applied to code analysis: **no claim without evidence**.

- **Duplicates** → You have to compare the files first
- **Dead code** → You have to count the uses first
- **Orphans** → You have to check the connections first

This prevents AI hallucination by requiring computation before synthesis.

---

## License

MIT

## Environment Safety Check

Detects Workers APIs used in Node.js code paths (or vice versa). Implemented 2026-01-18.

```bash
ground check environment-safety packages/cli/src/index.ts

→ Environment Safety Check for packages/cli/src/index.ts

  Detected environment: Node.js
  Reachable modules: 61
  Environment-specific APIs found: 18

  ✓ No environment safety issues detected.
```

When issues are found:
```
  ⚠ 1 warning(s) found:

  1. ✗ Workers-only API 'caches.default' reachable from Node.js entry point

     Import chain:
     index.ts
       → sdk.ts
       → edge-cache.ts

     Options:
       - Use conditional exports in package.json
       - Lazy-load with: const { caches } = await import('./workers-only.js')
       - Split into separate /node and /workers entry points
```

**APIs detected:**

| Workers-only | Node.js-only |
|--------------|--------------|
| `caches.default`, `caches.open` | `require('fs')`, `require('child_process')` |
| `env.KV`, `env.R2`, `env.D1`, `env.AI` | `process.env`, `__dirname`, `__filename` |
| `ctx.waitUntil`, `HTMLRewriter`, `WebSocketPair` | `Buffer.from` |

**MCP:** `ground_check_environment`
