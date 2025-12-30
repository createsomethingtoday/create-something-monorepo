<script lang="ts">
	// Weniger, aber besser - Canonical Definition
	// The philosophical foundation of CREATE SOMETHING's design language
</script>

<svelte:head>
	<title>Weniger, aber besser — Canon Concepts</title>
	<meta
		name="description"
		content="'Less, but better' - Dieter Rams' guiding principle and the philosophical foundation of Canon design."
	/>
</svelte:head>

<header class="concept-header">
	<span class="concept-label">Concept</span>
	<h1 class="concept-title">Weniger, aber besser</h1>
	<p class="concept-pronunciation">/ˈveːnɪɡɐ ˈaːbɐ ˈbɛsɐ/</p>
	<p class="concept-translation">German: "Less, but better"</p>
</header>

<section class="concept-section">
	<h2>Definition</h2>
	<blockquote class="definition-block">
		<p>
			The principle that quality emerges through disciplined subtraction rather than addition.
			Every element must earn its existence by serving a purpose. What remains after removing
			the unnecessary is not diminished but revealed.
		</p>
	</blockquote>
</section>

<section class="concept-section">
	<h2>Origin</h2>
	<p>
		Attributed to <strong>Dieter Rams</strong>, Chief Design Officer at Braun (1961–1995),
		who distilled his design philosophy into this phrase. Rams' work influenced generations
		of designers, from Apple's Jonathan Ive to the entire modern minimalist movement.
	</p>
	<p>
		The phrase captures what Rams demonstrated through decades of product design: that
		removing what doesn't belong creates space for what does. A Braun radio with fewer
		controls is not simpler—it is <em>clearer</em>.
	</p>
</section>

<section class="concept-section">
	<h2>In Canon</h2>
	<p>
		<em>Weniger, aber besser</em> is the generative principle behind every Canon decision.
		It manifests across scales:
	</p>

	<div class="manifestation-grid">
		<div class="manifestation">
			<h3>Tokens</h3>
			<p>
				One color palette. One type scale. One spacing system based on the golden ratio (φ = 1.618).
				Constraints that liberate rather than limit.
			</p>
		</div>

		<div class="manifestation">
			<h3>Components</h3>
			<p>
				Each component earns existence by solving a real problem. No "nice to have" variants.
				A button does what buttons do—nothing more, nothing less.
			</p>
		</div>

		<div class="manifestation">
			<h3>Motion</h3>
			<p>
				Animation reveals state changes, never decorates. 200ms for micro-interactions.
				One easing curve. Movement that guides attention, not demands it.
			</p>
		</div>

		<div class="manifestation">
			<h3>Code</h3>
			<p>
				Tailwind for structure, Canon for aesthetics. No abstractions for hypothetical futures.
				Three similar lines are better than premature extraction.
			</p>
		</div>
	</div>
</section>

<section class="concept-section">
	<h2>The Subtractive Triad</h2>
	<p>
		CREATE SOMETHING operationalizes <em>weniger, aber besser</em> through three levels
		of disciplined subtraction:
	</p>

	<ol class="triad-list">
		<li>
			<strong>DRY</strong> (Implementation) — "Have I built this before?" → Unify
		</li>
		<li>
			<strong>Rams</strong> (Artifact) — "Does this earn its existence?" → Remove
		</li>
		<li>
			<strong>Heidegger</strong> (System) — "Does this serve the whole?" → Reconnect
		</li>
	</ol>

	<p>
		The triad is coherent because it applies one principle—<em>subtractive revelation</em>—at
		three scales. Each question removes a different kind of excess: duplication, ornament,
		disconnection.
	</p>
</section>

<section class="concept-section">
	<h2>Rams' Ten Principles</h2>
	<p>
		The fuller context for <em>weniger, aber besser</em>. Good design is:
	</p>

	<ol class="principles-list">
		<li><strong>Innovative</strong> — Possibilities of progress are never exhausted</li>
		<li><strong>Useful</strong> — A product is bought to be used</li>
		<li><strong>Aesthetic</strong> — Well-executed affects our wellbeing</li>
		<li><strong>Understandable</strong> — Clarifies the product's structure</li>
		<li><strong>Unobtrusive</strong> — Products are tools, not decorations</li>
		<li><strong>Honest</strong> — Does not manipulate or make promises it cannot keep</li>
		<li><strong>Long-lasting</strong> — Avoids being fashionable, never appears antiquated</li>
		<li><strong>Thorough</strong> — Nothing must be arbitrary or left to chance</li>
		<li><strong>Environmentally friendly</strong> — Conserves resources throughout lifecycle</li>
		<li><strong>As little design as possible</strong> — Concentrates on essential aspects</li>
	</ol>

	<p class="principle-note">
		The tenth principle is <em>weniger, aber besser</em> restated: design is complete
		not when there is nothing left to add, but when there is nothing left to take away.
	</p>
</section>

<section class="concept-section">
	<h2>Anti-Patterns</h2>
	<p>
		What <em>weniger, aber besser</em> is <strong>not</strong>:
	</p>

	<ul class="antipattern-list">
		<li>
			<strong>Minimalism as aesthetic</strong> — The goal is clarity, not emptiness.
			Removing the necessary leaves a void; removing the unnecessary reveals structure.
		</li>
		<li>
			<strong>Feature reduction</strong> — Fewer features ≠ better product.
			The right features, fully realized, is the goal.
		</li>
		<li>
			<strong>Austerity</strong> — Subtraction serves human needs, not budgets.
			A Braun radio was not cheap; it was <em>complete</em>.
		</li>
		<li>
			<strong>One-size-fits-all</strong> — Context determines what is "less."
			A form needs labels; a dashboard needs density.
		</li>
	</ul>
</section>

<section class="concept-section">
	<h2>Application Test</h2>
	<p>
		When evaluating any design decision—token, component, pattern, or page—ask:
	</p>

	<blockquote class="test-block">
		<p>"If I remove this, what breaks?"</p>
	</blockquote>

	<p>
		If nothing breaks, remove it. If something breaks, the element has earned its existence.
		This is the operational meaning of <em>weniger, aber besser</em>.
	</p>
</section>

<section class="concept-section references">
	<h2>References</h2>
	<ul class="reference-list">
		<li>
			Rams, Dieter. <em>Less and More: The Design Ethos of Dieter Rams</em>. Berlin: Gestalten, 2009.
		</li>
		<li>
			Hustwit, Gary. <em>Rams</em> (documentary film). Film First, 2018.
		</li>
		<li>
			<a href="/canon/foundations/philosophy">Canon Foundations: Philosophy</a>
		</li>
		<li>
			<a href="/patterns/subtractive-triad-audit">Pattern: Subtractive Triad Audit</a>
		</li>
	</ul>
</section>

<style>
	/* Header */
	.concept-header {
		margin-bottom: var(--space-xl);
		padding-bottom: var(--space-lg);
		border-bottom: 1px solid var(--color-border-default);
	}

	.concept-label {
		display: inline-block;
		font-size: var(--text-caption);
		font-weight: var(--font-medium);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: var(--tracking-wider);
		margin-bottom: var(--space-xs);
	}

	.concept-title {
		font-size: var(--text-display);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		letter-spacing: var(--tracking-tight);
		margin-bottom: var(--space-xs);
		font-style: italic;
	}

	.concept-pronunciation {
		font-family: var(--font-mono);
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		margin-bottom: var(--space-xs);
	}

	.concept-translation {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
	}

	/* Sections */
	.concept-section {
		margin-bottom: var(--space-xl);
	}

	.concept-section h2 {
		font-size: var(--text-h2);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-md);
		letter-spacing: var(--tracking-tight);
	}

	.concept-section h3 {
		font-size: var(--text-h3);
		font-weight: var(--font-medium);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.concept-section p {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
		margin-bottom: var(--space-md);
	}

	.concept-section p:last-child {
		margin-bottom: 0;
	}

	/* Definition block */
	.definition-block {
		padding: var(--space-lg);
		background: var(--color-bg-subtle);
		border-left: 3px solid var(--color-fg-primary);
		border-radius: 0 var(--radius-md) var(--radius-md) 0;
		margin: 0;
	}

	.definition-block p {
		font-size: var(--text-body-lg);
		color: var(--color-fg-primary);
		margin: 0;
	}

	/* Manifestation grid */
	.manifestation-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: var(--space-md);
		margin-top: var(--space-md);
	}

	.manifestation {
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.manifestation p {
		font-size: var(--text-body-sm);
		margin: 0;
	}

	/* Lists */
	.triad-list,
	.principles-list {
		list-style: decimal;
		padding-left: var(--space-lg);
		margin-bottom: var(--space-md);
	}

	.triad-list li,
	.principles-list li {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-sm);
		line-height: var(--leading-relaxed);
	}

	.principle-note {
		font-style: italic;
		color: var(--color-fg-tertiary);
	}

	.antipattern-list {
		list-style: none;
		padding: 0;
	}

	.antipattern-list li {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-md);
		padding-left: var(--space-md);
		border-left: 2px solid var(--color-border-emphasis);
	}

	/* Test block */
	.test-block {
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		text-align: center;
		margin: var(--space-md) 0;
	}

	.test-block p {
		font-size: var(--text-h3);
		font-style: italic;
		color: var(--color-fg-primary);
		margin: 0;
	}

	/* References */
	.references {
		padding-top: var(--space-lg);
		border-top: 1px solid var(--color-border-default);
	}

	.reference-list {
		list-style: none;
		padding: 0;
	}

	.reference-list li {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		margin-bottom: var(--space-sm);
	}

	.reference-list a {
		color: var(--color-fg-secondary);
		text-decoration: underline;
		text-underline-offset: 2px;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.reference-list a:hover {
		color: var(--color-fg-primary);
	}
</style>
