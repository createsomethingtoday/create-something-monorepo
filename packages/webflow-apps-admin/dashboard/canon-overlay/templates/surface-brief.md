# Webflow Apps Admin Audit Overlay Surface Brief

Overlay: Webflow Apps Admin Audit Overlay (overlay.webflow-apps-admin-audit)

## Surface

- Name: Webflow app audit dashboard surface
- Modality: web | chat | app | voice | glasses
- Owner: webflow-apps-team
- Source path: src/routes/+page.svelte

## Workflow Need

Render app-review audit status, evidence, owner, and next review action in one operator dashboard surface.

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

- web proof: `src/routes/+page.svelte` (webflow-apps-admin-dashboard) - The dashboard route renders app-review audit status and evidence for operators.
- chat proof: `canon-overlay/copy-rules.md` (webflow-apps-admin-summary) - The copy rules constrain chat summaries to app, status, evidence, owner, and next action.
- app proof: `src/routes/+page.svelte` (webflow-apps-admin-review) - The same dashboard route acts as the app surface for repeated review and comparison work.
- voice proof: `canon-overlay/copy-rules.md` (webflow-apps-admin-voice) - The copy rules constrain spoken review summaries to app, status, blocker, proof, and next action.
- glasses proof: `canon-overlay/surface-policy.md` (webflow-apps-admin-glasses) - The surface policy keeps thin displays to app status, owner, proof, and next action.

## Extension Intake

Promote only the repeated audit-dashboard structure to Canon. Keep Webflow app review policy, reviewer exceptions, and operational data local.
