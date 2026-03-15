---
name: ground-claims
description: Use Ground MCP to verify claims about code before making them (duplicates, dead code, orphans)
category: quality-assurance
triggers:
  - "duplicate"
  - "dead code"
  - "orphan"
  - "unused"
  - "refactor"
  - "cleanup"
related:
  - subtractive-review
  - canon-maintenance
composable: true
priority: P0
tools: ground_compare, ground_count_uses, ground_check_connections, ground_find_duplicate_functions, ground_find_orphans, ground_find_dead_exports
---

# Ground Claims

Use Ground MCP to verify claims about code. **You cannot claim something until you've checked it.**

## Philosophy

**"Computation-constrained synthesis."**

AI agents often make claims about code that aren't verified:
- "These files look like duplicates" (did you actually compare them?)
- "This function is dead code" (did you count the uses?)
- "This module is orphaned" (did you check connections?)

Ground enforces verification before claims. The MCP blocks unverified claims.

## Available Tools (12 total)

### Discovery Tools (use proactively)

| Tool | Purpose |
|------|---------|
| `ground_find_duplicate_functions` | Scan for DRY violations |
| `ground_find_orphans` | Find disconnected modules |
| `ground_find_dead_exports` | Find unused API surface |
| `ground_check_environment` | Detect Workers/Node.js boundary issues |

### Verification Tools (before specific claims)

| Tool | Purpose |
|------|---------|
| `ground_compare` | Compare two files for similarity |
| `ground_count_uses` | Count symbol usages (definitions vs actual uses) |
| `ground_check_connections` | Check module connections (imports + architectural) |

### Claim Tools (after verification)

| Tool | Purpose |
|------|---------|
| `ground_claim_duplicate` | Record a verified DRY violation |
| `ground_claim_dead_code` | Record verified dead code |
| `ground_claim_orphan` | Record a verified orphan |

### Utility Tools

| Tool | Purpose |
|------|---------|
| `ground_suggest_fix` | Get monorepo refactoring suggestions |
| `ground_status` | Show current thresholds |

## Workflow

```
┌─────────────────────────────────────────────────┐
│  1. DISCOVER: Find potential issues             │
│     ground_find_duplicate_functions(dir)        │
├─────────────────────────────────────────────────┤
│  2. VERIFY: Confirm with evidence               │
│     ground_compare(file_a, file_b)              │
├─────────────────────────────────────────────────┤
│  3. CLAIM: Make grounded assertion              │
│     ground_claim_duplicate(file_a, file_b, why) │
└─────────────────────────────────────────────────┘
```

## Integration with Subtractive Triad

| Pass | Ground Tool | Question |
|------|-------------|----------|
| **DRY** | `ground_find_duplicate_functions` | "Have I built this before?" |
| **Rams** | `ground_count_uses`, `ground_find_dead_exports` | "Does this earn existence?" |
| **Heidegger** | `ground_check_connections`, `ground_find_orphans` | "Does this serve the whole?" |

## Recommended Options

```
# For duplicate functions
ground_find_duplicate_functions(
  directory,
  threshold: 0.8,      # 80% similar
  exclude_tests: true, # Skip test files
  min_lines: 5         # Skip trivial functions
)

# For orphan detection
ground_find_orphans(
  directory,
  include_tests: false # Tests are expected orphans
)

# For dead exports
ground_find_dead_exports(
  module_path,
  search_scope: "."    # Search whole project
)
```

## What Ground Detects

### Architectural Connections
- Cloudflare Workers (routes, crons, bindings from wrangler.toml)
- Package entry points (bin, main, exports from package.json)
- Multi-line imports/exports (`} from './module'`)
- Re-exports through barrel files (index.ts)

### Environment Safety
- Workers-only APIs reachable from Node.js entry points
- Node.js APIs in Workers code
- Import chain tracing to problematic APIs

## Anti-Patterns

### ❌ Claiming without checking
```
"These files are duplicates, let me consolidate"
→ BLOCKED until you call ground_compare
```

### ❌ Trusting file names
```
"utils.ts and helpers.ts are probably duplicates"
→ Use ground_compare, not assumptions
```

### ❌ Assuming unused = dead
```
"I don't see this called anywhere"
→ Use ground_count_uses - check actual_uses vs definitions
```

## Example Session

```
User: "Clean up duplicate code in packages/api"

Agent:
1. ground_find_duplicate_functions("packages/api/src", {
     threshold: 0.8, exclude_tests: true, min_lines: 5
   })
   → Found: validateEmail (94% in 2 files)

2. ground_compare("auth/validate.ts", "user/validate.ts")
   → similarity: 94%, evidence_id: "abc123"

3. Create shared utility, update imports

4. Verify: ground_find_duplicate_functions(...) 
   → Duplicates reduced
```

## Reference

- `packages/ground/README.md` — Full documentation
- `.claude/skills/subtractive-review.md` — Review methodology
