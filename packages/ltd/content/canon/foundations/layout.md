---
category: "Canon"
section: "Foundations"
title: "Layout"
description: "Canon layout system: containers, breakpoints, and grid patterns."
lead: "Container widths, breakpoints, and composition patterns for responsive layouts."
publishedAt: "2026-01-08"
published: true
---


<h2>Containers</h2>
<p class="section-description">
		Maximum widths for constraining content at different scales.
	</p>
<div class="container-demo">
		{#each containerTokens as container}
			<div class="container-row">
<div class="container-bar" style="max-width: var({container.token})">
<code>{container.token}</code>
</div>
<div class="container-meta">
<span class="container-value">{container.value}</span>
<span class="container-use">{container.description}</span>
</div>
</div>
		{/each}
	</div>
<div class="prose-note">
<strong>Prose width:</strong> <code>--container-prose</code> uses <code>65ch</code> (65 characters),
		the optimal line length for reading comfort. This is typography-aware, scaling with font size.
	</div>



<h2>Breakpoints</h2>
<p class="section-description">
		Mobile-first breakpoints aligned with Tailwind's defaults.
	</p>
<div class="breakpoints-grid">
		{#each breakpoints as bp}
			<div class="breakpoint-item">
<div class="breakpoint-header">
<code>@media (min-width: {bp.value})</code>
</div>
<div class="breakpoint-meta">
<span class="breakpoint-name">{bp.name}</span>
<span class="breakpoint-use">{bp.description}</span>
</div>
</div>
		{/each}
	</div>
<div class="mobile-first-note">
<strong>Mobile-first:</strong> Start with mobile styles, then add complexity at larger breakpoints.
		This ensures fast initial load on constrained devices.
	</div>



<h2>Grid Patterns</h2>
<p class="section-description">
		Common layout patterns using CSS Grid and Flexbox with Canon spacing.
	</p>
<h3>Responsive Card Grid</h3>
<div class="pattern-demo">
<div class="demo-card-grid">
<div class="demo-card">Card 1</div>
<div class="demo-card">Card 2</div>
<div class="demo-card">Card 3</div>
<div class="demo-card">Card 4</div>
<div class="demo-card">Card 5</div>
<div class="demo-card">Card 6</div>
</div>
</div>
<h3>Stack Layout</h3>
<div class="pattern-demo">
<div class="demo-stack">
<div class="demo-stack-item">Item 1</div>
<div class="demo-stack-item">Item 2</div>
<div class="demo-stack-item">Item 3</div>
</div>
</div>
<h3>Flex Row</h3>
<div class="pattern-demo">
<div class="demo-flex-row">
<div class="demo-flex-item">Left</div>
<div class="demo-flex-item grow">Center (grows)</div>
<div class="demo-flex-item">Right</div>
</div>
</div>



<h2>Layout Composition</h2>
<p class="section-description">
		Combine container, grid, and spacing tokens for complete layouts.
	</p>
<codeblock code="{layoutExample}" language="css" title="layout-patterns.css"></codeblock>



<h2>Grid Utilities</h2>
<codeblock code="{gridExample}" language="css" title="grid-utilities.css"></codeblock>



<h2>Guidelines</h2>
<div class="guidelines">
<div class="guideline">
<h4>Use max-width, not width</h4>
<p>Containers should shrink on smaller screens. Always <code>max-width</code>.</p>
</div>
<div class="guideline">
<h4>Margin-inline for centering</h4>
<p>Use <code>margin-inline: auto</code> to center containers horizontally.</p>
</div>
<div class="guideline">
<h4>Gap over margin</h4>
<p>Use <code>gap</code> in Grid/Flexbox instead of margins between children.</p>
</div>
<div class="guideline">
<h4>Fluid grids</h4>
<p>Prefer <code>auto-fill</code>/<code>auto-fit</code> with <code>minmax()</code> for natural responsiveness.</p>
</div>
</div>

