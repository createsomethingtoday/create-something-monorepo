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
- Template file pack: `canon://overlays/overlay.project-template/files`
- Template file resource: `canon://overlays/overlay.project-template/files/<encoded-path>`
- Template file tool: `canon_overlay_template_file_get`

The template pack renders eight files: `theme.css`, `tokens.json`, `templates/README.md`, `templates/surface-brief.md`, `copy-rules.md`, `surface-policy.md`, `registry.json`, and `manifest.ts`.

Agents can inspect the file pack before instantiation through MCP resources, search, or `canon_overlay_template_file_get`. The collection includes the rendered file bodies, MIME types, output paths, and per-file URIs. Use these resources and the getter for review and copy planning only; use `canon_overlay_instantiate_preview` or the local instantiate CLI when a project-specific id, owner, source package, output root, and modality set are needed.

Use `canon_overlay_template_file_get` without a `relativePath` to render the full pack as Markdown, or pass a file such as `surface-policy.md` or `templates/surface-brief.md` to render one file. The tool does not write template files, instantiate overlays, create Linear work, mutate Canon, mutate project overlays, or approve candidate promotion.

## Intake Inventory

Multiple projects can feed Canon without creating a second design-system fork by checking their overlay manifests into the project that owns the local surface, then running the Canon intake inventory.

```bash
pnpm --filter @create-something/canon overlay:inventory -- --root .
```

The inventory scans `apps/` and `packages/` for `CANON_PROJECT_OVERLAY_MANIFEST` exports, skips the Canon template itself, reviews every discovered manifest with `reviewCanonProjectOverlay(...)`, and reports:

- complete overlays that are ready for handoff
- overlays missing required artifacts
- overlays with declared artifact files that no longer exist
- overlays with source evidence paths that no longer exist
- overlays with registry dependencies that do not resolve to Canon registry items
- extension intakes that should stay project-local
- extension intakes with repeated-surface evidence for Canon candidate review

Agents can read the same inventory through `canon://overlays/intake` and the compact index at `canon://overlays/intake/list`.

Readiness now means more than a complete manifest shape. A project overlay is ready only when its required artifact set exists on disk, its evidence paths still resolve in the owning package or app, and every declared Canon dependency matches a registry item.

## Candidate Queue

Ready overlays can produce candidate intakes when they have repeated-surface evidence. Canon exposes those candidates as a read-only queue:

- Full queue: `canon://overlays/candidates`
- Compact list: `canon://overlays/candidates/list`
- Candidate detail: `canon://overlays/candidates/<intake-id>`
- Review packet collection: `canon://overlays/candidates/handoffs`
- Candidate review packet: `canon://overlays/candidates/<intake-id>/handoff`
- Promotion plan collection: `canon://overlays/candidates/promotion-plans`
- Candidate promotion plan: `canon://overlays/candidates/<intake-id>/promotion-plan`
- Readiness report collection: `canon://overlays/candidates/readiness-reports`
- Candidate readiness report: `canon://overlays/candidates/<intake-id>/readiness`
- Approval record collection: `canon://overlays/candidates/approval-records`
- Candidate approval record: `canon://overlays/candidates/<intake-id>/approval-record`
- Approval target template collection: `canon://overlays/candidates/approval-target-templates`
- Candidate approval target template: `canon://overlays/candidates/<intake-id>/approval-record/target-template`
- Approval validation report collection: `canon://overlays/candidates/approval-validation-reports`
- Candidate approval validation report: `canon://overlays/candidates/<intake-id>/approval-record/validation`
- Rendered handoff tool: `canon_overlay_candidate_handoff_get`
- Rendered promotion plan tool: `canon_overlay_candidate_promotion_plan_get`
- Rendered readiness tool: `canon_overlay_candidate_promotion_readiness_get`
- Rendered approval record tool: `canon_overlay_candidate_promotion_approval_record_get`
- Approval target template tool: `canon_overlay_candidate_promotion_approval_target_template_get`
- Approval validation report tool: `canon_overlay_candidate_promotion_approval_validation_report_get`
- Approval validation tool: `canon_overlay_candidate_promotion_approval_record_validate`
- Local CLI handoff: `pnpm --filter @create-something/canon overlay:candidate-handoff -- --root . --intake <intake-id>`
- Local CLI promotion plan: `pnpm --filter @create-something/canon overlay:candidate-plan -- --root . --intake <intake-id>`
- Local CLI readiness report: `pnpm --filter @create-something/canon overlay:candidate-readiness -- --root . --intake <intake-id>`
- Local CLI approval record: `pnpm --filter @create-something/canon overlay:candidate-approval-record -- --root . --intake <intake-id>`
- Local CLI approval target template: `pnpm --filter @create-something/canon overlay:candidate-approval-target -- --root . --intake <intake-id>`
- Local CLI approval validation: `pnpm --filter @create-something/canon overlay:candidate-approval-validate -- --root . --intake <intake-id>`

The queue is not an approval engine. It gathers overlay id, intake id, requested kind, modalities, source paths, surfaces, dependencies, required evidence, and stop-before-stable notes so Canon maintainers can decide whether to open a promotion slice.

Each queued candidate also has a review packet. The packet turns the queue entry into a stable handoff with the owning overlay manifest, source package, surfaces, evidence requirements, promotion checklist, and explicit approval boundary. Agents can use it to prepare Canon implementation work after human approval, but the packet does not create Linear issues, edit project overlays, or approve stable promotion.

Use `canon_overlay_candidate_handoff_get` when a maintainer needs the packet as Markdown rather than JSON. The tool accepts the intake id, packet id, or candidate id and returns the source URIs, surfaces, dependencies, required evidence, stop-before-stable notes, promotion checklist, and approval boundary.

Use `overlay:candidate-handoff` for the same review packet from the local repo checkout. Omitting `--intake` prints the packet list; adding `--json` prints the source packet data.

After explicit human approval, use promotion plans to scope implementation. Plans turn an approved handoff into preconditions, implementation scope, required changes, validation, documentation, compatibility, stop conditions, and the approval boundary for the next Canon slice. They are read-only artifacts: they do not create Linear issues, edit project overlays, approve implementation, or mark anything stable.

Use `canon_overlay_candidate_promotion_plan_get` when a maintainer needs the plan as Markdown rather than JSON. Use `overlay:candidate-plan` for the same plan from the local repo checkout. Omitting `--intake` prints the plan list; adding `--json` prints the source plan data.

Readiness reports sit after promotion plans and before implementation. They compare the plan with current Canon registry and public export policy snapshots, then call out human approval, registry target, export target, docs target, validation, and compatibility readiness. Related registry items and export policies are review hints only; the report does not select targets automatically.

Use `canon_overlay_candidate_promotion_readiness_get` when a maintainer needs the readiness report as Markdown. Use `overlay:candidate-readiness` for the same report from the local repo checkout. Omitting `--intake` prints the report list; adding `--json` prints the source readiness data.

Approval records sit after readiness reports and before implementation. They are fillable contracts for maintainer approval, approval evidence, registry action, selected registry item, export path, docs path, maturity target, and implementation owner. Target choices remain unset until a maintainer records them. The approval record is a read-only template: it does not approve implementation, create Linear issues, mutate Canon or project overlays, or mark candidates stable.

Use `canon_overlay_candidate_promotion_approval_record_get` when a maintainer needs the approval record as Markdown. Use `overlay:candidate-approval-record` for the same record from the local repo checkout. Omitting `--intake` prints the record list; adding `--json` prints the source approval-record data.

Use target templates to produce the compact JSON payload maintainers fill before validation. Target template fields start unset/null; hints are context, not selections. The template does not approve implementation, fill fields, create Linear issues, mutate Canon or project overlays, or mark candidates stable.

Agents can discover target templates through `canon://overlays/candidates/approval-target-templates`, the per-candidate `canon://overlays/candidates/<intake-id>/approval-record/target-template` resource, or search. Candidate list entries include `approvalTargetTemplateUri` next to the approval record and validation path.

Use `canon_overlay_candidate_promotion_approval_target_template_get` when a maintainer needs the fillable target JSON as Markdown. Use `overlay:candidate-approval-target` for the same template from the local repo checkout. Omitting `--intake` prints the target-template list; adding `--json` prints the source template data.

Validate a filled approval record before opening implementation work. Validation reports missing required fields, invalid registry action, invalid maturity target, invalid approval date, and target evidence warnings. It can return `ready-for-implementation`, but that is still only a gate check: validation does not approve implementation, persist approval fields, create Linear issues, mutate Canon or project overlays, or mark candidates stable.

Agents can discover current validation reports through `canon://overlays/candidates/approval-validation-reports`, the per-candidate `canon://overlays/candidates/<intake-id>/approval-record/validation` resource, `canon_overlay_candidate_promotion_approval_validation_report_get`, or search. Candidate list entries include `approvalValidationUri` next to the approval record and target-template path. These resources and the getter validate the generated approval records as they currently stand; use the validation tool when a maintainer supplies filled target fields.

Use `canon_overlay_candidate_promotion_approval_record_validate` when an agent has maintainer-supplied target fields to check in MCP. Use `overlay:candidate-approval-validate` for the same validation from the local repo checkout. Add `--record <path>` to validate a JSON approval record or target payload, and add `--strict` when CI should fail unless the record is ready for implementation.

Do not treat a queued candidate as stable. Stable promotion still requires Canon-owned export paths, docs, tests, compatibility notes, and registry routing.

## Related

- [Registry](/canon/resources/registry)
- [Get Started](/canon/resources/get-started)
- [Clear Components](/canon/components/clear)
