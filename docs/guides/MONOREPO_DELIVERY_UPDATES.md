# Monorepo Delivery Updates

Client delivery updates should be generated from repo-owned manifests and evidence paths, not assembled by memory in a workspace tool.

## Rule

The monorepo owns the delivery truth.

Each client/project update should map to the CREATE SOMETHING tiers:

- **Database**: what durable data exists and where it lives
- **Automation**: what tools, APIs, MCP surfaces, or workflow routes can act
- **Judgment**: what agent behavior, policy boundary, review state, or escalation rule applies

## Current Generator

Abundance is the first project wired into this pattern.

```bash
pnpm delivery:abundance:check
pnpm delivery:abundance
```

The generated update currently writes:

- `docs/deliveries/abundance/2026-05-06-project-update.md`
- `docs/deliveries/abundance/assets/abundance-delivery-graph-2026-05-06.png`
- `docs/deliveries/abundance/assets/abundance-evidence-map-2026-05-06.png`
- `docs/deliveries/abundance/assets/abundance-delivery-graph-2026-05-06.svg`
- `docs/deliveries/abundance/assets/abundance-evidence-map-2026-05-06.svg`

When Image 2 generation is enabled, it also writes OpenAI `gpt-image-2` prompt files and uses Image 2 PNGs when they exist:

```bash
pnpm delivery:abundance:image2
```

The deterministic SVG/PNG files remain as fallback evidence. The Image 2 assets are client presentation images, not the durable source of truth.

Image 2 prompt files are written with the Canon image standard already included.
That standard uses Ona.com as the design and communication foundation, then
translates it into CREATE SOMETHING artifact language: system maps, MCP
boundaries, policy gates, receipts, validation proof, owners, and handoff state.
The public Canon rule lives in
`packages/ltd/src/lib/content/canon/guidelines/images.md`.

If OpenAI rejects `gpt-image-2` because the organization is not verified for the model, the command writes a small `.error.txt` beside the intended image output and keeps the deterministic fallback images in the Markdown. Do not silently downgrade to another image model.

## Project Manifest

Each project gets a manifest in `config/delivery/projects/`.

The manifest should include:

- project identity and client
- client-ready summary
- Database / Automation / Judgment components
- evidence paths that prove the update
- recent-change paths for the commit summary
- next review questions
- image specifications

Keep global registry files out of `recentChangePaths` unless the update is specifically about the registry. Global files are useful evidence, but they can make the recent-commit section noisy.

## Delivery Shape

The generated Markdown is the portable artifact. The generated images are evidence visuals.

Later delivery surfaces can render the same content:

- Cloudflare/Webflow Cloud client portal
- Webflow Code Components operator surface
- Linear handoff or delivery-evidence note
- PDF or deck export
- client email digest

Those surfaces should not become the source of truth.

## Agent Delivery Updates

Yes: an agent can generate delivery updates automatically on CREATE SOMETHING's behalf.

The boundary is that the agent may draft, stage, and document. It may not publish, send, or commit business promises without approval.

Agent policy lives in `config/delivery/agent.json`.

Generate the operator progress report:

```bash
pnpm delivery:progress
```

Check the delivery agent configuration:

```bash
pnpm delivery:progress:check
```

Check the delivery image prompt contract:

```bash
node --test scripts/test/delivery-update.test.mjs
```

Langfuse is intentionally not part of this Image 2 path. The required gate is
deterministic: repo manifest validation, the prompt-contract test, generated
prompt files, and the Canon guideline. Introduce Langfuse only if the image
program needs rubric scoring across batches of generated assets or prompt
variants.

The progress report summarizes:

- configured delivery projects
- latest generated updates
- missing evidence
- Image 2 status
- allowed agent actions
- human approval gates

This should become the base for scheduled or event-driven delivery reporting. A future Cloudflare cron, GitHub Action, or Linear-triggered agent can run the same command and stage the result.

## Delivery Pages

`pnpm delivery:site` renders all project manifests in
`config/delivery/projects/` into a static delivery surface under
`.cloudflare/delivery-site`.

The page is generated from:

- project/package manifest fields
- the DB / Automation / Judgment component list
- evidence paths
- generated delivery images
- recent Git history for configured `recentChangePaths`
- Linear issue IDs and URLs in `coordination.linearIssueIds` and `coordination.linearUrls`
- legacy Loom task IDs in `coordination.loomTaskIds` for migration traceability only

Deploy with:

```bash
pnpm delivery:site:deploy
```

This should remain a rendering layer. The monorepo remains the durable delivery
record; Cloudflare Pages is the shareable client surface. Standalone delivery
pages should be used when they reduce review and handoff friction, not for every
minor status update.

## Screenshot Policy

Use real screenshots when there is a deployed client-visible route.

Use repo-generated evidence images when:

- the UI is not deployed yet
- the update is architectural
- the goal is to show relationships between DB, MCP/API, and agent behavior
- private data should not be exposed in screenshots

For Abundance, the first delivery uses generated evidence images. Once the presentation or client portal route is live, add screenshot capture as a second evidence lane.

## Image 2 Policy

Use OpenAI `gpt-image-2` for generated client presentation images when the delivery needs a polished artifact rather than a literal screenshot.

For generated images:

- keep the repo manifest as the source of truth
- store prompts beside generated assets
- include model, snapshot when known, date, source manifest, image family, and review status
- use the Canon image standard and Ona.com communication foundation
- avoid real people, PHI, secrets, private client data, and fake screenshots
- keep deterministic SVG/PNG evidence available as fallback
- do not rely on generated text for exact file paths or operational facts
- do not downgrade to another model if `gpt-image-2` access is blocked
- do not require Langfuse unless there is a separate scored image-quality rubric
