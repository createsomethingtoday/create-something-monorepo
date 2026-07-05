# Spritz Reading Overlay Surface Brief

Overlay: Spritz Reading Overlay (overlay.spritz-reading)

## Surface

- Name: Reading component proof surface
- Modality: web | chat | app | voice | glasses
- Owner: spritz-team
- Source path: src/routes/+page.svelte

## Workflow Need

Show the reading component, its API, proof state, and next integration action in a reusable component-demo surface.

## Canon Reuse

- Registry items: token.canon-core, component.clear-decision-panel, component.clear-proof-strip, template.canon-project-overlay-manifest, template.canon-extension-intake, policy.signal-decision-proof
- Imported components: use Clear decision/proof primitives and Canon tokens where the route needs status, evidence, receipt, or next action.
- Token aliases: use `theme.css` and `tokens.json` only for local names that resolve back to Canon tokens.

## Local Overlay

- Theme changes: project-local emphasis, route hierarchy, and workflow-specific state treatment.
- Copy rules: keep product, client, and operational language local; keep Canon primitive names stable.
- Surface policy: full controls and evidence stay on web/app; chat, voice, and glasses summarize state, owner, proof, and next action.
- Templates: use this brief as the candidate packet for future repeated-surface promotion.

## Evidence

- web proof: `src/routes/+page.svelte` (spritz-demo) - The demo route renders the interactive reading component and its visitor-facing proof.
- chat proof: `src/lib/index.ts` (spritz-component-api) - The library entry gives agents a stable source for exports and integration summaries.
- app proof: `src/lib/Spritz.svelte` (spritz-component) - The component implementation is the app-level control surface for reading state and interaction behavior.
- voice proof: `canon-overlay/copy-rules.md` (spritz-voice-policy) - The copy rules constrain spoken previews to reading state, speed, proof, and next action.
- glasses proof: `canon-overlay/surface-policy.md` (spritz-glasses-policy) - The surface policy keeps thin displays to current word/state, speed, and next action.

## Extension Intake

Promote only the repeated component-demo structure to Canon. Keep Spritz timing, ORP behavior, and package API local.
