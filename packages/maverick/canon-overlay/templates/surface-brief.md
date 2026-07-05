# Maverick Industry Overlay Surface Brief

Overlay: Maverick Industry Overlay (overlay.maverick-industry)

## Surface

- Name: Industry service proof surface
- Modality: web | chat | app | voice | glasses
- Owner: maverick-team
- Source path: src/routes/+page.svelte

## Workflow Need

Publish industry pages and service proof so visitors and operators can compare industry context, claims, evidence, and next contact action.

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

- web proof: `src/routes/+page.svelte` (maverick-home) - The home route presents the public industry story and routes visitors to sector-specific proof.
- chat proof: `src/routes/news/+page.svelte` (maverick-news) - The news route gives agents a bounded source for current context and public claims.
- app proof: `src/routes/oil-gas/+page.svelte` (maverick-oil-gas) - The oil and gas route acts as a focused service surface with offer, proof, and next action.
- voice proof: `src/routes/water-treatment/+page.svelte` (maverick-water-voice) - The water-treatment route supports concise spoken summaries of sector, problem, proof, and next action.
- glasses proof: `canon-overlay/surface-policy.md` (maverick-glasses-proof) - The overlay policy keeps thin displays to sector, status, proof, owner, and next action.

## Extension Intake

Promote only the repeated industry-service structure to Canon. Keep Maverick claims, sector language, product names, and contact policy local.
