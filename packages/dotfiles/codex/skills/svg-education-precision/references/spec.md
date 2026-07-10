# SVG Education Specification

The JSON spec is the editable Database-tier artifact. SVG is a deterministic
Automation-tier derivative. Publication quality remains a Judgment-tier
decision.

## Minimal document

```json
{
  "version": 1,
  "canvas": {
    "width": 1200,
    "height": 720,
    "background": "#f9f9f9"
  },
  "metadata": {
    "title": "Allowed, ask, blocked",
    "description": "A policy-gate education diagram."
  },
  "elements": []
}
```

`canvas.width` and `canvas.height` are positive pixel values. The compiler emits
matching `width`, `height`, and `viewBox` attributes plus accessible title and
description nodes.

## Rectangles

```json
{
  "id": "decision-card",
  "type": "rect",
  "x": 80,
  "y": 160,
  "width": 280,
  "height": 180,
  "radius": 8,
  "fill": "#ffffff",
  "stroke": "#e1e1e1",
  "contains": ["decision-label"]
}
```

Use `contains` for elements intentionally placed inside a card. The named
element still receives independent canvas and text-fit validation.

## Text

```json
{
  "id": "decision-label",
  "type": "text",
  "x": 104,
  "y": 196,
  "width": 232,
  "height": 60,
  "lines": ["Policy chooses", "the permitted route."],
  "fontSize": 18,
  "lineHeight": 26,
  "fontWeight": 600,
  "fontFamily": "Inter, Arial, sans-serif",
  "fill": "#0a0e19"
}
```

Text does not wrap implicitly. Supply reviewed lines and a real layout box. The
CLI uses a conservative deterministic width estimate; the browser check catches
font-engine differences. If pixel-identical rendering is required, use an
embedded approved font or convert final labels to reviewed paths outside this
skill's default workflow.

## Connectors

```json
{
  "id": "signal-to-decision",
  "type": "connector",
  "x1": 360,
  "y1": 250,
  "x2": 480,
  "y2": 250,
  "stroke": "#636363",
  "strokeWidth": 2,
  "markerEnd": true
}
```

Connector endpoints must remain within the canvas. Connectors are excluded from
area-collision checks because touching node boundaries is expected; verify
their routing and arrowheads in the browser review.

## Intentional overlap

```json
{
  "id": "status-badge",
  "type": "rect",
  "x": 320,
  "y": 144,
  "width": 72,
  "height": 32,
  "allowOverlapWith": ["decision-card"]
}
```

Use `allowOverlapWith` only for a named pair. The relationship does not suppress
collisions with any other element. Every referenced ID must exist.

## Supported element types

- `rect`
- `text`
- `connector`

Add another type only with a failing public-interface fixture, deterministic
bounds, SVG serialization, and browser evidence.

## Review artifact

The included representative fixture is:

```text
packages/dotfiles/codex/skills/svg-education-precision/fixtures/workflow-valid.json
```

Build it with:

```bash
pnpm agent:svg-education check \
  packages/dotfiles/codex/skills/svg-education-precision/fixtures/workflow-valid.json \
  /tmp/svg-education-workflow.svg
```
