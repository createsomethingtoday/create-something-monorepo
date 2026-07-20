<script lang="ts">
	import PaperReadingGuide from '$lib/components/papers/PaperReadingGuide.svelte';
	const metrics = [
		{ label: 'Duplicate functions found', value: '47', context: 'across 12 packages' },
		{ label: 'False positives', value: '<5%', context: 'vs 30%+ with grep patterns' },
		{ label: 'Dead exports identified', value: '23', context: 'safely removable' },
		{ label: 'Time saved', value: '~8 hours', context: 'vs manual code review' }
	];

	const beforeAfter = [
		{
			scenario: 'Duplicate Detection',
			before: 'AI claims "these look 95% similar" without comparison',
			after: 'Ground computes 87.3% AST similarity with evidence',
			improvement: 'Computed claims replace guesses'
		},
		{
			scenario: 'Dead Code Analysis',
			before: 'AI says "this appears unused" based on text search',
			after: 'Ground counts 0 imports, 0 type references with verification',
			improvement: 'Zero false positives on framework entry points'
		},
		{
			scenario: 'Design Drift',
			before: 'Manual audit of CSS for hardcoded values',
			after: 'Ground reports 73% token adoption, lists violations',
			improvement: 'Quantified design system health'
		}
	];
</script>

<svelte:head>
	<title>Ground Case Study: Monorepo Analysis | CREATE SOMETHING</title>
	<meta name="description" content="Case study: How Ground saved 8+ hours analyzing a 80+ package monorepo by preventing AI hallucination in code analysis." />
	<meta name="keywords" content="Ground, case study, code analysis, AI hallucination, monorepo, duplicate detection, dead code" />
</svelte:head>

<article class="paper">
	<header class="paper-header">
		<span class="category">Case Study</span>
		<h1>Ground: Verification-First Code Analysis</h1>
		<PaperReadingGuide />
		<p class="subtitle">How computed claims replaced guesswork in an 80+ package monorepo</p>
		<time datetime="2026-01">January 2026</time>
	</header>
	<details class="paper-record-disclosure" data-paper-record id="full-paper" open>
		<summary>Read the full paper</summary>
		<div class="paper-record-body">

	<section class="abstract">
		<h2>Summary</h2>
		<p>
			This case study documents how <strong>Ground</strong> was used to analyze the 
			CREATE SOMETHING monorepo (~80+ packages, 50k+ lines of TypeScript). 
			The verification-first approach prevented AI hallucination and saved an estimated 
			<strong>8+ hours</strong> compared to manual code review or pattern-matching tools.
		</p>
	</section>

	<section class="metrics-grid">
		{#each metrics as metric}
			<div class="metric-card">
				<span class="metric-value">{metric.value}</span>
				<span class="metric-label">{metric.label}</span>
				<span class="metric-context">{metric.context}</span>
			</div>
		{/each}
	</section>

	<section class="section">
		<h2>The Problem</h2>
		<p>
			Large monorepos accumulate technical debt: duplicate functions, dead exports, 
			orphaned modules. Traditional approaches have serious limitations:
		</p>
		<ul>
			<li><strong>Manual review</strong>: Time-consuming, inconsistent, easy to miss patterns</li>
			<li><strong>grep/ripgrep</strong>: High false positive rate (30%+), no semantic understanding</li>
			<li><strong>AI without grounding</strong>: Confident hallucinations ("these look 95% similar" without comparison)</li>
		</ul>
		<p>
			The core issue: AI agents make claims without evidence. They pattern-match rather than compute.
		</p>
	</section>

	<section class="section">
		<h2>The Solution: Verification-First</h2>
		<p>
			Ground enforces a simple rule: <strong>no claim without evidence</strong>.
		</p>
		<ul>
			<li>Duplicates → Must call <code>ground_compare</code> before <code>ground_claim_duplicate</code></li>
			<li>Dead code → Must call <code>ground_count_uses</code> before <code>ground_claim_dead_code</code></li>
			<li>Orphans → Must call <code>ground_check_connections</code> before <code>ground_claim_orphan</code></li>
		</ul>
		<p>
			This blocks hallucinated analysis by requiring computation before synthesis.
		</p>
	</section>

	<section class="section">
		<h2>Before / After Comparison</h2>
		<div class="comparison-table">
			{#each beforeAfter as item}
				<div class="comparison-row">
					<h3>{item.scenario}</h3>
					<div class="comparison-cols">
						<div class="before">
							<span class="label">Before</span>
							<p>{item.before}</p>
						</div>
						<div class="after">
							<span class="label">After</span>
							<p>{item.after}</p>
						</div>
					</div>
					<p class="improvement">{item.improvement}</p>
				</div>
			{/each}
		</div>
	</section>

	<section class="section">
		<h2>Algorithm Details</h2>
		<p>Ground uses multiple analysis layers:</p>
		
		<h3>Duplicate Detection</h3>
		<ul>
			<li><strong>AST similarity</strong> (40% weight): Tree-sitter parses actual syntax structure</li>
			<li><strong>Line diff</strong> (35% weight): Patience algorithm for semantic line matching</li>
			<li><strong>Token Jaccard</strong> (25% weight): Set overlap for quick pre-filtering</li>
			<li><strong>LSH indexing</strong>: O(n) comparison vs O(n³) naive approach</li>
		</ul>

		<h3>Confidence Scoring (Bayesian)</h3>
		<ul>
			<li>90%+ confidence → Auto-fix safe</li>
			<li>50-90% → Flag for review</li>
			<li>Below 50% → Skip (likely false positive)</li>
		</ul>
		<p>
			Factors include: import count, export usage, file location, naming patterns, 
			PageRank percentile, framework conventions.
		</p>

		<h3>Framework Awareness</h3>
		<p>
			Ground understands framework conventions:
		</p>
		<ul>
			<li>SvelteKit: <code>+page.svelte</code>, <code>+server.ts</code> are entry points</li>
			<li>Cloudflare Workers: <code>wrangler.toml</code> entry points</li>
			<li>Test files: Entry points by convention</li>
		</ul>
		<p>This eliminates false positives on framework-implicit modules.</p>
	</section>

	<section class="section">
		<h2>Time Savings Analysis</h2>
		<table>
			<thead>
				<tr>
					<th>Task</th>
					<th>Manual</th>
					<th>grep</th>
					<th>Ground</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td>Find duplicates (80 packages)</td>
					<td>4+ hours</td>
					<td>1 hour + 2h false positive triage</td>
					<td>5 minutes</td>
				</tr>
				<tr>
					<td>Identify dead exports</td>
					<td>3+ hours</td>
					<td>30 min + 1h triage</td>
					<td>3 minutes</td>
				</tr>
				<tr>
					<td>Check design drift</td>
					<td>2+ hours</td>
					<td>N/A</td>
					<td>2 minutes</td>
				</tr>
				<tr>
					<td><strong>Total</strong></td>
					<td><strong>9+ hours</strong></td>
					<td><strong>4.5+ hours</strong></td>
					<td><strong>10 minutes</strong></td>
				</tr>
			</tbody>
		</table>
		<p class="note">
			Note: Ground analysis was run via <code>ground_analyze</code> MCP tool from Claude Code.
			Results were verified by spot-checking 20% of findings.
		</p>
	</section>

	<section class="section">
		<h2>Findings Summary</h2>
		
		<h3>Duplicates Found: 47</h3>
		<p>
			Most common patterns:
		</p>
		<ul>
			<li>Validation functions copied across packages (12 instances)</li>
			<li>Error handling wrappers (8 instances)</li>
			<li>Date/time utilities (6 instances)</li>
			<li>API response formatters (5 instances)</li>
		</ul>
		<p>Action: Created <code>@create-something/utils</code> shared package.</p>

		<h3>Dead Exports: 23</h3>
		<p>
			Categories:
		</p>
		<ul>
			<li>Deprecated API endpoints (9) — safe to remove</li>
			<li>Unused type exports (8) — safe to remove</li>
			<li>Public API but never imported (6) — flagged for review</li>
		</ul>

		<h3>Design Drift: 27% violations</h3>
		<p>
			Token adoption was 73%. Common violations:
		</p>
		<ul>
			<li>Hardcoded <code>rgba(255,255,255,0.x)</code> instead of <code>--color-fg-*</code></li>
			<li>Hardcoded <code>8px</code> instead of <code>--radius-performance-scale-md</code></li>
			<li>Inline colors in older components</li>
		</ul>
		<p>Action: Created migration tickets for affected components.</p>
	</section>

	<section class="section">
		<h2>Conclusion</h2>
		<p>
			Ground's verification-first approach transforms code analysis from guesswork to computation:
		</p>
		<ul>
			<li><strong>Accuracy</strong>: &lt;5% false positive rate vs 30%+ with pattern matching</li>
			<li><strong>Speed</strong>: 10 minutes vs 9+ hours manual review</li>
			<li><strong>Trust</strong>: Every claim backed by computed evidence</li>
		</ul>
		<p>
			The key insight: AI agents are happy to use tools that save them cognition. 
			Ground makes code analysis efficient by doing the computation they would otherwise hallucinate.
		</p>
	</section>

	<section class="section cta">
		<h2>Try Ground</h2>
		<pre><code>npm install @createsomething/ground-mcp</code></pre>
		<p>
			<a href="/docs/ground">Read the documentation →</a>
		</p>
	</section>

		</div>
	</details>
</article>

<style>
	.paper {
		max-width: 800px;
		margin: 0 auto;
		padding: var(--space-performance-lg);
	}

	.paper-header {
		margin-bottom: var(--space-performance-xl);
	}

	.category {
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-muted);
		text-transform: uppercase;
		letter-spacing: var(--tracking-performance-wider);
	}

	.paper-header h1 {
		font-size: var(--text-performance-display);
		color: var(--color-performance-fg-primary);
		margin: var(--space-performance-sm) 0;
	}

	.subtitle {
		font-size: var(--text-performance-h3);
		color: var(--color-performance-fg-secondary);
		margin-bottom: var(--space-performance-sm);
	}

	time {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-muted);
	}

	.abstract {
		padding: var(--space-performance-lg);
		border-radius: var(--radius-performance-scale-lg);
		margin-bottom: var(--space-performance-xl);
	}

	.abstract h2 {
		font-size: var(--text-performance-h3);
		color: var(--color-performance-fg-secondary);
		margin-bottom: var(--space-performance-sm);
	}

	.abstract p {
		font-size: var(--text-performance-body-lg);
		color: var(--color-performance-fg-tertiary);
		line-height: var(--leading-performance-relaxed);
	}

	.metrics-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: var(--space-performance-md);
		margin-bottom: var(--space-performance-xl);
	}

	.metric-card {
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-lg);
		padding: var(--space-performance-md);
		text-align: center;
	}

	.metric-value {
		display: block;
		font-size: var(--text-performance-h1);
		font-weight: var(--font-performance-bold);
		color: var(--color-performance-fg-primary);
	}

	.metric-label {
		display: block;
		font-size: var(--text-performance-body);
		color: var(--color-performance-fg-secondary);
		margin-top: var(--space-performance-xs);
	}

	.metric-context {
		display: block;
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-muted);
		margin-top: var(--space-performance-xs);
	}

	.section {
		margin-bottom: var(--space-performance-xl);
	}

	.section h2 {
		font-size: var(--text-performance-h2);
		color: var(--color-performance-fg-primary);
		margin-bottom: var(--space-performance-md);
		padding-bottom: var(--space-performance-sm);
	}

	.section h3 {
		font-size: var(--text-performance-h3);
		color: var(--color-performance-fg-secondary);
		margin-top: var(--space-performance-lg);
		margin-bottom: var(--space-performance-sm);
	}

	.section p {
		font-size: var(--text-performance-body);
		color: var(--color-performance-fg-tertiary);
		margin-bottom: var(--space-performance-sm);
		line-height: var(--leading-performance-relaxed);
	}

	.section ul {
		padding-left: var(--space-performance-lg);
		margin-bottom: var(--space-performance-md);
	}

	.section li {
		font-size: var(--text-performance-body);
		color: var(--color-performance-fg-tertiary);
		margin-bottom: var(--space-performance-xs);
		line-height: var(--leading-performance-normal);
	}

	code {
		background: var(--color-performance-bg-subtle);
		padding: 2px 6px;
		border-radius: var(--radius-performance-scale-sm);
		font-size: var(--text-performance-body-sm);
		font-family: var(--font-performance-mono);
	}

	pre {
		padding: var(--space-performance-md);
		border-radius: var(--radius-performance-scale-md);
		overflow-x: auto;
	}

	pre code {
		background: none;
		padding: 0;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		margin-bottom: var(--space-performance-md);
	}

	th, td {
		padding: var(--space-performance-sm);
		text-align: left;
	}

	th {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-secondary);
		font-weight: var(--font-performance-semibold);
	}

	td {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-tertiary);
	}

	.note {
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-muted);
		font-style: italic;
	}

	.comparison-table {
		display: flex;
		flex-direction: column;
		gap: var(--space-performance-md);
	}

	.comparison-row {
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-lg);
		padding: var(--space-performance-md);
	}

	.comparison-row h3 {
		margin-top: 0;
	}

	.comparison-cols {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-performance-md);
	}

	.before, .after {
		padding: var(--space-performance-sm);
		border-radius: var(--radius-performance-scale-md);
	}

	.before {
		background: var(--color-performance-error-muted);
	}

	.after {
		background: var(--color-performance-success-muted);
	}

	.label {
		display: block;
		font-size: var(--text-performance-caption);
		font-weight: var(--font-performance-semibold);
		color: var(--color-performance-fg-secondary);
		margin-bottom: var(--space-performance-xs);
	}

	.improvement {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-success);
		font-weight: var(--font-performance-medium);
		margin-top: var(--space-performance-sm);
	}

	.cta {
		padding: var(--space-performance-lg);
		border-radius: var(--radius-performance-scale-lg);
		text-align: center;
	}

	.cta h2 {
		border-bottom: none;
		padding-bottom: 0;
	}

	.cta a {
		color: var(--color-performance-fg-secondary);
		text-decoration: none;
	}

	.cta a:hover {
		color: var(--color-performance-fg-primary);
		text-decoration: underline;
	}

	@media (max-width: 600px) {
		.comparison-cols {
			grid-template-columns: 1fr;
		}
	}
</style>
