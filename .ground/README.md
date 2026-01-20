# Ground MCP Configuration Patterns

This directory contains reusable Ground MCP configuration patterns organized by concern.

## Architecture

```
.ground/
├── sveltekit-patterns.yml    # SvelteKit framework conventions
├── cloudflare-patterns.yml   # Cloudflare Workers/Pages patterns
├── monorepo-patterns.yml     # General monorepo patterns
└── project-specific.yml      # Project-specific exceptions
```

The main `.ground.yml` extends these files using the `extends` directive.

## Pattern Files

### `sveltekit-patterns.yml`
**Purpose:** SvelteKit framework conventions that Ground MCP cannot detect.

**Includes:**
- Entry points (`hooks.*.ts`, `app.html`, `service-worker.ts`)
- Route conventions (`+page.svelte`, `+layout.server.ts`, `+server.ts`)
- Static assets (served by URL, not imports)
- Co-located route files (relative imports)

**When to update:** When you discover a new SvelteKit pattern that Ground misses.

### `cloudflare-patterns.yml`
**Purpose:** Cloudflare Workers and Pages deployment patterns.

**Includes:**
- Configuration files (`wrangler.toml`, `_routes.json`)
- Worker entry points (defined in config, not imports)
- Pages Functions (filesystem routing)

**When to update:** When adding new Workers or Pages-specific patterns.

### `monorepo-patterns.yml`
**Purpose:** Universal monorepo and build tool patterns.

**Includes:**
- Build configs (`*.config.*`, `tsconfig.json`, `package.json`)
- Scripts and tooling (`scripts/`, `bin/`)
- Test files (`*.test.ts`, `__tests__/`)
- Generated directories (`dist/`, `.svelte-kit/`)

**When to update:** When adding new build tools or development patterns.

### `project-specific.yml`
**Purpose:** Patterns unique to this specific monorepo.

**Includes:**
- Side-effect imports (`webflow/globals.ts`)
- Co-located experiment data
- Airtable scripts
- Intentional duplicate pairs

**When to update:** When you have project-specific architectural decisions.

## Usage Workflow

### Running Ground MCP

```bash
# Analyze the entire monorepo
pnpm ground analyze --directory=.

# Analyze a specific package
pnpm ground analyze --directory=packages/io

# Incremental analysis (only new issues)
pnpm ground diff --directory=. --base=main
```

### Handling False Positives

When Ground MCP flags a file as orphaned/dead:

1. **Verify it's actually used:**
   ```bash
   # Check for imports
   grep -r "from.*filename" .
   
   # Check for URL references (static assets)
   grep -r "filename" src/
   
   # Build the package
   pnpm --filter=package-name build
   ```

2. **Identify the pattern:**
   - Is it a **framework convention**? (e.g., SvelteKit hook)
   - Is it a **static asset**? (referenced in HTML)
   - Is it a **co-located file**? (relative import)
   - Is it **project-specific**? (unique to this repo)

3. **Add to appropriate pattern file:**
   ```yaml
   # Example: Adding to sveltekit-patterns.yml
   ignore:
     paths:
       - "**/routes/**/helpers.ts"  # Co-located route helpers
   ```

4. **Document why:**
   ```yaml
   # Co-located route helpers (imported via ./helpers)
   # Ground's import resolution misses these relative imports
   - "**/routes/**/helpers.ts"
   ```

5. **Re-run Ground MCP:**
   ```bash
   pnpm ground analyze --directory=.
   ```

## Pattern Decision Matrix

| Pattern Type | Add To | Example |
|--------------|--------|---------|
| SvelteKit convention | `sveltekit-patterns.yml` | `hooks.server.ts` |
| Cloudflare runtime | `cloudflare-patterns.yml` | `wrangler.toml` |
| Build tool config | `monorepo-patterns.yml` | `vite.config.ts` |
| Test file | `monorepo-patterns.yml` | `*.test.ts` |
| Static asset | `sveltekit-patterns.yml` | `static/favicon.svg` |
| Side-effect import | `project-specific.yml` | `webflow/globals.ts` |
| Intentional duplicate | `project-specific.yml` | Duplicate route handlers |

## Sharing Patterns

These pattern files can be shared across projects:

```bash
# Copy framework patterns to another SvelteKit project
cp .ground/sveltekit-patterns.yml ../other-project/.ground/
cp .ground/monorepo-patterns.yml ../other-project/.ground/

# Or symlink for shared patterns
ln -s ../../shared-configs/.ground/sveltekit-patterns.yml .ground/
```

## Best Practices

### ✅ DO
- Add patterns **proactively** when adopting a new framework
- Document **why** each pattern exists
- Group related patterns together
- Use specific glob patterns (avoid overly broad rules)
- Test pattern changes with `ground analyze`

### ❌ DON'T
- Wait for "critical usage" before adding patterns
- Add one-off exceptions without understanding the underlying pattern
- Use `.ground.yml` for framework patterns (use dedicated files)
- Add overly broad ignore rules (e.g., `**/*.ts`)
- Forget to document your reasoning

## Important Note: Config Composition

**⚠️ The `extends` directive is aspirational.** If Ground MCP doesn't support config composition yet:

### Option 1: Manual Merge (Temporary)
Create a merged config for Ground MCP:

```bash
# Merge all pattern files into .ground.yml
cat .ground/sveltekit-patterns.yml \
    .ground/cloudflare-patterns.yml \
    .ground/monorepo-patterns.yml \
    .ground/project-specific.yml > .ground.merged.yml

# Use merged config
ground analyze --config=.ground.merged.yml
```

### Option 2: Preprocessing Script
Create `.ground/merge.sh`:

```bash
#!/bin/bash
# Merge pattern files into main config
yq eval-all '. as $item ireduce ({}; . * $item)' \
  .ground/*.yml > .ground.merged.yml
```

### Option 3: Feature Request
If Ground MCP doesn't support `extends`, this structure still provides:
- ✅ **Documentation** - Each pattern file explains framework conventions
- ✅ **Organization** - Patterns grouped by concern
- ✅ **Reusability** - Easy to copy patterns to other projects
- ✅ **Maintainability** - Update one file, not a monolith

The pattern files serve as **living documentation** even if not directly composed.

## Troubleshooting

### Ground MCP still flags false positives

1. Check if the pattern exists in the config:
   ```bash
   grep -r "pattern" .ground/
   ```

2. Verify the glob pattern is correct:
   ```bash
   # Test glob locally
   fd --glob 'hooks.*.ts'
   ```

3. Check the extends are working:
   ```bash
   # Ground should show "Loaded config from: .ground.yml"
   # And list extended files
   ```

### Pattern file not being loaded

- Ensure `extends` path is correct in `.ground.yml`
- Check YAML syntax: `yamllint .ground/*.yml`
- Verify file permissions: `ls -la .ground/`

## Contributing

When adding new patterns:

1. Add to the **most specific** file
2. Include a **comment** explaining why
3. Group with **related patterns**
4. Test with `ground analyze`
5. Document in commit message

## Related Documentation

- [Ground MCP Postmortem](../GROUND_MCP_POSTMORTEM.md) - Lessons learned
- [Ground MCP Analysis](../GROUND_MCP_ANALYSIS_2026_01_20.md) - Initial analysis
- [SvelteKit Docs](https://kit.svelte.dev/docs) - Framework conventions
- [Cloudflare Docs](https://developers.cloudflare.com/workers/) - Worker patterns
