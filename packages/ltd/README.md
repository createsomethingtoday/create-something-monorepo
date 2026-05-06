# CREATE SOMETHING Ltd

**createsomething.ltd** — The Philosophy of Automation Infrastructure

The philosophical foundation for the CREATE SOMETHING ecosystem. Where we articulate *why* creation matters more than consumption.

---

## The Core Thesis

**MCP consumption is commoditized. MCP creation is not.**

Neither Claude Desktop, Claude Cowork, nor Codex can *create* MCP servers from within the app. Users can consume, install, and use—but building the connectivity layer between tools and AI still requires expertise.

This is the moat. This is where CREATE SOMETHING operates.

---

## The Two-Layer Model

```
┌─────────────────────────────────────────────────────────────┐
│                   INTELLIGENCE LAYER                        │
│        Skills, Agents, Automations (the upsell)            │
│   "Draft this RFI" · "Summarize daily logs" · "Flag risk"  │
├─────────────────────────────────────────────────────────────┤
│                    AUTOMATION LAYER                         │
│              MCP Servers (the entry point)                  │
│        Connect your tools to AI with trust boundaries       │
└─────────────────────────────────────────────────────────────┘
```

**The entry point to automation is connectivity, not intelligence.**

---

## The Subtractive Triad

Every creation exists simultaneously at three levels:

| Level | Discipline | Question | Action |
|-------|------------|----------|--------|
| **Implementation** | DRY | "Have I built this before?" | Unify |
| **Artifact** | Rams | "Does this earn its existence?" | Remove |
| **System** | Heidegger | "Does this serve the whole?" | Reconnect |

**Meta-principle**: Creation is the discipline of removing what obscures.

---

## The Automotive Framework

MCP is the **chassis**—the structural frame that holds everything together.

| Vehicle Part | Technology | Function |
|--------------|------------|----------|
| **Chassis** | MCP Servers | The frame that connects everything |
| **Engine** | Workers | Where execution happens |
| **Transmission** | Durable Objects | State coordination |
| **Fuel Tank** | D1 | Data persistence |
| **Turbocharger** | Workers AI / LLMs | Intelligence boost |

**The Chassis Principle**: Without the chassis, you have a pile of parts. Without MCP, you have disconnected tools.

---

## Hermeneutic Position

`.ltd` defines the philosophical foundation that all properties build upon:

```
.ltd (Philosophy) → articulates "creation > consumption" →
.io (Research) → validates with real MCP server development →
.space (Practice) → experiments with MCP patterns →
.agency (Services) → delivers custom MCPs to clients →
.ltd (Philosophy) → refined by what creation work reveals
```

## Agent Legibility Contract

| Field | Value |
|-------|-------|
| Entry point | `src/routes/+page.svelte`, `src/routes/principles/+page.svelte`, `src/routes/standards/+page.svelte` |
| Boot command | `pnpm dev` |
| Smoke command | `pnpm check` |
| Validation surfaces | Svelte check output, route preview, Cloudflare Pages build output |
| UI validation path | `/`, `/principles`, `/standards` |
| Escalation rule | stop if a change alters canon, voice, or standards semantics without an explicit judgment artifact or operator decision |

---

## Development

```bash
# Start dev server
pnpm dev --filter=ltd

# Type check
pnpm --filter=ltd exec tsc --noEmit

# Deploy
pnpm --filter=ltd build && wrangler pages deploy packages/ltd/.svelte-kit/cloudflare --project-name=createsomething-ltd
```

---

## Related

- [The MCP-First Thesis](../../docs/MCP_FIRST_THESIS.md) — Full strategic context
- [CLAUDE.md](../../CLAUDE.md) — Monorepo standards and philosophy
- [Canon Design System](https://createsomething.ltd/canon) — Visual philosophy
