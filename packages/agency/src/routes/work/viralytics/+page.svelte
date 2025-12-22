<script lang="ts">
	// Footer is provided by layout
</script>

<svelte:head>
	<title>Viralytics — Case Study | CREATE SOMETHING Agency</title>
	<meta
		name="description"
		content="Autonomous A&R discovery agent that identifies independent artists with viral momentum across Spotify charts and city playlists."
	/>
</svelte:head>

<div class="page-container min-h-screen">
	<!-- Hero -->
	<section class="hero-section pt-32 pb-16 px-6">
		<div class="max-w-4xl mx-auto">
			<div class="mb-6">
				<a href="/work" class="body-sm link-muted">← Back to Work</a>
			</div>
			<p class="body-sm tracking-widest uppercase body-tertiary mb-4">Client: Half Dozen</p>
			<h1 class="mb-6">Viralytics</h1>
			<p class="heading-2 body-tertiary leading-relaxed mb-8">
				Autonomous A&R discovery agent that identifies independent artists with viral momentum across Spotify charts and city playlists
			</p>
			<div class="flex flex-wrap gap-4 body-sm body-muted">
				<span>• Cloudflare Workers</span>
				<span>• Puppeteer Scraping</span>
				<span>• AI Analysis</span>
				<span>• Notion Integration</span>
			</div>
		</div>
	</section>

	<!-- Overview -->
	<section class="py-16 px-6">
		<div class="max-w-3xl mx-auto">
			<h2 class="mb-8">The Challenge</h2>

			<div class="space-y-6 body-lg leading-relaxed">
				<p>
					Half Dozen's A&R team needed a way to discover independent artists before they blow up.
					Manual tracking across multiple chart sources was time-consuming and inconsistent.
					The solution needed to identify artists with viral momentum and present actionable intelligence.
				</p>

				<p><strong>Technical requirements:</strong></p>

				<ul class="space-y-3 body body-tertiary pl-6">
					<li class="flex items-start gap-3">
						<span class="body-subtle mt-1">—</span>
						<span>Scrape Spotify charts (Global Daily, City Pulse playlists)</span>
					</li>
					<li class="flex items-start gap-3">
						<span class="body-subtle mt-1">—</span>
						<span>Track chart positions, rank changes, days on chart</span>
					</li>
					<li class="flex items-start gap-3">
						<span class="body-subtle mt-1">—</span>
						<span>Filter for independent artists (non-major label)</span>
					</li>
					<li class="flex items-start gap-3">
						<span class="body-subtle mt-1">—</span>
						<span>Calculate "Viralytics Score" for discovery prioritization</span>
					</li>
					<li class="flex items-start gap-3">
						<span class="body-subtle mt-1">—</span>
						<span>Automatically add qualified artists to Notion for review</span>
					</li>
				</ul>
			</div>
		</div>
	</section>

	<!-- Architecture -->
	<section class="py-16 px-6 section-border">
		<div class="max-w-3xl mx-auto">
			<h2 class="mb-8">System Architecture</h2>

			<div class="space-y-6 body-lg leading-relaxed">
				<div class="my-8 p-8 card-surface">
					<p class="body-sm font-mono body-tertiary mb-4">Data Flow:</p>
					<pre class="body-sm body-tertiary font-mono leading-loose overflow-x-auto">
Chart Sources (Spotify, City Pulse)
    ↓
chart-scraper Worker (Puppeteer)
    ↓
chart-service Worker (API + Storage)
    ↓
D1 Database (charts, artists, metrics)
    ↓
viralytics-workflow (Daily 7 AM UTC)
    ↓
AI Analysis (OpenAI + Perplexity)
    ↓
Notion (A&R Review Queue)
					</pre>
				</div>

				<p><strong>Key components:</strong></p>

				<ul class="space-y-3 body body-tertiary pl-6">
					<li class="flex items-start gap-3">
						<span class="body-subtle mt-1">✓</span>
						<span><strong>chart-scraper:</strong> Browser Rendering API with Puppeteer for scraping protected charts</span>
					</li>
					<li class="flex items-start gap-3">
						<span class="body-subtle mt-1">✓</span>
						<span><strong>chart-service:</strong> API orchestrator that fetches, caches, and stores chart data</span>
					</li>
					<li class="flex items-start gap-3">
						<span class="body-subtle mt-1">✓</span>
						<span><strong>viralytics-workflow:</strong> Daily AI agent that discovers and qualifies artists</span>
					</li>
				</ul>
			</div>
		</div>
	</section>

	<!-- Discovery Queries -->
	<section class="py-16 px-6 section-border">
		<div class="max-w-3xl mx-auto">
			<h2 class="mb-8">AI-Powered Discovery</h2>

			<div class="space-y-6 body-lg leading-relaxed">
				<p>
					The viralytics workflow runs 20 SQL queries daily to identify artists with viral potential:
				</p>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-4 my-8">
					<div class="p-4 query-card">
						<p class="body-sm font-semibold mb-2">Trending New Entries</p>
						<p class="body-xs query-desc">New in top 50, last 14 days</p>
					</div>
					<div class="p-4 query-card">
						<p class="body-sm font-semibold mb-2">Rapid Climbers</p>
						<p class="body-xs query-desc">8+ position jump in 7 days</p>
					</div>
					<div class="p-4 query-card">
						<p class="body-sm font-semibold mb-2">Cross-Market Momentum</p>
						<p class="body-xs query-desc">Charting in 2+ markets</p>
					</div>
					<div class="p-4 query-card">
						<p class="body-sm font-semibold mb-2">Independent Rising</p>
						<p class="body-xs query-desc">Non-major label, top 30</p>
					</div>
				</div>

				<p>
					Each candidate is scored using the <strong>Viralytics Score</strong>—a composite metric
					combining chart velocity, market breadth, and independence status.
				</p>
			</div>
		</div>
	</section>

	<!-- Results -->
	<section class="py-16 px-6 section-border">
		<div class="max-w-3xl mx-auto">
			<h2 class="mb-8">Results</h2>

			<div class="space-y-6 body-lg leading-relaxed">
				<div class="grid grid-cols-1 md:grid-cols-3 gap-6 my-8">
					<div class="text-center p-6 metric-card">
						<p class="heading-2 font-bold mb-2">4+</p>
						<p class="body-sm metric-label">Chart sources</p>
						<p class="body-xs metric-sublabel mt-1">Global, Denver, NYC, Austin</p>
					</div>
					<div class="text-center p-6 metric-card">
						<p class="heading-2 font-bold mb-2">Daily</p>
						<p class="body-sm metric-label">Automated discovery</p>
						<p class="body-xs metric-sublabel mt-1">7 AM UTC workflow</p>
					</div>
					<div class="text-center p-6 metric-card">
						<p class="heading-2 font-bold mb-2">20</p>
						<p class="body-sm metric-label">Discovery queries</p>
						<p class="body-xs metric-sublabel mt-1">Multi-signal analysis</p>
					</div>
				</div>

				<p><strong>Production status:</strong></p>

				<ul class="space-y-3 body body-tertiary pl-6">
					<li class="flex items-start gap-3">
						<span class="body-subtle mt-1">✓</span>
						<span>Chart scraping operational (4 sources)</span>
					</li>
					<li class="flex items-start gap-3">
						<span class="body-subtle mt-1">✓</span>
						<span>Daily workflow triggering at 7 AM UTC</span>
					</li>
					<li class="flex items-start gap-3">
						<span class="body-subtle mt-1">✓</span>
						<span>Notion integration for A&R review queue</span>
					</li>
					<li class="flex items-start gap-3">
						<span class="body-subtle mt-1">⏳</span>
						<span>Cloudflare D1 migration in progress (from Neon PostgreSQL)</span>
					</li>
				</ul>
			</div>
		</div>
	</section>

	<!-- Pattern Validation -->
	<section class="py-16 px-6 section-border">
		<div class="max-w-3xl mx-auto">
			<h2 class="mb-8">Applying the Canon</h2>

			<div class="space-y-6 body-lg leading-relaxed">
				<p>
					Viralytics applies <strong>Tufte's data-ink ratio</strong> principle: the system maximizes
					signal (actionable artist discoveries) and minimizes noise (irrelevant chart data).
				</p>

				<p>
					The 20-query discovery engine embodies <strong>Rams' Principle 10</strong> (as little as possible)—each
					query targets a specific signal. No query exists without justification.
				</p>
			</div>
		</div>
	</section>

	<!-- CTA -->
	<section class="py-16 px-6 section-border">
		<div class="max-w-3xl mx-auto text-center">
			<h2 class="mb-6">Need AI-Powered Discovery?</h2>
			<p class="body-lg body-tertiary mb-8 leading-relaxed">
				We build autonomous agents that surface actionable intelligence from complex data landscapes.
			</p>
			<a
				href="/contact"
				class="inline-block px-8 py-4 btn-primary"
			>
				Start a Conversation
			</a>
		</div>
	</section>

<style>
	.page-container {
		background: var(--color-bg-pure);
	}

	.hero-section {
		border-bottom: 1px solid var(--color-border-default);
	}

	.hero-title {
		font-size: var(--text-h1);
		font-weight: bold;
		color: var(--color-fg-primary);
	}

	.metric-card {
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.metric-label {
		color: var(--color-fg-muted);
	}

	.metric-sublabel {
		color: var(--color-fg-subtle);
	}

	.query-card {
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
	}

	.query-desc {
		color: var(--color-fg-muted);
	}

	.heading-2 {
		font-size: var(--text-h2);
		font-weight: bold;
		color: var(--color-fg-primary);
	}

	.heading-3 {
		font-size: var(--text-h3);
		font-weight: 600;
		color: var(--color-fg-primary);
	}

	.body-xl {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
	}

	.body-lg {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
	}

	.body {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
	}

	.body-sm {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	.body-xs {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.body-secondary {
		color: var(--color-fg-secondary);
	}

	.body-tertiary {
		color: var(--color-fg-tertiary);
	}

	.body-muted {
		color: var(--color-fg-muted);
	}

	.link {
		color: var(--color-fg-primary);
	}

	.link:hover {
		text-decoration: underline;
	}

	.card-surface {
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.card-elevated {
		padding: var(--space-md);
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.section-border {
		border-top: 1px solid var(--color-border-default);
	}

	.btn-primary {
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		font-weight: 600;
		border-radius: var(--radius-full);
	}

	.btn-primary:hover {
		opacity: 0.9;
	}

	.input {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		color: var(--color-fg-primary);
	}

	.input:focus {
		border-color: var(--color-border-emphasis);
	}
</style>

</div>
