# Understanding: @create-something/agency

> **The service platform—Being-as-Service where validated patterns meet commercial reality.**

## Ontological Position

**Mode of Being**: `.agency` — Being-as-Service

This is where philosophy meets the market. Patterns validated in `.space` and documented in `.io` are applied to real client work here. `.agency` is the ultimate test: does this pattern survive commercial pressure? Clients don't care about theory—they care about results. What works here earns canonical status.

## Depends On (Understanding-Critical)

| Dependency | Why It Matters |
|------------|----------------|
| `@create-something/components` | Shared UI for professional presentation |
| `gsap` | Smooth animations for client-facing polish |
| `marked` + `highlight.js` | Case study content rendering |
| Cloudflare Pages | Edge deployment for global client access |
| Validated patterns | Only deploy what's proven in .io/.space |

## Enables Understanding Of

| Consumer | What This Package Clarifies |
|----------|----------------------------|
| `@create-something/ltd` | Which patterns earn canonical status |
| `@create-something/io` | What research has commercial validation |
| Potential clients | What CREATE Something delivers |
| The methodology | Ultimate validation of the hermeneutic cycle |

## Internal Structure

```
src/routes/
├── +page.svelte              → Homepage: agency introduction
├── services/                 → What we offer
│   └── +page.svelte          → Service descriptions
├── work/                     → Case studies
│   ├── +page.svelte          → Portfolio overview
│   └── [slug]/               → Individual case studies
├── experiments/              → Public experiments (shared with .io)
│   ├── +page.svelte          → Experiment listing
│   └── [slug]/               → Individual experiments
├── methodology/              → How we work
├── about/                    → About the agency
└── contact/                  → Get in touch

src/lib/
├── components/               → Agency-specific components
└── data/                     → Case studies, services
```

## To Understand This Package, Read

1. **`src/routes/services/+page.svelte`** — What the agency offers
2. **`src/routes/work/+page.svelte`** — How case studies are presented
3. **`src/routes/methodology/+page.svelte`** — How client work is conducted
4. **`src/routes/work/arc-for-gmail/+page.svelte`** — Example case study structure

## Key Concepts

| Concept | Definition | Where to Find |
|---------|------------|---------------|
| Service | A validated capability offered to clients | `/services` |
| Case Study | Documentation of successful client engagement | `/work/[slug]` |
| Methodology | The process applied to client work | `/methodology` |
| Validated Pattern | A pattern that survived commercial pressure | Referenced throughout |

## This Package Helps You Understand

- **Commercial validation**: Theory that survives market reality
- **Service delivery**: How patterns become deliverables
- **Client communication**: Professional presentation of technical work
- **The feedback loop**: How client work refines the canon

## Common Tasks

| Task | Start Here |
|------|------------|
| Understand services | `/services` |
| See example work | `/work/[slug]` |
| Learn the process | `/methodology` |
| Contact for work | `/contact` |

## Service Structure

Services follow a validated-pattern structure:

```
┌─────────────────────────────────────────────────┐
│  Service Name                                   │
├─────────────────────────────────────────────────┤
│  What It Is                                     │
│  [Clear description of the deliverable]         │
├─────────────────────────────────────────────────┤
│  How It Works                                   │
│  1. Discovery                                   │
│  2. Proposal                                    │
│  3. Execution                                   │
│  4. Handoff                                     │
├─────────────────────────────────────────────────┤
│  What You Get                                   │
│  [Concrete deliverables]                        │
├─────────────────────────────────────────────────┤
│  Validated By                                   │
│  [Link to .io research / .space practice]       │
└─────────────────────────────────────────────────┘
```

## Hermeneutic Function

```
.ltd (Canon) ──► .io (Research) ──► .space (Practice)
                                        │
                                        ▼
                                   .agency (Service)
                                        │
    ┌───────────────────────────────────┤
    │                                   │
    ▼                                   ▼
"Pattern survives               "Pattern fails
 commercial pressure"            commercial pressure"
    │                                   │
    ▼                                   ▼
Returns to .ltd                 Returns to .io
as canonical                    for refinement
```

## The Ultimate Test

A pattern is only canonical if it:
1. ✅ Embodies principles (`.ltd`)
2. ✅ Has theoretical grounding (`.io`)
3. ✅ Works hands-on (`.space`)
4. ✅ **Survives commercial pressure (`.agency`)**

`.agency` is where the hermeneutic circle closes.

---

*Last validated: 2024-11-25*
