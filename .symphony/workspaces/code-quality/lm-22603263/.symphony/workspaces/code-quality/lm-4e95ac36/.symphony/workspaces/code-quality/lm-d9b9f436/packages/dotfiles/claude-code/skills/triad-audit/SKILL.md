---
name: triad-audit
description: Run systematic code audits using the Subtractive Triad framework (DRY → Rams → Heidegger). Use when auditing codebases for bloat, reviewing PRs for quality, finding dead code, or evaluating if code "earns its existence."
allowed-tools: Read, Grep, Glob, ground_compare, ground_count_uses, ground_check_connections, ground_find_duplicate_functions, ground_find_orphans, ground_find_dead_exports, ground_analyze
---

# Subtractive Triad Audit

Systematic code reduction using the DRY → Rams → Heidegger framework.

## The Framework

Apply three levels of scrutiny, in order:

### Level 1: DRY (Implementation)
**Question**: "Have I built this before?"

Use `ground_find_duplicate_functions` to find copied code:
```
ground_find_duplicate_functions with directory="src/" min_lines=5 exclude_tests=true
```

Look for:
- Duplicate code across files
- Repeated patterns that should be abstracted
- Copy-paste with minor variations

**Action**: Unify

### Level 2: Rams (Artifact)
**Question**: "Does this earn its existence?"

Use `ground_find_dead_exports` to find unused code:
```
ground_find_dead_exports with module_path="src/utils.ts"
```

Use `ground_count_uses` to verify before claiming dead:
```
ground_count_uses with symbol="unusedFunction"
```

Look for:
- Unused imports and exports
- Dead code paths
- Over-engineered abstractions
- Features nobody uses

**Action**: Remove

### Level 3: Heidegger (System)
**Question**: "Does this serve the whole?"

Use `ground_find_orphans` to find disconnected modules:
```
ground_find_orphans with directory="src/"
```

Use `ground_check_connections` to verify:
```
ground_check_connections with module_path="src/old-utils.ts"
```

Look for:
- Orphaned modules (nothing imports them)
- Inconsistent naming conventions
- Poor cohesion
- Missing documentation

**Action**: Reconnect

## Running an Audit

### Full Codebase Audit

Use `ground_analyze` for batch analysis:
```
ground_analyze with directory="src/" checks=["duplicates", "dead_exports", "orphans"]
```

### PR Review

1. Get the changed files from the PR
2. Run targeted analysis on affected areas
3. Apply the three levels to each change

### Single File Deep Dive

```
ground_find_dead_exports with module_path="path/to/file.ts"
ground_count_uses with symbol="exportedFunction" search_path="src/"
```

## Output Format

Generate a structured report:

```markdown
# Subtractive Triad Audit: [Scope]

## Summary
- **DRY Score**: X/10
- **Rams Score**: X/10  
- **Heidegger Score**: X/10
- **Overall Health**: X/10

## Level 1: DRY Findings
| Location A | Location B | Similarity | Action |
|------------|------------|------------|--------|

## Level 2: Rams Findings
| Export | File | Uses | Action |
|--------|------|------|--------|

## Level 3: Heidegger Findings
| Module | Connections | Action |
|--------|-------------|--------|

## Recommendations
### P0 - Must Fix
### P1 - Should Fix
### P2 - Backlog
```

## Scoring Guidelines

| Score | Meaning |
|-------|---------|
| 9-10 | Excellent - minimal issues |
| 7-8 | Good - minor issues only |
| 5-6 | Acceptable - some work needed |
| 3-4 | Poor - significant issues |
| 0-2 | Critical - major refactoring needed |

## Philosophy

> "Perfection is achieved, not when there is nothing more to add, but when there is nothing left to take away."

The Subtractive Triad operationalizes this into actionable code review. It shifts the question from "does this work?" to "does this *need* to exist?"

## Requirements

Install Ground MCP for automated analysis:
```bash
npm install -g @createsomething/ground-mcp
```

Add to `.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "ground": {
      "command": "ground-mcp"
    }
  }
}
```

## Case Study

See the framework in action: [Kickstand Triad Audit](https://createsomething.io/papers/kickstand-triad-audit) — 155 scripts reduced to 13 (92% reduction).

---

*From [CREATE SOMETHING](https://createsomething.agency) — The canon for "less, but better."*
