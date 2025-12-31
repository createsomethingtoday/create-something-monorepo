<script lang="ts">
	import { onMount } from 'svelte';
	import { QuoteBlock } from '@create-something/components';

	// Parallax tracking - relative to container
	let parallaxContainer: HTMLElement;
	let parallaxOffset = $state(0);

	// Cascade container for intersection observer
	let cascadeContainer: HTMLElement;

	// Demo states
	let gridHovered = $state(false);
	let cascadeVisible = $state(false);

	// Sample data for staggered grid
	const gridItems = Array.from({ length: 12 }, (_, i) => ({
		id: i + 1,
		title: `Item ${i + 1}`
	}));

	onMount(() => {
		const handleScroll = () => {
			if (parallaxContainer) {
				const rect = parallaxContainer.getBoundingClientRect();
				const containerCenter = rect.top + rect.height / 2;
				const viewportCenter = window.innerHeight / 2;
				// Offset from center of viewport - gives smooth parallax as you scroll past
				parallaxOffset = (viewportCenter - containerCenter) * 0.1;
			}
		};

		window.addEventListener('scroll', handleScroll, { passive: true });
		handleScroll(); // Initial calculation

		// Trigger cascade when section comes into view
		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting && !cascadeVisible) {
						cascadeVisible = true;
					}
				});
			},
			{ threshold: 0.3 }
		);

		if (cascadeContainer) {
			observer.observe(cascadeContainer);
		}

		return () => {
			window.removeEventListener('scroll', handleScroll);
			observer.disconnect();
		};
	});
</script>

<svelte:head>
	<title>Award-Winning Patterns in Monochrome | CREATE SOMETHING</title>
	<meta
		name="description"
		content="Exploring black & white design patterns from Awwwards winners through the lens of Canon principles"
	/>
</svelte:head>

<article class="experiment-page">
	<!-- Header -->
	<header class="experiment-header">
		<div class="header-meta">
			<span class="category">Motion & Interaction</span>
			<span class="separator">/</span>
			<span class="reading-time">8 min read</span>
		</div>
		<h1>Award-Winning Patterns in Monochrome</h1>
		<p class="subtitle">
			How constraint produces excellence: black & white design patterns from 2024 Awwwards winners
		</p>
	</header>

	<!-- Abstract -->
	<section class="section">
		<h2>Abstract</h2>
		<p>
			The best black & white websites of 2024 share a pattern: when color is removed, typography,
			spacing, and motion carry all meaning. This constraint forces intentionality.
		</p>
		<p>
			This experiment documents four interaction patterns from award-winning monochromatic sites,
			implemented using Canon design tokens. Each demonstrates how limitation liberates.
		</p>
	</section>

	<!-- The Constraint -->
	<section class="section">
		<h2>The Monochrome Constraint</h2>
		<p>
			Award sites like <strong>Monochrome (ELEMENT)</strong>, <strong>Shuka Design</strong>, and
			<strong>Baseborn Studio</strong> prove that removing color doesn't reduce visual interest—it
			forces designers to master fundamentals.
		</p>
		<QuoteBlock
			quote="Weniger, aber besser. Less, but better."
			attribution="Dieter Rams"
		/>
		<p>Without color to lean on, these sites excel at:</p>
		<ul>
			<li><strong>Typography hierarchy</strong> — Weight and scale create emphasis</li>
			<li><strong>Whitespace rhythm</strong> — Negative space becomes compositional tool</li>
			<li><strong>Purposeful motion</strong> — Animation reveals structure, not decoration</li>
			<li><strong>Depth through layering</strong> — Parallax creates semantic depth</li>
		</ul>
	</section>

	<!-- Pattern 1: Scale + Border Hover -->
	<section class="section">
		<h2>Pattern 1: Scale + Border Progression</h2>
		<p>
			The most common hover pattern across award winners: subtle scale combined with border
			emphasis. Simple, but effective.
		</p>

		<div class="demo-container">
			<div class="demo-grid">
				{#each [1, 2, 3] as item}
					<div class="scale-card">
						<h3>Card {item}</h3>
						<p>Hover for subtle lift</p>
					</div>
				{/each}
			</div>
		</div>

		<h3>Implementation</h3>
		<pre class="code-block">{`.scale-card {
  transition: all var(--duration-micro) var(--ease-standard);
}
.scale-card:hover {
  transform: scale(var(--scale-micro));
  border-color: var(--color-border-emphasis);
}`}</pre>

		<p>
			<strong>Canon tokens used:</strong>
			<code>--duration-micro</code> (200ms), <code>--ease-standard</code>,
			<code>--scale-micro</code> (1.02), <code>--color-border-emphasis</code>
		</p>
	</section>

	<!-- Pattern 2: Underline Reveal -->
	<section class="section">
		<h2>Pattern 2: Typography-First Links</h2>
		<p>
			<strong>U.I.WD.</strong> and <strong>Shuka Design</strong> demonstrate typography-first navigation.
			Links reveal underlines on hover, drawing from print design traditions.
		</p>

		<div class="demo-container">
			<nav class="demo-nav">
				<a href="#pattern1" class="reveal-link">About</a>
				<a href="#pattern2" class="reveal-link">Work</a>
				<a href="#pattern3" class="reveal-link">Contact</a>
			</nav>
		</div>

		<h3>Implementation</h3>
		<pre class="code-block">{`.reveal-link {
  position: relative;
}
.reveal-link::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 0;
  height: 1px;
  background: var(--color-fg-primary);
  transition: width var(--duration-micro) var(--ease-standard);
}
.reveal-link:hover::after {
  width: 100%;
}`}</pre>

		<p>
			The underline isn't decorative—it's an <em>affordance</em>. It shows clickability through
			progressive disclosure rather than persistent decoration.
		</p>
	</section>

	<!-- Pattern 3: Staggered Grid -->
	<section class="section">
		<h2>Pattern 3: Staggered Grid Interaction</h2>
		<p>
			<strong>CalArts 2024</strong> uses staggered opacity changes to emphasize the hovered item.
			Non-hovered siblings fade, creating focus through de-emphasis.
		</p>

		<div class="demo-container">
			<div
				class="stagger-grid"
				onmouseenter={() => (gridHovered = true)}
				onmouseleave={() => (gridHovered = false)}
			>
				{#each gridItems as item, i}
					<div class="stagger-item" style="--index: {i}">
						{item.title}
					</div>
				{/each}
			</div>
		</div>

		<h3>Implementation</h3>
		<pre class="code-block">{`.stagger-item {
  transition: opacity var(--duration-standard) var(--ease-standard);
  transition-delay: calc(var(--cascade-step) * var(--index));
}
.stagger-grid:hover .stagger-item:not(:hover) {
  opacity: 0.5;
}`}</pre>

		<p>
			<strong>Canon tokens used:</strong>
			<code>--cascade-step</code> (50ms) creates the stagger effect. Each item delays by
			<code>50ms * index</code>, revealing the grid's structure through sequential motion.
		</p>
	</section>

	<!-- Pattern 4: Parallax Depth -->
	<section class="section">
		<h2>Pattern 4: Parallax Depth</h2>
		<p>
			<strong>Baseborn Studio</strong> uses subtle parallax to create depth without decoration. Foreground,
			midground, and background layers move at different rates on scroll.
		</p>

		<div class="demo-container parallax-demo" bind:this={parallaxContainer}>
			<div
				class="parallax-layer background"
				style="transform: translateY({parallaxOffset * 0.2}px)"
			>
				Background
			</div>
			<div
				class="parallax-layer midground"
				style="transform: translateY({parallaxOffset * 0.5}px)"
			>
				Midground
			</div>
			<div
				class="parallax-layer foreground"
				style="transform: translateY({parallaxOffset * 1}px)"
			>
				Foreground
			</div>
		</div>

		<h3>Implementation</h3>
		<pre class="code-block">{`// JavaScript
const scroll = window.scrollY;

// CSS
.parallax-layer {
  transform: translateY(calc(var(--scroll, 0) * var(--depth-factor)));
  will-change: transform;
}

/* Depth factors */
.foreground { --depth-factor: -0.1; }
.midground { --depth-factor: -0.05; }
.background { --depth-factor: -0.02; }`}</pre>

		<p>
			<strong>Restraint principle:</strong> Parallax only when semantic depth matters. Hero sections,
			not entire pages. Never on text (readability suffers).
		</p>
	</section>

	<!-- Pattern 5: Cascading Entrance -->
	<section class="section">
		<h2>Pattern 5: Cascading Entrance</h2>
		<p>
			<strong>Typography Principles (Obys)</strong> uses sequential reveals to introduce content.
			Each element fades in with a slight delay, creating rhythm.
		</p>

		<div class="demo-container" bind:this={cascadeContainer}>
			<div class="cascade-container">
				{#each ['Principle 1', 'Principle 2', 'Principle 3', 'Principle 4'] as principle, i}
					<div class="cascade-item" class:visible={cascadeVisible} style="--index: {i}">
						{principle}
					</div>
				{/each}
			</div>
		</div>

		<h3>Implementation</h3>
		<pre class="code-block">{`.cascade-item {
  opacity: 0;
  transform: translateY(20px);
  animation: cascadeIn var(--duration-standard) var(--ease-standard) forwards;
  animation-delay: calc(var(--cascade-step) * var(--index));
}

@keyframes cascadeIn {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}`}</pre>

		<p>
			<strong>Canon tokens used:</strong>
			<code>--cascade-step</code> (50ms) between items, <code>--duration-standard</code> (300ms)
			for each transition. The pattern reveals structure through sequential disclosure.
		</p>
	</section>

	<!-- Philosophical Alignment -->
	<section class="section">
		<h2>Philosophical Alignment</h2>

		<h3>Rams: Constraint as Liberation</h3>
		<p>
			Removing color forces mastery of fundamentals. These patterns work <em>because</em> they
			can't rely on color for emphasis. Typography, scale, and motion carry all meaning.
		</p>

		<h3>Heidegger: Tools That Recede</h3>
		<p>
			When these patterns work well, you don't notice them. The scale hover doesn't announce
			itself—it just makes cards feel responsive. The underline doesn't decorate—it reveals
			affordance. The tool disappears; interaction remains.
		</p>

		<h3>The Subtractive Triad</h3>
		<ul>
			<li><strong>DRY</strong> — Patterns codified as Canon tokens, reusable across properties</li>
			<li><strong>Rams</strong> — Each animation earns its existence through functional purpose</li>
			<li>
				<strong>Heidegger</strong> — Motion serves content revelation, not self-expression
			</li>
		</ul>
	</section>

	<!-- Award References -->
	<section class="section">
		<h2>Award References</h2>
		<p>Patterns sourced from 2024 Awwwards winners:</p>

		<div class="reference-grid">
			<div class="reference">
				<h4>Monochrome (ELEMENT)</h4>
				<p>Site of the Day</p>
				<p class="reference-pattern">Single-color constraint, Three.js depth</p>
				<a
					href="https://www.awwwards.com/sites/monochrome"
					target="_blank"
					rel="noopener noreferrer">View site →</a
				>
			</div>

			<div class="reference">
				<h4>Shuka Design</h4>
				<p>Honorable Mention</p>
				<p class="reference-pattern">Typography-only hierarchy</p>
				<a
					href="https://www.awwwards.com/sites/shuka-design"
					target="_blank"
					rel="noopener noreferrer">View site →</a
				>
			</div>

			<div class="reference">
				<h4>Typography Principles (Obys)</h4>
				<p>Site of the Day (7.73)</p>
				<p class="reference-pattern">Scroll-triggered transitions</p>
				<a
					href="https://www.awwwards.com/sites/typography-principles"
					target="_blank"
					rel="noopener noreferrer">View site →</a
				>
			</div>

			<div class="reference">
				<h4>CalArts 2024</h4>
				<p>Honorable Mention</p>
				<p class="reference-pattern">Interactive grid patterns</p>
				<a
					href="https://www.awwwards.com/sites/calarts-2024"
					target="_blank"
					rel="noopener noreferrer">View site →</a
				>
			</div>

			<div class="reference">
				<h4>U.I.WD.</h4>
				<p>Site of the Day</p>
				<p class="reference-pattern">Typography-first portfolio</p>
				<a
					href="https://www.awwwards.com/sites/uiwd"
					target="_blank"
					rel="noopener noreferrer">View site →</a
				>
			</div>

			<div class="reference">
				<h4>Baseborn Studio</h4>
				<p>Awwwards Winner</p>
				<p class="reference-pattern">Parallax depth, whitespace</p>
				<a
					href="https://www.awwwards.com/sites/baseborn"
					target="_blank"
					rel="noopener noreferrer">View site →</a
				>
			</div>
		</div>
	</section>

	<!-- Conclusion -->
	<section class="section">
		<h2>Conclusion</h2>
		<QuoteBlock
			quote="Constraint is craft. When color is removed, fundamentals remain."
			attribution="CREATE SOMETHING Canon"
		/>
		<p>
			These patterns validate what Canon already knew: monochrome forces intentionality.
			Typography must create hierarchy. Whitespace must breathe. Motion must serve meaning.
		</p>
		<p>
			The award-winning sites prove this isn't asceticism—it's excellence. Constraint doesn't
			reduce possibility; it focuses it. Less color, more clarity. Fewer effects, better craft.
		</p>
		<p>
			<strong>Weniger, aber besser.</strong> Less, but better.
		</p>
	</section>

	<!-- Footer -->
	<footer class="experiment-footer">
		<div class="tags">
			<span class="tag">Motion Design</span>
			<span class="tag">Interaction Patterns</span>
			<span class="tag">Awwwards</span>
			<span class="tag">Monochrome</span>
			<span class="tag">Typography</span>
		</div>
		<p class="principles">Tests: Rams Principle 10 (Less Design), Heidegger (Zuhandenheit)</p>
	</footer>
</article>

<style>
	.experiment-page {
		max-width: var(--width-content);
		margin: 0 auto;
		padding: var(--space-xl) var(--gutter);
	}

	/* Header */
	.experiment-header {
		margin-bottom: var(--space-2xl);
		padding-bottom: var(--space-xl);
		border-bottom: 1px solid var(--color-border-default);
	}

	.header-meta {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		margin-bottom: var(--space-sm);
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.separator {
		color: var(--color-fg-subtle);
	}

	.experiment-header h1 {
		font-size: var(--text-h1);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
		line-height: var(--leading-tight);
	}

	.subtitle {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
	}

	/* Sections */
	.section {
		margin-bottom: var(--space-2xl);
	}

	.section h2 {
		font-size: var(--text-h2);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-md);
	}

	.section h3 {
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-top: var(--space-lg);
		margin-bottom: var(--space-sm);
	}

	.section h4 {
		font-size: var(--text-body-lg);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.section p {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
		margin-bottom: var(--space-sm);
	}

	.section ul {
		margin: var(--space-sm) 0;
		padding-left: var(--space-md);
	}

	.section li {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
		margin-bottom: var(--space-xs);
	}

	.section a {
		color: var(--color-fg-primary);
		text-decoration: underline;
		text-underline-offset: 0.15em;
	}

	.section a:hover {
		color: var(--color-fg-secondary);
	}

	.section strong {
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
	}

	.section code {
		font-family: var(--font-mono);
		font-size: 0.9em;
		padding: 0.15em 0.4em;
		background: var(--color-bg-surface);
		border-radius: var(--radius-sm);
	}

	/* Demo Container */
	.demo-container {
		margin: var(--space-lg) 0;
		padding: var(--space-xl);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
	}

	/* Pattern 1: Scale Cards */
	.demo-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: var(--space-md);
	}

	.scale-card {
		padding: var(--space-lg);
		background: var(--color-bg-pure);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		transition: all var(--duration-micro) var(--ease-standard);
		cursor: pointer;
	}

	.scale-card:hover {
		transform: scale(var(--scale-micro));
		border-color: var(--color-border-emphasis);
	}

	.scale-card h3 {
		font-size: var(--text-body-lg);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-xs) 0;
	}

	.scale-card p {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		margin: 0;
	}

	/* Pattern 2: Reveal Links */
	.demo-nav {
		display: flex;
		gap: var(--space-lg);
		justify-content: center;
	}

	.reveal-link {
		position: relative;
		font-size: var(--text-body-lg);
		color: var(--color-fg-primary);
		text-decoration: none;
		padding-bottom: 0.25em;
	}

	.reveal-link::after {
		content: '';
		position: absolute;
		bottom: 0;
		left: 0;
		width: 0;
		height: 1px;
		background: var(--color-fg-primary);
		transition: width var(--duration-micro) var(--ease-standard);
	}

	.reveal-link:hover::after {
		width: 100%;
	}

	/* Pattern 3: Staggered Grid */
	.stagger-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
		gap: var(--space-sm);
		/* Define cascade timing locally until Canon tokens are in CSS */
		--cascade-step: 50ms;
	}

	.stagger-item {
		padding: var(--space-md);
		background: var(--color-bg-pure);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-sm);
		text-align: center;
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		transition: opacity 300ms cubic-bezier(0.4, 0, 0.2, 1);
		transition-delay: calc(var(--cascade-step) * var(--index));
		cursor: pointer;
	}

	.stagger-grid:hover .stagger-item:not(:hover) {
		opacity: 0.5;
	}

	.stagger-item:hover {
		border-color: var(--color-border-emphasis);
	}

	/* Pattern 4: Parallax */
	.parallax-demo {
		position: relative;
		height: 300px;
		overflow: hidden;
	}

	.parallax-layer {
		position: absolute;
		left: 50%;
		transform: translateX(-50%);
		padding: var(--space-md) var(--space-lg);
		background: var(--color-bg-pure);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		color: var(--color-fg-secondary);
		font-size: var(--text-body-sm);
		will-change: transform;
	}

	.parallax-layer.background {
		top: 20%;
		opacity: 0.5;
		border-color: var(--color-border-default);
	}

	.parallax-layer.midground {
		top: 40%;
		opacity: 0.75;
		border-color: var(--color-border-default);
	}

	.parallax-layer.foreground {
		top: 60%;
		opacity: 1;
		border-color: var(--color-border-emphasis);
	}

	/* Pattern 5: Cascade */
	.cascade-container {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		/* Define cascade timing locally until Canon tokens are in CSS */
		--cascade-step: 50ms;
	}

	.cascade-item {
		padding: var(--space-md);
		background: var(--color-bg-pure);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-sm);
		color: var(--color-fg-secondary);
		opacity: 0;
		transform: translateY(20px);
	}

	.cascade-item.visible {
		animation: cascadeIn 300ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
		animation-delay: calc(var(--cascade-step) * var(--index));
	}

	@keyframes cascadeIn {
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* Code Block */
	.code-block {
		font-family: var(--font-mono);
		font-size: var(--text-body-sm);
		line-height: 1.6;
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		overflow-x: auto;
		margin: var(--space-sm) 0 var(--space-md) 0;
		color: var(--color-fg-secondary);
	}

	/* Reference Grid */
	.reference-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: var(--space-md);
		margin: var(--space-md) 0;
	}

	.reference {
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
	}

	.reference h4 {
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-xs) 0;
	}

	.reference p {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		margin: 0 0 var(--space-xs) 0;
	}

	.reference-pattern {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		font-style: italic;
	}

	.reference a {
		font-size: var(--text-body-sm);
		color: var(--color-fg-primary);
		text-decoration: underline;
		text-underline-offset: 0.15em;
	}

	.reference a:hover {
		color: var(--color-fg-secondary);
	}

	/* Footer */
	.experiment-footer {
		margin-top: var(--space-2xl);
		padding-top: var(--space-lg);
		border-top: 1px solid var(--color-border-default);
	}

	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-xs);
		margin-bottom: var(--space-sm);
	}

	.tag {
		padding: var(--space-xs) var(--space-sm);
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-full);
	}

	.principles {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		font-family: var(--font-mono);
	}

	/* Reduced Motion */
	@media (prefers-reduced-motion: reduce) {
		.scale-card,
		.reveal-link::after,
		.stagger-item,
		.cascade-item {
			transition: none;
			animation: none;
		}

		.parallax-layer {
			transform: translateX(-50%) !important;
		}
	}

	/* Responsive */
	@media (max-width: 768px) {
		.experiment-header h1 {
			font-size: var(--text-h2);
		}

		.demo-grid {
			grid-template-columns: 1fr;
		}

		.demo-nav {
			flex-direction: column;
			align-items: center;
		}

		.reference-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
