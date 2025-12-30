<script lang="ts">
	// Complementarity - Canonical Definition
	// The principle governing human-AI partnership in CREATE SOMETHING
</script>

<svelte:head>
	<title>Complementarity — Canon Concepts</title>
	<meta
		name="description"
		content="The principle that human and AI capabilities complete rather than replace each other."
	/>
</svelte:head>

<header class="concept-header">
	<span class="concept-label">Concept</span>
	<h1 class="concept-title">Complementarity</h1>
	<p class="concept-pronunciation">/ˌkɒmplɪmɛnˈtærɪti/</p>
	<p class="concept-translation">From Latin <em>complementum</em>: "that which fills up"</p>
</header>

<section class="concept-section">
	<h2>Definition</h2>
	<blockquote class="definition-block">
		<p>
			The principle that human and AI capabilities complete rather than replace each other.
			Neither is sufficient alone; together they form a whole greater than the sum of parts.
			The human provides judgment, context, and purpose; the AI provides scale, consistency,
			and tireless execution.
		</p>
	</blockquote>
</section>

<section class="concept-section">
	<h2>Origin</h2>
	<p>
		The term derives from Niels Bohr's principle in quantum mechanics, where wave and particle
		descriptions are both necessary but mutually exclusive views of the same phenomenon. CREATE
		SOMETHING adapts this to human-AI collaboration: different modes of intelligence that cannot
		be reduced to each other but together describe the complete picture.
	</p>
	<p>
		In the CREATE SOMETHING context, complementarity emerged from practical experience with
		Claude Code—discovering that the most effective work happens when human and AI each do
		what they do best, with clear handoff points rather than blurred responsibilities.
	</p>
</section>

<section class="concept-section">
	<h2>In Practice</h2>
	<p>
		The Complementarity Principle manifests in how CREATE SOMETHING divides work between
		human and AI:
	</p>

	<div class="complementarity-table">
		<div class="column human">
			<h3>Human (WezTerm)</h3>
			<ul>
				<li>Monitor logs</li>
				<li>Verify production</li>
				<li>Debug edge cases</li>
				<li>Interactive sessions</li>
				<li>Observe and decide</li>
				<li>Provide context and judgment</li>
				<li>Set direction and purpose</li>
			</ul>
		</div>
		<div class="column ai">
			<h3>AI (Claude Code)</h3>
			<ul>
				<li>Write code</li>
				<li>Deploy code</li>
				<li>Run migrations</li>
				<li>Execute tests</li>
				<li>Plan and execute</li>
				<li>Scale repetitive tasks</li>
				<li>Maintain consistency</li>
			</ul>
		</div>
	</div>

	<p class="table-note">
		The boundary is not rigid but principled: handoff occurs where one mode of intelligence
		reaches its limit and the other excels.
	</p>
</section>

<section class="concept-section">
	<h2>Relationship to Zuhandenheit</h2>
	<p>
		Complementarity enables <a href="/canon/concepts/zuhandenheit">Zuhandenheit</a> (ready-to-hand).
		When human and AI work in their proper domains, the tool recedes. The human doesn't think
		about the AI; the AI doesn't demand attention. They simply work together.
	</p>
	<p>
		When complementarity breaks down—when the AI attempts judgment it cannot make, or the human
		micromanages execution—the tool becomes <a href="/canon/concepts/vorhandenheit">present-at-hand</a>.
		We notice the partnership instead of the work.
	</p>
</section>

<section class="concept-section">
	<h2>Anti-Patterns</h2>
	<p>
		What Complementarity is <strong>not</strong>:
	</p>

	<ul class="antipattern-list">
		<li>
			<strong>Replacement</strong> — AI replacing human judgment, or humans doing what AI
			does better. Complementarity is completion, not substitution.
		</li>
		<li>
			<strong>Delegation without oversight</strong> — The human remains responsible.
			Complementarity is partnership, not abdication.
		</li>
		<li>
			<strong>50/50 split</strong> — The division is by capability, not by quantity.
			Some tasks are 90% AI; others are 90% human.
		</li>
		<li>
			<strong>Static boundaries</strong> — As AI capabilities grow, the boundary shifts.
			What required human judgment yesterday may be AI-appropriate today.
		</li>
	</ul>
</section>

<section class="concept-section">
	<h2>The Complementarity Test</h2>
	<p>
		When deciding who should do a task, ask:
	</p>

	<blockquote class="test-block">
		<p>"Does this require judgment, or execution?"</p>
	</blockquote>

	<p>
		Judgment—weighing tradeoffs, understanding context, deciding what matters—belongs to humans.
		Execution—implementing decisions consistently at scale—belongs to AI. The boundary is where
		one transforms into the other.
	</p>
</section>

<section class="concept-section">
	<h2>In the Hermeneutic Circle</h2>
	<p>
		Complementarity connects to the broader CREATE SOMETHING system:
	</p>

	<ul class="connection-list">
		<li>
			<strong>.agency</strong> applies complementarity to client work—AI handles implementation,
			humans handle relationships and strategy.
		</li>
		<li>
			<strong>.io</strong> uses complementarity in research—AI gathers and synthesizes,
			humans interpret and apply.
		</li>
		<li>
			<strong>.space</strong> explores complementarity—experiments test where the boundary lies.
		</li>
		<li>
			<strong>.ltd</strong> defines complementarity—Canon documents the principle so it can
			be applied consistently.
		</li>
	</ul>
</section>

<section class="concept-section references">
	<h2>References</h2>
	<ul class="reference-list">
		<li>
			Bohr, Niels. "The Quantum Postulate and the Recent Development of Atomic Theory." <em>Nature</em>, 1928.
		</li>
		<li>
			<a href="/canon/concepts/zuhandenheit">Canon Concept: Zuhandenheit</a>
		</li>
		<li>
			<a href="/canon/concepts/vorhandenheit">Canon Concept: Vorhandenheit</a>
		</li>
		<li>
			<a href="/canon/foundations/philosophy">Canon Foundations: Philosophy</a>
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
		margin-bottom: var(--space-sm);
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

	/* Complementarity table */
	.complementarity-table {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-md);
		margin: var(--space-md) 0;
	}

	@media (max-width: 600px) {
		.complementarity-table {
			grid-template-columns: 1fr;
		}
	}

	.column {
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.column.human {
		border-top: 3px solid var(--color-info);
	}

	.column.ai {
		border-top: 3px solid var(--color-success);
	}

	.column ul {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.column li {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		padding: var(--space-xs) 0;
		border-bottom: 1px solid var(--color-border-default);
	}

	.column li:last-child {
		border-bottom: none;
	}

	.table-note {
		font-size: var(--text-body-sm);
		font-style: italic;
		color: var(--color-fg-tertiary);
	}

	/* Lists */
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

	.connection-list {
		list-style: none;
		padding: 0;
	}

	.connection-list li {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-sm);
		padding-left: var(--space-md);
		position: relative;
	}

	.connection-list li::before {
		content: "→";
		position: absolute;
		left: 0;
		color: var(--color-fg-muted);
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

	/* Links in content */
	.concept-section a {
		color: var(--color-fg-secondary);
		text-decoration: underline;
		text-underline-offset: 2px;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.concept-section a:hover {
		color: var(--color-fg-primary);
	}
</style>
