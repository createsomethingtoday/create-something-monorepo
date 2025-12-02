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
	<title>Our Work | CREATE SOMETHING Agency</title>
	<meta
		name="description"
		content="Real client projects applying AI-native development to business challenges. Case studies showing how research becomes production."
	/>
</svelte:head>

<!-- Hero Section -->
	<section class="relative pt-32 pb-16 px-6 border-b border-white/10">
		<div class="max-w-7xl mx-auto">
			<div class="text-center space-y-6">
				<h1 class="text-4xl md:text-6xl font-bold text-white">Our Work</h1>
				<p class="text-lg text-white/60 max-w-3xl mx-auto">
					Real client projects applying canonical patterns from
					<a
						href="https://createsomething.ltd"
						class="text-white hover:text-white/80 underline"
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
					class="block p-12 bg-white/[0.07] border border-white/10 rounded-xl hover:border-white transition-colors group"
				>
					<div class="mb-6">
						<span class="text-xs font-mono text-white/40">CLIENT: HALF DOZEN</span>
					</div>
					<h2 class="text-3xl font-semibold text-white mb-4 group-hover:opacity-70 transition-opacity">
						Kickstand
					</h2>
					<p class="text-lg text-white/60 mb-8 leading-relaxed">
						Venue intelligence system with health monitoring, automated cleanup scripts, and real-time status dashboards
					</p>
					<div class="space-y-3 text-sm text-white/50">
						<p>→ Cloudflare Workers + D1</p>
						<p>→ 92% script reduction via Subtractive Triad</p>
						<p>→ Health score: 6.2 → 9.2</p>
					</div>
					<div class="mt-8 pt-6 border-t border-white/10">
						<p class="text-xs text-white/40 uppercase tracking-wider mb-2">Pattern Applied</p>
						<p class="text-sm text-white/60">Subtractive Triad: DRY → Rams → Heidegger</p>
					</div>
				</a>

				<!-- Arc for Gmail -->
				<a
					href="/work/arc-for-gmail"
					class="block p-12 bg-white/[0.07] border border-white/10 rounded-xl hover:border-white transition-colors group"
				>
					<div class="mb-6">
						<span class="text-xs font-mono text-white/40">CLIENT: HALF DOZEN</span>
					</div>
					<h2 class="text-3xl font-semibold text-white mb-4 group-hover:opacity-70 transition-opacity">
						Arc for Gmail
					</h2>
					<p class="text-lg text-white/60 mb-8 leading-relaxed">
						Multi-user Gmail→Notion sync with AI-powered summaries and automatic contact management
					</p>
					<div class="space-y-3 text-sm text-white/50">
						<p>→ Cloudflare Workers + Workers AI</p>
						<p>→ OAuth-based multi-tenant sync</p>
						<p>→ Production-deployed, 5-min cycles</p>
					</div>
					<div class="mt-8 pt-6 border-t border-white/10">
						<p class="text-xs text-white/40 uppercase tracking-wider mb-2">Pattern Applied</p>
						<p class="text-sm text-white/60">Arc: Efficient connection between points</p>
					</div>
				</a>

				<!-- Maverick X -->
				<a
					href="/work/maverick-x"
					class="block p-12 bg-white/[0.07] border border-white/10 rounded-xl hover:border-white transition-colors group"
				>
					<div class="mb-6">
						<span class="text-xs font-mono text-white/40">CLIENT: MAVERICK X</span>
					</div>
					<h2 class="text-3xl font-semibold text-white mb-4 group-hover:opacity-70 transition-opacity">
						Maverick X
					</h2>
					<p class="text-lg text-white/60 mb-8 leading-relaxed">
						Corporate website for industrial chemistry company with product showcases across oil & gas, mining, and water treatment
					</p>
					<div class="space-y-3 text-sm text-white/50">
						<p>→ Next.js 14 + Tailwind CSS</p>
						<p>→ Sector-specific landing pages</p>
						<p>→ Production-deployed on Vercel</p>
					</div>
					<div class="mt-8 pt-6 border-t border-white/10">
						<p class="text-xs text-white/40 uppercase tracking-wider mb-2">Pattern Applied</p>
						<p class="text-sm text-white/60">Weniger, aber besser: Less, but better</p>
					</div>
				</a>

				<!-- Viralytics -->
				<a
					href="/work/viralytics"
					class="block p-12 bg-white/[0.07] border border-white/10 rounded-xl hover:border-white transition-colors group"
				>
					<div class="mb-6">
						<span class="text-xs font-mono text-white/40">CLIENT: HALF DOZEN</span>
					</div>
					<h2 class="text-3xl font-semibold text-white mb-4 group-hover:opacity-70 transition-opacity">
						Viralytics
					</h2>
					<p class="text-lg text-white/60 mb-8 leading-relaxed">
						AI-powered A&R discovery agent identifying independent artists with viral momentum across Spotify charts
					</p>
					<div class="space-y-3 text-sm text-white/50">
						<p>→ Cloudflare Workers + Puppeteer</p>
						<p>→ 20 discovery queries daily</p>
						<p>→ Notion integration for A&R review</p>
					</div>
					<div class="mt-8 pt-6 border-t border-white/10">
						<p class="text-xs text-white/40 uppercase tracking-wider mb-2">Pattern Applied</p>
						<p class="text-sm text-white/60">Data-ink ratio: Maximize signal, minimize noise</p>
					</div>
				</a>
			</div>
		</div>
	</section>

	<!-- Methodology Link -->
	<section class="py-24 px-6">
		<div class="max-w-4xl mx-auto text-center">
			<div class="p-12 bg-white/[0.07] border border-white/10 rounded-lg">
				<h2 class="text-2xl font-semibold text-white mb-4">See Our Methodology</h2>
				<p class="text-white/60 mb-8 leading-relaxed">
					Every project starts as a tracked experiment. View our research and development process
					at createsomething.io.
				</p>
				<a
					href="https://createsomething.io"
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex items-center gap-2 px-8 py-4 bg-white text-black text-lg font-semibold rounded-full hover:bg-white/90 transition-all group"
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

<Footer
	mode="agency"
	showNewsletter={false}
	aboutText="Professional AI-native development services backed by research from createsomething.io"
	quickLinks={quickLinks}
	showSocial={true}
/>
