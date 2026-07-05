# LMS Workflow Learning Overlay Brief

Overlay: LMS Workflow Learning Overlay (overlay.lms-workflow-learning)

## Candidate

- Name: Workflow learning proof surface
- Modalities: web, app, chat
- Owner: learning-team
- Primary source path: `src/lib/content/lessons/make-your-workflow-visible/what-images-prove.md`

## Workflow Need

Operators need a repeatable lesson surface for turning workflows into proof images. The overlay must teach the object, state, proof, and owner model, link lessons into a path, record progress, and let learning events flow back into durable app data.

## Canon Reuse

- Registry items: `token.canon-core`, `component.clear-proof-strip`, `template.canon-project-overlay-manifest`, `template.canon-project-overlay-template-pack`, `template.canon-extension-intake`, `policy.signal-decision-proof`.
- Imported components: course and progress routes use Canon token names and clear proof language through local Svelte surfaces.
- Token aliases: local overlay variables in `theme.css` and `tokens.json` point back to Canon color, radius, spacing, and focus tokens.

## Local Overlay

- Theme changes: learning-local aliases only; no new Canon token scale.
- Copy rules: every lesson must connect a visual artifact to an operational question and a receipt.
- Surface policy: lesson content, path pages, progress pages, and event APIs are separate surfaces that share one learning overlay.
- Templates: use this brief before proposing a general Canon learning-surface template.

## Evidence

- Lesson proof: `src/lib/content/lessons/make-your-workflow-visible/what-images-prove.md` teaches object, state, proof, and owner.
- Path proof: `src/lib/content/paths.ts` and `src/routes/paths/[id]/+page.svelte` expose the lesson sequence.
- App proof: `src/routes/progress/+page.svelte` and `src/routes/api/progress/+server.ts` render and return completion receipts.
- Handoff proof: `src/routes/api/events/+server.ts` records property, event type, and metadata from CREATE SOMETHING properties.

## Extension Intake

Route only repeated learning-surface structure through Canon extension intake. Keep LMS course copy, route IDs, progress schema, and event taxonomy project-local.
