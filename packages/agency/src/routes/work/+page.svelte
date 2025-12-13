<script lang="ts">
	// Footer is provided by layout
</script>

<svelte:head>
	<title>Our Work | CREATE SOMETHING Agency</title>
	<meta
		name="description"
		content="Real client projects applying AI-native development to business challenges. Case studies showing how research becomes production."
	/>
</svelte:head>

<!-- Hero Section -->
<section class="relative pt-32 pb-16 px-6 hero-section">
	<div class="max-w-7xl mx-auto">
		<div class="text-center space-y-6">
			<h1 class="hero-title font-bold">Our Work</h1>
			<p class="body-lg body-tertiary max-w-3xl mx-auto">
				Real client projects applying canonical patterns from
				<a
					href="https://createsomething.ltd"
					class="hover:body-secondary underline"
				>
					createsomething.ltd
				</a>. Each case study shows how research becomes production.
			</p>
		</div>
	</div>
</section>

<!-- Case Studies -->
<section class="py-24 px-6">
		<div class="max-w-7xl mx-auto">
			<div class="grid grid-cols-1 md:grid-cols-2 gap-8">
				<!-- Kickstand -->
				<a
					href="/work/kickstand"
					class="block p-12 transition-colors group case-study-card"
				>
					<div class="mb-6">
						<span class="body-xs font-mono body-muted">CLIENT: HALF DOZEN</span>
					</div>
					<h2 class="heading-2 font-semibold mb-4 group-hover:opacity-70 transition-opacity">
						Kickstand
					</h2>
					<p class="body-lg body-tertiary mb-8 leading-relaxed">
						Venue intelligence system with health monitoring, automated cleanup scripts, and real-time status dashboards
					</p>
					<div class="space-y-3 body-sm body-muted">
						<p>→ Cloudflare Workers + D1</p>
						<p>→ 92% script reduction via Subtractive Triad</p>
						<p>→ Health score: 6.2 → 9.2</p>
					</div>
					<div class="mt-8 pt-6 section-border">
						<p class="body-xs body-muted uppercase tracking-wider mb-2">Pattern Applied</p>
						<p class="body-sm body-tertiary">Subtractive Triad: DRY → Rams → Heidegger</p>
					</div>
				</a>

				<!-- Arc for Gmail -->
				<a
					href="/work/arc-for-gmail"
					class="block p-12 transition-colors group case-study-card"
				>
					<div class="mb-6">
						<span class="body-xs font-mono body-muted">CLIENT: HALF DOZEN</span>
					</div>
					<h2 class="heading-2 font-semibold mb-4 group-hover:opacity-70 transition-opacity">
						Arc for Gmail
					</h2>
					<p class="body-lg body-tertiary mb-8 leading-relaxed">
						Multi-user Gmail→Notion sync with AI-powered summaries and automatic contact management
					</p>
					<div class="space-y-3 body-sm body-muted">
						<p>→ Cloudflare Workers + Workers AI</p>
						<p>→ OAuth-based multi-tenant sync</p>
						<p>→ Production-deployed, 5-min cycles</p>
					</div>
					<div class="mt-8 pt-6 section-border">
						<p class="body-xs body-muted uppercase tracking-wider mb-2">Pattern Applied</p>
						<p class="body-sm body-tertiary">Arc: Efficient connection between points</p>
					</div>
				</a>

				<!-- Maverick X -->
				<a
					href="/work/maverick-x"
					class="block p-12 transition-colors group case-study-card"
				>
					<div class="mb-6">
						<span class="body-xs font-mono body-muted">CLIENT: MAVERICK X</span>
					</div>
					<h2 class="heading-2 font-semibold mb-4 group-hover:opacity-70 transition-opacity">
						Maverick X
					</h2>
					<p class="body-lg body-tertiary mb-8 leading-relaxed">
						Corporate website for industrial chemistry company with product showcases across oil & gas, mining, and water treatment
					</p>
					<div class="space-y-3 body-sm body-muted">
						<p>→ Next.js 14 + Tailwind CSS</p>
						<p>→ Sector-specific landing pages</p>
						<p>→ Production-deployed on Vercel</p>
					</div>
					<div class="mt-8 pt-6 section-border">
						<p class="body-xs body-muted uppercase tracking-wider mb-2">Pattern Applied</p>
						<p class="body-sm body-tertiary">Weniger, aber besser: Less, but better</p>
					</div>
				</a>

				<!-- Viralytics -->
				<a
					href="/work/viralytics"
					class="block p-12 transition-colors group case-study-card"
				>
					<div class="mb-6">
						<span class="body-xs font-mono body-muted">CLIENT: HALF DOZEN</span>
					</div>
					<h2 class="heading-2 font-semibold mb-4 group-hover:opacity-70 transition-opacity">
						Viralytics
					</h2>
					<p class="body-lg body-tertiary mb-8 leading-relaxed">
						AI-powered A&R discovery agent identifying independent artists with viral momentum across Spotify charts
					</p>
					<div class="space-y-3 body-sm body-muted">
						<p>→ Cloudflare Workers + Puppeteer</p>
						<p>→ 20 discovery queries daily</p>
						<p>→ Notion integration for A&R review</p>
					</div>
					<div class="mt-8 pt-6 section-border">
						<p class="body-xs body-muted uppercase tracking-wider mb-2">Pattern Applied</p>
						<p class="body-sm body-tertiary">Data-ink ratio: Maximize signal, minimize noise</p>
					</div>
				</a>
			</div>
		</div>
	</section>

<!-- Methodology Link -->
<section class="py-24 px-6">
	<div class="max-w-4xl mx-auto text-center">
		<div class="p-12 methodology-card">
			<h2 class="heading-2 font-semibold mb-4">See Our Methodology</h2>
			<p class="body-tertiary mb-8 leading-relaxed">
				Every project starts as a tracked experiment. View our research and development process
				at createsomething.io.
			</p>
			<a
				href="https://createsomething.io"
				target="_blank"
				rel="noopener noreferrer"
				class="inline-flex items-center gap-2 px-8 py-4 transition-all group cta-button-primary"
			>
				View Experiments
				<svg
					class="w-5 h-5 transition-transform group-hover:translate-x-1"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
					stroke-width="2"
				>
					<path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
				</svg>
			</a>
		</div>
	</div>
</section>

<style>
	/* Hero section */
	.hero-section {
		border-bottom: 1px solid var(--color-border-default);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	/* Case study cards */
	.case-study-card {
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.case-study-card:hover {
		border-color: var(--color-fg-primary);
	}

	/* Methodology card */
	.methodology-card {
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	/* Primary CTA button */
	.cta-button-primary {
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		font-size: var(--text-body-lg);
		font-weight: 600;
		border-radius: var(--radius-full);
		transition: all var(--duration-standard) var(--ease-standard);
	}

	.cta-button-primary:hover {
		opacity: 0.9;
	}

	.hero-title {
		font-size: var(--text-h1);
		font-weight: bold;
		color: var(--color-fg-primary);
		text-align: center;
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
