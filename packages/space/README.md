# CREATE SOMETHING Space

**createsomething.space** — MCP Integration Experiments

Practice and experimentation with MCP patterns. Where ideas become working code.

---

## The Pivot

**Old focus**: Template tutorials, learning paths for frameworks
**New focus**: MCP integration experiments, pattern validation

Templates are commoditized. The value is in understanding *how* to integrate MCP servers with real systems—the messy parts that tutorials skip.

---

## Experiment Areas

### Integration Patterns

- Connecting MCP servers to existing APIs
- Auth flow integration (OAuth dance, token refresh)
- Data mapping between schemas
- Error recovery and retry logic

### Edge Deployment

- MCP servers on Cloudflare Workers
- Durable Objects for stateful MCP
- D1 for MCP server persistence

### Multi-Agent Coordination

- MCP servers communicating with each other
- Skill composition patterns
- Agent orchestration experiments

---

## What This Is Not

- **Not template tutorials** — Those are everywhere now
- **Not "getting started" content** — That's scaffolding tools' job
- **Not consumption guides** — `.io` covers usage patterns

`.space` is for experiments that might fail, patterns that need validation, and integration approaches that push boundaries.

---

## Hermeneutic Position

`.space` experiments before patterns become documented:

```
.ltd (Philosophy) → provides principles →
.io (Research) → documents validated patterns →
.space (Practice) → experiments with new approaches ← YOU ARE HERE
.agency (Services) → applies proven patterns →
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

## Experiments Index

See `/experiments` routes for current work:
- `/experiments/code-mode` — Code execution patterns
- `/experiments/motion-ontology` — Animation as philosophy
- `/experiments/nba-live` — Real-time data integration

---

## Related

- [The MCP-First Thesis](../../docs/MCP_FIRST_THESIS.md) — Strategic context
- [CLAUDE.md](../../CLAUDE.md) — Monorepo standards
- [packages/io](../io) — Where validated patterns get documented
