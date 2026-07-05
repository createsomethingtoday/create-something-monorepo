# Notion Agent Workspace Overlay Surface Brief

Overlay: Notion Agent Workspace Overlay (overlay.notion-agent-workspace)

## Surface

- Name: Notion agent workspace surface
- Modality: web | chat | app | voice | glasses
- Owner: notion-agent-team
- Source path: src/routes/dashboard/+page.svelte

## Workflow Need

Expose the agent offer, authentication boundary, dashboard state, execution receipts, and job handoffs as one governed workspace surface.

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

- web proof: `src/routes/+page.svelte` (notion-agent-home) - The home route explains the Notion agent offer and directs operators toward the authenticated workspace flow.
- chat proof: `src/routes/api/execute/+server.ts` (notion-agent-execute-api) - The execution API gives chat/agent handoffs a durable source for action, result, and receipt state.
- app proof: `src/routes/dashboard/+page.svelte` (notion-agent-dashboard) - The dashboard route is the operator-facing app surface for agent state and workspace receipts.
- voice proof: `canon-overlay/copy-rules.md` (notion-agent-voice-policy) - The copy rules constrain spoken summaries to workspace, action, proof, owner, and next step.
- glasses proof: `canon-overlay/surface-policy.md` (notion-agent-glasses-policy) - The surface policy keeps glasses output to workspace state, owner, proof, and next action.

## Extension Intake

Promote only the repeated workspace-agent structure to Canon. Keep Notion OAuth, tool execution, database schemas, and workspace-specific copy local.
