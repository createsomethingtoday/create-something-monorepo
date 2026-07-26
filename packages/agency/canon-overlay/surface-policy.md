# Agency Map Public Overlay Surface Policy

This policy keeps @create-something/agency Map overlays portable across web, chat, and app without forking internal Canon Atlas primitives.

## Web

- Use Canon components and tokens first.
- Add project-local layout, copy, and theme aliases only when the consuming route needs them.
- Keep receipt, evidence, and owner metadata visible near decisions.
- Treat `/map`, `/services`, `/methodology`, `/stack`, `/products`, `/products/signal`, `/products/decision`, and `/products/proof` as public proof routes.
- The public route can demonstrate Map through Canon Atlas, but it must not require credentials, private workspace data, or production MCP calls.

## Chat

- Return compact summaries grounded in overlay artifacts.
- Name the registry item or template before suggesting a local primitive.
- Route primitive changes through Canon extension intake.
- Enforce `PUBLIC_ATLAS_LIMITS`; chat may mutate only the public prospect map.

## App

- Preserve touch targets, focus order, and text state labels.
- Use local templates for workflow-specific screens, not new base components.
- Booking handoff metadata must include readiness, score, lane, session id, and agent message count when available.

## Voice

- Speak status, owner, and next action.
- Do not read long policy text. Point to the receipt or durable record.

## Glasses

- Show only glanceable state, owner, and next action.
- Keep reasoning, review history, and policy bodies on larger surfaces.

## Promotion Boundary

Project overlays can become Canon candidates only after repeated-surface evidence exists. Until then, keep implementation, copy, and policy local to the named overlay.
