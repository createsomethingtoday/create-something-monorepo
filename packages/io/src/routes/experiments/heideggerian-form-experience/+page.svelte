<script lang="ts">
	/**
	 * Heideggerian Form Experience
	 *
	 * An interactive experiment demonstrating Heideggerian philosophy through
	 * a service configuration form. The form embodies:
	 * - Zuhandenheit (transparent use)
	 * - Vorhandenheit (validation breakdown)
	 * - Gelassenheit (technology that serves rather than extracts)
	 *
	 * Split view: Form on left, live database on right
	 */

	import ServiceForm from './ServiceForm.svelte';
	import LiveDatabase from './LiveDatabase.svelte';
	import type { PhilosophyEvent } from './types';

	let philosophyEvents: PhilosophyEvent[] = $state([]);

	function handlePhilosophyEvent(event: PhilosophyEvent) {
		philosophyEvents = [...philosophyEvents, event];
	}

	function handleSubmitSuccess() {
		// Database will auto-refresh via polling
	}
</script>

<svelte:head>
	<title>Heideggerian Form Experience | CREATE SOMETHING.io</title>
	<meta name="description" content="An interactive experiment demonstrating how forms can serve user intent rather than extract value. Experience Zuhandenheit, Vorhandenheit, and Gelassenheit through interaction." />
</svelte:head>

<div class="page">
	<div class="container">
		<!-- Header -->
		<header class="header">
			<p class="category-label">Experiment</p>
			<h1 class="title">Heideggerian Form Experience</h1>
			<p class="subtitle">When Forms Serve Rather Than Extract</p>
			<p class="meta">
				December 2025 · Interactive · Heidegger, Rams, Subtractive Triad
			</p>
		</header>

		<!-- ASCII Art -->
		<div class="flex justify-center">
			<pre class="ascii-art">
╔═══════════════════════════════════════════════════════════════════════╗
║   HEIDEGGERIAN FORM EXPERIENCE                                        ║
║                                                                       ║
║   ┌─────────────────────────────┬────────────────────────────────┐    ║
║   │                             │                                │    ║
║   │    SERVICE CONFIGURATION    │     LIVE DATABASE              │    ║
║   │                             │                                │    ║
║   │    ┌─ Service Type ────┐    │     ┌────────────────────────┐ │    ║
║   │    │ [Automation    ▼] │    │     │ automation / workflow  │ │    ║
║   │    └───────────────────┘    │     │ 2 features · growth    │ │    ║
║   │                             │     ├────────────────────────┤ │    ║
║   │    ┌─ Scope ───────────┐    │     │ transformation / proc  │ │    ║
║   │    │ [Workflow      ▼] │    │     │ 4 features · enterprise│ │    ║
║   │    └───────────────────┘    │     └────────────────────────┘ │    ║
║   │                             │                                │    ║
║   │    ┌─ Features ────────┐    │     "The form recedes;         │    ║
║   │    │ ☑ Routing         │    │      the service emerges."     │    ║
║   │    │ ☐ Triggers        │    │                                │    ║
║   │    └───────────────────┘    │                                │    ║
║   │                             │                                │    ║
║   └─────────────────────────────┴────────────────────────────────┘    ║
║                                                                       ║
║   Zuhandenheit → Vorhandenheit → Gestell → Gelassenheit              ║
╚═══════════════════════════════════════════════════════════════════════╝
			</pre>
		</div>

		<!-- Introduction -->
		<section class="abstract">
			<h2 class="section-title">The Experiment</h2>
			<p class="lead">
				Most forms <em>extract</em>—they are designed to capture maximum data with minimum user awareness.
				This experiment inverts that relationship: a form that <em>serves</em> your intent to configure
				a service, with every entry visible in the database beside it.
			</p>
			<p class="body-text">
				As you interact, notice how the form reveals itself through your engagement. When it works
				well, you don't see the form—you see your service taking shape. This is <strong>Zuhandenheit</strong>,
				Heidegger's concept of tools that recede into transparent use.
			</p>
		</section>

		<!-- Interactive Split View -->
		<section class="split-section">
			<h2 class="section-title">Configure & Observe</h2>
			<div class="split-view">
				<div class="form-panel">
					<h3 class="panel-title">Service Configuration</h3>
					<ServiceForm
						onPhilosophyEvent={handlePhilosophyEvent}
						onSubmitSuccess={handleSubmitSuccess}
					/>
				</div>
				<div class="database-panel">
					<LiveDatabase />
				</div>
			</div>
		</section>

		<!-- Philosophy Explanation -->
		<section class="section">
			<h2 class="section-title">The Philosophy</h2>
			<div class="content">
				<div class="concept-grid">
					<div class="concept-card">
						<h4 class="concept-title">Zuhandenheit</h4>
						<p class="concept-subtitle">Ready-to-hand</p>
						<p class="concept-description">
							When tools work, they disappear. A hammer becomes an extension of your arm;
							you see the nail going in, not the tool. This form is designed to recede—
							you configure a service, not "fill out a form."
						</p>
					</div>
					<div class="concept-card">
						<h4 class="concept-title">Vorhandenheit</h4>
						<p class="concept-subtitle">Present-at-hand</p>
						<p class="concept-description">
							When tools break, they become visible. A broken hammer isn't a tool anymore—
							it's an obstacle. Validation errors make the form visible as form, not as
							service configuration. Notice this moment when it happens.
						</p>
					</div>
					<div class="concept-card">
						<h4 class="concept-title">Gestell</h4>
						<p class="concept-subtitle">Enframing</p>
						<p class="concept-description">
							Technology that turns everything into resource. Most forms exhibit Gestell—
							required fields, dark patterns, aggressive upsells. Users become data to extract,
							not humans to serve. This experiment avoids that pattern.
						</p>
					</div>
					<div class="concept-card">
						<h4 class="concept-title">Gelassenheit</h4>
						<p class="concept-subtitle">Releasement</p>
						<p class="concept-description">
							Neither submission to technology nor rejection of it—engagement without capture.
							The form serves your intent. You remain in control. This is mindful technology use.
						</p>
					</div>
				</div>
			</div>
		</section>

		<!-- Why Not AI? -->
		<section class="section">
			<h2 class="section-title">Why Not Just Use AI?</h2>
			<div class="content">
				<p class="body-text">
					Conversational AI is the current hype—a <a href="https://www.mckinsey.com/capabilities/quantumblack/our-insights/the-state-of-ai" target="_blank" rel="noopener">$14-50 billion market</a> by 2030.
					But AI interfaces aren't always better. As <a href="https://uxmag.com/articles/the-next-big-ai-ux-trend-its-not-conversational-ui" target="_blank" rel="noopener">UX Magazine notes</a>:
				</p>

				<blockquote class="quote">
					"For tasks like editing, travel planning, and researching, users need to track state and drafts—
					areas where traditional apps excel."
				</blockquote>

				<p class="body-text">
					Service configuration is one such task. You need to see:
				</p>
				<ul class="bullet-list">
					<li>What you've selected</li>
					<li>What options remain</li>
					<li>How choices affect each other</li>
					<li>The final configuration taking shape</li>
				</ul>

				<p class="body-text">
					A chatbot would hide this state. You'd ask questions, get answers, but lose the
					visual overview that lets you compare options at a glance. The form provides
					<strong>transparent state</strong>—you always know where you are.
				</p>

				<p class="body-text">
					This isn't anti-AI. It's recognizing that different interfaces serve different purposes.
					Conversational AI excels at exploration and Q&A. Forms excel at structured configuration.
					<strong>The right tool for the task</strong>—another application of Zuhandenheit.
				</p>
			</div>
		</section>

		<!-- Subtractive Triad -->
		<section class="section">
			<h2 class="section-title">The Subtractive Triad Applied</h2>
			<div class="content">
				<p class="body-text">
					This experiment applies CREATE SOMETHING's design philosophy at three levels:
				</p>

				<div class="triad-table">
					<div class="triad-row">
						<div class="triad-level">DRY</div>
						<div class="triad-question">"Have I built this before?"</div>
						<div class="triad-application">One form pattern, one database schema, reusable components</div>
					</div>
					<div class="triad-row">
						<div class="triad-level">Rams</div>
						<div class="triad-question">"Does this earn its existence?"</div>
						<div class="triad-application">Every field reveals only when needed. No decoration.</div>
					</div>
					<div class="triad-row">
						<div class="triad-level">Heidegger</div>
						<div class="triad-question">"Does this serve the whole?"</div>
						<div class="triad-application">Form serves service configuration; database serves transparency</div>
					</div>
				</div>

				<p class="body-text">
					The result is a form that teaches through use. You don't read about philosophy—
					you experience it. The concepts become tangible through interaction.
				</p>
			</div>
		</section>

		<!-- What Businesses Actually Want -->
		<section class="section">
			<h2 class="section-title">What Businesses Actually Value</h2>
			<div class="content">
				<p class="body-text">
					According to <a href="https://menlovc.com/perspective/2025-the-state-of-generative-ai-in-the-enterprise/" target="_blank" rel="noopener">Menlo Ventures' 2025 Enterprise AI Report</a>,
					businesses are shifting focus "from hype to outcomes." What matters:
				</p>

				<ul class="bullet-list">
					<li><strong>Workflow redesign</strong> delivers 80% of value (not the technology itself)</li>
					<li><strong>Measurable ROI</strong>—clear improvements in efficiency, cost, or revenue</li>
					<li><strong>Cross-system automation</strong>—connecting disparate tools</li>
				</ul>

				<p class="body-text">
					This experiment demonstrates all three. The form is a redesigned workflow (disclosure over extraction).
					The split view shows immediate feedback (measurable outcomes). The database visualization connects
					form input to persistent storage (system integration).
				</p>

				<p class="body-text">
					Philosophy isn't impractical—it's the foundation of durable design. When you understand
					<em>why</em> certain patterns work (Zuhandenheit), you can apply them across contexts.
					When you recognize extraction patterns (Gestell), you can avoid them.
				</p>
			</div>
		</section>

		<!-- Footer -->
		<footer class="experiment-footer">
			<p class="footer-note">
				This experiment is part of CREATE SOMETHING's research into Heideggerian design.
				All entries are public and can be deleted by anyone—this is a demo, not production.
			</p>
			<div class="footer-links">
				<a href="/experiments" class="footer-link">← All Experiments</a>
				<a href="/experiments/validation-zuhandenheit" class="footer-link">Related: Validation as Zuhandenheit →</a>
			</div>
		</footer>
	</div>
</div>

<style>
	.page {
		min-height: 100vh;
		background: var(--color-bg-pure);
		padding: var(--space-xl) 0 var(--space-2xl);
	}

	.container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 var(--space-md);
	}

	/* Header */
	.header {
		text-align: center;
		margin-bottom: var(--space-xl);
	}

	.category-label {
		font-size: var(--text-caption);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-fg-muted);
		margin-bottom: var(--space-sm);
	}

	.title {
		font-size: var(--text-h1);
		font-weight: 700;
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.subtitle {
		font-size: var(--text-h3);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-sm);
	}

	.meta {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	/* ASCII Art */
	.ascii-art {
		font-family: var(--font-mono);
		font-size: 0.65rem;
		line-height: 1.2;
		color: var(--color-fg-muted);
		text-align: center;
		background: var(--color-bg-surface);
		padding: var(--space-md);
		border-radius: var(--radius-md);
		overflow-x: auto;
		white-space: pre;
		margin: var(--space-lg) 0;
	}

	/* Sections */
	.section,
	.abstract,
	.split-section {
		margin-bottom: var(--space-xl);
	}

	.section-title {
		font-size: var(--text-h2);
		font-weight: 600;
		color: var(--color-fg-primary);
		margin-bottom: var(--space-md);
	}

	.lead {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		line-height: 1.6;
		margin-bottom: var(--space-md);
	}

	.body-text {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		line-height: 1.7;
		margin-bottom: var(--space-md);
	}

	.body-text a {
		color: var(--color-info);
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.body-text a:hover {
		color: var(--color-fg-primary);
	}

	/* Split View */
	.split-view {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-lg);
		margin-top: var(--space-md);
	}

	@media (max-width: 900px) {
		.split-view {
			grid-template-columns: 1fr;
		}
	}

	.form-panel,
	.database-panel {
		min-height: 500px;
	}

	.panel-title {
		font-size: var(--text-body);
		font-weight: 600;
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-sm);
	}

	/* Concept Grid */
	.concept-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-md);
		margin-top: var(--space-md);
	}

	@media (max-width: 700px) {
		.concept-grid {
			grid-template-columns: 1fr;
		}
	}

	.concept-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-md);
	}

	.concept-title {
		font-size: var(--text-body);
		font-weight: 600;
		color: var(--color-fg-primary);
		margin: 0 0 2px 0;
	}

	.concept-subtitle {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		font-style: italic;
		margin-bottom: var(--space-sm);
	}

	.concept-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: 1.5;
		margin: 0;
	}

	/* Quote */
	.quote {
		border-left: 3px solid var(--color-border-emphasis);
		padding-left: var(--space-md);
		margin: var(--space-md) 0;
		font-style: italic;
		color: var(--color-fg-secondary);
	}

	/* Bullet List */
	.bullet-list {
		margin: var(--space-md) 0;
		padding-left: var(--space-lg);
	}

	.bullet-list li {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		line-height: 1.7;
		margin-bottom: var(--space-xs);
	}

	/* Triad Table */
	.triad-table {
		margin: var(--space-md) 0;
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		overflow: hidden;
	}

	.triad-row {
		display: grid;
		grid-template-columns: 100px 1fr 2fr;
		border-bottom: 1px solid var(--color-border-default);
	}

	.triad-row:last-child {
		border-bottom: none;
	}

	.triad-level {
		background: var(--color-bg-surface);
		padding: var(--space-sm) var(--space-md);
		font-weight: 600;
		color: var(--color-fg-primary);
	}

	.triad-question {
		padding: var(--space-sm) var(--space-md);
		color: var(--color-fg-muted);
		font-style: italic;
		border-left: 1px solid var(--color-border-default);
	}

	.triad-application {
		padding: var(--space-sm) var(--space-md);
		color: var(--color-fg-secondary);
		border-left: 1px solid var(--color-border-default);
	}

	@media (max-width: 700px) {
		.triad-row {
			grid-template-columns: 1fr;
		}

		.triad-question,
		.triad-application {
			border-left: none;
			border-top: 1px solid var(--color-border-default);
		}
	}

	/* Footer */
	.experiment-footer {
		margin-top: var(--space-2xl);
		padding-top: var(--space-lg);
		border-top: 1px solid var(--color-border-default);
	}

	.footer-note {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		text-align: center;
		margin-bottom: var(--space-md);
	}

	.footer-links {
		display: flex;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: var(--space-md);
	}

	.footer-link {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		text-decoration: none;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.footer-link:hover {
		color: var(--color-fg-primary);
	}

	@media (prefers-reduced-motion: reduce) {
		.footer-link {
			transition: none;
		}
	}
</style>
