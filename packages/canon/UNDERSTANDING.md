# Understanding: @create-something/canon

> **The shared design-system foundation that makes CREATE SOMETHING UI, templates, governance surfaces, and modality contracts reusable by humans and agents.**

## Ontological Position

**Mode of Being**: foundation

Canon is the package boundary where visual primitives, governance UI language, Atlas graph contracts, and design tokens become reusable artifacts. Property packages consume Canon and supply local policy, content, integrations, and deployment behavior.

## Depends On (Understanding-Critical)

| Dependency | Why It Matters |
|------------|----------------|
| `Svelte` | Component implementation and package output |
| `@xyflow/svelte` | Shared Atlas flow renderer primitives |
| `@create-something/tufte` | Editorial and documentation-adjacent visual language |
| `src/lib/styles/` | Canonical token and CSS source |
| `src/lib/registry/` | Machine-readable registry for agents, docs, templates, and MCP consumers |

## Enables Understanding Of

| Consumer | What This Package Clarifies |
|----------|----------------------------|
| `.ltd`, `.agency`, `.space`, `.io` | Which canonical components, palette scopes, Atlas contracts and Performance patterns should be reused instead of recreated |
| `@create-something/mcp` | Which Canon artifacts can be exposed to agents as resources and tools |
| project overlays | How local client patterns mature into Canon candidates or stable primitives |

## Internal Structure

```text
src/lib/
├── components/       -> shared Svelte UI primitives, Performance compositions and Clear compatibility exports
├── styles/           -> canonical light/dark CSS, tokens and portable generated artifacts
├── atlas/            -> renderer-independent Atlas graph/story contracts plus Svelte renderers
├── governance/       -> Signal, Decision, Proof product contract
├── registry/         -> machine-readable Canon manifest, search helpers, and modality contracts
├── domains/          -> property-specific primitives owned by Canon but scoped to a property
└── experiments/      -> complete experiments that can graduate reusable pieces into Canon
```

## To Understand This Package, Read

1. **`README.md`** — package philosophy, exports, Clear rules, Atlas boundary, governance contract
2. **`src/lib/registry/index.ts`** — agent-readable registry API
3. **`src/lib/registry/data.ts`** — current Canon foundation manifest
4. **`src/lib/components/clear/README.md`** — Clear component copy, evidence, and layout contract
5. **`src/lib/atlas/headless.ts`** — renderer-independent Atlas graph and story artifact contract
6. **`src/lib/governance/products.ts`** — Atlas, Signal, Decision, Proof product loop

## Agent Legibility Contract

| Field | Value |
|-------|-------|
| Entry point | `README.md`, `src/lib/index.ts`, `src/lib/registry/index.ts`, `src/lib/styles/tokens.css` |
| Boot command | `pnpm dev` |
| Smoke command | `pnpm check && pnpm test && pnpm overlay:check && pnpm overlay:consumer-check && pnpm codification:check` |
| Validation surfaces | package build output, `svelte-check`, registry tests, Atlas/governance tests, generated MCP registry snapshot, Canon overlay quality gate, cross-property overlay consumer compatibility, repo-wide UI codification audit |
| UI validation path | Canon consumers such as .ltd Canon docs and .agency Atlas/Clear surfaces |
| Escalation rule | Stop if a change moves source-of-truth state out of Canon, forks the Atlas graph contract, copies third-party brand identity, or promotes a project-local overlay without evidence. |

## Key Concepts

| Concept | Definition | Where to Find |
|---------|------------|---------------|
| Canon registry | Agent-readable manifest of components, tokens, templates, adapters, policies, modalities, and extension lifecycle | `src/lib/registry/` |
| Opt-in dark neutrals | Scoped `--color-operator-*` roles and a separate parity artifact; no global Performance retheme | `src/lib/styles/operator.md` |
| Performance / Clear compatibility | Canon-owned communication components preserve authority, evidence and receipt semantics | `src/lib/components/clear/` |
| Atlas artifact | Renderer-independent graph/story contract for workflow maps | `src/lib/atlas/headless.ts` |
| Signal Decision Proof | Governance loop attached to Atlas nodes and UI templates | `src/lib/governance/products.ts` |

## This Package Helps You Understand

- how CREATE SOMETHING prevents each project from inventing its own design foundation
- how UI components, proof objects, and governance products become shared artifacts
- how agents should choose, validate, and extend Canon across web, chat, app, voice, and glasses surfaces

## Common Tasks

| Task | Start Here |
|------|------------|
| add a registry item | `src/lib/registry/data.ts` and `src/lib/registry/registry.test.ts` |
| change exported components | `src/lib/components/index.ts` and `package.json` exports |
| update Clear guidance | `src/lib/components/clear/README.md` and `.ltd` Canon docs |
| validate package behavior | `pnpm check && pnpm test && pnpm overlay:check && pnpm overlay:consumer-check && pnpm codification:check` |

---

*Source and local Canon validation updated: 2026-11-13. Consumer deployment and independent final design acceptance are separate gates.*

## Current visual and implementation boundary

The website default is true black with neutral gray surfaces, clear white actions and locally loaded Geist. Explicit light work surfaces rebind derived state aliases; workspace remains dark and specialist operator roles remain namespaced. Existing public names and entrypoints carry the foundation. Solid controls, 44px targets, visible focus and readable error descriptions are standard; glass/shine is not the default material. Heroes and CTA sections use CSS background imagery with readable HTML; subsequent editorial sections may use inline images. Measured rules, useful chapter labels and square artwork frames balance the original tactile character and workshop whimsy.

Read `APPROACHABLE-SYSTEM.md` for the current direction and boundaries. `/next/components`, `/next/patterns` and `/next/compositions` exercise actual canonical components; `/next/character` and `/next/world` separate provisional character studies from approved scene originals. Migration and independent-review reports record tested scope and remaining findings. A package build, static concept or local browser fixture does not establish production acceptance.
