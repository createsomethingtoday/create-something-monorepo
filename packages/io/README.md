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

### Research Artifact Template Guard

Papers and experiments share the `ResearchArtifactPage` shell for file-backed artifacts. New papers should use:

1. `src/lib/config/fileBasedPapers.ts`
2. `content/papers/{slug}.md`
3. the dynamic `/papers/[slug]` route

New experiments should use:

1. `src/lib/config/fileBasedExperiments.ts`
2. `content/experiments/{slug}.md` when the detail page is text-backed
3. the dynamic `/experiments/[slug]` route unless an interactive route needs explicit review

`pnpm check` runs `scripts/check-research-artifact-templates.mjs` and fails when a new static paper route is added outside the shared artifact path, when a new static experiment route bypasses the reviewed exception list, when dynamic routes stop rendering through `ResearchArtifactPage`, or when paper markdown omits required publication frontmatter.

### AI-Native Visual Communication

File-based papers and experiments use a repeatable visual communication layer instead of one-off illustrations:

1. `ascii_art` for terminal-native conceptual heroes
2. `visual_summary` for Canon-rendered state, layer, boundary, flow, or proof-card diagrams
3. `generated_brand_image` for prompt-governed `gpt-image-2` editorial image specs

Use [docs/ai-native-visual-communication.md](./docs/ai-native-visual-communication.md) when adding or reviewing visuals for a research artifact. New file-based catalog entries must add an ID-keyed `defineArtifactVisuals` entry.

`pnpm check` runs `scripts/check-visual-communication.mjs` and fails when a file-based paper or experiment lacks a visual definition, when a definition points at an unknown artifact, or when the shared prompt contract is missing the `gpt-image-2` model declaration and visual-summary basics.

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
