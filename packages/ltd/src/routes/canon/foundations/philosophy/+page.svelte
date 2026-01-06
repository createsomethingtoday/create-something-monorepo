<script lang="ts">
	import { CodeBlock } from '$lib/canon';
</script>

<svelte:head>
	<title>Philosophy — Canon Design System</title>
	<meta name="description" content="The philosophical foundations of Canon: Zuhandenheit, the Subtractive Triad, and tools that recede into use." />
</svelte:head>

<!-- Header -->
<header class="page-header">
	<p class="eyebrow">Foundations</p>
	<h1>Philosophy</h1>
	<p class="lead">
		Canon is not a style guide. It is a philosophical commitment to tools that recede into use,
		revealing only the work that matters.
	</p>
</header>

<!-- Zuhandenheit -->
<section class="section">
	<h2>Zuhandenheit</h2>
	<p class="pronunciation">/ˈtsuːˌhandənˌhaɪt/ — German: "ready-to-hand"</p>

	<p>
		Martin Heidegger distinguished between two modes of encountering tools:
		<strong>present-at-hand</strong> (Vorhandenheit) and <strong>ready-to-hand</strong> (Zuhandenheit).
	</p>

	<div class="concept-grid">
		<div class="concept-card">
			<h3>Present-at-Hand</h3>
			<p class="concept-german">Vorhandenheit</p>
			<p>
				The hammer as an object of study. You notice its weight, its material, its construction.
				The tool demands attention. Work stops.
			</p>
			<div class="concept-example">
				<span class="label">In Design Systems:</span>
				<span class="value">Documentation you must study. Components that require memorization.</span>
			</div>
		</div>

		<div class="concept-card featured">
			<h3>Ready-to-Hand</h3>
			<p class="concept-german">Zuhandenheit</p>
			<p>
				The hammer disappears into hammering. You think only of the nail, the wall, the picture
				you're hanging. The tool recedes into transparent use.
			</p>
			<div class="concept-example">
				<span class="label">In Design Systems:</span>
				<span class="value">Tokens that feel inevitable. Components that just work.</span>
			</div>
		</div>
	</div>

	<blockquote class="philosophy-quote">
		"The less we just stare at the hammer-thing, and the more we seize hold of it and use it,
		the more primordial does our relationship to it become."
		<cite>— Martin Heidegger, Being and Time</cite>
	</blockquote>

	<p>
		Canon's goal is Zuhandenheit: a design system that disappears into use. When you reach for
		<code>var(--space-md)</code>, you shouldn't think about the golden ratio—you
		achieve the spacing that feels right.
	</p>
</section>

<!-- The Subtractive Triad -->
<section class="section">
	<h2>The Subtractive Triad</h2>
	<p>
		Every creation exists simultaneously at three levels. Each level has its own discipline,
		question, and action. Applied in sequence, they reveal what truly matters.
	</p>

	<div class="triad-grid">
		<div class="triad-card">
			<div class="triad-number">1</div>
			<h3>DRY</h3>
			<p class="triad-level">Implementation Level</p>
			<div class="triad-question">"Have I built this before?"</div>
			<div class="triad-action">Unify</div>
			<p class="triad-description">
				Eliminate duplication. Don't repeat patterns, tokens, or components.
				Every abstraction should exist exactly once.
			</p>
		</div>

		<div class="triad-card">
			<div class="triad-number">2</div>
			<h3>Rams</h3>
			<p class="triad-level">Artifact Level</p>
			<div class="triad-question">"Does this earn its existence?"</div>
			<div class="triad-action">Remove</div>
			<p class="triad-description">
				Dieter Rams: "Weniger, aber besser"—less, but better. Every element must justify
				its presence. Ornament is crime. Function is beauty.
			</p>
		</div>

		<div class="triad-card">
			<div class="triad-number">3</div>
			<h3>Heidegger</h3>
			<p class="triad-level">System Level</p>
			<div class="triad-question">"Does this serve the whole?"</div>
			<div class="triad-action">Reconnect</div>
			<p class="triad-description">
				The hermeneutic circle: parts must serve the whole, and the whole must illuminate
				the parts. Eliminate disconnection.
			</p>
		</div>
	</div>

	<h3>Application</h3>
	<p>
		For any design decision, ask the three questions in order:
	</p>

	<ol class="application-list">
		<li>
			<strong>DRY</strong>: Is this pattern already defined? If so, use it. If not, should it become a pattern?
		</li>
		<li>
			<strong>Rams</strong>: Does this element justify its existence? Can it be removed without loss?
		</li>
		<li>
			<strong>Heidegger</strong>: Does this serve the system's coherence? Does it enable the whole?
		</li>
	</ol>
</section>

<!-- Weniger, aber besser -->
<section class="section">
	<h2>Weniger, aber besser</h2>
	<p class="pronunciation">/ˈveːnɪɡɐ ˈaːbɐ ˈbɛsɐ/ — German: "less, but better"</p>

	<p>
		Dieter Rams' principle guides every Canon decision. It is not minimalism for aesthetics—it is
		minimalism for function. We remove what obscures.
	</p>

	<div class="rams-principles">
		<div class="principle">
			<span class="principle-number">1</span>
			<span class="principle-text">Good design is innovative</span>
		</div>
		<div class="principle">
			<span class="principle-number">2</span>
			<span class="principle-text">Good design makes a product useful</span>
		</div>
		<div class="principle">
			<span class="principle-number">3</span>
			<span class="principle-text">Good design is aesthetic</span>
		</div>
		<div class="principle">
			<span class="principle-number">4</span>
			<span class="principle-text">Good design makes a product understandable</span>
		</div>
		<div class="principle">
			<span class="principle-number">5</span>
			<span class="principle-text">Good design is unobtrusive</span>
		</div>
		<div class="principle highlighted">
			<span class="principle-number">6</span>
			<span class="principle-text">Good design is honest</span>
		</div>
		<div class="principle">
			<span class="principle-number">7</span>
			<span class="principle-text">Good design is long-lasting</span>
		</div>
		<div class="principle">
			<span class="principle-number">8</span>
			<span class="principle-text">Good design is thorough down to the last detail</span>
		</div>
		<div class="principle">
			<span class="principle-number">9</span>
			<span class="principle-text">Good design is environmentally friendly</span>
		</div>
		<div class="principle highlighted">
			<span class="principle-number">10</span>
			<span class="principle-text">Good design is as little design as possible</span>
		</div>
	</div>

	<blockquote class="philosophy-quote">
		"Indifference towards people and the reality in which they live is actually the one and only
		cardinal sin in design."
		<cite>— Dieter Rams</cite>
	</blockquote>
</section>

<!-- Mathematical Foundation -->
<section class="section">
	<h2>Mathematical Foundation</h2>
	<p>
		Canon's spacing and typography derive from the golden ratio (φ = 1.618033...). This is not
		arbitrary aestheticism—it is the recognition that proportional relationships feel natural
		because they occur throughout nature.
	</p>

	<div class="math-demo">
		<div class="phi-visual">
			<div class="phi-rect large"></div>
			<div class="phi-rect medium"></div>
			<div class="phi-rect small"></div>
		</div>
		<div class="phi-values">
			<div class="phi-row">
				<code>--space-xs</code>
				<span>0.5rem</span>
				<span class="phi-note">φ⁻²</span>
			</div>
			<div class="phi-row">
				<code>--space-sm</code>
				<span>1rem</span>
				<span class="phi-note">φ⁻¹</span>
			</div>
			<div class="phi-row">
				<code>--space-md</code>
				<span>1.618rem</span>
				<span class="phi-note">φ⁰ × base</span>
			</div>
			<div class="phi-row">
				<code>--space-lg</code>
				<span>2.618rem</span>
				<span class="phi-note">φ¹</span>
			</div>
			<div class="phi-row">
				<code>--space-xl</code>
				<span>4.236rem</span>
				<span class="phi-note">φ²</span>
			</div>
		</div>
	</div>

	<p>
		Each step in the scale multiplies by φ. The result: spacing that relates harmoniously at
		every level. Adjacent elements feel balanced. The mathematics recede; the harmony remains.
	</p>

	<div class="callout-info">
		<h3 class="callout-heading">Why This Matters</h3>
		<p>
			The golden ratio isn't decoration—it's practical. When spacing follows φ, layouts compose predictably. A card with <code>--space-md</code> padding naturally nests inside a section with <code>--space-lg</code> margins. The proportions align without manual adjustment. This is why Zuhandenheit works: the system makes correct spacing automatic.
		</p>
	</div>
</section>

<!-- Color Philosophy -->
<section class="section">
	<h2>Color Philosophy</h2>
	<p>
		Canon's palette is functional, not decorative. Black and white provide structure. Opacity
		creates hierarchy. Semantic colors serve specific purposes—never ornament.
	</p>

	<div class="color-philosophy">
		<div class="color-principle">
			<h4>Black as Canvas</h4>
			<p>
				Pure black (<code>#000000</code>) is the canvas. Everything else is light revealing form.
			</p>
		</div>
		<div class="color-principle">
			<h4>Opacity for Hierarchy</h4>
			<p>
				White at varying opacities (100%, 80%, 60%, 46%, 20%) creates text hierarchy without
				introducing new colors.
			</p>
		</div>
		<div class="color-principle">
			<h4>Semantic Only</h4>
			<p>
				Colors beyond black/white exist only for meaning: success, error, warning, info.
				Never for decoration.
			</p>
		</div>
	</div>

	<blockquote class="philosophy-quote">
		"Color is not to decorate, but to communicate."
	</blockquote>
</section>

<!-- In Practice -->
<section class="section">
	<h2>In Practice</h2>
	<p>
		Philosophy without application is empty. Here is how Canon's philosophy manifests in code:
	</p>

	<CodeBlock
		code={`/* The Subtractive Triad applied to a component */

/* 1. DRY: Use existing tokens, don't reinvent */
.card {
  padding: var(--space-md);
  border-radius: var(--radius-lg);
}

/* 2. Rams: Only necessary properties */
.card {
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border-default);
  /* No shadows, gradients, or decoration */
}

/* 3. Heidegger: Serve the system's coherence */
.card {
  transition: border-color var(--duration-micro) var(--ease-standard);
}
.card:hover {
  border-color: var(--color-border-emphasis);
  /* Consistent with all other hover states */
}`}
		language="css"
		title="subtractive-component.css"
	/>
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

	.pronunciation {
		font-size: var(--text-body-sm);
		font-style: italic;
		color: var(--color-fg-muted);
		margin-bottom: var(--space-md);
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

	h3 {
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-top: var(--space-lg);
		margin-bottom: var(--space-sm);
	}

	h4 {
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
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
		background: var(--color-bg-surface);
		padding: 2px 6px;
		border-radius: var(--radius-sm);
	}

	/* Philosophy quote */
	.philosophy-quote {
		font-size: var(--text-h3);
		font-style: italic;
		color: var(--color-fg-secondary);
		border-left: 2px solid var(--color-border-emphasis);
		padding-left: var(--space-md);
		margin: var(--space-lg) 0;
		max-width: 50ch;
	}

	.philosophy-quote cite {
		display: block;
		font-size: var(--text-body-sm);
		font-style: normal;
		color: var(--color-fg-muted);
		margin-top: var(--space-sm);
	}

	/* Concept grid */
	.concept-grid {
		display: grid;
		gap: var(--space-md);
		margin: var(--space-lg) 0;
	}

	@media (min-width: 768px) {
		.concept-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	.concept-card {
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.concept-card.featured {
		border-color: var(--color-border-emphasis);
		background: var(--color-bg-subtle);
	}

	.concept-card h3 {
		margin-top: 0;
		margin-bottom: var(--space-xs);
	}

	.concept-german {
		font-size: var(--text-caption);
		font-style: italic;
		color: var(--color-fg-muted);
		margin-bottom: var(--space-sm);
	}

	.concept-card p {
		margin-bottom: var(--space-sm);
	}

	.concept-example {
		padding-top: var(--space-sm);
		border-top: 1px solid var(--color-border-default);
		font-size: var(--text-body-sm);
	}

	.concept-example .label {
		display: block;
		color: var(--color-fg-muted);
		margin-bottom: 4px;
	}

	.concept-example .value {
		color: var(--color-fg-tertiary);
	}

	/* Triad grid */
	.triad-grid {
		display: grid;
		gap: var(--space-md);
		margin: var(--space-lg) 0;
	}

	@media (min-width: 900px) {
		.triad-grid {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	.triad-card {
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		position: relative;
	}

	.triad-number {
		position: absolute;
		top: var(--space-sm);
		right: var(--space-sm);
		width: 24px;
		height: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-bg-subtle);
		border-radius: var(--radius-full);
		font-size: var(--text-caption);
		font-weight: var(--font-semibold);
		color: var(--color-fg-muted);
	}

	.triad-card h3 {
		margin-top: 0;
		margin-bottom: 4px;
	}

	.triad-level {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		margin-bottom: var(--space-sm);
	}

	.triad-question {
		font-size: var(--text-body);
		font-style: italic;
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-xs);
	}

	.triad-action {
		display: inline-block;
		font-size: var(--text-caption);
		font-weight: var(--font-semibold);
		text-transform: uppercase;
		letter-spacing: var(--tracking-wide);
		color: var(--color-fg-primary);
		padding: 2px 8px;
		background: var(--color-bg-subtle);
		border-radius: var(--radius-sm);
		margin-bottom: var(--space-sm);
	}

	.triad-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		margin-bottom: 0;
	}

	/* Application list */
	.application-list {
		list-style: decimal;
		padding-left: var(--space-lg);
		margin: var(--space-md) 0;
	}

	.application-list li {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
		margin-bottom: var(--space-sm);
		max-width: 65ch;
	}

	/* Rams principles */
	.rams-principles {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
		margin: var(--space-lg) 0;
	}

	.principle {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-xs) var(--space-sm);
		border-radius: var(--radius-md);
		transition: background var(--duration-micro) var(--ease-standard);
	}

	.principle:hover {
		background: var(--color-bg-surface);
	}

	.principle.highlighted {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
	}

	.principle-number {
		width: 24px;
		height: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-bg-subtle);
		border-radius: var(--radius-full);
		font-size: var(--text-caption);
		font-weight: var(--font-semibold);
		color: var(--color-fg-muted);
		flex-shrink: 0;
	}

	.principle.highlighted .principle-number {
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
	}

	.principle-text {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
	}

	.principle.highlighted .principle-text {
		color: var(--color-fg-primary);
		font-weight: var(--font-medium);
	}

	/* Math demo */
	.math-demo {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border-radius: var(--radius-lg);
		margin: var(--space-lg) 0;
	}

	@media (min-width: 640px) {
		.math-demo {
			flex-direction: row;
			align-items: center;
		}
	}

	.phi-visual {
		display: flex;
		align-items: flex-end;
		gap: var(--space-xs);
	}

	.phi-rect {
		background: var(--color-fg-muted);
		border-radius: var(--radius-sm);
	}

	.phi-rect.large {
		width: 68px;
		height: 68px;
	}

	.phi-rect.medium {
		width: 42px;
		height: 42px;
	}

	.phi-rect.small {
		width: 26px;
		height: 26px;
	}

	.phi-values {
		flex: 1;
	}

	.phi-row {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: 4px 0;
		border-bottom: 1px solid var(--color-border-default);
	}

	.phi-row:last-child {
		border-bottom: none;
	}

	.phi-row code {
		flex: 1;
	}

	.phi-row span {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	.phi-note {
		font-family: var(--font-mono);
		color: var(--color-fg-muted) !important;
	}

	/* Color philosophy */
	.color-philosophy {
		display: grid;
		gap: var(--space-md);
		margin: var(--space-lg) 0;
	}

	@media (min-width: 768px) {
		.color-philosophy {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	.color-principle {
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border-radius: var(--radius-lg);
	}

	.color-principle p {
		margin-bottom: 0;
		font-size: var(--text-body-sm);
	}
</style>
