---
category: "Canon"
section: "Foundations"
title: "Motion"
description: "Canon motion system: timing, easing, and animation principles for purposeful motion."
lead: "Motion should be purposeful, not decorative. Animation reveals state changes and guides
		attention. When in doubt, don't animate."
publishedAt: "2026-01-08"
published: true
---


<h2>Motion Philosophy</h2>
<p>
		Every animation must answer: what does this communicate that stillness cannot? Motion
		exists to reduce cognitive load, not increase visual complexity.
	</p>
<div class="principles-grid">
<div class="principle-card">
<h4>Purposeful</h4>
<p>Motion communicates state change. No decorative animation.</p>
</div>
<div class="principle-card">
<h4>Subtle</h4>
<p>Users should feel the effect, not notice the animation.</p>
</div>
<div class="principle-card">
<h4>Consistent</h4>
<p>One easing curve for coherent motion language.</p>
</div>
<div class="principle-card">
<h4>Reducible</h4>
<p>Always respect <code>prefers-reduced-motion</code>.</p>
</div>
</div>



<h2>Duration</h2>
<p class="section-description">
		Five duration levels from instant feedback to deliberate reveals.
	</p>
<div class="duration-grid">
		{#each durationTokens as duration}
			<button =="" class="duration-item" class:active="{hoveredDuration" onmouseenter="{()"> hoveredDuration = duration.token}
				onmouseleave={() =&gt; hoveredDuration = null}
			&gt;
				<div class="duration-visual">
<div =="duration.token}" class="duration-bar" class:animating="{hoveredDuration" style="transition-duration: var({duration.token})"></div>
</div>
<div class="duration-info">
<div class="duration-header">
<code>{duration.token}</code>
<span class="duration-value">{duration.value}</span>
</div>
<p class="duration-description">{duration.description}</p>
<p class="duration-use">{duration.use}</p>
</div>
</button>
		{/each}
	</div>



<h2>Easing</h2>
<p class="section-description">
		Consistent easing creates coherent motion. Use <code>--ease-standard</code> for most transitions.
	</p>
<div class="easing-grid">
		{#each easingTokens as ease}
			<div class="easing-item">
<div class="easing-visual">
<div class="easing-ball" style="transition-timing-function: var({ease.token})"></div>
</div>
<div class="easing-curve">
					{#if ease.token === '--ease-standard'}
						<svg class="curve-svg" viewbox="0 0 100 100">
<path d="M 0 100 C 40 100, 20 0, 100 0" fill="none" stroke="currentColor" stroke-width="2"></path>
</svg>
					{:else if ease.token === '--ease-decelerate'}
						<svg class="curve-svg" viewbox="0 0 100 100">
<path d="M 0 100 C 0 100, 20 0, 100 0" fill="none" stroke="currentColor" stroke-width="2"></path>
</svg>
					{:else}
						<svg class="curve-svg" viewbox="0 0 100 100">
<path d="M 0 100 C 40 100, 100 0, 100 0" fill="none" stroke="currentColor" stroke-width="2"></path>
</svg>
					{/if}
				</div>
<div class="easing-info">
<code>{ease.token}</code>
<p class="easing-description">{ease.description}</p>
<p class="easing-use">{ease.use}</p>
</div>
</div>
		{/each}
	</div>



<h2>View Transitions</h2>
<p class="section-description">
		Property-specific transition speeds reflect their ontological character.
	</p>
<div class="view-transitions">
<div class="transition-row">
<span class="property-name">.agency</span>
<span class="property-speed">200ms</span>
<span class="property-character">Efficient, direct</span>
</div>
<div class="transition-row">
<span class="property-name">.io</span>
<span class="property-speed">250ms</span>
<span class="property-character">Measured, analytical</span>
</div>
<div class="transition-row">
<span class="property-name">.space</span>
<span class="property-speed">300ms</span>
<span class="property-character">Exploratory, playful</span>
</div>
<div class="transition-row featured">
<span class="property-name">.ltd</span>
<span class="property-speed">500ms</span>
<span class="property-character">Contemplative, deliberate</span>
</div>
</div>
<p class="gradient-note">
<strong>Gradient principle:</strong> Motion speed reflects epistemic stance. Commercial work
		demands efficiency; philosophical foundation requires dwelling.
	</p>



<h2>Anti-Patterns</h2>
<p class="section-description">
		Avoid these common motion mistakes.
	</p>
<div class="antipatterns">
<div class="antipattern">
<span class="antipattern-icon">✕</span>
<div class="antipattern-content">
<strong>Decorative animation</strong>
<p>Bouncing icons, pulsing elements, attention-seeking motion.</p>
</div>
</div>
<div class="antipattern">
<span class="antipattern-icon">✕</span>
<div class="antipattern-content">
<strong>Duration &gt; 500ms</strong>
<p>Feels sluggish. Users wait for UI, not watch it.</p>
</div>
</div>
<div class="antipattern">
<span class="antipattern-icon">✕</span>
<div class="antipattern-content">
<strong>Custom easing curves</strong>
<p>Breaks motion coherence. One curve for all.</p>
</div>
</div>
<div class="antipattern">
<span class="antipattern-icon">✕</span>
<div class="antipattern-content">
<strong>Animating layout properties</strong>
<p>Avoid <code>width</code>, <code>height</code>. Use <code>transform</code> instead.</p>
</div>
</div>
</div>



<h2>Reduced Motion</h2>
<p class="section-description">
		Always respect user preferences. Some users experience motion sickness or vestibular disorders.
	</p>
<codeblock !important;="" (prefers-reduced-motion:="" *,="" *::after="" *::before,="" 0.01ms="" 1="" animation-duration:="" animation-iteration-count:="" code="{`@media" language="css" reduce)="" title="reduced-motion.css" transition-duration:="" {="" }="" }`}=""></codeblock>



<h2>Usage</h2>
<codeblock code="{usageExample}" language="css" title="motion-usage.css"></codeblock>

