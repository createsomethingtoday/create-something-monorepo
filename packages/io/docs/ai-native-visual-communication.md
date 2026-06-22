# AI-Native Visual Communication For Research Artifacts

This guide defines the repeatable visual system for `.io` papers and experiments.

The goal is not to decorate research. The goal is to make technical ideas easier
to inspect, remember, and reuse without losing precision.

## Decision

Every research artifact can carry three visual layers:

1. `ascii_art`: terminal-native conceptual hero.
2. `visual_summary`: Canon-rendered structured explanation.
3. `generated_brand_image`: prompt-governed editorial image spec.

Use all three only when they each do a different job. A generated image should
set tone and recognition. A structured visual summary should carry the
framework. Markdown tables and code blocks should carry exact details.

## Ownership

The repo owns the framework. The image model creates assets inside the repo's
constraints.

That means:

- diagrams with exact states, labels, and relationships should be rendered by
  Canon components
- generated images should be prompt-versioned metadata before they become
  published assets
- generated images should never be the only source of framework meaning
- prompt contracts should travel with the paper or experiment metadata

## Metadata Fields

File-based papers and experiments support these fields in their config object:

```ts
ascii_art?: string;
visual_summary?: {
  kind: 'state-strip' | 'layer-stack' | 'boundary-matrix' | 'flow' | 'proof-card';
  title: string;
  caption?: string;
  nodes: Array<{
    label: string;
    detail?: string;
    icon?: 'document' | 'folder' | 'user' | 'users' | 'settings' | 'mail' | 'calendar' | 'clock' | 'check' | 'warning' | 'info';
    tone?: 'neutral' | 'run' | 'wait' | 'stop' | 'receipt';
  }>;
};
generated_brand_image?: {
  prompt_contract: 'create-something-research-visual.v1';
  model: 'gpt-image-2';
  status: 'prompt-only' | 'generated' | 'approved';
  prompt: string;
  intended_use?: 'article-hero' | 'social-card' | 'section-opener' | 'visual-abstract';
  size?: string;
  quality?: 'low' | 'medium' | 'high';
  asset_path?: string | null;
  alt?: string | null;
};
```

## Visual Summary Kinds

Use the smallest kind that explains the idea.

| Kind | Use when | Example |
| --- | --- | --- |
| `state-strip` | The artifact defines visible states. | Run, wait, stop, receipt. |
| `layer-stack` | The artifact explains levels in a system. | Database, Automation, Judgment. |
| `boundary-matrix` | The artifact separates audiences or permissions. | Public status vs private evidence. |
| `flow` | The artifact explains sequence. | Connect, verify, coordinate, control. |
| `proof-card` | The artifact includes a reusable operating record. | Workflow, owner, evidence, receipt. |

## Generated Brand Image Contract

Use this prompt contract for OpenAI `gpt-image-2` visual assets.

```text
CREATE SOMETHING research visual system.

Purpose:
Create a publication-quality visual abstract for a research paper or experiment.

Brand:
Minimal, rigorous, systems-oriented, black and white foundation with one
restrained amber accent. High contrast, quiet interface density, no decorative
clutter.

Visual language:
Abstract operating-system diagram. Architectural systems thinking. Sparse
geometry. Visible layers, boundaries, traces, receipts, handoff paths, and owner
checkpoints. Subtle terminal or paper texture. No stock-photo people. No glossy
SaaS gradients. No mascot. No cartoon. No fake UI chrome.

Composition:
16:9 editorial hero. Centered system object with generous negative space.
Readable at article header size. Suitable above a title, but do not include
title text in the image.

Subject:
[artifact-specific subject]

Required motifs:
- [3 to 5 motifs that match the artifact]

Forbidden:
watermarks, extra logos, random text, illegible labels, fake brand names,
colorful dashboard clutter, decorative blobs.
```

## Authoring Rules

1. Start with the framework claim, not the image.
2. Choose one `visual_summary.kind`.
3. Write 3 to 5 nodes with short labels and useful details.
4. Add `generated_brand_image` as `prompt-only` before generating an asset.
5. Only set `status: 'approved'` after a human checks the exported image.
6. Add `asset_path` only after the image is committed or otherwise managed.
7. Keep exact labels in Canon-rendered visuals, not inside generated images.

## File Conventions

Generated `.io` image assets should live near the `.io` property:

```text
packages/io/static/generated/research/<slug>/<slug>--hero--vYYYYMMDD.webp
packages/io/static/generated/research/<slug>/<slug>--social--vYYYYMMDD.webp
```

Source prompts remain in `fileBasedPapers.ts` or `fileBasedExperiments.ts`.
If an image is used across multiple artifacts, promote the prompt and asset to
a shared Canon or docs asset only after the reuse is real.

## Review Checklist

Before publishing an artifact with visuals:

- [ ] `ascii_art` summarizes the concept in the `.io` Unicode visual dialect.
- [ ] `visual_summary` explains a state, layer, boundary, flow, or proof card.
- [ ] generated imagery is prompt-versioned as `generated_brand_image`.
- [ ] generated imagery does not contain framework-critical text.
- [ ] exact labels remain in HTML/SVG/Markdown, not only in the bitmap.
- [ ] alt text exists for any committed generated image.
- [ ] the artifact still reads correctly if generated images fail to load.

## First Reference Implementation

`The Proof Surface` uses:

- `ascii_art` for the terminal-native hero
- `visual_summary.kind = 'state-strip'` for Run, Wait, Stop, Receipt
- `generated_brand_image.prompt_contract = 'create-something-research-visual.v1'`
  for the future `gpt-image-2` editorial image

Use it as the template for the next paper or experiment that needs a visual
communication layer.
