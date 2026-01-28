# Understanding: @create-something/ltd

> **The design canon—Being-as-Canon that defines what "good" means across all CREATE Something properties.**

## Ontological Position

**Mode of Being**: `.ltd` — Being-as-Canon

This is the philosophical foundation. When we ask "Is this good design?", `.ltd` provides the answer. It documents the masters (Rams, Mies, Eames), articulates principles, and defines standards. All other properties look to `.ltd` for guidance. Patterns validated in `.space` and `.agency` return here to be canonized.

## Depends On (Understanding-Critical)

| Dependency | Why It Matters |
|------------|----------------|
| `@create-something/canon` | Shared UI implementing canonical principles |
| Dieter Rams' 10 Principles | Philosophical foundation for all design decisions |
| Tailwind CSS | Utility classes for rapid canonical styling |
| Cloudflare Pages | Edge deployment for global accessibility |

## Enables Understanding Of

| Consumer | What This Package Clarifies |
|----------|----------------------------|
| `@create-something/io` | What standards research should meet |
| `@create-something/space` | What good practice looks like |
| `@create-something/agency` | Quality bar for client deliverables |
| All developers | Definition of "good design" in CREATE Something context |

## Internal Structure

```
src/routes/
├── +page.svelte        → Homepage: introduction to the canon
├── masters/            → Profiles of design masters (Rams, Mies, Eames)
│   └── [slug]/         → Individual master pages
├── principles/         → The 10 principles articulated
├── standards/          → Concrete implementation standards
├── patterns/           → Canonical design patterns
├── ethos/              → Philosophical foundation
└── voice/              → Brand voice and tone guidelines
```

## To Understand This Package, Read

1. **`src/routes/principles/+page.svelte`** — The 10 principles in full
2. **`src/routes/masters/+page.svelte`** — Who we learn from and why
3. **`src/routes/standards/+page.svelte`** — Concrete implementation rules
4. **`src/lib/data/masters.ts`** — Data structure for master profiles (if exists)

## Key Concepts

| Concept | Definition | Where to Find |
|---------|------------|---------------|
| Canon | The authoritative standard for design quality | `/principles` |
| Masters | Designers whose work defines excellence | `/masters` |
| Standards | Measurable implementation requirements | `/standards` |
| Patterns | Reusable solutions that embody principles | `/patterns` |

## This Package Helps You Understand

- **What "good" means**: Concrete definition of design quality
- **Why minimalism**: Philosophical grounding for "less, but better"
- **Design lineage**: How Rams → CREATE Something methodology
- **The hermeneutic role**: How canon informs and is informed by practice

## Common Tasks

| Task | Start Here |
|------|------------|
| Check if design is canonical | Read `/principles`, compare against work |
| Understand a principle | `/principles/+page.svelte` |
| Learn about a master | `/masters/[slug]/+page.svelte` |
| Find implementation standards | `/standards/+page.svelte` |

## The 10 Principles (Summary)

1. **Innovative** — Don't copy; interpret
2. **Useful** — Every element serves purpose
3. **Aesthetic** — Visual harmony through restraint
4. **Understandable** — Self-evident interfaces
5. **Unobtrusive** — Tools recede into background
6. **Honest** — No false promises
7. **Long-lasting** — Avoid trends
8. **Thorough** — Down to the last detail
9. **Environmentally friendly** — Performance is sustainability
10. **As little as possible** — Remove until it breaks

## Hermeneutic Function

```
.ltd (Canon)
    │
    ├──► Informs .io (what standards research should meet)
    ├──► Informs .space (what good practice looks like)
    ├──► Informs .agency (quality bar for deliverables)
    │
    └──◄ Receives validated patterns from all properties
```

---

*Last validated: 2024-11-25*
