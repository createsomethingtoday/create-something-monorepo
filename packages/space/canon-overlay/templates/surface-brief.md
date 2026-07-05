# Space Workbench Surface Brief

Overlay: Space Workbench Overlay (overlay.space-workbench)

## Surface

- Name: Workbench tool proof surface
- Modality: web | chat | app | voice | glasses
- Owner: space-team
- Source path: src/routes/+page.svelte

## Workflow Need

Expose live tools, playgrounds, data dashboards, and operator receipts as reusable workbench surfaces where the tool, state, required input, proof, and next action remain visible.

## Canon Reuse

- Registry items: token.canon-core, component.clear-decision-panel, component.clear-proof-strip, template.canon-project-overlay-manifest, template.canon-extension-intake, policy.signal-decision-proof
- Imported components: Clear page, card, proof, decision, and CTA primitives for tool directories and operator dashboards.
- Token aliases: use `theme.css` and `tokens.json` only for Space workbench aliases that resolve back to Canon tokens.

## Local Overlay

- Theme changes: tool-state emphasis, input/proof pairing, and live workbench affordances.
- Copy rules: name the tool, state, required input, proof, and next action before any supporting detail.
- Surface policy: controls and datasets stay on web/app; chat, voice, and glasses report status, owner, next action, and receipt.
- Templates: use this brief as the candidate packet for future workbench/tool overlays.

## Evidence

- Receipt: manifest extension intake `overlay.space-workbench.surface-brief`.
- Validation command: `pnpm --filter @create-something/canon overlay:inventory -- --root . --json`.
- Second surface or client proof: the workbench home, routing data, and data route prove the same tool state can support web, chat, app, voice, and glasses surfaces.

## Extension Intake

Promote only the repeated workbench structure to Canon. Keep Space-specific experiments, datasets, playground routes, and tool copy local until another property proves the same primitive need.
