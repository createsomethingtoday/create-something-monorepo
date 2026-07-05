# Tend Database Overlay Surface Brief

Overlay: Tend Database Overlay (overlay.tend-database)

## Surface

- Name: Database source management surface
- Modality: web | chat | app | voice | glasses
- Owner: tend-team
- Source path: src/routes/+page.svelte

## Workflow Need

Expose sources, settings, agent automation, and database receipts so operators can understand what data exists, what automation can run, and what proof remains.

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

- web proof: `src/routes/+page.svelte` (tend-home) - The home route introduces the database service, automation model, and next action.
- chat proof: `src/lib/sdk/agent.ts` (tend-agent-sdk) - The SDK agent module gives agents a source for summarizing automation capabilities without relying on rendered copy.
- app proof: `src/routes/sources/+page.svelte` (tend-sources) - The sources route is the app surface for database inputs, state, and receipts.
- voice proof: `src/routes/settings/+page.svelte` (tend-settings-voice) - The settings route supports concise spoken summaries of configuration, state, owner, and next action.
- glasses proof: `canon-overlay/surface-policy.md` (tend-glasses-state) - The overlay policy keeps thin displays to source state, owner, proof, and next action.

## Extension Intake

Promote only the repeated database-source structure to Canon. Keep Tend vertical schemas, SDK behavior, and customer data policy local.
