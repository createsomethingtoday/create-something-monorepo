# Delivery Artifacts

This directory contains generated delivery artifacts. The source of truth lives in:

- `config/delivery/projects/*.json`
- `config/delivery/agent.json`
- repo evidence paths referenced by each project manifest

Generated files here are safe to regenerate.

## Commands

```bash
pnpm delivery:abundance
pnpm delivery:abundance:image2
pnpm delivery:progress
pnpm delivery:site
```

`pnpm delivery:site` renders the current delivery manifests into a static
Cloudflare Pages-ready surface under `.cloudflare/delivery-site`.

## Current Deliveries

- `abundance/2026-05-06-project-update.md` - The NP Group / NPG Abundance nurse staffing DB/MCP/agent update.
- `progress/2026-05-06-agent-progress-report.md` - Operator report for the delivery-update agent.
- `webflow-marketplace/README.md` - Webflow Template Marketplace PM impact report collection.

## Source of Truth

The source of truth is the project manifest in `config/delivery/projects/`
plus the evidence paths it references. Generated Markdown, images, and pages
are reviewable delivery artifacts, not the primary project record.

Each manifest can include a `coordination` block with Linear issue IDs/URLs and
legacy Loom task IDs retained for migration traceability. The generated delivery
page renders those references alongside recent Git commits for the manifest's
configured paths.

## Agent Boundary

Agents may draft and stage updates here automatically.

Agents may not:

- send client messages
- publish public case studies
- promote private client portals
- include secrets, PHI, or unapproved private data
- change scope, pricing, or commitments

Those actions require human approval.

## Deploy

```bash
pnpm delivery:site:check
pnpm delivery:site
pnpm delivery:site:deploy
```

The deploy target is the Cloudflare Pages project `create-something-deliveries`.
The page is intentionally static so future projects and packages can be added by
creating a manifest, generating the delivery artifacts, and rerunning the site
build.
