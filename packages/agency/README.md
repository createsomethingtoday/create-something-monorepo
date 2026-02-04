# CREATE SOMETHING Agency

**createsomething.agency** — Custom MCP Development

We build the connectivity layer between your tools and AI.

---

## The Creation Moat

**MCP consumption is commoditized. MCP creation is not.**

Neither Claude Desktop, Claude Cowork, nor Codex can create MCP servers from within the app. Templates and scaffolding tools have lowered the barrier to *starting*, but deep integration still requires:

- Domain expertise (understanding your business)
- MCP protocol knowledge (auth, transports, error handling)
- Integration experience (data mapping, security boundaries)
- Intelligence Layer design (Skills and Agents on top)

This is what `.agency` delivers.

---

## Service Offerings

| Service | Description | Deliverable |
|---------|-------------|-------------|
| **MCP Audit** | What MCPs would unlock value for your business? | Strategic report + prioritized roadmap |
| **Custom MCP Development** | Build the server, package as `.mcpb` | Production-ready MCP server |
| **Intelligence Layer** | Skills and Agents on top of your MCPs | Working automations |
| **Ongoing Support** | Auth updates, API changes, new capabilities | Retainer relationship |

---

## The Two-Layer Model

```
┌─────────────────────────────────────────────────────────────┐
│                   INTELLIGENCE LAYER                        │
│        Skills, Agents, Automations (the margin)            │
│   "Draft this RFI" · "Summarize logs" · "Flag compliance"  │
├─────────────────────────────────────────────────────────────┤
│                    AUTOMATION LAYER                         │
│           Custom MCP Servers (the entry point)             │
│           Connect your tools to AI with trust              │
└─────────────────────────────────────────────────────────────┘
```

**Entry point**: MCP server that connects your existing tools
**Upsell**: Intelligence Layer that produces outcomes

---

## Positioning

**Before**: "We build websites/apps with modern templates"
**After**: "We build the connectivity layer between your tools and AI"

Templates are table stakes. The moat is creation expertise applied to specific domains.

---

## The Subtractive Triad in Client Work

| Level | Client Question | Our Response |
|-------|-----------------|--------------|
| **DRY** | "Have you built this integration before?" | Pattern recognition, reference architectures |
| **Rams** | "Do we need all these features?" | Scope discipline, ruthless prioritization |
| **Heidegger** | "Does this MCP serve the business?" | Outcome alignment, strategic coherence |

**Why this matters**: Clients often ask for integrations they don't need. The Triad provides a framework for having that conversation with rigor.

---

## Core Principles

### Zuhandenheit (Ready-to-hand)

The MCP server should recede into use. Clients shouldn't notice the infrastructure—only the capability it enables.

**Test**: "Can they use this without thinking about how it works?"

### Complementarity

We augment, never replace. Human judgment + machine execution. Client expertise + our MCP knowledge.

**Test**: "Is the client more capable after the MCP is deployed?"

### Gelassenheit (Releasement)

We know when to automate and when to preserve human judgment. Not every workflow should become an AI agent.

**Test**: "Are we solving the problem or just applying technology?"

---

## Hermeneutic Position

`.agency` applies proven patterns to client work:

```
.ltd (Philosophy) → provides principles →
.io (Research) → documents validated patterns →
.space (Practice) → experiments with approaches →
.agency (Services) → delivers to clients ← YOU ARE HERE
.ltd (Philosophy) → client outcomes inform evolution
```

**Key insight**: Client constraints test MCP patterns. What survives contact with budgets, timelines, and stakeholder complexity becomes proven methodology.

---

## Package Structure

```
packages/agency/
├── src/
│   ├── routes/              # SvelteKit routes
│   │   ├── api/             # API endpoints
│   │   └── admin/           # Internal tools
│   └── lib/                 # Shared utilities
├── content/                 # Operational content
│   ├── sales/               # Discovery scripts, proposals
│   └── case-studies/        # MCP project documentation
├── docs/                    # Client documentation
└── workers/                 # Cloudflare Workers
```

---

## Development

```bash
# Start dev server
pnpm dev --filter=agency

# Type check
pnpm --filter=agency exec tsc --noEmit

# Deploy
pnpm --filter=agency build && wrangler pages deploy packages/agency/.svelte-kit/cloudflare --project-name=create-something-agency
```

---

## Related

- [The MCP-First Thesis](../../docs/MCP_FIRST_THESIS.md) — Strategic context
- [CLAUDE.md](../../CLAUDE.md) — Monorepo standards and philosophy
- [WORKWAY](https://workway.co) — The vertical play (construction via Procore)
