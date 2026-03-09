# CREATE SOMETHING Space

**createsomething.space** — The Workbench

Live tools for building, testing, and analyzing automation infrastructure. Every tool runs on Cloudflare Workers.

---

## The Thesis

`.io` is where you **read** (papers, patterns, documentation). `.space` is where you **do** (tools, playgrounds, live analysis). The distinction is functional, not academic.

---

## Tools

### Code Playground (`/playground`)

Execute JavaScript directly in the Cloudflare Workers runtime. Console output, async/await, ES2022.

- **API**: `/api/code/run` — Native Workers runtime execution
- **API**: `/api/code/execute` — Safe KV-scoped analysis

### Praxis (`/praxis`)

Learn integration patterns through graded code challenges. Subtractive Triad validation — DRY, Rams, Heidegger.

- **API**: `/api/praxis/run` — Pattern validation with graded feedback

### Motion Lab (`/motion`)

Analyze CSS animations from any URL. Puppeteer-based extraction with timing, easing, and property analysis.

- **API**: `/api/motion/analyze` — Full analysis with AI interpretation
- **API**: `/api/motion/extract` — Technical extraction only
- **Worker**: `workers/motion-extractor` — Cloudflare Puppeteer automation

### Data Studio (`/data`)

Live data dashboards with real-time updates, caching, and historical snapshots.

- **NBA Live** (`/data/nba`) — Game data, shot networks, pace analysis, clutch performance
- **Worker**: `workers/nba-proxy` — Rate-limited proxy with KV caching and D1 snapshots

### Concept Explorer (`/discover`)

Cross-property concept mapping and hermeneutic spiral visualization.

---

## What This Is Not

- **Not articles** — That's `.io`
- **Not tutorials** — That's `.io`
- **Not a newsletter** — That's `.io`
- **Not client services** — That's `.agency`

Every route is something you **do**, not something you **read**.

---

## Hermeneutic Position

```
.ltd (Philosophy) → provides principles →
.io (Research) → documents validated patterns →
.space (Workbench) → tools for building and testing ← YOU ARE HERE
.agency (Services) → delivers to clients →
.ltd (Philosophy) → refined by what works
```

---

## Development

```bash
# Start dev server
pnpm dev --filter=space

# Type check
pnpm --filter=space exec tsc --noEmit

# Deploy
pnpm --filter=space build && wrangler pages deploy packages/space/.svelte-kit/cloudflare --project-name=create-something-space
```

---

## Agent Legibility Contract

| Field | Value |
|-------|-------|
| Entry point | `README.md`, `src/routes`, `src/lib` |
| Boot command | `pnpm --filter=space dev` |
| Smoke command | `pnpm --filter=space check && pnpm --filter=space build` |
| Validation surfaces | `svelte-check` output, build output, local route rendering, browser screenshots, Worker-backed API responses for `/api/code/run`, `/api/praxis/run`, `/api/motion/analyze`, and `/api/motion/extract` |
| UI validation path | Start with `/playground`, then validate the narrow route affected by the change: `/praxis`, `/motion`, `/data`, or `/discover` |
| Escalation rule | Stop if the visual issue depends on deployed Cloudflare Workers, Puppeteer extraction, or remote data feeds that cannot be reproduced from the local route and API surface. |

---

## Related

- [The MCP-First Thesis](../../docs/MCP_FIRST_THESIS.md) — Strategic context
- [CLAUDE.md](../../CLAUDE.md) — Monorepo standards
- [packages/io](../io) — Where papers and documentation live
