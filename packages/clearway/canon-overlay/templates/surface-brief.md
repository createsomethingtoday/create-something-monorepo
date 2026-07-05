# Clearway Conversion Overlay Surface Brief

Overlay: Clearway Conversion Overlay (overlay.clearway-conversion)

## Surface

- Name: Conversion booking and embed surface
- Modality: web | chat | app | voice | glasses
- Owner: clearway-team
- Source path: src/routes/+page.svelte

## Workflow Need

Publish booking, embed, developer, and admin surfaces where a facility or operator can see the offer, act, confirm proof, and hand off the next step across web, chat, app, voice, and glasses.

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

- web proof: `src/routes/+page.svelte` (clearway-home) - The home route frames the conversion flow, proof, pricing, and next action for public visitors.
- chat proof: `src/routes/embed/+page.svelte` (clearway-embed) - The embed route gives agents and implementers a durable widget target for summarizing integration state without scraping marketing copy.
- app proof: `src/routes/admin/+page.svelte` (clearway-admin) - The admin route is the operator-facing app surface for booking state, evidence, and follow-up work.
- voice proof: `src/routes/book/+page.svelte` (clearway-booking-voice) - The booking route supplies the short spoken conversion handoff: intent, available action, proof, owner, and next step.
- glasses proof: `canon-overlay/surface-policy.md` (clearway-glance-state) - The overlay policy keeps thin displays to booking state, owner, proof, and next action while controls stay on web/app.

## Extension Intake

Promote only the repeated conversion-and-receipt structure to Canon. Keep Clearway scheduling, pricing, facility, and embed implementation details local.
