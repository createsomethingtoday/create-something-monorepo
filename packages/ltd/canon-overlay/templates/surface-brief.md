# LTD Canon Philosophy Surface Brief

Overlay: LTD Canon Philosophy Overlay (overlay.ltd-canon-philosophy)

## Surface

- Name: Canon philosophy documentation surface
- Modality: web | chat | app | voice | glasses
- Owner: ltd-team
- Source path: src/routes/canon/+page.svelte

## Workflow Need

Publish the philosophy, standards, voice, and live Canon documentation needed to extend Canon across CREATE SOMETHING properties without turning property-specific language into Canon primitives.

## Canon Reuse

- Registry items: token.canon-core, component.clear-decision-panel, component.clear-proof-strip, template.canon-project-overlay-manifest, template.canon-extension-intake, policy.signal-decision-proof
- Imported components: Clear decision and proof primitives where the route needs an explicit decision, evidence, or handoff state.
- Token aliases: use `theme.css` and `tokens.json` only to name LTD-local aliases that resolve back to Canon tokens.

## Local Overlay

- Theme changes: Canon documentation emphasis, route hierarchy, and philosophy/standards treatment.
- Copy rules: keep philosophy language in LTD docs; keep Canon primitive names stable.
- Surface policy: full reasoning belongs on web/app routes; chat, voice, and glasses summarize route, state, owner, and next action.
- Templates: use this brief as the candidate packet for future Canon documentation overlays.

## Evidence

- Receipt: manifest extension intake `overlay.ltd-canon-philosophy.surface-brief`.
- Validation command: `pnpm --filter @create-something/canon overlay:inventory -- --root . --json`.
- Second surface or client proof: standards and voice routes prove the same Canon guidance can be rendered as checklist, spoken guidance, and thin-display navigation.

## Extension Intake

Promote only the repeated documentation structure to Canon. Keep LTD philosophy, taste language, route copy, and property positioning local unless another property proves the same primitive need.
