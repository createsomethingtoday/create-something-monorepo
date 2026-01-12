---
category: "Canon"
section: "Foundations"
title: "Typography"
description: "Canon typography system: type scale, font families, weights, line heights, and letter spacing."
lead: "Text sizes that work together naturally. We use the golden ratio (1.618) so every 
		heading and paragraph relates harmoniously—no guesswork needed."
publishedAt: "2026-01-08"
published: true
---


<h2>Why the golden ratio?</h2>
<p>
		φ (phi) = 1.618. You'll find this ratio in nature—shells, flowers, galaxies. When 
		you multiply each text size by 1.618, the result just feels right. Your headlines 
		and body text look like they belong together.
	</p>
<div class="phi-derivation">
<div class="phi-formula">
<span class="phi-symbol">φ</span>
<span class="phi-equals">=</span>
<span class="phi-value">1.618033...</span>
</div>
<div class="phi-sequence">
<span class="sequence-item">1 × φ² = 2.618</span>
<span class="sequence-divider">→</span>
<span class="sequence-item">1 × φ = 1.618</span>
<span class="sequence-divider">→</span>
<span class="sequence-item">1</span>
<span class="sequence-divider">→</span>
<span class="sequence-item">1 / φ = 0.618</span>
</div>
</div>
<p>
		For body text and small headings, we use a minor third (1.2) for finer steps. 
		Both ratios create progressions that feel musical—each size is in tune with the next.
	</p>



<h2>Type Scale</h2>
<p class="section-description">
		These sizes scale smoothly from mobile to desktop using <code>clamp()</code>. 
		Pick a token and the responsive behavior is built in.
	</p>
<h3>Display &amp; Headings</h3>
<div class="type-scale-demo">
		{#each typeScale as type}
			<div class="type-sample">
<div class="sample-preview" style="font-size: var({type.token})">
					Weniger
				</div>
<div class="sample-meta">
<code class="sample-token">{type.token}</code>
<span class="sample-ratio">{type.ratio}</span>
<span class="sample-description">{type.description}</span>
</div>
</div>
		{/each}
	</div>
<h3>Body &amp; Caption</h3>
<div class="type-scale-demo">
		{#each bodyScale as type}
			<div class="type-sample">
<div class="sample-preview" style="font-size: var({type.token})">
					Less, but better.
				</div>
<div class="sample-meta">
<code class="sample-token">{type.token}</code>
<span class="sample-ratio">{type.ratio}</span>
<span class="sample-description">{type.description}</span>
</div>
</div>
		{/each}
	</div>



<h2>Font Families</h2>
<p class="section-description">
		Three fonts with fallbacks for when they don't load. Sans for interfaces, 
		mono for code, serif for editorial moments.
	</p>
<div class="font-families">
<div class="font-demo">
<div class="font-preview sans">
				The quick brown fox jumps over the lazy dog
			</div>
<div class="font-meta">
<code>--font-sans</code>
<span class="font-name">Stack Sans Notch</span>
<span class="font-use">Primary typeface</span>
</div>
</div>
<div class="font-demo">
<div class="font-preview mono">
				const φ = 1.618033988749895;
			</div>
<div class="font-meta">
<code>--font-mono</code>
<span class="font-name">JetBrains Mono</span>
<span class="font-use">Code, data tables</span>
</div>
</div>
<div class="font-demo">
<div class="font-preview serif">
				"Good design is as little design as possible."
			</div>
<div class="font-meta">
<code>--font-serif</code>
<span class="font-name">Georgia</span>
<span class="font-use">Editorial, quotes</span>
</div>
</div>
</div>



<h2>Font Weights</h2>
<p class="section-description">
		Five weights—from light to bold. That's enough range for any hierarchy without 
		overwhelming the reader.
	</p>
<div class="weights-demo">
		{#each fontWeights as weight}
			<div class="weight-sample">
<span class="weight-preview" style="font-weight: var({weight.token})">
					Weniger, aber besser
				</span>
<div class="weight-meta">
<code>{weight.token}</code>
<span class="weight-value">{weight.value}</span>
<span class="weight-use">{weight.description}</span>
</div>
</div>
		{/each}
	</div>



<h2>Line Heights</h2>
<p class="section-description">
		More space between lines makes text easier to read. Use <code>--leading-relaxed</code> (1.618) 
		for body text—it's the golden ratio again.
	</p>
<div class="leading-demo">
		{#each lineHeights as leading}
			<div class="leading-sample" class:featured="{leading.featured}">
<div class="leading-preview" style="line-height: var({leading.token})">
<p>Good design is innovative. Good design makes a product useful. Good design is aesthetic.</p>
</div>
<div class="leading-meta">
<code>{leading.token}</code>
<span class="leading-value">{leading.value}</span>
<span class="leading-use">{leading.description}</span>
</div>
</div>
		{/each}
	</div>



<h2>Letter Spacing</h2>
<p class="section-description">
		Tracking adjusts horizontal rhythm for different contexts.
	</p>
<div class="tracking-demo">
		{#each letterSpacings as tracking}
			<div class="tracking-sample">
<span class="tracking-preview" style="letter-spacing: var({tracking.token})">
					TYPOGRAPHY
				</span>
<div class="tracking-meta">
<code>{tracking.token}</code>
<span class="tracking-value">{tracking.value}</span>
<span class="tracking-use">{tracking.description}</span>
</div>
</div>
		{/each}
	</div>



<h2>Responsive Typography</h2>
<p>
		Display and heading sizes use CSS <code>clamp()</code> for fluid scaling between viewport widths.
		This ensures readability across devices without breakpoint jumps.
	</p>
<codeblock );`}="" *="" +="" --text-display:="" 1.5rem,="" 2.618rem,="" 4.236rem="" 4vw="" clamp(="" code="{`/*" fluid="" formula="" language="css" maximum:="" minimum:="" preferred:="" scales="" title="fluid-typography.css" typography="" viewport="" with="" φ²="" φ³=""></codeblock>
<div class="responsive-note">
<strong>Resize your browser</strong> to see the display text above scale fluidly.
	</div>



<h2>Usage</h2>
<p class="section-description">
		Combine size, weight, height, and spacing tokens for consistent typography.
	</p>
<codeblock code="{usageExample}" language="css" title="typography-patterns.css"></codeblock>

