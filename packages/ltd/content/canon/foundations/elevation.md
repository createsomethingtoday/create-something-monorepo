---
category: "Canon"
section: "Foundations"
title: "Elevation"
description: "Canon elevation system: shadows, glows, and z-index for depth and layering."
lead: "Shadows create depth without color. Elevation establishes hierarchy through layering,
		not decoration."
publishedAt: "2026-01-08"
published: true
---


<h2>Depth Without Color</h2>
<p>
		On a black canvas, traditional drop shadows would disappear. Canon uses increased opacity
		and subtle light glows to create the illusion of elevation. Dark theme, not flat design.
	</p>



<h2>Shadows</h2>
<p class="section-description">
		Progressive shadow scale for increasing elevation. Higher elements cast deeper shadows.
	</p>
<div class="shadow-grid">
		{#each shadowTokens as shadow}
			<div class="shadow-item">
<div class="shadow-preview" style="box-shadow: var({shadow.token})">
<span class="preview-text">{shadow.token.replace('--shadow-', '')}</span>
</div>
<div class="shadow-info">
<code>{shadow.token}</code>
<span class="shadow-use">{shadow.description}</span>
</div>
</div>
		{/each}
	</div>



<h2>Glows</h2>
<p class="section-description">
		Light-based elevation for dark backgrounds. Use sparingly for emphasis.
	</p>
<div class="glow-grid">
		{#each glowTokens as glow}
			<div class="glow-item">
<div class="glow-preview" style="box-shadow: var({glow.token})">
<span class="preview-text">{glow.token.replace('--shadow-glow-', '')}</span>
</div>
<div class="glow-info">
<code>{glow.token}</code>
<span class="glow-use">{glow.description}</span>
</div>
</div>
		{/each}
	</div>



<h2>Inner Shadows</h2>
<p class="section-description">
		Inset shadows for recessed elements like input fields.
	</p>
<div class="inner-grid">
		{#each innerTokens as inner}
			<div class="inner-item">
<div class="inner-preview" style="box-shadow: var({inner.token})">
<span class="preview-text">{inner.token.replace('--shadow-inner', 'inner')}</span>
</div>
<div class="inner-info">
<code>{inner.token}</code>
<span class="inner-use">{inner.description}</span>
</div>
</div>
		{/each}
	</div>



<h2>Z-Index Scale</h2>
<p class="section-description">
		Predictable stacking order for layered interfaces. Never use arbitrary z-index values.
	</p>
<div class="z-index-demo">
<div class="z-stack">
			{#each [...zIndexTokens].reverse() as z, i}
				<div class="z-layer" style="
						z-index: var({z.token});
						transform: translateY({i * 8}px);
						opacity: {1 - i * 0.1};
					">
<code>{z.token}</code>
<span>{z.value}</span>
</div>
			{/each}
		</div>
</div>
<div class="z-reference">
		{#each zIndexTokens as z}
			<div class="z-row">
<code>{z.token}</code>
<span class="z-value">{z.value}</span>
<span class="z-use">{z.description}</span>
</div>
		{/each}
	</div>



<h2>Elevation in Action</h2>
<p class="section-description">
		Interactive demo showing how shadows communicate elevation changes on hover.
	</p>
<div class="elevation-demo">
<div class="demo-card">
<span class="demo-label">Hover me</span>
<p class="demo-text">Shadow increases on hover, communicating lift.</p>
</div>
</div>



<h2>Usage</h2>
<codeblock code="{usageExample}" language="css" title="elevation-usage.css"></codeblock>

