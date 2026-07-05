# Agency Atlas Public Overlay Brief

Overlay: Agency Atlas Public Overlay (overlay.agency-atlas-public)

## Candidate

- Name: Public Atlas workflow proof surface
- Modalities: web, chat, app
- Owner: agency-team
- Primary source path: `src/routes/atlas/+page.svelte`

## Workflow Need

Public readers need to test CREATE SOMETHING's workflow mapping method before a call. The overlay must show the workflow object, owner, run/wait/stop/proof state, and booking handoff without exposing private systems or production credentials.

## Canon Reuse

- Registry items: `component.clear-page-section`, `component.clear-proof-strip`, `component.atlas-atlas-flow`, `component.atlas-atlas-story-canvas`, `adapter.atlas-graph-artifact`, `template.atlas-development-handoff`, `policy.signal-decision-proof`.
- Imported components: `ClearPageSection`, `PublicAtlasCanvas`, `PublicAtlasStoryCanvas`, `PublicAtlasFlow`.
- Token aliases: local overlay variables in `theme.css` and `tokens.json` point back to Canon color, radius, spacing, and focus tokens.

## Local Overlay

- Theme changes: agency-local aliases only; no new Canon token scale.
- Copy rules: name the workflow object, readiness, owner, proof, and next step in every public Atlas handoff.
- Surface policy: `/atlas`, `/services`, `/methodology`, `/stack`, and product proof routes carry the same public-proof boundary.
- Templates: use this brief for future public workflow proof surfaces before proposing Canon promotion.

## Evidence

- Route proof: `src/routes/atlas/+page.svelte` composes story, canvas, and booking handoff around Canon Atlas.
- Chat proof: `src/lib/components/PublicAtlasCanvas.svelte` sends bounded visitor prompts to `src/routes/api/atlas/public-agent/+server.ts`.
- App proof: `buildBookingUrl` carries readiness, lane, score, session, and message metadata to `/book`.
- Tests: `test/public-atlas-route.test.ts` and `test/public-atlas-starter-maps.test.ts`.

## Extension Intake

Route only the repeated workflow-proof pattern through Canon extension intake. Keep Agency route names, copy, public limits, and booking metadata project-local.
