<script lang="ts">
	// Canon Concepts - Canonical Glossary
	// Formal definitions for CREATE SOMETHING's philosophical vocabulary
</script>

<svelte:head>
	<title>Concepts — Canon Design System</title>
	<meta
		name="description"
		content="Canonical definitions for the philosophical vocabulary of CREATE SOMETHING's design system."
	/>
</svelte:head>

<header class="page-header">
	<h1>Concepts</h1>
	<p class="page-intro">
		Canonical definitions for the philosophical vocabulary that grounds Canon.
		Each concept represents a principle that informs design decisions across
		CREATE SOMETHING properties.
	</p>
</header>

<section class="concepts-grid">
	<a href="/canon/concepts/weniger-aber-besser" class="concept-card">
		<h2>Weniger, aber besser</h2>
		<p class="concept-translation">"Less, but better"</p>
		<p class="concept-summary">
			The principle that quality emerges through disciplined subtraction.
			Every element must earn its existence.
		</p>
		<span class="concept-origin">Dieter Rams</span>
	</a>

	<a href="/canon/concepts/zuhandenheit" class="concept-card">
		<h2>Zuhandenheit</h2>
		<p class="concept-translation">"Ready-to-hand"</p>
		<p class="concept-summary">
			Tools that recede into transparent use. When working well,
			the hammer disappears—only the hammering remains.
		</p>
		<span class="concept-origin">Martin Heidegger</span>
	</a>

	<a href="/canon/concepts/vorhandenheit" class="concept-card">
		<h2>Vorhandenheit</h2>
		<p class="concept-translation">"Present-at-hand"</p>
		<p class="concept-summary">
			When tools become objects of attention. Breakdown reveals what
			was previously invisible. The failure state of design.
		</p>
		<span class="concept-origin">Martin Heidegger</span>
	</a>

	<a href="/canon/concepts/gestell" class="concept-card">
		<h2>Gestell</h2>
		<p class="concept-translation">"Enframing"</p>
		<p class="concept-summary">
			The danger of technological thinking that reduces everything to
			standing-reserve. Automation that fills every gap is invasion.
		</p>
		<span class="concept-origin">Martin Heidegger</span>
	</a>

	<a href="/canon/concepts/gelassenheit" class="concept-card">
		<h2>Gelassenheit</h2>
		<p class="concept-translation">"Releasement"</p>
		<p class="concept-summary">
			Neither rejection nor submission—full engagement without capture.
			The craftsman uses the hammer; the hammer does not use him.
		</p>
		<span class="concept-origin">Martin Heidegger</span>
	</a>

	<a href="/canon/concepts/complementarity" class="concept-card">
		<h2>Complementarity</h2>
		<p class="concept-translation">"Mutual completion"</p>
		<p class="concept-summary">
			Human and AI capabilities complete rather than replace each other.
			Judgment and execution, together forming a whole.
		</p>
		<span class="concept-origin">CREATE SOMETHING</span>
	</a>

	<a href="/canon/concepts/hermeneutic-circle" class="concept-card">
		<h2>Hermeneutic Circle</h2>
		<p class="concept-translation">"Understanding through parts and whole"</p>
		<p class="concept-summary">
			Parts inform the whole; the whole informs parts. Understanding
			emerges through iterative interpretation.
		</p>
		<span class="concept-origin">Hermeneutic Tradition</span>
	</a>
</section>

<style>
	.page-header {
		margin-bottom: var(--space-xl);
	}

	.page-header h1 {
		font-size: var(--text-display);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		letter-spacing: var(--tracking-tight);
		margin-bottom: var(--space-md);
	}

	.page-intro {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		max-width: 65ch;
		line-height: var(--leading-relaxed);
	}

	.concepts-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: var(--space-md);
	}

	.concept-card {
		display: flex;
		flex-direction: column;
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		text-decoration: none;
		transition: all var(--duration-micro) var(--ease-standard);
		position: relative;
	}

	.concept-card:not(.concept-placeholder):hover {
		border-color: var(--color-border-emphasis);
		transform: translateY(-2px);
	}

	.concept-card h2 {
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		font-style: italic;
		margin-bottom: var(--space-xs);
	}

	.concept-translation {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		margin-bottom: var(--space-sm);
	}

	.concept-summary {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
		flex: 1;
		margin-bottom: var(--space-md);
	}

	.concept-origin {
		font-size: var(--text-caption);
		color: var(--color-fg-tertiary);
		text-transform: uppercase;
		letter-spacing: var(--tracking-wider);
	}

</style>
