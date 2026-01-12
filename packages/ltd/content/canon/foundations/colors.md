---
category: "Canon"
section: "Foundations"
title: "Colors"
description: "Canon color tokens: backgrounds, foregrounds, semantic colors, and data visualization palette."
lead: "Every color you need, ready to copy. Black and white for structure. 
		Opacity for hierarchy. Semantic colors when something needs attention."
publishedAt: "2026-01-08"
published: true
---


<h2>Why so few colors?</h2>
<p>
		More colors mean more decisions. We use black and white as the foundation, then adjust 
		opacity to create hierarchy—no need to pick new shades. When you need to show success, 
		error, or a warning, semantic colors do the work.
	</p>
<blockquote class="philosophy-quote">
		"Color communicates. Decoration distracts."
	</blockquote>



<h2>Backgrounds</h2>
<p class="section-description">
		Four levels from pure black to subtle grey. Stack them to create depth—like layers of paper.
	</p>
<div class="token-grid">
		{#each backgroundColors as color}
			<tokenswatch description="{color.description}" token="{color.token}" value="{color.value}"></tokenswatch>
		{/each}
	</div>



<h2>Foregrounds</h2>
<p class="section-description">
		Five text colors, all white at different opacities. Use brighter for headlines, 
		dimmer for captions. Contrast ratios shown help you stay accessible.
	</p>
<div class="token-grid">
		{#each foregroundColors as color}
			<tokenswatch contrastratio="{color.contrast}" description="{color.description}" isforeground="{true}" token="{color.token}" value="{color.value}"></tokenswatch>
		{/each}
	</div>
<div class="note">
<strong>WCAG Compliance:</strong> <code>--color-fg-muted</code> (4.56:1) meets AA for normal text.
		<code>--color-fg-subtle</code> should only be used for decorative elements.
	</div>



<h2>Borders</h2>
<p class="section-description">
		Three border levels for separation and emphasis.
	</p>
<div class="token-grid">
		{#each borderColors as color}
			<tokenswatch description="{color.description}" token="{color.token}" value="{color.value}"></tokenswatch>
		{/each}
	</div>



<h2>Semantic Colors</h2>
<p class="section-description">
		Four colors that mean something: success, error, warning, info. Each comes with 
		<code>-muted</code> and <code>-border</code> variants for backgrounds and outlines.
	</p>
<div class="token-grid">
		{#each semanticColors as color}
			<tokenswatch contrastratio="{color.contrast}" description="{color.description}" token="{color.token}" value="{color.value}"></tokenswatch>
		{/each}
	</div>
<h3>Semantic Variants</h3>
<div class="semantic-demo">
<div class="semantic-card success">
<span class="semantic-label">Success</span>
<code>--color-success-muted</code> + <code>--color-success-border</code>
</div>
<div class="semantic-card error">
<span class="semantic-label">Error</span>
<code>--color-error-muted</code> + <code>--color-error-border</code>
</div>
<div class="semantic-card warning">
<span class="semantic-label">Warning</span>
<code>--color-warning-muted</code> + <code>--color-warning-border</code>
</div>
<div class="semantic-card info">
<span class="semantic-label">Info</span>
<code>--color-info-muted</code> + <code>--color-info-border</code>
</div>
</div>



<h2>Interactive States</h2>
<p class="section-description">
		Overlay colors for hover, active, and focus states.
	</p>
<div class="token-grid">
		{#each interactiveColors as color}
			<tokenswatch contrastratio="{color.contrast}" description="{color.description}" token="{color.token}" value="{color.value}"></tokenswatch>
		{/each}
	</div>
<div class="interactive-demo">
<button class="demo-button">Hover me</button>
</div>



<h2>Data Visualization</h2>
<p class="section-description">
		Six distinct colors for charts and graphs. They're designed to look different even 
		to colorblind users. Use <code>-muted</code> variants for area fills.
	</p>
<div class="token-grid">
		{#each dataVizColors as color}
			<tokenswatch description="{color.description}" token="{color.token}" value="{color.value}"></tokenswatch>
		{/each}
	</div>



<h2>Overlays</h2>
<p class="section-description">
		Backdrop colors for modals, dialogs, and drawers.
	</p>
<div class="token-grid token-grid-sm">
		{#each overlayColors as color}
			<tokenswatch description="{color.description}" token="{color.token}" value="{color.value}"></tokenswatch>
		{/each}
	</div>



<h2>How to use</h2>
<p class="section-description">
		Copy the token names into your CSS. Never hardcode hex values—tokens let you 
		change the whole palette later without hunting through files.
	</p>
<codeblock code="{usageExample}" language="css" title="colors.css"></codeblock>

