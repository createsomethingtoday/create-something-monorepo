---
name: repo-navigator
description: Navigate the CREATE SOMETHING monorepo — domain rules, Cloudflare patterns, SvelteKit conventions, SDK auth, error handling, and project-name mappings. Use when working on code in any package.
---

# Repo Navigator

Domain knowledge for the CREATE SOMETHING monorepo. Load this skill when working on code to ensure you follow established patterns and conventions.

## Quick Reference

For full details, read the relevant rule file under `.claude/rules/`:

| Topic | Rule File | When to Use |
|-------|-----------|-------------|
| Cloudflare deploy, D1, KV, Pages | `.claude/rules/cloudflare-patterns.md` | Any Cloudflare work |
| SvelteKit routes, layouts, types | `.claude/rules/sveltekit-conventions.md` | Any SvelteKit work |
| Error handling patterns | `.claude/rules/error-handling-patterns.md` | Error handling design |
| SDK auth (OAuth, tokens, API keys) | `.claude/rules/sdk-auth-patterns.md` | Auth integration |
| Context7 external docs | `.claude/rules/context7-patterns.md` | Pulling library docs |
| Voice canon (writing style) | `.claude/rules/voice-canon.md` | Content writing |
| CSS Canon / Taste reference | `.claude/rules/taste-reference.md` | Design decisions |
| Project name mapping | `.claude/rules/PROJECT_NAME_REFERENCE.md` | Deployments |
| Beads (agent persistence) | `.claude/rules/beads-patterns.md` | Agent state |
| Social posting automation | `.claude/rules/social-patterns.md` | LinkedIn posts |
| Paper content requirements | `.claude/rules/paper-content-requirements.md` | Papers |

## Critical Conventions

### Cloudflare Pages Project Names

Names are **inconsistent** due to historical reasons. Always verify:

| Package | Project Name | Domain |
|---------|-------------|--------|
| space | `create-something-space` | createsomething.space |
| io | `create-something-io` | createsomething.io |
| agency | `create-something-agency` | createsomething.agency |
| ltd | `createsomething-ltd` | createsomething.ltd |

### SvelteKit File Structure

```
packages/[pkg]/src/
├── routes/
│   ├── +page.svelte           # Page component
│   ├── +page.server.ts        # Server load function
│   ├── +layout.svelte         # Layout component
│   └── api/[endpoint]/+server.ts  # API route
├── lib/
│   ├── components/            # Reusable components
│   ├── utils/                 # Utility functions
│   └── server/                # Server-only code
├── app.html, app.css, app.d.ts
```

### Platform Access (D1 / KV)

```typescript
export const load: PageServerLoad = async ({ platform }) => {
  const db = platform?.env.DB;
  const kv = platform?.env.KV;
};
```

### CSS Rule: Tailwind for Structure, Canon for Aesthetics

- **Tailwind**: `flex`, `grid`, `gap-*`, `p-*`, `m-*`, `w-*`, `h-*`, `items-*`, `justify-*`
- **Canon tokens**: colors (`--color-*`), radius (`--radius-*`), shadows (`--shadow-*`), typography (`--text-*`)
- Token source: `packages/components/src/lib/styles/tokens.css`

### Error Handling

```typescript
// Use Result pattern for expected failures
type Result<T> = { ok: true; data: T } | { ok: false; error: AppError };

// Throw only for unexpected failures
// Always provide actionable error messages
// Never expose internal details to users
```

### Auth Pattern Selection

The deciding constraint is **runtime**:
- **Edge (Workers/Pages)**: Use platform APIs, JWT validation at edge
- **Server (Node)**: Use SDK with full OAuth flow
- **Client**: Use Auth0 SPA SDK, never store tokens in localStorage

### Import Verification

Before using `@create-something/*` imports, verify the export exists:

```bash
pnpm exports <package>
pnpm exports <package> <symbol>
```

### Grounding Discipline

Do not guess code symbols. Verify with:

```bash
pnpm exports           # List all packages
pnpm exports <pkg>     # List exports of a package
pnpm exports <pkg> <s> # Check specific symbol
```

## How to Load Full Rules

Read the file directly when you need the complete reference:

```
Read .claude/rules/cloudflare-patterns.md
Read .claude/rules/sveltekit-conventions.md
Read .claude/rules/error-handling-patterns.md
```

All 23 rule files live in `.claude/rules/` and are agent-readable.
