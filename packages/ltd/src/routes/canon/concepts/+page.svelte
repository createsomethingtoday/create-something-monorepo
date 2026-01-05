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
		The ideas behind Canon. Each concept shapes how we make design decisions—click any card to learn more.
	</p>
</header>

<section class="concepts-grid">
	<a href="/canon/concepts/weniger-aber-besser" class="concept-card">
		<h2>Weniger, aber besser</h2>
		<p class="concept-translation">"Less, but better"</p>
		<p class="concept-summary">
			Quality comes from removing what doesn't belong. If it doesn't serve a purpose, it doesn't stay.
		</p>
		<span class="concept-origin">Dieter Rams</span>
	</a>

	<a href="/canon/concepts/zuhandenheit" class="concept-card">
		<h2>Zuhandenheit</h2>
		<p class="concept-translation">"Ready-to-hand" — tools that disappear into use</p>
		<p class="concept-summary">
			Good tools get out of your way. You don't think about the hammer—you think about the nail.
		</p>
		<span class="concept-origin">Martin Heidegger</span>
	</a>

	<a href="/canon/concepts/vorhandenheit" class="concept-card">
		<h2>Vorhandenheit</h2>
		<p class="concept-translation">"Present-at-hand" — when tools demand attention</p>
		<p class="concept-summary">
			When you notice the design, something's broken. Failure makes the invisible visible.
		</p>
		<span class="concept-origin">Martin Heidegger</span>
	</a>

	<a href="/canon/concepts/gestell" class="concept-card">
		<h2>Gestell</h2>
		<p class="concept-translation">"Enframing" — seeing everything as a resource</p>
		<p class="concept-summary">
			The trap of treating everything as raw material to optimize. Not every gap needs filling.
		</p>
		<span class="concept-origin">Martin Heidegger</span>
	</a>

	<a href="/canon/concepts/gelassenheit" class="concept-card">
		<h2>Gelassenheit</h2>
		<p class="concept-translation">"Releasement" — using tools without being used by them</p>
		<p class="concept-summary">
			Use technology fully, but stay free from it. The craftsman uses the hammer; the hammer doesn't use him.
		</p>
		<span class="concept-origin">Martin Heidegger</span>
	</a>

	<a href="/canon/concepts/complementarity" class="concept-card">
		<h2>Complementarity</h2>
		<p class="concept-translation">"Mutual completion" — humans and AI working together</p>
		<p class="concept-summary">
			Human judgment + AI execution = more than either alone. Partnership, not replacement.
		</p>
		<span class="concept-origin">CREATE SOMETHING</span>
	</a>

	<a href="/canon/concepts/hermeneutic-circle" class="concept-card">
		<h2>Hermeneutic Circle</h2>
		<p class="concept-translation">"Parts and whole" — understanding through iteration</p>
		<p class="concept-summary">
			You understand sentences through words, and words through sentences. Each pass deepens meaning.
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
