# CREATE SOMETHING IO

**createsomething.io** — MCP Patterns for Builders

Research, reference implementations, and documentation for developers building MCP servers and Skills.

---

## The Creation Moat

Templates and scaffolding tools have commoditized *starting* an MCP server. The value is in:

- **Understanding what to build** — Domain expertise + MCP knowledge
- **Deep integration patterns** — Auth, data mapping, security boundaries
- **Production-grade implementations** — Error handling, logging, testing

`.io` publishes the patterns that make the difference.

---

## Focus Areas

### MCP Server Patterns

- Transport patterns (stdio vs SSE vs Streamable HTTP)
- Authentication integration (OAuth 2.0, API keys)
- Error handling and recovery
- Logging and observability
- Testing strategies

### Skills Development

- Agent Skills specification compliance
- Portable capability design
- Cross-platform compatibility (Claude, Codex, Cursor)

### Reference Implementations

- Procore MCP Server (WORKWAY)
- Common integration patterns (CRM, project management)
- Edge deployment with Cloudflare Workers

---

## Hermeneutic Position

`.io` validates patterns through real implementation:

```
.ltd (Philosophy) → provides principles →
.io (Research) → validates with real MCP development ← YOU ARE HERE
.space (Practice) → experiments with patterns →
.agency (Services) → delivers to clients →
.ltd (Philosophy) → refined by outcomes
```

---

## Content Principles

1. **Show, don't scaffold** — Reference implementations over templates
2. **Production focus** — Patterns that survive real deployment
3. **Creation over consumption** — How to build, not just how to use

---

## Agent Legibility Contract

| Field | Value |
|-------|-------|
| Entry point | `src/routes/+page.svelte`, `src/routes/papers/+page.svelte`, `src/lib/config/plugins.ts` |
| Boot command | `pnpm dev` |
| Smoke command | `pnpm check` |
| Validation surfaces | Svelte check output, ESLint output, route preview, paper/plugin route responses |
| UI validation path | `/`, `/papers`, `/plugins` |
| Escalation rule | stop if research content, plugin catalog, or D1-backed experiment data cannot be reconciled with the checked-in source artifacts |

### Paper Catalog Guard

`pnpm check` runs `scripts/check-paper-catalog.mjs` before Svelte diagnostics. The guard fails when:

- a static paper route under `src/routes/papers/{slug}/` lacks `meta.ts`
- `static/sitemap.xml` is reintroduced and shadows the generated sitemap route
- the old `content/papers/test-markdown-paper.md` fixture appears in production content
- a markdown file under `content/papers/` lacks either a static route or `fileBasedPapers` entry

---

## Development

```bash
# Start dev server
pnpm dev --filter=io

# Type check
pnpm --filter=io exec tsc --noEmit

# Lint
pnpm --filter=io lint

# Deploy
pnpm --filter=io build && wrangler pages deploy packages/io/.svelte-kit/cloudflare --project-name=create-something-io
```

---

## Related

- [The MCP-First Thesis](../../docs/MCP_FIRST_THESIS.md) — Strategic context
- [CLAUDE.md](../../CLAUDE.md) — Monorepo standards
- [packages/webflow-mcp](../webflow-mcp) — Example MCP implementation
