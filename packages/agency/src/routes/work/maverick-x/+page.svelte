<script lang="ts">
	// Footer is provided by layout
</script>

<svelte:head>
	<title>Maverick X — Case Study | CREATE SOMETHING Agency</title>
	<meta
		name="description"
		content="Corporate website for Maverick X industrial chemistry company. Built with Next.js 14 and Tailwind CSS."
	/>
</svelte:head>

<div class="page-container min-h-screen">
	<!-- Hero -->
	<section class="hero-section pt-32 pb-16 px-6">
		<div class="max-w-4xl mx-auto">
			<div class="mb-6">
				<a href="/work" class="body-sm link-muted">← Back to Work</a>
			</div>
			<p class="body-sm tracking-widest uppercase opacity-60 mb-4">Client: Maverick X</p>
			<h1 class="mb-6">Maverick X</h1>
			<p class="heading-2 opacity-70 leading-relaxed mb-8">
				Corporate website for industrial chemistry company with breakthrough solutions across oil & gas, mining, and water treatment
			</p>
			<div class="flex gap-4 body-sm opacity-50">
				<span>• Next.js 14</span>
				<span>• Tailwind CSS</span>
				<span>• Framer Motion</span>
				<span>• Vercel</span>
			</div>
		</div>
	</section>

	<!-- Overview -->
	<section class="py-16 px-6">
		<div class="max-w-3xl mx-auto">
			<h2 class="mb-8">The Challenge</h2>

			<div class="space-y-6 body-lg opacity-80 leading-relaxed">
				<p>
					Maverick X needed a corporate website to communicate their breakthrough industrial chemistry solutions across three distinct sectors: oil & gas recovery, mining & metals extraction, and water treatment.
				</p>

				<p><strong>Requirements:</strong></p>

				<ul class="space-y-3 body opacity-70 pl-6">
					<li class="flex items-start gap-3">
						<span class="opacity-40 mt-1">—</span>
						<span>Clear product differentiation (PetroX, LithX, DME)</span>
					</li>
					<li class="flex items-start gap-3">
						<span class="opacity-40 mt-1">—</span>
						<span>Sector-specific landing pages with technical depth</span>
					</li>
					<li class="flex items-start gap-3">
						<span class="opacity-40 mt-1">—</span>
						<span>Professional aesthetic for B2B industrial audience</span>
					</li>
					<li class="flex items-start gap-3">
						<span class="opacity-40 mt-1">—</span>
						<span>Performance-optimized for fast load times</span>
					</li>
				</ul>
			</div>
		</div>
	</section>

	<!-- The Pattern -->
	<section class="py-16 px-6 section-border">
		<div class="max-w-3xl mx-auto">
			<h2 class="mb-8">Applying "Less, But Better"</h2>

			<div class="space-y-6 body-lg opacity-80 leading-relaxed">
				<p>
					This project applied <a
						href="https://createsomething.ltd/principles"
						class="underline hover:opacity-70">Dieter Rams' tenth principle</a
					>: as little design as possible. Industrial chemistry is complex—the website's job is to clarify, not complicate.
				</p>

				<div class="my-8 p-8 card-surface">
					<p class="body-sm font-mono opacity-60 mb-4">Design Decisions:</p>
					<ul class="space-y-2 body-sm opacity-70 font-mono">
						<li>→ Three products, three colors, three sections</li>
						<li>→ No unnecessary animations or decorations</li>
						<li>→ Technical content presented clearly</li>
						<li>→ Fast paths to contact for each sector</li>
					</ul>
				</div>

				<p><strong>Principles applied:</strong></p>

				<ul class="space-y-3 body opacity-70 pl-6">
					<li class="flex items-start gap-3">
						<span class="opacity-40 mt-1">✓</span>
						<span><strong>Understandable:</strong> Complex chemistry made accessible</span>
					</li>
					<li class="flex items-start gap-3">
						<span class="opacity-40 mt-1">✓</span>
						<span><strong>As little as possible:</strong> Remove until it breaks</span>
					</li>
					<li class="flex items-start gap-3">
						<span class="opacity-40 mt-1">✓</span>
						<span><strong>Honest:</strong> No inflated claims, real technical specs</span>
					</li>
				</ul>
			</div>
		</div>
	</section>

	<!-- Technical Implementation -->
	<section class="py-16 px-6 section-border">
		<div class="max-w-5xl mx-auto">
			<h2 class="mb-12">Technical Implementation</h2>

			<div class="grid grid-cols-1 md:grid-cols-2 gap-8">
				<!-- Stack -->
				<div class="card-surface p-8">
					<h3 class="heading-3 font-semibold mb-4">Technology Stack</h3>
					<ul class="space-y-3 body-sm opacity-70">
						<li>• Next.js 14 (App Router)</li>
						<li>• Tailwind CSS</li>
						<li>• TypeScript</li>
						<li>• Framer Motion (animations)</li>
					</ul>
				</div>

				<!-- Deployment -->
				<div class="card-surface p-8">
					<h3 class="heading-3 font-semibold mb-4">Deployment</h3>
					<ul class="space-y-3 body-sm opacity-70">
						<li>• Vercel (automatic deploys)</li>
						<li>• Edge network distribution</li>
						<li>• Image optimization</li>
						<li>• SEO-optimized meta tags</li>
					</ul>
				</div>
			</div>
		</div>
	</section>

	<!-- Results -->
	<section class="py-16 px-6 section-border">
		<div class="max-w-3xl mx-auto">
			<h2 class="mb-8">Results</h2>

			<div class="space-y-6 body-lg opacity-80 leading-relaxed">
				<p>
					<strong>Deployed to production</strong> with three sector-specific landing pages and clear product positioning.
				</p>

				<div class="grid grid-cols-1 md:grid-cols-3 gap-6 my-8">
					<div class="text-center p-6 metric-card">
						<p class="heading-2 font-bold mb-2">3</p>
						<p class="body-sm metric-label">Product lines</p>
					</div>
					<div class="text-center p-6 metric-card">
						<p class="heading-2 font-bold mb-2">3</p>
						<p class="body-sm metric-label">Sector pages</p>
					</div>
					<div class="text-center p-6 metric-card">
						<p class="heading-2 font-bold mb-2">&lt;1s</p>
						<p class="body-sm metric-label">Load times</p>
						<p class="body-xs metric-sublabel mt-1">Sub-second TTFB</p>
					</div>
				</div>

				<p>
					<a href="https://maverickx.createsomething.io" target="_blank" rel="noopener noreferrer" class="underline hover:opacity-70">
						View live site →
					</a>
				</p>
			</div>
		</div>
	</section>

	<!-- CTA -->
	<section class="py-16 px-6 section-border">
		<div class="max-w-3xl mx-auto text-center">
			<h2 class="mb-6">Need a Corporate Website?</h2>
			<p class="body-lg opacity-70 mb-8 leading-relaxed">
				We build focused, fast websites that communicate complex products clearly.
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
