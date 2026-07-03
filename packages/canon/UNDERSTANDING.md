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
| `.ltd`, `.agency`, `.space`, `.io` | Which components, tokens, Atlas contracts, and Clear primitives should be reused instead of recreated |
| `@create-something/mcp` | Which Canon artifacts can be exposed to agents as resources and tools |
| project overlays | How local client patterns mature into Canon candidates or stable primitives |

## Internal Structure

```text
src/lib/
├── components/       -> shared Svelte UI primitives, including Clear communication surfaces
├── styles/           -> Canon CSS, token, glass, performance, and generated token artifacts
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
| Smoke command | `pnpm check && pnpm test` |
| Validation surfaces | package build output, `svelte-check`, registry tests, Atlas/governance tests, generated MCP registry snapshot |
| UI validation path | Canon consumers such as .ltd Canon docs and .agency Atlas/Clear surfaces |
| Escalation rule | Stop if a change moves source-of-truth state out of Canon, forks the Atlas graph contract, copies third-party brand identity, or promotes a project-local overlay without evidence. |

## Key Concepts

| Concept | Definition | Where to Find |
|---------|------------|---------------|
| Canon registry | Agent-readable manifest of components, tokens, templates, adapters, policies, modalities, and extension lifecycle | `src/lib/registry/` |
| Clear primitives | Canon-owned communication components for governed, proof-bearing work | `src/lib/components/clear/` |
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
| validate package behavior | `pnpm check && pnpm test` |

---

*Last validated: 2026-07-03*
