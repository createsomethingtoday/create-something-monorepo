---
category: "Canon"
section: "Foundations"
title: "Spacing"
description: "Canon spacing system: golden ratio scale for margins, padding, and gaps."
lead: "Seven spacing values that work together. Based on the golden ratio, so 
		your padding, margins, and gaps always feel proportional."
publishedAt: "2026-01-08"
published: true
---


<h2>How the scale works</h2>
<p>
		Start with 1rem as your base. Multiply by 1.618 for larger spaces, divide for smaller. 
		Adjacent elements look balanced because they share the same underlying ratio.
	</p>
<div class="phi-scale">
<div class="scale-formula">
<span class="formula-item"><code>xs</code> = 1/φ</span>
<span class="formula-arrow">→</span>
<span class="formula-item"><code>sm</code> = 1</span>
<span class="formula-arrow">→</span>
<span class="formula-item"><code>md</code> = φ</span>
<span class="formula-arrow">→</span>
<span class="formula-item"><code>lg</code> = φ²</span>
<span class="formula-arrow">→</span>
<span class="formula-item">...</span>
</div>
</div>



<h2>Spacing Tokens</h2>
<p class="section-description">
		Copy these into your CSS for padding, margins, and gaps. The visual shows actual size.
	</p>
<div class="spacing-grid">
		{#each spacingTokens as space}
			<div class="spacing-item">
<div class="spacing-visual">
<div class="spacing-box" style="width: var({space.token}); height: var({space.token})"></div>
</div>
<div class="spacing-info">
<div class="spacing-header">
<code class="spacing-token">{space.token}</code>
<span class="spacing-ratio">{space.ratio}</span>
</div>
<div class="spacing-values">
<span class="spacing-rem">{space.value}</span>
<span class="spacing-px">{space.pixels}</span>
</div>
<p class="spacing-description">{space.description}</p>
</div>
</div>
		{/each}
	</div>



<h2>Visual Harmony</h2>
<p class="section-description">
		Nested containers demonstrating the golden ratio in action. Each container's padding
		relates to the next by φ.
	</p>
<div class="harmony-demo">
<div class="harmony-outer">
<span class="harmony-label">--space-xl</span>
<div class="harmony-middle">
<span class="harmony-label">--space-lg</span>
<div class="harmony-inner">
<span class="harmony-label">--space-md</span>
<div class="harmony-core">
<span class="harmony-label">--space-sm</span>
</div>
</div>
</div>
</div>
</div>



<h2>Border Radius</h2>
<p class="section-description">
		Radius tokens use a 4px base with multipliers for consistency across UI elements.
	</p>
<div class="radius-grid">
		{#each radiusTokens as radius}
			<div class="radius-item">
<div class="radius-preview" style="border-radius: var({radius.token})"></div>
<div class="radius-info">
<code>{radius.token}</code>
<span class="radius-value">{radius.value}</span>
<span class="radius-use">{radius.description}</span>
</div>
</div>
		{/each}
	</div>



<h2>Usage Guidelines</h2>
<div class="guidelines">
<div class="guideline">
<h4>Component Internals</h4>
<p>Use <code>--space-sm</code> and <code>--space-xs</code> for internal component spacing.</p>
</div>
<div class="guideline">
<h4>Between Components</h4>
<p>Use <code>--space-md</code> and <code>--space-lg</code> for gaps between components.</p>
</div>
<div class="guideline">
<h4>Page Sections</h4>
<p>Use <code>--space-xl</code> and <code>--space-2xl</code> for major page divisions.</p>
</div>
<div class="guideline">
<h4>Consistency</h4>
<p>Prefer adjacent scale steps. Don't jump from <code>--space-xs</code> to <code>--space-xl</code>.</p>
</div>
</div>



<h2>Usage</h2>
<codeblock code="{usageExample}" language="css" title="spacing-usage.css"></codeblock>

