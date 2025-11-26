# Understanding: @create-something/io

> **The research platform—Being-as-Document that publishes rigorous inquiry into AI-native development.**

## Ontological Position

**Mode of Being**: `.io` — Being-as-Document

This is where theory lives. When we discover something worth knowing, `.io` documents it. Papers on Code Mode, hermeneutic analysis, Cloudflare patterns—all originate or culminate here. `.io` bridges canon (`.ltd`) and practice (`.space`), providing the intellectual framework that makes both meaningful.

## Depends On (Understanding-Critical)

| Dependency | Why It Matters |
|------------|----------------|
| `@create-something/components` | Shared UI for paper display |
| `@create-something/tufte` | Visualization for experiment metrics |
| `marked` | Markdown → HTML for paper content |
| `highlight.js` | Code syntax highlighting in papers |
| Cloudflare Pages + D1 | Edge deployment with database for experiments |

## Enables Understanding Of

| Consumer | What This Package Clarifies |
|----------|----------------------------|
| `@create-something/space` | Theoretical grounding for practical experiments |
| `@create-something/agency` | Research-backed patterns for client work |
| External readers | AI-native development methodology |
| The field | Novel contributions to agentic development |

## Internal Structure

```
src/routes/
├── +page.svelte              → Homepage: featured research
├── experiments/              → Published papers/experiments
│   ├── +page.svelte          → Paper listing
│   ├── [slug]/               → Individual paper pages
│   └── +layout.svelte        → Paper layout with navigation
├── methodology/              → Research methodology explanation
├── categories/               → Paper categorization
├── admin/                    → Content management
│   ├── experiments/          → CRUD for papers
│   ├── analytics/            → Tufte dashboard for metrics
│   ├── agent-drafts/         → AI-generated draft review
│   └── subscribers/          → Newsletter management
└── subscribe/                → Newsletter signup

src/lib/
├── components/               → IO-specific components
├── data/                     → Paper content and metadata
└── utils/                    → Markdown processing, etc.
```

## To Understand This Package, Read

1. **`src/routes/experiments/[slug]/+page.svelte`** — How papers are rendered
2. **`src/routes/methodology/+page.svelte`** — Research methodology
3. **`src/lib/data/papers/`** — Paper content structure (if exists)
4. **`src/routes/admin/experiments/+page.svelte`** — How papers are managed

## Key Concepts

| Concept | Definition | Where to Find |
|---------|------------|---------------|
| Experiment | A documented research inquiry with hypothesis and results | `/experiments/[slug]` |
| Category | Thematic grouping of related papers | `/categories` |
| Methodology | How we conduct and document research | `/methodology` |
| Agent Drafts | AI-generated paper drafts for review | `/admin/agent-drafts` |

## This Package Helps You Understand

- **Research methodology**: How CREATE Something conducts inquiry
- **Paper structure**: Hypothesis → Method → Results → Discussion
- **Theory ↔ practice**: How papers connect to `.space` experiments
- **Documentation as practice**: Writing as part of the hermeneutic cycle

## Common Tasks

| Task | Start Here |
|------|------------|
| Read a paper | `/experiments/[slug]` |
| Create a new paper | `/admin/experiments/new` |
| View analytics | `/admin/analytics` |
| Review AI drafts | `/admin/agent-drafts` |

## Paper Structure

Each paper follows this canonical structure:

```markdown
# [Title]

## Abstract
[150-250 words summarizing contribution]

## The Problem
[What we're investigating and why it matters]

## Methodology
[How we approached the inquiry]

## Results
[What we found, with evidence]

## Discussion
[What it means, limitations, future work]

## Conclusion
[Summary and implications]
```

## Hermeneutic Function

```
.ltd (Canon) ──────────────────────────────────────┐
    │                                               │
    ▼                                               │
.io (Research) ◄── "Is this theoretically sound?"  │
    │                                               │
    ├──► Grounds .space experiments                 │
    ├──► Validates .agency patterns                 │
    │                                               │
    └──► Discovers patterns → returns to .ltd ─────┘
```

---

*Last validated: 2024-11-25*
