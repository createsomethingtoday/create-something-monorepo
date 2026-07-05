# Concierge Chat Staffing Overlay Surface Brief

Overlay: Concierge Chat Staffing Overlay (overlay.concierge-chat-staffing)

## Surface

- Name: Staffing concierge chat surface
- Modality: web | chat | app | voice | glasses
- Owner: concierge-team
- Source path: src/routes/chat/+page.svelte

## Workflow Need

Keep staffing conversations, intake claims, job matches, profile state, and operator settings legible as proof-backed surfaces across chat and app contexts.

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

- web proof: `src/routes/+page.svelte` (concierge-home) - The home route introduces the staffing concierge surface and routes visitors to jobs, nurses, facilities, or chat.
- chat proof: `src/routes/chat/+page.svelte` (concierge-chat) - The chat route is the primary conversation surface for progressive profiling, handoff cards, and proof-backed next steps.
- app proof: `src/routes/settings/+page.svelte` (concierge-settings) - The settings route gives operators a local app surface for reviewing configuration and handoff state.
- voice proof: `src/routes/jobs/+page.svelte` (concierge-jobs-voice) - The jobs route supports short spoken summaries of role, location, fit, proof, and next action.
- glasses proof: `canon-overlay/surface-policy.md` (concierge-glasses-handoff) - The overlay policy keeps thin displays to candidate/facility state, owner, proof, and next action.

## Extension Intake

Promote only the reusable concierge handoff structure to Canon. Keep Abundance/staffing language, job data, nurse/facility positioning, and Dify routing local.
