# Guard Performance Lab Overlay Surface Policy

This policy keeps @create-something/guard-performance-lab overlays portable across web, chat, app, voice, and glasses without forking Canon.

## Web

- Use Canon components and tokens first.
- Add project-local layout, copy, and theme aliases only when the consuming route needs them.
- Keep receipt, evidence, and owner metadata visible near decisions.
- Keep the player workspace private-first. Do not expose another player's profile, evidence, engagements, or receipts.
- Load Satoshi and IBM Plex Mono from local app assets only. Runtime views must not depend on third-party font or analytics requests.
- Preserve keyboard operation, visible focus, reduced-motion behavior, responsive layouts, and printable receipts.

## Chat

- Return compact summaries grounded in overlay artifacts.
- Name the registry item or template before suggesting a local primitive.
- Route primitive changes through Canon extension intake.
- Let the program guide each interaction. Request coach context only when the observation can change the next action.
- For player-scoped Codex or MCP access, resolve the assigned player server-side; never accept another player's identity from the player.
- Player-safe tools may read and update the assigned workspace but may not list players, reset the lab, or cross scope.
- Treat source-linked artifacts as evidence, coach notes as context, player words as reflection, and generated synthesis as inference.

## App

- Preserve touch targets, focus order, and text state labels.
- Use local templates for workflow-specific screens, not new base components.
- Present the controlled sequence as `prepare`, `connect`, `baseline`, `advantage`, `help`, `misdirection`, `live`, and `receipt`.
- Stop or reduce coached volume when pain, fatigue, distress, or declining decision quality appears.
- Require explicit source links for external stats, rules, and highlights before they support a decision.

## API And MCP

- Use the typed LabService as the single automation boundary for browser API routes and MCP tools.
- Enforce operator and player scopes at the server boundary; UI hiding is not authorization.
- Keep mutations revisioned and atomic. Fail closed on stale locks, corrupted data, invalid player scope, or unsupported commands.
- Tool responses expose durable records and concise explanations, never hidden reasoning or private policy text.

## Voice

- Speak status, owner, and next action.
- Do not read long policy text. Point to the receipt or durable record.

## Glasses

- Show only glanceable state, owner, and next action.
- Keep reasoning, review history, and policy bodies on larger surfaces.

## Promotion Boundary

Project overlays can become Canon candidates only after repeated-surface evidence exists. Until then, keep implementation, copy, and policy local to the named overlay. Source promotion does not authorize public hosting: deployment requires a private authentication model, named operator, data-retention decision, rollback path, and verified player-scope isolation.
