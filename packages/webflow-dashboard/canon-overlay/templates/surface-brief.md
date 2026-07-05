# Webflow Dashboard Marketplace Overlay Surface Brief

Overlay: Webflow Dashboard Marketplace Overlay (overlay.webflow-dashboard-marketplace)

## Surface

- Name: Webflow marketplace dashboard surface
- Modality: web | chat | app | voice | glasses
- Owner: webflow-dashboard-team
- Source path: src/routes/dashboard/+page.svelte

## Workflow Need

Expose marketplace health, validation state, assets, profile data, and operational receipts as one proof-backed dashboard surface.

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

- web proof: `src/routes/+page.svelte` (webflow-dashboard-home) - The home route introduces the dashboard and routes operators toward marketplace and validation work.
- chat proof: `src/lib/marketplace-insights.ts` (webflow-dashboard-insights) - The marketplace insights module gives agents a structured source for summarizing dashboard state.
- app proof: `src/routes/dashboard/+page.svelte` (webflow-dashboard-app) - The dashboard route is the main app surface for status, proof, and next operational action.
- voice proof: `src/routes/validation/+page.svelte` (webflow-dashboard-validation-voice) - The validation route supports concise spoken summaries of issue, status, proof, and next action.
- glasses proof: `canon-overlay/surface-policy.md` (webflow-dashboard-glasses) - The surface policy keeps thin displays to template/app status, owner, proof, and next action.

## Extension Intake

Promote only the repeated marketplace-dashboard structure to Canon. Keep Webflow API data, Airtable/R2/KV policy, and Marketplace operational language local.
