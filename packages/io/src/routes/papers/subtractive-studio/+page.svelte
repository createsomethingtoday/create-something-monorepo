<script lang="ts">
	/**
	 * The Subtractive Studio: Philosophy as Infrastructure
	 *
	 * Positioning paper establishing CREATE SOMETHING's differentiation:
	 * Most agencies add. CREATE SOMETHING removes what obscures.
	 */
</script>

<svelte:head>
	<title>The Subtractive Studio: Philosophy as Infrastructure | CREATE SOMETHING.io</title>
	<meta
		name="description"
		content="Most agencies add. CREATE SOMETHING removes what obscures. A positioning paper on philosophy as infrastructure, not marketing."
	/>
</svelte:head>

<div class="min-h-screen p-6 paper-container">
	<div class="max-w-4xl mx-auto space-y-12">
		<!-- Header -->
		<div class="pb-8 paper-header">
			<div class="font-mono mb-4 paper-id">PAPER-2025-011</div>
			<h1 class="mb-3 paper-title">The Subtractive Studio</h1>
			<p class="max-w-3xl paper-subtitle">
				Philosophy as Infrastructure—most agencies add, CREATE SOMETHING removes what obscures
			</p>
			<div class="flex gap-4 mt-4 paper-meta">
				<span>Research</span>
				<span>-</span>
				<span>15 min read</span>
				<span>-</span>
				<span>Intermediate</span>
			</div>
		</div>

		<!-- Abstract -->
		<section class="pl-6 space-y-4 abstract-section">
			<h2 class="section-heading">Abstract</h2>
			<p class="leading-relaxed body-text">
				The digital services industry operates on an additive assumption: more features, more
				services, more complexity equals more value. This paper proposes an alternative grounded in
				<strong>phenomenology</strong> (the philosophical study of structures of experience and consciousness—how things show themselves to us through lived experience) and design philosophy. CREATE SOMETHING is a <em>subtractive studio</em>—an
				organization whose primary discipline is the removal of what obscures. We articulate the
				Subtractive Triad (DRY, Rams, Heidegger) as operational philosophy, demonstrate how
				philosophy functions as infrastructure rather than marketing, and establish the hermeneutic
				circle as organizational architecture. The thesis: <strong
					>position emerges from practice, not positioning statements</strong
				>.
			</p>
		</section>

		<!-- The Insight -->
		<section class="p-6 quote-box">
			<div class="text-center">
				<p class="italic quote-text">"Weniger, aber besser."</p>
				<p class="mt-2 quote-attribution">— Dieter Rams</p>
			</div>
		</section>

		<!-- Section 1: The Problem with "More" -->
		<section class="space-y-6">
			<h2 class="section-heading">I. The Problem with "More"</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					Consider the standard agency pitch: "We offer end-to-end solutions across web development,
					mobile applications, branding, content strategy, SEO optimization, social media
					management, data analytics, and AI integration." The implicit promise: we do everything,
					so you need only us.
				</p>

				<p>But what does this comprehensiveness actually deliver?</p>

				<h3 class="subsection-heading">The Complexity Compounding Problem</h3>

				<p>
					Each additional service creates coordination overhead. The web team must sync with the
					mobile team must sync with the content team must sync with the analytics team. Coherence
					suffers as each vertical optimizes locally. The client receives a collection of
					deliverables rather than an integrated system.
				</p>

				<div class="grid md:grid-cols-2 gap-4 mt-6">
					<div class="p-4 comparison-warning">
						<h4 class="mb-2 comparison-heading comparison-warning-heading">Additive Logic</h4>
						<ul class="space-y-1 comparison-list">
							<li>- "What else can we offer?"</li>
							<li>- Scope expansion as value demonstration</li>
							<li>- Complexity as capability signifier</li>
							<li>- Client dependency as retention strategy</li>
						</ul>
					</div>

					<div class="p-4 comparison-success">
						<h4 class="mb-2 comparison-heading comparison-success-heading">Subtractive Logic</h4>
						<ul class="space-y-1 comparison-list">
							<li>- "What can we remove?"</li>
							<li>- Scope reduction as clarity creation</li>
							<li>- Simplicity as mastery signifier</li>
							<li>- Client autonomy as success metric</li>
						</ul>
					</div>
				</div>

				<h3 class="subsection-heading mt-6">The Gestell Critique</h3>

				<p>
					Heidegger's concept of <em>Gestell</em> (enframing) describes technology's tendency to
					reveal everything as standing-reserve—resources to be optimized. The additive agency
					embodies Gestell: every client problem becomes an opportunity for service expansion.
					Solutions multiply because multiplication serves the agency, not the client.
				</p>

				<blockquote class="pl-4 italic my-4 blockquote">
					"Automation that fills every gap is not efficiency but invasion."
				</blockquote>

				<p>
					The question is not whether to use technology, but whether our systems enable dwelling or
					merely accelerate consumption. Most agencies choose acceleration. They are structured to
					add.
				</p>
			</div>
		</section>

		<!-- Section 2: The Subtractive Triad -->
		<section class="space-y-6">
			<h2 class="section-heading">II. The Subtractive Triad</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					CREATE SOMETHING operates on a meta-principle: <strong
						>Creation is the discipline of removing what obscures</strong
					>. This principle applies at three levels, forming the Subtractive Triad:
				</p>

				<div class="responsive-table-scroll">
					<table class="w-full data-table">
						<thead>
							<tr>
								<th class="text-left py-2">Level</th>
								<th class="text-left py-2">Discipline</th>
								<th class="text-left py-2">Question</th>
								<th class="text-left py-2">Action</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td class="py-2">Implementation</td>
								<td class="py-2">DRY</td>
								<td class="py-2">"Have I built this before?"</td>
								<td class="py-2 result-positive">Unify</td>
							</tr>
							<tr>
								<td class="py-2">Artifact</td>
								<td class="py-2">Rams</td>
								<td class="py-2">"Does this earn its existence?"</td>
								<td class="py-2 result-positive">Remove</td>
							</tr>
							<tr>
								<td class="py-2">System</td>
								<td class="py-2">Heidegger</td>
								<td class="py-2">"Does this serve the whole?"</td>
								<td class="py-2 result-positive">Reconnect</td>
							</tr>
						</tbody>
					</table>
				</div>

				<h3 class="subsection-heading mt-6">DRY: Implementation Level</h3>

				<p>
					"Don't Repeat Yourself" is not merely a coding principle. It's an <strong>ontological</strong> (concerning the fundamental nature of being and existence) stance:
					duplication is disconnection. When the same logic exists in two places, they will
					inevitably drift apart. The system loses coherence.
				</p>

				<p>
					Applied to agency work: each client engagement should contribute to shared understanding.
					Patterns discovered in one project inform the next. The studio accumulates wisdom, not
					just deliverables.
				</p>

				<h3 class="subsection-heading mt-6">Rams: Artifact Level</h3>

				<p>
					Dieter Rams' <em>Weniger, aber besser</em> (Less, but better) demands that every element
					justify its existence. This is not minimalism as aesthetic—it's minimalism as ethics.
					Adding without justification is a form of harm.
				</p>

				<p>Applied to agency work: every feature, every page, every interaction must earn its place. The question is not "what can we add?" but "what can we remove without loss of function?"</p>

				<h3 class="subsection-heading mt-6">Heidegger: System Level</h3>

				<p>
					The hermeneutic question—"Does this serve the whole?"—operates at the system level. Parts
					gain meaning through the whole; the whole is constituted by its parts. When a component
					doesn't serve the system, it creates disconnection.
				</p>

				<p>
					Applied to agency work: every deliverable must connect to the client's broader mission.
					Isolated excellence is failure if it doesn't integrate.
				</p>

				<div class="p-6 highlight-box mt-6">
					<p class="highlight-text">
						The Triad is coherent because it's one principle—<strong>subtractive revelation</strong
						>—applied at three scales.
					</p>
				</div>
			</div>
		</section>

		<!-- Section 3: Philosophy as Infrastructure -->
		<section class="space-y-6">
			<h2 class="section-heading">III. Philosophy as Infrastructure</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					Most studios treat philosophy as marketing. "Our values" appear on the about page,
					disconnected from practice. CREATE SOMETHING inverts this: philosophy is infrastructure.
					It determines architecture, tooling, and workflow.
				</p>

				<h3 class="subsection-heading">.ltd as Versioned Canon</h3>

				<p>
					The CREATE SOMETHING ecosystem includes a dedicated property—createsomething.ltd—that
					hosts the philosophical Canon. This is not a static document. It's a versioned,
					deployable specification:
				</p>

				<ul class="list-disc list-inside space-y-2 pl-4">
					<li>
						<strong>CSS tokens</strong> encode Canon principles (golden ratio spacing, WCAG-compliant
						accessibility)
					</li>
					<li>
						<strong>Component libraries</strong> implement Canon constraints (no arbitrary radii, semantic
						color only)
					</li>
					<li>
						<strong>Linting rules</strong> enforce Canon compliance (automated auditing against philosophical
						principles)
					</li>
				</ul>

				<p>
					When a developer writes code, the Canon is not a document they consult—it's a system that
					shapes their options. The infrastructure embodies the philosophy.
				</p>

				<h3 class="subsection-heading mt-6">Research as Practice</h3>

				<p>
					CREATE SOMETHING maintains active research independent of client work. Papers like this
					one exist not to attract clients but to clarify thinking. The research property
					(createsomething.io) publishes formal analysis of AI development, phenomenology, and
					design philosophy.
				</p>

				<p>This independence matters. Research that exists only to justify services is captured research. It will bend toward what sells rather than what's true. By maintaining research as practice, we ensure ideas remain accountable to reality, not revenue.</p>

				<h3 class="subsection-heading mt-6">AI Partnership Modeled</h3>

				<p>
					CREATE SOMETHING's development workflow is AI-native. Claude Code operates as a
					collaborator, not a tool. The CLAUDE.md configuration file—over 1,500 lines—encodes
					organizational philosophy directly into the AI's context:
				</p>

				<div class="p-4 font-mono code-block">
					<pre class="code-secondary">{`# The Subtractive Triad

Every creation exists simultaneously at three levels:

| Level          | Discipline | Question                    | Action     |
|----------------|------------|-----------------------------|------------|
| Implementation | DRY        | "Have I built this before?" | Unify      |
| Artifact       | Rams       | "Does this earn existence?" | Remove     |
| System         | Heidegger  | "Does this serve the whole?"| Reconnect  |`}</pre>
				</div>

				<p class="mt-4">
					This is not prompt engineering. It's infrastructure. The AI operates within philosophical
					constraints because those constraints are the development environment.
				</p>
			</div>
		</section>

		<!-- Section 4: The Hermeneutic Circle -->
		<section class="space-y-6">
			<h2 class="section-heading">IV. The <strong>Hermeneutic Circle</strong> (a philosophical method where understanding deepens through iterative interpretation—you understand parts through the whole, and the whole through its parts) as Architecture</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					CREATE SOMETHING operates as four interconnected properties, each serving the whole while
					maintaining distinct purpose:
				</p>

				<div class="p-4 font-mono code-block">
					<pre class="code-primary">{`.ltd (Philosophy) provides criteria for
    |
    v
.io (Research) validates
    |
    v
.space (Practice) applies to
    |
    v
.agency (Services) tests and evolves
    |
    v
.ltd (Philosophy)`}</pre>
				</div>

				<h3 class="subsection-heading mt-6">The Circle in Practice</h3>

				<div class="responsive-table-scroll">
					<table class="w-full data-table">
						<thead>
							<tr>
								<th class="text-left py-2">Property</th>
								<th class="text-left py-2">Mode</th>
								<th class="text-left py-2">Function</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td class="py-2">.ltd</td>
								<td class="py-2">Being-as-Canon</td>
								<td class="py-2">Establishes principles</td>
							</tr>
							<tr>
								<td class="py-2">.io</td>
								<td class="py-2">Being-as-Document</td>
								<td class="py-2">Analyzes and validates</td>
							</tr>
							<tr>
								<td class="py-2">.space</td>
								<td class="py-2">Being-as-Experience</td>
								<td class="py-2">Experiments and learns</td>
							</tr>
							<tr>
								<td class="py-2">.agency</td>
								<td class="py-2">Being-as-Service</td>
								<td class="py-2">Applies and tests</td>
							</tr>
						</tbody>
					</table>
				</div>

				<p class="mt-4">
					Client work (.agency) does not exist in isolation. Patterns discovered serve back to
					practice (.space). Insights formalize into research (.io). Research refines the Canon
					(.ltd). The Canon shapes future client work.
				</p>

				<p>
					This is not metaphor. It's architecture. Issues flow through Beads (the task system),
					carrying labels that route work to appropriate properties. Dependencies track how insights
					propagate. The circle closes continuously.
				</p>

				<h3 class="subsection-heading mt-6">Why This Structure Matters</h3>

				<p>
					The hermeneutic circle prevents capture. Client work cannot dominate because it must
					justify itself against research. Research cannot become abstract because it must apply to
					practice. Practice cannot drift because it must align with Canon.
				</p>

				<p>Each property holds the others accountable. The system self-corrects.</p>
			</div>
		</section>

		<!-- Section 5: Selective Engagement -->
		<section class="space-y-6">
			<h2 class="section-heading">V. Selective Engagement</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					The subtractive principle applies to client selection itself. Not every engagement serves
					the whole. Some projects would require compromising Canon. Others would consume resources
					without contributing insights. These are declined.
				</p>

				<h3 class="subsection-heading">Assessment-First Approach</h3>

				<p>
					CREATE SOMETHING leads with assessment rather than proposals. Before committing to build,
					we analyze: Does this project align with our capabilities? Will it contribute to our
					research? Can we deliver within Canon constraints?
				</p>

				<p>This inversion matters. Traditional agencies assess how to win work. We assess whether to pursue it.</p>

				<div class="grid md:grid-cols-2 gap-4 mt-6">
					<div class="p-4 comparison-warning">
						<h4 class="mb-2 comparison-heading comparison-warning-heading">Standard Approach</h4>
						<ul class="space-y-1 comparison-list">
							<li>- Proposal first, assessment embedded</li>
							<li>- Win work, then scope constraints</li>
							<li>- Revenue as primary selection criterion</li>
							<li>- Client dependency as success</li>
						</ul>
					</div>

					<div class="p-4 comparison-success">
						<h4 class="mb-2 comparison-heading comparison-success-heading">Subtractive Approach</h4>
						<ul class="space-y-1 comparison-list">
							<li>- Assessment first, proposal earned</li>
							<li>- Scope constraints before commitment</li>
							<li>- Alignment as primary selection criterion</li>
							<li>- Client autonomy as success</li>
						</ul>
					</div>
				</div>

				<h3 class="subsection-heading mt-6">Quality Over Quantity</h3>

				<p>
					Sublimio, a design studio we study, articulates this directly: "We are picky, and so are
					our clients." Selectivity is mutual. Clients who value our approach self-select. Those who
					want maximum scope for minimum cost look elsewhere.
				</p>

				<p>
					This is not elitism. It's alignment. A studio that takes every project cannot maintain
					coherence. A client who wants everything cannot receive focus. Selectivity serves both.
				</p>

				<div class="p-6 quote-box mt-6">
					<p class="text-center italic quote-text">
						"We are picky, and so are our clients."
					</p>
					<p class="mt-2 quote-attribution">— Sublimio</p>
				</div>
			</div>
		</section>

		<!-- Conclusion -->
		<section class="space-y-6">
			<h2 class="section-heading">VI. Conclusion: Position Is Practice</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					This paper has articulated CREATE SOMETHING's positioning, but the articulation is
					secondary. The position exists in the practice:
				</p>

				<ul class="list-disc list-inside space-y-2 pl-4">
					<li>
						In the CSS tokens that enforce Canon constraints before a designer makes choices
					</li>
					<li>
						In the CLAUDE.md that shapes AI collaboration around philosophical principles
					</li>
					<li>
						In the Beads workflow that routes issues through the hermeneutic circle
					</li>
					<li>
						In the assessment protocol that filters engagements before proposals begin
					</li>
				</ul>

				<p>
					<strong>Position is not marketing.</strong> It's infrastructure. The Subtractive Triad is not
					a selling point—it's the architecture of how we work. Philosophy is not window dressing—it's
					the foundation that determines what buildings can stand.
				</p>

				<p>
					Most agencies add. They accumulate services, expand scope, multiply touchpoints. The logic
					is additive: more capability, more value.
				</p>

				<p>
					CREATE SOMETHING subtracts. We remove what obscures. We simplify until only the essential
					remains. We believe that truth emerges through disciplined removal at every level of
					abstraction.
				</p>

				<div class="p-6 principle-box mt-6">
					<p class="principle-text">
						Creation is the discipline of removing what obscures.
					</p>
				</div>

				<p class="mt-6">
					The position statement is simple: <em>Most agencies add. CREATE SOMETHING removes what obscures.</em>
				</p>

				<p>
					But the statement is not the position. The position is the practice that makes the
					statement true.
				</p>
			</div>
		</section>

		<!-- Footer -->
		<div class="pt-6 paper-footer">
			<p class="footer-text">
				This paper was developed as part of CREATE SOMETHING's GTM Sprint 1 initiative,
				establishing foundational positioning for the .agency property.
			</p>
			<div class="flex justify-between mt-4">
				<a href="/papers" class="footer-link">All Papers</a>
				<a href="https://createsomething.ltd" class="footer-link" target="_blank" rel="noopener"
					>Visit Canon</a
				>
			</div>
		</div>
	</div>
</div>

<style>
	/* Structure: Tailwind | Design: Canon */

	/* Container */
	.paper-container {
		background: var(--color-bg-pure);
		color: var(--color-fg-primary);
	}

	/* Header */
	.paper-header {
		border-bottom: 1px solid var(--color-border-default);
	}

	.paper-id {
		color: var(--color-fg-muted);
		font-size: var(--text-body-sm);
	}

	.paper-title {
		font-size: var(--text-h1);
	}

	.paper-subtitle {
		color: var(--color-fg-secondary);
		font-size: var(--text-body-lg);
	}

	.paper-meta {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	/* Abstract */
	.abstract-section {
		border-left: 4px solid var(--color-border-emphasis);
	}

	/* Typography */
	.section-heading {
		font-size: var(--text-h2);
	}

	.subsection-heading {
		font-size: var(--text-h3);
		color: var(--color-fg-primary);
	}

	.body-text {
		color: var(--color-fg-secondary);
	}

	/* Quote Box */
	.quote-box {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.quote-text {
		color: var(--color-fg-secondary);
		font-size: var(--text-body-lg);
	}

	.quote-attribution {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	/* Blockquote */
	.blockquote {
		border-left: 4px solid var(--color-border-emphasis);
		color: var(--color-fg-tertiary);
	}

	/* Code Blocks */
	.code-block {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		font-size: var(--text-body-sm);
		overflow-x: auto;
	}

	.code-primary {
		color: var(--color-fg-primary);
	}

	.code-secondary {
		color: var(--color-fg-secondary);
	}

	/* Comparison Cards */
	.comparison-success {
		background: var(--color-success-muted);
		border: 1px solid var(--color-success-border);
		border-radius: var(--radius-lg);
	}

	.comparison-warning {
		background: var(--color-warning-muted);
		border: 1px solid var(--color-warning-border);
		border-radius: var(--radius-lg);
	}

	.comparison-heading {
		font-size: var(--text-body-lg);
	}

	.comparison-success-heading {
		color: var(--color-success);
	}

	.comparison-warning-heading {
		color: var(--color-warning);
	}

	.comparison-list {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	/* Data Table */
	.responsive-table-scroll {
		overflow-x: auto;
	}

	.data-table {
		font-size: var(--text-body-sm);
	}

	.data-table thead tr {
		border-bottom: 1px solid var(--color-border-emphasis);
	}

	.data-table th {
		color: var(--color-fg-secondary);
	}

	.data-table tbody tr {
		border-bottom: 1px solid var(--color-border-default);
	}

	.data-table td {
		color: var(--color-fg-tertiary);
	}

	.result-positive {
		color: var(--color-success);
	}

	/* Highlight Box */
	.highlight-box {
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-emphasis);
		border-radius: var(--radius-lg);
	}

	.highlight-text {
		font-size: var(--text-body-lg);
		text-align: center;
		color: var(--color-fg-primary);
	}

	/* Principle Box */
	.principle-box {
		background: var(--color-bg-subtle);
		border: 2px solid var(--color-border-strong);
		border-radius: var(--radius-lg);
	}

	.principle-text {
		font-size: var(--text-h3);
		font-weight: 600;
		text-align: center;
		color: var(--color-fg-primary);
	}

	/* Footer */
	.paper-footer {
		border-top: 1px solid var(--color-border-default);
	}

	.footer-text {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.footer-link {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.footer-link:hover {
		color: var(--color-fg-primary);
	}
</style>
