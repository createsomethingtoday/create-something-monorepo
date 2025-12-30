# CREATE SOMETHING Agency

**createsomething.agency** — Being-as-Service

The commercial practice of CREATE SOMETHING. Where philosophy becomes delivery.

---

## Hermeneutic Position

`.agency` occupies a specific position in the [Hermeneutic Circle](/canon/concepts/hermeneutic-circle):

```
.ltd (Philosophy)  → defines principles
        ↓
.io (Research)     → validates patterns
        ↓
.space (Practice)  → experiments with approaches
        ↓
.agency (Services) → applies to client work
        ↓
.ltd (Philosophy)  → client outcomes inform evolution
```

**Key insight**: .agency is where Canon meets reality. Client constraints test philosophical principles. What survives contact with budgets, timelines, and stakeholder complexity becomes battle-tested methodology.

---

## The Subtractive Triad in Practice

Every .agency engagement applies the [Subtractive Triad](/canon):

| Level | Client Question | Our Response |
|-------|-----------------|--------------|
| **DRY** (Implementation) | "Have you built this before?" | Pattern recognition, reference architectures |
| **Rams** (Artifact) | "Is this feature necessary?" | Scope discipline, ruthless prioritization |
| **Heidegger** (System) | "Does this serve the business?" | Outcome alignment, strategic coherence |

**Why this matters**: Clients often ask for features they don't need. The Triad provides a framework for having that conversation with rigor rather than opinion.

---

## Core Principles

### Zuhandenheit (Ready-to-hand)

Our deliverables should recede into use. The client shouldn't notice the infrastructure—only the capability it enables. When we've done our job well, the system disappears.

**Test**: "Can the team use this without thinking about how it works?"

### Complementarity

We augment, never replace. Human judgment + machine execution. Client expertise + our methodology.

**Test**: "Is the client more capable after we leave?"

### Gelassenheit (Releasement)

Neither rejection nor submission to technology. We use powerful tools (AI, automation) without being captured by them. We know when to automate and when to preserve human judgment.

**Test**: "Are we solving the problem or just applying technology?"

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
│   ├── sales/               # Discovery scripts, templates
│   ├── social/              # LinkedIn content
│   └── templates/           # Reusable deliverables
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

- [Canon Design System](https://createsomething.ltd/canon) — Philosophical foundation
- [GTM Sprint Plan](./content/gtm-sprint-2-plan.md) — Current go-to-market execution
- [ICP Document](./content/templates/sales/icp.md) — Ideal client profile
- [Pricing Framework](./content/templates/sales/pricing-framework.md) — Value-based pricing
