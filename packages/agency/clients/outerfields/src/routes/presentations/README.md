# OUTERFIELDS Presentations

Presentations are implemented as SvelteKit routes and rendered using the shared `Presentation` and `Slide` components.

## Where decks live

- `packages/agency/clients/outerfields/src/routes/presentations/` (index)
- `packages/agency/clients/outerfields/src/routes/presentations/<deck>/+page.svelte` (a deck)

Current decks:
- `investor`
- `user`

## How decks work

- Each deck is a Svelte page that composes:
  - `$lib/components/Presentation.svelte` (navigation, fullscreen, progress)
  - `$lib/components/Slide.svelte` (layout primitives)
  - Optional embedded components (e.g. analytics previews) when appropriate

## Client-managed workflow (PR + deploy)

Clients should NOT need access to this monorepo to edit decks.

Recommended approach:
- Maintain a presentations-only repo (decks as Svelte routes)
- Integrate into this path via subtree/submodule
- Client edits → PR → merge → deploy

Client setup details live in:
- `packages/agency/clients/outerfields/mcp-server/CLIENT_SETUP.md` (Claude Desktop + filesystem MCP configuration)

