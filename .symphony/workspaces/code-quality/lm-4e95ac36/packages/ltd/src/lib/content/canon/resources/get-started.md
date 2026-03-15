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


<h2>Installation</h2>
<p>Install the Canon components package in your SvelteKit project.</p>
<div class="code-block">
<div class="code-header">Terminal</div>
<pre><code>pnpm add @create-something/canon</code></pre>
</div>
<div class="note">
<strong>Requirements:</strong> SvelteKit 2.0+ and Svelte 5.0+
		</div>



<h2>Import Tokens</h2>
<p>
			Import the Canon design tokens in your app's global CSS file.
			Choose the import that matches your needs.
		</p>
<h3>Option 1: Full Canon (Recommended)</h3>
<p>Includes tokens, base styles, and utility classes.</p>
<div class="code-block">
<div class="code-header">src/app.css</div>
<pre><code>{`@import '@create-something/canon/styles/canon.css';`}</code></pre>
</div>
<h3>Option 2: Tokens Only</h3>
<p>Just the CSS custom properties, for custom theming.</p>
<div class="code-block">
<div class="code-header">src/app.css</div>
<pre><code>{`@import '@create-something/canon/styles/tokens.css';`}</code></pre>
</div>
<h3>Option 3: With Tailwind</h3>
<p>For projects using Tailwind CSS alongside Canon.</p>
<div class="code-block">
<div class="code-header">src/app.css</div>
<pre><code>{`@import '@create-something/canon/styles/tokens.css';
@tailwind base;
@tailwind components;
@tailwind utilities;`}</code></pre>
</div>



<h2>Using Components</h2>
<p>Import and use Canon components in your Svelte files.</p>
<div class="code-block">
<div class="code-header">+page.svelte</div>
<pre><code>{`<script lang="ts">
  import { Button, TextField, Card } from '@create-something/canon';

  let email = $state('');
</script>

<card>
  <textfield bind:value="{email}" label="Email" type="email"></textfield>
  <button>Subscribe</button>
</card>`}</code></pre>
</div>



<h2>Using Tokens Directly</h2>
<p>
			Canon tokens are CSS custom properties. Use them anywhere you write CSS.
		</p>
<div class="code-block">
<div class="code-header">Component.svelte</div>
<pre><code>{`<div class="custom-box">
  Custom styled element
</div>

<style>
  .custom-box {
    padding: var(--space-md);
    background: var(--color-bg-subtle);
    border-radius: var(--radius-lg);
    color: var(--color-fg-primary);
  }
</style>`}</code></pre>
</div>
<h3>Common Tokens</h3>
<table class="spec-table">
<thead>
<tr>
<th>Category</th>
<th>Token</th>
<th>Use</th>
</tr>
</thead>
<tbody>
<tr>
<td>Color</td>
<td><code>--color-fg-primary</code></td>
<td>Primary text</td>
</tr>
<tr>
<td>Color</td>
<td><code>--color-bg-subtle</code></td>
<td>Card backgrounds</td>
</tr>
<tr>
<td>Spacing</td>
<td><code>--space-md</code></td>
<td>Medium spacing (1.618rem)</td>
</tr>
<tr>
<td>Radius</td>
<td><code>--radius-lg</code></td>
<td>Large border radius (12px)</td>
</tr>
<tr>
<td>Typography</td>
<td><code>--text-body</code></td>
<td>Body text size (1rem)</td>
</tr>
</tbody>
</table>



<h2>Project Structure</h2>
<p>Recommended structure for Canon-based projects.</p>
<div class="code-block">
<pre><code>{`src/
├── app.css           # Import canon.css here
├── app.html
├── routes/
│   ├── +layout.svelte
│   └── +page.svelte
└── lib/
    └── components/   # Your custom components`}</code></pre>
</div>



<h2>What's Next?</h2>
<div class="next-grid">
<a class="next-card" href="/canon/foundations/colors">
<h3>Colors</h3>
<p>Explore the color token system</p>
</a>
<a class="next-card" href="/canon/foundations/typography">
<h3>Typography</h3>
<p>Learn the type scale</p>
</a>
<a class="next-card" href="/canon/components/button">
<h3>Components</h3>
<p>Browse all components</p>
</a>
<a class="next-card" href="/canon/resources/tokens">
<h3>Token Reference</h3>
<p>Complete token list</p>
</a>
</div>

