---
category: "Canon"
section: "Resources"
title: "Figma Integration"
description: "How the Canon token files map into design tooling today."
lead: "Code remains the source of truth. Figma consumes exported token artifacts so design and implementation stay aligned without inventing a second canon."
publishedAt: "2026-04-14"
published: true
---

## Source Of Truth

Start from `packages/canon/src/lib/styles/tokens.css`. The additional artifacts exist to move that same token system into other tools.

## Files To Use

- `packages/canon/src/lib/styles/tokens.figma.json` for Tokens Studio style imports
- `packages/canon/src/lib/styles/tokens.dtcg.json` for standards-oriented token pipelines
- `@create-something/canon/styles/tokens.figma.json` and `@create-something/canon/styles/tokens.dtcg.json` from the packaged library surface

## Recommended Workflow

1. Change tokens in code first.
2. Treat exported JSON files as derived artifacts, not hand-edited sources.
3. Re-import the Figma-facing artifact when token values change.

## Documentation Status

The long-form walkthrough for Tokens Studio and end-to-end sync is still being rewritten. This page is live now so the Canon resources section no longer points at a 404.

## Related

- [Token Reference](/canon/resources/tokens)
- [Theming](/canon/guidelines/theming)
- [Contributing](/canon/resources/contributing)
