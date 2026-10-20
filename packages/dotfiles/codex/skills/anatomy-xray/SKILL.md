---
name: anatomy-xray
description: Create original SVG systems explainers with selectable internals, transparent shells, cutaways, exploded assemblies, and consistent multiple views. Use for XRay-style reveals of workflows or mechanisms, not diagnostic medical imaging.
---
# Anatomy XRay

Reveal how a system works, with an original object whose internals explain its boundaries and dependencies. This is a standalone companion to Anatomy, not a replacement or automatic installer. Read [provenance](references/provenance.md) before adapting upstream material.

## Make the explanation trustworthy

1. State the reader's question and the system boundary. Inventory assemblies, ports, directed connections, states, evidence, and unknowns using [the model template](references/model-template.json). Label the artifact schematic, inferred, or measured; a schematic is not a physical simulation.
2. Choose a recognizable original enclosure or mechanism. Translate the reference's reveal, not its character, composition, or branding. Detail must explain function; do not invent screws, sensors, quantitative scales, or telemetry to imply fidelity.
3. Define geometry and semantic state once. Derive every view, connector, selection, label, legend, and text alternative from stable IDs. Preserve scale across views; disclose orthographic projections and illustrative exploded spacing. Keep connector endpoints attached in every pose. Use a shared clipping boundary for shell and internals.
4. Offer exterior, transparent, cutaway, and exploded modes when they help answer the question. Exterior hides internals; transparency reveals through a shell; cutaway removes a defined region; explosion separates assemblies without changing topology. Use multiple views only to reveal otherwise hidden relationships. Keep selection synchronized and provide a reset.
5. Use restrained monochrome Canon styling for CREATE SOMETHING, with accent only for a declared semantic role such as selection. For another brand, neutral light/dark palettes are acceptable. Use color encoding for measured data only with a source, units, domain, timestamp, uncertainty, and legend. Never invent heat maps or scientific confidence.
6. Build code-native HTML/SVG first. [The working demo](assets/workflow-demo/index.html) and its local renderer are an adaptable starting point. Do not run downloaded upstream scripts as an incidental setup step. Use [delivery checks](references/checklist.md) before handoff.

## Boundaries worth drawing

For AI workflows, distinguish intent, declared contract, orchestration, host permissions and approval, tools, verification, and receipt. A prose.md contract can describe policy; it does not enforce it. Host gates and tool/server checks enforce actual authority. Approval is scoped, may be refused, and is needed only where policy requires it. A receipt is an evidence record, not automatic proof of correctness. Show blocked and unknown paths when describing execution; do not turn a selection animation into a claimed live run.

## Delivery

The included demo’s tested behavior and remaining limits are recorded in [validation](references/validation.md).

Provide source, standalone fallback, evidence mapping, and validation results. Use native controls for keyboard and touch, visible focus, readable labels, no-JS text and static geometry, reduced-motion and print support. Keep the model independent of rendering; test topology and state consistency as well as screenshots. See [implementation notes](references/implementation.md) for budgets and optional depth effects.

Do not globally install this skill, activate plugins, retrofit a live site, or publish/deploy merely to show a preview. After an approved installation, invoke: `$anatomy-xray Explain this workflow with a cutaway, evidence map, and accessible SVG demo.`
