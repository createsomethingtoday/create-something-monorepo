<script lang="ts">
	import { CodeBlock } from '$lib/canon';

	// Duration tokens
	const durationTokens = [
		{ token: '--duration-instant', value: '100ms', description: 'Instant feedback', use: 'Icon color, opacity flash' },
		{ token: '--duration-micro', value: '200ms', description: 'Micro-interactions', use: 'Hover states, toggles' },
		{ token: '--duration-standard', value: '300ms', description: 'Standard transitions', use: 'Modal open/close, tabs' },
		{ token: '--duration-complex', value: '500ms', description: 'Complex animations', use: 'Multi-step, orchestrated' },
		{ token: '--duration-slow', value: '700ms', description: 'Deliberate motion', use: 'Page transitions, reveals' }
	];

	// Easing tokens
	const easingTokens = [
		{ token: '--ease-standard', value: 'cubic-bezier(0.4, 0.0, 0.2, 1)', description: 'Default easing', use: 'Most transitions' },
		{ token: '--ease-decelerate', value: 'cubic-bezier(0.0, 0.0, 0.2, 1)', description: 'Enter screen', use: 'Elements appearing' },
		{ token: '--ease-accelerate', value: 'cubic-bezier(0.4, 0.0, 1, 1)', description: 'Leave screen', use: 'Elements disappearing' }
	];

	let hoveredDuration = $state<string | null>(null);

	const usageExample = `/* Hover transitions */
.button {
  transition: all var(--duration-micro) var(--ease-standard);
}

.button:hover {
  background: var(--color-hover);
}

/* Modal entrance */
.modal {
  animation: fadeIn var(--duration-standard) var(--ease-decelerate);
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}`;
</script>

<svelte:head>
	<title>Motion — Canon Design System</title>
	<meta name="description" content="Canon motion system: timing, easing, and animation principles for purposeful motion." />
</svelte:head>

<!-- Header -->
<header class="page-header">
	<p class="eyebrow">Foundations</p>
	<h1>Motion</h1>
	<p class="lead">
		Motion should be purposeful, not decorative. Animation reveals state changes and guides
		attention. When in doubt, don't animate.
	</p>
</header>

<!-- Philosophy -->
<section class="section">
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
</section>

<!-- Duration -->
<section class="section">
	<h2>Duration</h2>
	<p class="section-description">
		Five duration levels from instant feedback to deliberate reveals.
	</p>

	<div class="duration-grid">
		{#each durationTokens as duration}
			<button
				class="duration-item"
				class:active={hoveredDuration === duration.token}
				onmouseenter={() => hoveredDuration = duration.token}
				onmouseleave={() => hoveredDuration = null}
			>
				<div class="duration-visual">
					<div
						class="duration-bar"
						class:animating={hoveredDuration === duration.token}
						style="transition-duration: var({duration.token})"
					></div>
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
</section>

<!-- Easing -->
<section class="section">
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
						<svg viewBox="0 0 100 100" class="curve-svg">
							<path d="M 0 100 C 40 100, 20 0, 100 0" fill="none" stroke="currentColor" stroke-width="2"/>
						</svg>
					{:else if ease.token === '--ease-decelerate'}
						<svg viewBox="0 0 100 100" class="curve-svg">
							<path d="M 0 100 C 0 100, 20 0, 100 0" fill="none" stroke="currentColor" stroke-width="2"/>
						</svg>
					{:else}
						<svg viewBox="0 0 100 100" class="curve-svg">
							<path d="M 0 100 C 40 100, 100 0, 100 0" fill="none" stroke="currentColor" stroke-width="2"/>
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
</section>

<!-- View Transitions -->
<section class="section">
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
</section>

<!-- Anti-patterns -->
<section class="section">
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
				<strong>Duration > 500ms</strong>
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
</section>

<!-- Reduced Motion -->
<section class="section">
	<h2>Reduced Motion</h2>
	<p class="section-description">
		Always respect user preferences. Some users experience motion sickness or vestibular disorders.
	</p>

	<CodeBlock
		code={`@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}`}
		language="css"
		title="reduced-motion.css"
	/>
</section>

<!-- Usage -->
<section class="section">
	<h2>Usage</h2>
	<CodeBlock code={usageExample} language="css" title="motion-usage.css" />
</section>

<style>
	/* Page header */
	.page-header {
		margin-bottom: var(--space-2xl);
		padding-bottom: var(--space-xl);
		border-bottom: 1px solid var(--color-border-default);
	}

	.eyebrow {
		font-size: var(--text-caption);
		text-transform: uppercase;
		letter-spacing: var(--tracking-widest);
		color: var(--color-fg-muted);
		margin-bottom: var(--space-xs);
	}

	h1 {
		font-size: var(--text-display);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
	}

	.lead {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
		max-width: 65ch;
	}

	/* Sections */
	.section {
		margin-bottom: var(--space-2xl);
	}

	h2 {
		font-size: var(--text-h2);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
	}

	h4 {
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.section-description {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-lg);
		max-width: 65ch;
	}

	.section-description code {
		font-family: var(--font-mono);
		font-size: var(--text-body-sm);
		background: var(--color-bg-surface);
		padding: 2px 6px;
		border-radius: var(--radius-sm);
	}

	p {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
		margin-bottom: var(--space-md);
		max-width: 65ch;
	}

	code {
		font-family: var(--font-mono);
		font-size: var(--text-body-sm);
		color: var(--color-fg-primary);
	}

	/* Principles grid */
	.principles-grid {
		display: grid;
		gap: var(--space-md);
		margin: var(--space-lg) 0;
	}

	@media (min-width: 640px) {
		.principles-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (min-width: 900px) {
		.principles-grid {
			grid-template-columns: repeat(4, 1fr);
		}
	}

	.principle-card {
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border-radius: var(--radius-lg);
	}

	.principle-card p {
		font-size: var(--text-body-sm);
		margin: 0;
	}

	.principle-card code {
		font-size: var(--text-caption);
		background: var(--color-bg-subtle);
		padding: 2px 6px;
		border-radius: var(--radius-sm);
	}

	/* Duration grid */
	.duration-grid {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.duration-item {
		display: flex;
		gap: var(--space-md);
		padding: var(--space-sm);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		cursor: pointer;
		text-align: left;
		transition: border-color var(--duration-micro) var(--ease-standard);
	}

	.duration-item:hover,
	.duration-item.active {
		border-color: var(--color-border-emphasis);
	}

	.duration-visual {
		width: 120px;
		height: 40px;
		background: var(--color-bg-subtle);
		border-radius: var(--radius-md);
		overflow: hidden;
		flex-shrink: 0;
	}

	.duration-bar {
		width: 100%;
		height: 100%;
		background: var(--color-fg-muted);
		transform: translateX(-100%);
		transition-property: transform;
		transition-timing-function: var(--ease-standard);
	}

	.duration-bar.animating {
		transform: translateX(0);
	}

	.duration-info {
		flex: 1;
	}

	.duration-header {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		margin-bottom: 4px;
	}

	.duration-value {
		font-family: var(--font-mono);
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.duration-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		margin: 0 0 4px 0;
	}

	.duration-use {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		margin: 0;
	}

	/* Easing grid */
	.easing-grid {
		display: grid;
		gap: var(--space-md);
	}

	@media (min-width: 768px) {
		.easing-grid {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	.easing-item {
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border-radius: var(--radius-lg);
	}

	.easing-visual {
		height: 60px;
		background: var(--color-bg-subtle);
		border-radius: var(--radius-md);
		margin-bottom: var(--space-sm);
		position: relative;
		overflow: hidden;
	}

	.easing-ball {
		width: 24px;
		height: 24px;
		background: var(--color-fg-primary);
		border-radius: var(--radius-full);
		position: absolute;
		top: 50%;
		left: 12px;
		transform: translateY(-50%);
		transition: left 1s;
	}

	.easing-item:hover .easing-ball {
		left: calc(100% - 36px);
	}

	.easing-curve {
		height: 60px;
		margin-bottom: var(--space-sm);
	}

	.curve-svg {
		width: 100%;
		height: 100%;
		color: var(--color-fg-muted);
	}

	.easing-info code {
		display: block;
		font-size: var(--text-caption);
		margin-bottom: 4px;
	}

	.easing-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		margin: 0 0 4px 0;
	}

	.easing-use {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		margin: 0;
	}

	/* View transitions */
	.view-transitions {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
		margin-bottom: var(--space-md);
	}

	.transition-row {
		display: grid;
		grid-template-columns: 100px 80px 1fr;
		gap: var(--space-sm);
		padding: var(--space-sm);
		background: var(--color-bg-surface);
		border-radius: var(--radius-md);
		align-items: center;
	}

	.transition-row.featured {
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-emphasis);
	}

	.property-name {
		font-family: var(--font-mono);
		font-size: var(--text-body-sm);
		color: var(--color-fg-primary);
	}

	.property-speed {
		font-family: var(--font-mono);
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.property-character {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	.gradient-note {
		padding: var(--space-sm);
		background: var(--color-bg-surface);
		border-radius: var(--radius-md);
		font-size: var(--text-body-sm);
	}

	/* Anti-patterns */
	.antipatterns {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.antipattern {
		display: flex;
		gap: var(--space-sm);
		padding: var(--space-sm);
		background: var(--color-error-muted);
		border: 1px solid var(--color-error-border);
		border-radius: var(--radius-md);
	}

	.antipattern-icon {
		color: var(--color-error);
		font-weight: var(--font-bold);
		flex-shrink: 0;
	}

	.antipattern-content strong {
		display: block;
		color: var(--color-fg-primary);
		margin-bottom: 4px;
	}

	.antipattern-content p {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		margin: 0;
	}

	.antipattern-content code {
		font-size: var(--text-caption);
		background: var(--color-bg-surface);
		padding: 2px 6px;
		border-radius: var(--radius-sm);
	}
</style>
