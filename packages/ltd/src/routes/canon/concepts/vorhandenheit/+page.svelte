<script lang="ts">
	// Vorhandenheit - Canonical Definition
	// Heidegger's concept of present-at-hand, the counterpart to Zuhandenheit
</script>

<svelte:head>
	<title>Vorhandenheit — Canon Concepts</title>
	<meta
		name="description"
		content="'Present-at-hand' - Heidegger's concept of detached theoretical observation, when tools become objects of attention."
	/>
</svelte:head>

<header class="concept-header">
	<span class="concept-label">Concept</span>
	<h1 class="concept-title">Vorhandenheit</h1>
	<p class="concept-pronunciation">/ˈfoːɐ̯handn̩haɪt/</p>
	<p class="concept-translation">German: "Present-at-hand" (literally: "before-hand-ness")</p>
</header>

<section class="concept-section">
	<h2>Definition</h2>
	<blockquote class="definition-block">
		<p>
			The mode of being in which things become objects of detached theoretical observation.
			When a tool breaks or proves unsuitable, it shifts from ready-to-hand to present-at-hand—we
			notice it as an object rather than using it transparently. In Canon design, Vorhandenheit
			signals failure: the infrastructure has become visible.
		</p>
	</blockquote>
</section>

<section class="concept-section">
	<h2>Origin</h2>
	<p>
		Martin Heidegger distinguished <em>Vorhandenheit</em> from <em>Zuhandenheit</em> in
		<em>Being and Time</em> (1927). Western philosophy, he argued, had privileged the
		present-at-hand mode—treating the world as a collection of objects to be studied,
		measured, and categorized.
	</p>
	<p>
		But this theoretical stance is derived, not primordial. We first encounter hammers
		by hammering, not by measuring their mass. Vorhandenheit emerges from the breakdown
		of Zuhandenheit—when the hammer breaks, we suddenly see it as an object.
	</p>
</section>

<section class="concept-section">
	<h2>In Canon</h2>
	<p>
		Vorhandenheit is the diagnostic signal for design failure:
	</p>

	<div class="manifestation-grid">
		<div class="manifestation warning">
			<h3>When Components Demand Attention</h3>
			<p>
				A button that makes you think about its styling. A form that requires consulting
				documentation. The component has become present-at-hand.
			</p>
		</div>

		<div class="manifestation warning">
			<h3>When Infrastructure Becomes Visible</h3>
			<p>
				Deployment that requires manual steps. Database queries that need optimization
				mid-feature. The infrastructure has surfaced as an obstacle.
			</p>
		</div>

		<div class="manifestation warning">
			<h3>When Motion Draws Eyes</h3>
			<p>
				Animation that users notice and comment on. Loading states that feel slow.
				The motion has become the subject rather than the transition.
			</p>
		</div>

		<div class="manifestation warning">
			<h3>When AI Partnership Breaks</h3>
			<p>
				Needing to explain context repeatedly. Correcting obvious errors. The AI has
				shifted from invisible partner to visible obstacle.
			</p>
		</div>
	</div>
</section>

<section class="concept-section">
	<h2>The Three Modes of Breakdown</h2>
	<p>
		Heidegger identified three ways Zuhandenheit fails, revealing Vorhandenheit:
	</p>

	<div class="breakdown-modes">
		<div class="breakdown-mode">
			<h3>Conspicuousness</h3>
			<p class="german">Auffälligkeit</p>
			<p>
				The tool breaks. A component throws an error; the build fails; the API returns 500.
				The tool announces its presence through malfunction.
			</p>
			<p class="response">
				<strong>Response:</strong> Fix the immediate failure, but also ask—why did this
				break? What assumption proved wrong?
			</p>
		</div>

		<div class="breakdown-mode">
			<h3>Obtrusiveness</h3>
			<p class="german">Aufdringlichkeit</p>
			<p>
				The tool is missing. You reach for a component that doesn't exist; a feature
				you assumed was available isn't. The absence becomes present.
			</p>
			<p class="response">
				<strong>Response:</strong> Create what's missing, but also ask—why did we
				assume this existed? What pattern suggested it?
			</p>
		</div>

		<div class="breakdown-mode">
			<h3>Obstinacy</h3>
			<p class="german">Aufsässigkeit</p>
			<p>
				The tool doesn't fit. The component exists but doesn't match the use case; the
				API returns data in the wrong shape. The tool resists its intended use.
			</p>
			<p class="response">
				<strong>Response:</strong> Adapt or replace, but also ask—was the tool wrong,
				or was the expectation? What does this resistance reveal?
			</p>
		</div>
	</div>
</section>

<section class="concept-section">
	<h2>Vorhandenheit as Information</h2>
	<p>
		While Vorhandenheit signals failure in design, it provides valuable information:
	</p>

	<ul class="info-list">
		<li>
			<strong>Reveals hidden dependencies</strong> — We don't notice what we rely on until
			it fails. Breakdown exposes the network of assumptions.
		</li>
		<li>
			<strong>Enables theoretical understanding</strong> — Sometimes we need to study an
			object, not just use it. Debugging requires Vorhandenheit.
		</li>
		<li>
			<strong>Invites repair</strong> — Breakdown creates the opportunity for improvement.
			The visible tool can be examined and refined.
		</li>
		<li>
			<strong>Tests design claims</strong> — A design that claims to recede into use can
			be tested: does it ever become present-at-hand in normal operation?
		</li>
	</ul>
</section>

<section class="concept-section">
	<h2>The Vorhandenheit Test</h2>
	<p>
		When evaluating design in use, ask:
	</p>

	<blockquote class="test-block">
		<p>"When did users last notice this?"</p>
	</blockquote>

	<p>
		If the answer is "during normal operation," the design has failed. If the answer is
		"only when something went wrong," the design may be succeeding. If the answer is
		"never," the design has achieved Zuhandenheit.
	</p>
</section>

<section class="concept-section">
	<h2>Productive Vorhandenheit</h2>
	<p>
		Not all presence-at-hand is failure. Some contexts require it:
	</p>

	<ul class="productive-list">
		<li>
			<strong>Learning</strong> — Beginners need to see the tool as an object before they
			can use it transparently. Documentation serves this mode.
		</li>
		<li>
			<strong>Debugging</strong> — When something fails, we must shift to theoretical
			observation. Console logs are Vorhandenheit tools.
		</li>
		<li>
			<strong>Design iteration</strong> — Creating new components requires studying them
			as objects. The designer works in Vorhandenheit so users can work in Zuhandenheit.
		</li>
		<li>
			<strong>Philosophy</strong> — Understanding concepts like Vorhandenheit itself
			requires theoretical reflection on our practical engagement.
		</li>
	</ul>

	<p>
		The goal is not to eliminate Vorhandenheit but to place it appropriately—in learning,
		debugging, and design, not in normal operation.
	</p>
</section>

<section class="concept-section references">
	<h2>References</h2>
	<ul class="reference-list">
		<li>
			Heidegger, Martin. <em>Being and Time</em>. Trans. Macquarrie & Robinson. New York: Harper & Row, 1962. §15-18.
		</li>
		<li>
			Dreyfus, Hubert. <em>Being-in-the-World: A Commentary on Heidegger's Being and Time, Division I</em>. MIT Press, 1991.
		</li>
		<li>
			<a href="/canon/concepts/zuhandenheit">Canon Concept: Zuhandenheit</a>
		</li>
		<li>
			<a href="/canon/foundations/philosophy">Canon Foundations: Philosophy</a>
		</li>
		<li>
			<a href="/patterns/breakdown-and-repair">Pattern: Breakdown and Repair</a>
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
		border-left: 3px solid var(--color-warning);
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
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: var(--space-md);
		margin-top: var(--space-md);
	}

	.manifestation {
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.manifestation.warning {
		border-left: 3px solid var(--color-warning);
	}

	.manifestation p {
		font-size: var(--text-body-sm);
		margin: 0;
	}

	/* Breakdown modes */
	.breakdown-modes {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
		margin-top: var(--space-md);
	}

	.breakdown-mode {
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		border-left: 3px solid var(--color-error);
	}

	.breakdown-mode .german {
		font-style: italic;
		color: var(--color-fg-muted);
		font-size: var(--text-body-sm);
		margin-bottom: var(--space-sm);
	}

	.breakdown-mode .response {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		margin-top: var(--space-sm);
		padding-top: var(--space-sm);
		border-top: 1px solid var(--color-border-default);
	}

	/* Lists */
	.info-list,
	.productive-list {
		list-style: none;
		padding: 0;
	}

	.info-list li,
	.productive-list li {
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
