# Understanding: @createsomething/canon-tokens

> **The framework-agnostic token package that lets non-Svelte consumers inherit Canon color, spacing, typography, motion, and surface values.**

## Ontological Position

**Mode of Being**: foundation

This package is the small, portable token artifact for projects that do not consume the full Svelte Canon package. It keeps CSS custom properties, SCSS, and JSON token forms available to web, app, and agent tooling without pulling in component runtime dependencies.

## Depends On (Understanding-Critical)

| Dependency | Why It Matters |
|------------|----------------|
| `tokens.css` | Default CSS custom property source |
| `tokens.scss` | SCSS distribution for build systems that need Sass |
| `tokens.json` | Structured token payload for tooling, docs, and adapters |

## Enables Understanding Of

| Consumer | What This Package Clarifies |
|----------|----------------------------|
| non-Svelte projects | How to consume Canon values without the component package |
| design tooling | Which raw token values are portable outside Svelte |
| project overlays | Where token aliases can begin before promotion into full Canon |

## Internal Structure

```text
.
├── tokens.css   -> CSS custom properties
├── tokens.scss  -> SCSS token form
├── tokens.json  -> structured token values
└── README.md    -> installation, usage, and framework examples
```

## To Understand This Package, Read

1. **`README.md`** — installation and framework usage
2. **`tokens.css`** — CSS variable source
3. **`tokens.json`** — structured token values for tools

## Agent Legibility Contract

| Field | Value |
|-------|-------|
| Entry point | `README.md`, `tokens.css`, `tokens.json` |
| Boot command | `pnpm check` |
| Smoke command | `pnpm check` |
| Validation surfaces | token files exist and `tokens.json` parses |
| UI validation path | none |
| Escalation rule | Stop if token renames or value changes are requested without checking full Canon package consumers and public docs. |

## Key Concepts

| Concept | Definition | Where to Find |
|---------|------------|---------------|
| portable tokens | Canon values distributed without Svelte components | `tokens.css`, `tokens.json` |
| framework-agnostic use | CSS/SCSS/JSON consumption for React, Vue, Angular, plain CSS, and tooling | `README.md` |

## This Package Helps You Understand

- how Canon values can travel beyond Svelte
- where project token overlays should start
- what raw token artifacts non-component consumers can depend on

## Common Tasks

| Task | Start Here |
|------|------------|
| validate token files | `pnpm check` |
| consume CSS variables | `tokens.css` |
| inspect structured values | `tokens.json` |

---

*Last validated: 2026-07-03*
