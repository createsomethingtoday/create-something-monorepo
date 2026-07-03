# Agents: @create-something/canon

## Agent Entry

- Start with `README.md` for the Canon package contract.
- Read `UNDERSTANDING.md` for the package model and boundary split.
- Primary entrypoints: `src/lib/index.ts`, `src/lib/registry/index.ts`, `src/lib/styles/tokens.css`.

## Validation

- Boot: `pnpm dev`
- Smoke: `pnpm check && pnpm test`
- Escalate before changing Canon semantics, registry lifecycle, modality contracts, or exported component behavior without a matching docs and test update.
