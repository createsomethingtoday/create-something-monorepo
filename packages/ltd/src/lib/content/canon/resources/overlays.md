---
category: "Canon"
section: "Resources"
title: "Overlays"
description: "Canon overlay contract for extending Canon across web, chat, app, voice, and glasses without forking primitives."
lead: "Project and client surfaces extend Canon through named overlay artifacts. Canon keeps primitives, tokens, lifecycle routing, and promotion rules as shared source data."
publishedAt: "2026-07-05"
published: true
---

## Source of Truth

The overlay contract lives in `@create-something/canon/overlays` and is mirrored for agents through `canon://overlays`.

Use it when a project needs local theme aliases, copy, templates, surface policy, or registry metadata without changing Canon primitives.

## Required Artifacts

Every complete project overlay declares the same artifact set:

- `theme.css` for project-local CSS aliases that still point back to Canon tokens
- `tokens.json` for token aliases without creating a parallel token scale
- `templates/` for surface briefs and reusable workflow templates
- `copy-rules.md` for project terminology and voice
- `surface-policy.md` for modality-specific behavior across web, chat, app, voice, and glasses
- `registry.json` for local registry metadata and Canon dependencies

## Overlay Rules

1. Extend Canon through named overlay artifacts, not primitive forks.
2. Route primitive, template, adapter, token, or policy promotion through Canon extension intake.
3. Keep one-surface needs project-local until repeated-surface evidence supports candidate promotion.
4. Do not mark an overlay-driven primitive stable until Canon owns export path, docs, tests, compatibility, and registry routing.

## Modalities

| Modality | Overlay owns | Canon owns |
| --- | --- | --- |
| Web | local copy, surface-specific templates, integration receipts | tokens, layout primitives, accessibility contract, registry routing |
| Chat | conversation copy, tool receipts, handoff templates | decision/proof semantics, extension intake routing, artifact metadata |
| App | workflow policy, app-specific states, domain data bindings | components, state display patterns, token and motion boundaries |
| Voice | spoken terminology, confirmation phrases, escalation scripts | decision/proof structure, state hierarchy, artifact references |
| Glasses | context labels, local task sequence, device-specific display policy | compact proof/state pattern, minimum readable metadata, routing template |

## Project Template

Start with `overlay.project-template`.

- Package export: `@create-something/canon/overlays`
- Template pack: `@create-something/canon/overlays/project-template`
- MCP catalog: `canon://overlays`
- Template resource: `canon://overlays/overlay.project-template`

The template pack renders eight files: `theme.css`, `tokens.json`, `templates/README.md`, `templates/surface-brief.md`, `copy-rules.md`, `surface-policy.md`, `registry.json`, and `manifest.ts`.

## Related

- [Registry](/canon/resources/registry)
- [Get Started](/canon/resources/get-started)
- [Clear Components](/canon/components/clear)
