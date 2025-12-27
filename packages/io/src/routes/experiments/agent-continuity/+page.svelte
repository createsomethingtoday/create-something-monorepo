<script lang="ts">
	/**
	 * Agent Continuity Experiment
	 *
	 * Analysis of Anthropic's agent harness patterns through a Heideggerian lens—
	 * how persistent artifacts enable re-entry into the hermeneutic circle.
	 */
</script>

<svelte:head>
	<title>Agent Continuity: Harnesses for Long-Running Sessions | CREATE SOMETHING.io</title>
	<meta name="description" content="Analysis of Anthropic's agent harness patterns through a Heideggerian lens—how persistent artifacts enable re-entry into the hermeneutic circle across context boundaries." />
</svelte:head>

<div class="page">
	<div class="container">
		<!-- Header -->
		<header class="header">
			<p class="category-label">Reference Analysis</p>
			<h1 class="title">Agent Continuity</h1>
			<p class="subtitle">Harnesses for Long-Running Sessions</p>
			<p class="meta">
				December 2025 · Agent Architecture · Heidegger, Anthropic
			</p>
		</header>

		<!-- ASCII Art -->
		<div class="flex justify-center">
			<pre class="ascii-art">
╔══════════════════════════════════════════════════════════════════╗
║  AGENT CONTINUITY                                                ║
║                                                                  ║
║  Session 1        Session 2        Session 3        Session N    ║
║  ┌────────┐       ┌────────┐       ┌────────┐       ┌────────┐   ║
║  │ Agent  │  ──►  │ Agent  │  ──►  │ Agent  │  ──►  │ Agent  │   ║
║  └───┬────┘       └───┬────┘       └───┬────┘       └───┬────┘   ║
║      │                │                │                │        ║
║      ▼                ▼                ▼                ▼        ║
║  ╔═══════════════════════════════════════════════════════════╗   ║
║  ║  progress.txt  │  features.json  │  git log  │  init.sh   ║   ║
║  ╚═══════════════════════════════════════════════════════════╝   ║
║                                                                  ║
║  "Artifacts enable re-entry into the hermeneutic circle"         ║
╚══════════════════════════════════════════════════════════════════╝
			</pre>
		</div>

		<!-- Source -->
		<section class="source-block">
			<h2 class="section-title">Source</h2>
			<a
				href="https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents"
				target="_blank"
				rel="noopener noreferrer"
				class="source-link"
			>
				Anthropic Engineering: Effective Harnesses for Long-Running Agents
				<span class="external-icon">↗</span>
			</a>
		</section>

		<!-- The Problem -->
		<section class="abstract">
			<h2 class="section-title">The Problem</h2>
			<p class="lead">
				Long-running agents lose context across sessions. Each new context window is
				<em>"an engineer arriving with no memory of what happened."</em>
			</p>
			<p class="body-text">
				When context exhausts, agents experience what Heidegger calls <strong>Unzuhandenheit</strong>—
				the tool becomes conspicuous, workflow breaks. The hammer that was invisible during hammering
				suddenly demands attention because it has broken.
			</p>
		</section>

		<!-- Core Patterns -->
		<section class="section">
			<h2 class="section-title">Core Patterns</h2>
			<div class="content">
				<div class="pattern-grid">
					<div class="pattern">
						<h3 class="pattern-title">1. Progress File</h3>
						<p class="pattern-desc">Persistent text file documenting prior work. Updated at session end.</p>
						<pre class="pattern-code">claude-progress.txt
├── What was completed
├── What failed and why
├── What to do next
└── Known issues</pre>
						<p class="pattern-mapping">
							<strong>CREATE SOMETHING equivalent:</strong> CLAUDE.md + conversation summaries
						</p>
					</div>

					<div class="pattern">
						<h3 class="pattern-title">2. Initialization Script</h3>
						<p class="pattern-desc">Executable setup that any new session can run to restore working state.</p>
						<pre class="pattern-code"># init.sh
cd /project
npm install
npm run dev &
echo "Ready"</pre>
						<p class="pattern-mapping">
							<strong>CREATE SOMETHING equivalent:</strong> CLAUDE.md development commands section
						</p>
					</div>

					<div class="pattern">
						<h3 class="pattern-title">3. Structured Feature List</h3>
						<p class="pattern-desc">JSON with explicit status tracking. Model updates only status fields.</p>
						<pre class="pattern-code">{`{
  "features": [
    {
      "id": "auth-login",
      "description": "User login",
      "passes": false
    }
  ]
}`}</pre>
						<p class="pattern-mapping">
							<strong>CREATE SOMETHING equivalent:</strong> TodoWrite tool
						</p>
					</div>

					<div class="pattern">
						<h3 class="pattern-title">4. Session Startup Protocol</h3>
						<p class="pattern-desc">Every session begins identically:</p>
						<ol class="protocol-list">
							<li>Run <code>pwd</code> to confirm directory</li>
							<li>Read git log and progress files</li>
							<li>Select highest-priority incomplete feature</li>
							<li>Run E2E tests before implementing</li>
						</ol>
						<p class="pattern-mapping">
							<strong>CREATE SOMETHING equivalent:</strong> Claude hooks (potential)
						</p>
					</div>

					<div class="pattern">
						<h3 class="pattern-title">5. One Feature Per Session</h3>
						<p class="pattern-desc">Constraint prevents scope creep. Each session:</p>
						<ul class="protocol-list">
							<li>Picks one feature</li>
							<li>Implements it</li>
							<li>Tests it</li>
							<li>Commits with descriptive message</li>
							<li>Updates progress file</li>
						</ul>
						<p class="pattern-mapping">
							<strong>CREATE SOMETHING equivalent:</strong> Atomic git commits
						</p>
					</div>
				</div>
			</div>
		</section>

		<!-- Failure Modes -->
		<section class="section">
			<h2 class="section-title">Failure Modes & Solutions</h2>

			<!-- Mobile: Card layout -->
			<div class="responsive-table-cards">
				<div class="responsive-table-card">
					<div class="responsive-table-card-header">
						<span class="responsive-table-card-title">Premature completion claims</span>
					</div>
					<div class="responsive-table-card-body">
						<div class="responsive-table-card-row">
							<span class="responsive-table-card-label">Solution</span>
							<span class="responsive-table-card-value">Comprehensive feature list with explicit pass/fail</span>
						</div>
					</div>
				</div>
				<div class="responsive-table-card">
					<div class="responsive-table-card-header">
						<span class="responsive-table-card-title">Lost setup knowledge</span>
					</div>
					<div class="responsive-table-card-body">
						<div class="responsive-table-card-row">
							<span class="responsive-table-card-label">Solution</span>
							<span class="responsive-table-card-value">Executable init.sh</span>
						</div>
					</div>
				</div>
				<div class="responsive-table-card">
					<div class="responsive-table-card-header">
						<span class="responsive-table-card-title">Undocumented bugs</span>
					</div>
					<div class="responsive-table-card-body">
						<div class="responsive-table-card-row">
							<span class="responsive-table-card-label">Solution</span>
							<span class="responsive-table-card-value">Git commits + progress notes</span>
						</div>
					</div>
				</div>
				<div class="responsive-table-card">
					<div class="responsive-table-card-header">
						<span class="responsive-table-card-title">Doing too much at once</span>
					</div>
					<div class="responsive-table-card-body">
						<div class="responsive-table-card-row">
							<span class="responsive-table-card-label">Solution</span>
							<span class="responsive-table-card-value">One feature per session constraint</span>
						</div>
					</div>
				</div>
			</div>

			<!-- Desktop: Table layout -->
			<div class="responsive-table-wrapper">
				<table class="responsive-table">
					<thead>
						<tr>
							<th>Problem</th>
							<th>Solution</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td>Premature completion claims</td>
							<td>Comprehensive feature list with explicit pass/fail</td>
						</tr>
						<tr>
							<td>Lost setup knowledge</td>
							<td>Executable init.sh</td>
						</tr>
						<tr>
							<td>Undocumented bugs</td>
							<td>Git commits + progress notes</td>
						</tr>
						<tr>
							<td>Doing too much at once</td>
							<td>One feature per session constraint</td>
						</tr>
					</tbody>
				</table>
			</div>
		</section>

		<!-- Hermeneutic Frame -->
		<section class="section">
			<h2 class="section-title">Hermeneutic Frame</h2>
			<div class="content">
				<p class="body-text">
					The harness doesn't <em>solve</em> continuity—it <strong>enables re-entry into the
					hermeneutic circle</strong>. Each session is a new interpreter. The artifacts
					(progress files, git history, feature lists) are the shared understanding that
					allows interpretation to continue.
				</p>

				<blockquote class="quote featured">
					<p>
						"Understanding is always already situated. The harness creates the situation."
					</p>
					<cite>— Heidegger, applied</cite>
				</blockquote>

				<div class="grid md:grid-cols-2 gap-6">
					<div class="card">
						<h4 class="card-title">Without Harness</h4>
						<p class="card-subtitle">Unzuhandenheit (Present-at-hand)</p>
						<p class="card-text">
							Agent arrives to broken state. Must reconstruct context from scratch.
							Tool becomes object of attention rather than transparent medium.
						</p>
					</div>
					<div class="card">
						<h4 class="card-title">With Harness</h4>
						<p class="card-subtitle">Zuhandenheit (Ready-to-hand)</p>
						<p class="card-text">
							Agent re-enters prepared situation. Artifacts provide fore-structure.
							Can immediately engage with the work rather than the setup.
						</p>
					</div>
				</div>
			</div>
		</section>

		<!-- Integration -->
		<section class="section">
			<h2 class="section-title">Integration with CREATE SOMETHING</h2>
			<div class="content">
				<h3 class="subsection-title">Already Present</h3>
				<ul class="list present">
					<li><span class="check">✓</span> CLAUDE.md as initialization context</li>
					<li><span class="check">✓</span> <code>.claude/memory/</code> for domain knowledge</li>
					<li><span class="check">✓</span> TodoWrite for task tracking</li>
					<li><span class="check">✓</span> Atomic git commits</li>
				</ul>

				<h3 class="subsection-title">To Adopt</h3>
				<ul class="list adopt">
					<li><span class="check">○</span> Explicit session startup sequence (could be a hook)</li>
					<li><span class="check">○</span> Structured feature JSON for complex multi-session work</li>
					<li><span class="check">○</span> Browser automation prompting for E2E testing</li>
				</ul>
			</div>
		</section>

		<!-- Subtractive Triad -->
		<section class="section">
			<h2 class="section-title">Through the Subtractive Triad</h2>
			<div class="triad-stack">
				<div class="triad-item">
					<h4 class="triad-title">DRY (Implementation)</h4>
					<p class="triad-question">"Have I built this before?"</p>
					<p class="triad-answer">
						→ Yes. CLAUDE.md, .claude/memory/, TodoWrite already exist. Don't rebuild—extend.
					</p>
				</div>
				<div class="triad-item">
					<h4 class="triad-title">Rams (Artifact)</h4>
					<p class="triad-question">"Does each harness element earn its existence?"</p>
					<p class="triad-answer">
						→ Progress file: Yes—captures what's lost at context boundary.
						Feature JSON: Maybe—TodoWrite may suffice.
						Init script: Yes—reproducible state setup.
					</p>
				</div>
				<div class="triad-item">
					<h4 class="triad-title">Heidegger (System)</h4>
					<p class="triad-question">"Does this serve the whole?"</p>
					<p class="triad-answer">
						→ Agent continuity serves all CREATE SOMETHING properties. A harness that works
						for .io benefits .space, .agency, and .ltd equally.
					</p>
				</div>
			</div>
		</section>

		<!-- Key Insight -->
		<section class="section">
			<h2 class="section-title">Key Insight</h2>
			<div class="insight">
				<p class="insight-text">
					The harness is not scaffolding to be removed. It is the <strong>dwelling</strong>
					that enables continuous work. Just as CLAUDE.md is not documentation but
					<em>orientation</em>, the progress file is not a log but a <em>threshold</em>—
					the place where one session hands off to the next.
				</p>
			</div>
		</section>

		<!-- Footer -->
		<footer class="footer">
			<div class="grid md:grid-cols-2 gap-8">
				<div>
					<h4 class="footer-heading">Principles Applied</h4>
					<ul class="footer-list">
						<li><a href="https://createsomething.ltd/masters/heidegger">Heidegger: Hermeneutic Circle</a></li>
						<li><a href="https://createsomething.ltd/patterns/dwelling-in-tools">Dwelling in Tools</a></li>
						<li><a href="https://createsomething.ltd/patterns/subtractive-triad-audit">Subtractive Triad</a></li>
					</ul>
				</div>
				<div>
					<h4 class="footer-heading">Related</h4>
					<ul class="footer-list">
						<li><a href="/experiments/meeting-capture">Meeting Capture: Tools Recede</a></li>
						<li><a href="/papers/code-mode-hermeneutic-analysis">Code Mode Analysis</a></li>
						<li><a href="/experiments">All Experiments</a></li>
					</ul>
				</div>
			</div>
		</footer>
	</div>
</div>

<style>
	.page {
		min-height: 100vh;
		background: var(--color-bg-pure);
		color: var(--color-fg-primary);
	}

	.container {
		max-width: 64rem;
		margin: 0 auto;
		padding: var(--space-xl) var(--space-md);
	}

	/* Header */
	.header {
		padding-bottom: var(--space-lg);
		margin-bottom: var(--space-xl);
		border-bottom: 1px solid var(--color-border-default);
	}

	.category-label {
		font-size: var(--text-caption);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-fg-muted);
		margin-bottom: var(--space-xs);
	}

	.title {
		font-size: var(--text-display);
		font-weight: 700;
		margin: 0 0 var(--space-xs);
	}

	.subtitle {
		font-size: var(--text-h3);
		color: var(--color-fg-secondary);
		font-style: italic;
		margin: 0 0 var(--space-sm);
	}

	.meta {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	/* ASCII Art */
	.ascii-art {
		font-family: monospace;
		font-size: 0.6rem;
		line-height: 1.2;
		color: var(--color-fg-tertiary);
		text-align: center;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		padding: var(--space-sm);
		overflow-x: auto;
	}

	/* Source Block */
	.source-block {
		margin: var(--space-xl) 0;
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.source-block .section-title {
		font-size: var(--text-caption);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-fg-muted);
		margin-bottom: var(--space-sm);
		padding-bottom: 0;
		border-bottom: none;
	}

	.source-link {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		color: var(--color-fg-primary);
		text-decoration: none;
		font-weight: 500;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.source-link:hover {
		color: var(--color-data-1);
	}

	.external-icon {
		font-size: var(--text-body-sm);
		opacity: 0.6;
	}

	/* Sections */
	.section {
		margin: var(--space-2xl) 0;
	}

	.abstract {
		margin: var(--space-xl) 0;
		padding-left: var(--space-md);
		border-left: 4px solid var(--color-border-emphasis);
	}

	.section-title {
		font-size: var(--text-h2);
		font-weight: 700;
		margin: 0 0 var(--space-md);
		padding-bottom: var(--space-sm);
		border-bottom: 1px solid var(--color-border-default);
	}

	.subsection-title {
		font-size: var(--text-h3);
		font-weight: 600;
		color: var(--color-fg-secondary);
		margin: var(--space-lg) 0 var(--space-sm);
	}

	.content {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	/* Typography */
	.lead {
		font-size: var(--text-body-lg);
		line-height: 1.8;
		color: var(--color-fg-secondary);
	}

	.body-text {
		line-height: 1.7;
		color: var(--color-fg-secondary);
	}

	em {
		font-style: italic;
		color: var(--color-fg-primary);
	}

	/* Patterns */
	.pattern-grid {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}

	.pattern {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-md);
	}

	.pattern-title {
		font-size: var(--text-body-lg);
		font-weight: 600;
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.pattern-desc {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-sm);
	}

	.pattern-code {
		font-family: monospace;
		font-size: var(--text-body-sm);
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		padding: var(--space-sm);
		color: var(--color-fg-tertiary);
		overflow-x: auto;
		margin-bottom: var(--space-sm);
	}

	.pattern-mapping {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		padding-top: var(--space-sm);
		border-top: 1px solid var(--color-border-default);
	}

	.pattern-mapping strong {
		color: var(--color-fg-secondary);
	}

	.protocol-list {
		list-style: none;
		padding: 0;
		margin: 0 0 var(--space-sm);
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	.protocol-list li {
		padding: var(--space-xs) 0;
		padding-left: var(--space-sm);
		border-left: 2px solid var(--color-border-default);
		margin-left: var(--space-xs);
	}

	/* Cards */
	.card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-md);
	}

	.card-title {
		font-size: var(--text-body-lg);
		font-weight: 600;
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.card-subtitle {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		margin-bottom: var(--space-sm);
	}

	.card-text {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	/* Lists */
	.list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.list li {
		display: flex;
		align-items: flex-start;
		gap: var(--space-sm);
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		padding: var(--space-xs) 0;
	}

	.list .check {
		flex-shrink: 0;
		width: 1.25rem;
	}

	.list.present .check {
		color: var(--color-success);
	}

	.list.adopt .check {
		color: var(--color-fg-muted);
	}

	/* Triad */
	.triad-stack {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.triad-item {
		background: var(--color-bg-surface);
		padding: var(--space-md);
		border-radius: var(--radius-md);
		border-left: 4px solid var(--color-border-emphasis);
	}

	.triad-title {
		font-weight: 600;
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.triad-question {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		font-style: italic;
	}

	.triad-answer {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		margin-top: var(--space-xs);
	}

	/* Quote */
	.quote {
		border-left: 2px solid var(--color-border-emphasis);
		padding-left: var(--space-md);
		margin: var(--space-md) 0;
	}

	.quote p {
		font-style: italic;
		color: var(--color-fg-secondary);
	}

	.quote cite {
		display: block;
		margin-top: var(--space-xs);
		font-size: var(--text-body-sm);
		font-style: normal;
		color: var(--color-fg-muted);
	}

	.quote.featured {
		background: var(--color-bg-surface);
		padding: var(--space-md);
		border-radius: var(--radius-md);
	}

	.quote.featured p {
		font-size: var(--text-body-lg);
	}

	/* Insight */
	.insight {
		background: var(--color-bg-surface);
		border: 2px solid var(--color-border-emphasis);
		border-radius: var(--radius-lg);
		padding: var(--space-lg);
	}

	.insight-text {
		font-size: var(--text-body-lg);
		line-height: 1.7;
		color: var(--color-fg-secondary);
	}

	code {
		font-family: monospace;
		font-size: 0.875em;
		background: var(--color-bg-subtle);
		padding: 0.125rem 0.375rem;
		border-radius: var(--radius-sm);
		color: var(--color-fg-primary);
	}

	/* Footer */
	.footer {
		margin-top: var(--space-2xl);
		padding-top: var(--space-lg);
		border-top: 1px solid var(--color-border-default);
	}

	.footer-heading {
		font-size: var(--text-caption);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-fg-muted);
		margin-bottom: var(--space-sm);
	}

	.footer-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
		font-size: var(--text-body-sm);
	}

	.footer-list li {
		border: none;
		padding: 0;
	}

	.footer-list a {
		color: var(--color-fg-tertiary);
		text-decoration: underline;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.footer-list a:hover {
		color: var(--color-fg-primary);
	}

	/* Responsive */
	@media (max-width: 768px) {
		.container {
			padding: var(--space-md);
		}
	}
</style>
