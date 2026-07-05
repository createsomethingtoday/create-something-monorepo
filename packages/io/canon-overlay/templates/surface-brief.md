# IO Research Artifact Surface Brief

Overlay: IO Research Artifact Overlay (overlay.io-research-artifact)

## Surface

- Name: Research artifact proof surface
- Modality: web | chat | app | voice | glasses
- Owner: research-team
- Source path: src/lib/config/fileBasedPapers.ts

## Workflow Need

Publish file-backed research artifacts so people and agents can inspect the claim, source artifact, visual proof, publication state, and next action without scraping rendered paper pages.

## Canon Reuse

- Registry items: token.canon-core, component.clear-proof-strip, template.canon-project-overlay-manifest, template.canon-extension-intake, policy.signal-decision-proof
- Imported components: proof surfaces and Canon navigation shells for research index, paper detail, and visual-summary states.
- Token aliases: use `theme.css` and `tokens.json` only for IO research emphasis names that resolve back to Canon tokens.

## Local Overlay

- Theme changes: research artifact hierarchy, paper-state emphasis, and visual-summary treatment.
- Copy rules: state the claim, source, proof, and next reading/action; avoid promoting one paper's language into Canon.
- Surface policy: full papers and diagrams belong on web/app; chat, voice, and glasses summarize artifact title, status, source, and next action.
- Templates: use this brief as the candidate packet for future research-artifact overlays.

## Evidence

- Receipt: manifest extension intake `overlay.io-research-artifact.surface-brief`.
- Validation command: `pnpm --filter @create-something/canon overlay:inventory -- --root . --json`.
- Second surface or client proof: the paper catalog, visual communication config, and papers index provide structured metadata, app-facing proof, and rendered web evidence.

## Extension Intake

Promote only the repeated research-artifact structure to Canon. Keep individual paper claims, publication decisions, visual assets, and research voice local until multiple properties need the same primitive.
