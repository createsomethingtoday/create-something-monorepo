# Cloudflare Pages Project Name Reference

## The Problem

Cloudflare Pages project names in this monorepo are **inconsistent** due to historical naming decisions. This document provides the authoritative mapping to prevent deployment errors.

## Critical Rule

**NEVER** rename these projects in Cloudflare Dashboard. Production deployments depend on these exact names.

## Complete Mapping

| Package Directory | Cloudflare Pages Project | Production Domain | Notes |
|-------------------|-------------------------|-------------------|-------|
| `packages/space` | `create-something-space` | createsomething.space | Hyphenated prefix |
| `packages/io` | `create-something-io` | createsomething.io | Hyphenated prefix |
| `packages/agency` | `create-something-agency` | createsomething.agency | Hyphenated prefix |
| `packages/ltd` | `createsomething-ltd` | createsomething.ltd | **No hyphen** in prefix |
| `packages/lms` | `createsomething-lms` | learn.createsomething.space | **No hyphen** in prefix |
| `packages/templates-platform` | `templates-platform` | templates.createsomething.space | Standalone name |

## Naming Patterns

### Pattern 1: `create-something-*` (with hyphen)
Used by: `space`, `io`, `agency`

Example:
```bash
wrangler pages deploy .svelte-kit/cloudflare --project-name=create-something-space
```

### Pattern 2: `createsomething-*` (no hyphen)
Used by: `ltd`, `lms`

Example:
```bash
wrangler pages deploy .svelte-kit/cloudflare --project-name=createsomething-ltd
```

### Pattern 3: Standalone
Used by: `templates-platform`

Example:
```bash
wrangler pages deploy .svelte-kit/cloudflare --project-name=templates-platform
```

## How to Use

### When Deploying

1. Check this table for the **exact** project name
2. Use it verbatim in your `wrangler pages deploy` command
3. Do NOT try to infer the pattern—look it up

### When Writing Documentation

Always include this reference:
```markdown
# Use exact project name - see .claude/rules/cloudflare-patterns.md
wrangler pages deploy .svelte-kit/cloudflare --project-name=[exact-project-name]
```

### When Creating New Packages

If adding a new CREATE SOMETHING property:
1. Choose ONE naming pattern and document it here
2. Use it consistently across:
   - Cloudflare Pages project name
   - `wrangler.toml` or `wrangler.jsonc` `name` field
   - All deployment scripts
   - All documentation

## Wrangler Config Reference

The `name` field in `wrangler.toml`/`wrangler.jsonc` MUST match the Cloudflare Pages project name:

```toml
# packages/space/wrangler.jsonc
{
  "name": "create-something-space",  # Must match Pages project
  ...
}
```

```toml
# packages/ltd/wrangler.jsonc
{
  "name": "createsomething-ltd",  # Must match Pages project (note: no hyphen)
  ...
}
```

## Verification Checklist

Before deploying:
- [ ] Looked up exact project name in this table
- [ ] Verified project name matches `wrangler.toml`/`wrangler.jsonc`
- [ ] Used project name verbatim in deploy command
- [ ] Did NOT attempt to rename the Cloudflare project

## Why This Matters

Incorrect project names cause:
1. **404 errors** - Cloudflare creates new project instead of deploying to existing
2. **Broken domains** - Custom domain bindings won't match
3. **Missing bindings** - D1, KV, and other bindings won't attach
4. **Split traffic** - Users hit old deployment while new one goes to wrong project

## Historical Context

The inconsistency exists because:
- `space`, `io`, `agency` were created first with `create-something-*` pattern
- `ltd` was created later using `createsomething-*` (no hyphen) pattern
- `lms` and `templates-platform` followed later conventions

Rather than rename (which would break production), we document the truth.

## Subtractive Triad Reflection

This document exists because:
1. **DRY** (Implementation) - Single source of truth eliminates duplicated knowledge
2. **Rams** (Artifact) - Only essential information; pattern explanations earn their existence
3. **Heidegger** (System) - Documentation serves deployment correctness; the tool recedes when correct names are used

When you know the exact name, you don't think about naming. The infrastructure disappears; only the work remains.
