---
category: "Canon"
section: "Resources"
title: "Get Started"
description: "Quick start guide for the Canon Design System"
lead: "Start building with Canon in under 5 minutes. This guide covers installation,
			basic setup, and your first component."
publishedAt: "2026-01-08"
published: true
---

## Install and import

In the monorepo, use the workspace package:

```bash
pnpm add @create-something/canon@workspace:*
```

For a SvelteKit application, import the complete system in global CSS:

```css
@import '@create-something/canon/styles/canon.css';
```

This supplies shared base styles and local Geist loading. `@create-something/canon/styles/tokens.css` supplies custom properties only; token-only consumers own resets, fonts and any required style modules. Standard controls own their sizes and padding without requiring Tailwind utilities.

## Use shared components

```svelte
<script lang="ts">
  import { Button, Card } from '@create-something/canon';
  import { TextField } from '@create-something/canon/components/form';
  let email = $state('');
</script>

<Card>
  <h2>Prepare a draft</h2>
  <TextField bind:value={email} label="Email" type="email" />
  <Button variant="secondary" href="/canon/components">Browse components</Button>
</Card>
```

This example is local interface markup; it does not submit, subscribe or grant consent. An owning application supplies validation, persistence, errors and any approval boundary. Use a native form with an explicit submit action when submission is intended.

## Start from the foundation

The default canvas is black, with solid neutral surfaces, local Geist and soft-square controls. Use `data-theme="light"` for an explicit light work surface. Meaningful records and code use mono; artwork frames remain square. Hero and CTA scenes use CSS backgrounds behind HTML copy; inline imagery belongs in later editorial sections.

Import component families through their published subpaths when that keeps the consuming graph narrow. Verify the current export and prop contract rather than guessing a package symbol.

See [Colors](/canon/foundations/colors), [Typography](/canon/foundations/typography), [Images](/canon/guidelines/images) and [Token Reference](/canon/resources/tokens).
