<script lang="ts">
	import { Footer } from '@create-something/components';

	const quickLinks = [
		{ label: 'Home', href: '/' },
		{ label: 'Services', href: '/services' },
		{ label: 'Work', href: '/work' },
		{ label: 'About', href: '/about' }
	];
</script>

<svelte:head>
	<title>Viralytics — Case Study | CREATE SOMETHING Agency</title>
	<meta
		name="description"
		content="AI-powered A&R discovery agent that identifies independent artists with viral momentum across Spotify charts and city playlists."
	/>
</svelte:head>

<div class="min-h-screen bg-black text-white">
	<!-- Hero -->
	<section class="pt-32 pb-16 px-6 border-b border-white/10">
		<div class="max-w-4xl mx-auto">
			<div class="mb-6">
				<a href="/work" class="text-sm opacity-60 hover:opacity-100">← Back to Work</a>
			</div>
			<p class="text-sm tracking-widest uppercase opacity-60 mb-4">Client: Half Dozen</p>
			<h1 class="mb-6">Viralytics</h1>
			<p class="text-2xl opacity-70 leading-relaxed mb-8">
				AI-powered A&R discovery agent that identifies independent artists with viral momentum across Spotify charts and city playlists
			</p>
			<div class="flex flex-wrap gap-4 text-sm opacity-50">
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

			<div class="space-y-6 text-lg opacity-80 leading-relaxed">
				<p>
					Half Dozen's A&R team needed a way to discover independent artists before they blow up.
					Manual tracking across multiple chart sources was time-consuming and inconsistent.
					The solution needed to identify artists with viral momentum and present actionable intelligence.
				</p>

				<p><strong>Technical requirements:</strong></p>

				<ul class="space-y-3 text-base opacity-70 pl-6">
					<li class="flex items-start gap-3">
						<span class="opacity-40 mt-1">—</span>
						<span>Scrape Spotify charts (Global Daily, City Pulse playlists)</span>
					</li>
					<li class="flex items-start gap-3">
						<span class="opacity-40 mt-1">—</span>
						<span>Track chart positions, rank changes, days on chart</span>
					</li>
					<li class="flex items-start gap-3">
						<span class="opacity-40 mt-1">—</span>
						<span>Filter for independent artists (non-major label)</span>
					</li>
					<li class="flex items-start gap-3">
						<span class="opacity-40 mt-1">—</span>
						<span>Calculate "Viralytics Score" for discovery prioritization</span>
					</li>
					<li class="flex items-start gap-3">
						<span class="opacity-40 mt-1">—</span>
						<span>Automatically add qualified artists to Notion for review</span>
					</li>
				</ul>
			</div>
		</div>
	</section>

	<!-- Architecture -->
	<section class="py-16 px-6 border-t border-white/10">
		<div class="max-w-3xl mx-auto">
			<h2 class="mb-8">System Architecture</h2>

			<div class="space-y-6 text-lg opacity-80 leading-relaxed">
				<div class="my-8 p-8 border border-white/10 rounded-xl bg-white/5">
					<p class="text-sm font-mono opacity-60 mb-4">Data Flow:</p>
					<pre class="text-sm opacity-70 font-mono leading-loose overflow-x-auto">
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

				<ul class="space-y-3 text-base opacity-70 pl-6">
					<li class="flex items-start gap-3">
						<span class="opacity-40 mt-1">✓</span>
						<span><strong>chart-scraper:</strong> Browser Rendering API with Puppeteer for scraping protected charts</span>
					</li>
					<li class="flex items-start gap-3">
						<span class="opacity-40 mt-1">✓</span>
						<span><strong>chart-service:</strong> API orchestrator that fetches, caches, and stores chart data</span>
					</li>
					<li class="flex items-start gap-3">
						<span class="opacity-40 mt-1">✓</span>
						<span><strong>viralytics-workflow:</strong> Daily AI agent that discovers and qualifies artists</span>
					</li>
				</ul>
			</div>
		</div>
	</section>

	<!-- Discovery Queries -->
	<section class="py-16 px-6 border-t border-white/10">
		<div class="max-w-3xl mx-auto">
			<h2 class="mb-8">AI-Powered Discovery</h2>

			<div class="space-y-6 text-lg opacity-80 leading-relaxed">
				<p>
					The viralytics workflow runs 20 SQL queries daily to identify artists with viral potential:
				</p>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-4 my-8">
					<div class="p-4 border border-white/10 rounded-lg">
						<p class="text-sm font-semibold mb-2">Trending New Entries</p>
						<p class="text-xs opacity-60">New in top 50, last 14 days</p>
					</div>
					<div class="p-4 border border-white/10 rounded-lg">
						<p class="text-sm font-semibold mb-2">Rapid Climbers</p>
						<p class="text-xs opacity-60">8+ position jump in 7 days</p>
					</div>
					<div class="p-4 border border-white/10 rounded-lg">
						<p class="text-sm font-semibold mb-2">Cross-Market Momentum</p>
						<p class="text-xs opacity-60">Charting in 2+ markets</p>
					</div>
					<div class="p-4 border border-white/10 rounded-lg">
						<p class="text-sm font-semibold mb-2">Independent Rising</p>
						<p class="text-xs opacity-60">Non-major label, top 30</p>
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
	<section class="py-16 px-6 border-t border-white/10">
		<div class="max-w-3xl mx-auto">
			<h2 class="mb-8">Results</h2>

			<div class="space-y-6 text-lg opacity-80 leading-relaxed">
				<div class="grid grid-cols-1 md:grid-cols-3 gap-6 my-8">
					<div class="text-center p-6 border border-white/10 rounded-xl">
						<p class="text-3xl font-bold mb-2">4+</p>
						<p class="text-sm opacity-60">Chart sources</p>
						<p class="text-xs opacity-40 mt-1">Global, Denver, NYC, Austin</p>
					</div>
					<div class="text-center p-6 border border-white/10 rounded-xl">
						<p class="text-3xl font-bold mb-2">Daily</p>
						<p class="text-sm opacity-60">Automated discovery</p>
						<p class="text-xs opacity-40 mt-1">7 AM UTC workflow</p>
					</div>
					<div class="text-center p-6 border border-white/10 rounded-xl">
						<p class="text-3xl font-bold mb-2">20</p>
						<p class="text-sm opacity-60">Discovery queries</p>
						<p class="text-xs opacity-40 mt-1">Multi-signal analysis</p>
					</div>
				</div>

				<p><strong>Production status:</strong></p>

				<ul class="space-y-3 text-base opacity-70 pl-6">
					<li class="flex items-start gap-3">
						<span class="opacity-40 mt-1">✓</span>
						<span>Chart scraping operational (4 sources)</span>
					</li>
					<li class="flex items-start gap-3">
						<span class="opacity-40 mt-1">✓</span>
						<span>Daily workflow triggering at 7 AM UTC</span>
					</li>
					<li class="flex items-start gap-3">
						<span class="opacity-40 mt-1">✓</span>
						<span>Notion integration for A&R review queue</span>
					</li>
					<li class="flex items-start gap-3">
						<span class="opacity-40 mt-1">⏳</span>
						<span>Cloudflare D1 migration in progress (from Neon PostgreSQL)</span>
					</li>
				</ul>
			</div>
		</div>
	</section>

	<!-- Pattern Validation -->
	<section class="py-16 px-6 border-t border-white/10">
		<div class="max-w-3xl mx-auto">
			<h2 class="mb-8">Applying the Canon</h2>

			<div class="space-y-6 text-lg opacity-80 leading-relaxed">
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
	<section class="py-16 px-6 border-t border-white/10">
		<div class="max-w-3xl mx-auto text-center">
			<h2 class="mb-6">Need AI-Powered Discovery?</h2>
			<p class="text-lg opacity-70 mb-8 leading-relaxed">
				We build autonomous agents that surface actionable intelligence from complex data landscapes.
			</p>
			<a
				href="/contact"
				class="inline-block px-8 py-4 bg-white text-black font-medium hover:opacity-90 transition-opacity"
			>
				Start a Conversation
			</a>
		</div>
	</section>

<Footer
	mode="agency"
	showNewsletter={false}
	aboutText="Professional AI-native development services backed by research from createsomething.io"
	quickLinks={quickLinks}
	showSocial={true}
/>
</div>
