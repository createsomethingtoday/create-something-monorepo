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
	<title>CREATE SOMETHING Agency | Agentic Systems Engineering</title>
	<meta
		name="description"
		content="We build AI systems that run your business autonomously. From web development to automation workflows to long-running AI agents. Research-backed agentic engineering."
	/>
</svelte:head>

<!-- Hero Section -->
	<section class="relative pt-32 pb-24 px-6 overflow-hidden">
		<div class="max-w-7xl mx-auto">
			<div class="text-center max-w-4xl mx-auto">
				<h1 class="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
					AI systems that run<br />your business autonomously
				</h1>
				<p class="text-xl md:text-2xl text-white/70 mb-8 max-w-3xl mx-auto">
					Start with web development. Scale to automation workflows. Evolve into intelligent agents.
					<br />Research from
					<a href="https://createsomething.io" class="text-white hover:text-white/80 underline"
						>createsomething.io</a
					>, applied to your operations.
				</p>
				<div class="flex flex-col sm:flex-row gap-4 justify-center">
					<a
						href="/work"
						class="group px-8 py-4 bg-white text-black text-lg font-semibold rounded-full hover:bg-white/90 transition-all inline-flex items-center justify-center gap-2"
					>
						View Our Work
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
					<a
						href="/contact"
						class="px-8 py-4 bg-white/5 border border-white/20 text-white text-lg font-semibold rounded-full hover:bg-white/10 transition-all"
					>
						Start a Conversation
					</a>
				</div>
			</div>
		</div>
	</section>

	<!-- Value Props -->
	<section class="py-24 px-6 border-t border-white/10">
		<div class="max-w-7xl mx-auto">
			<div class="grid grid-cols-1 md:grid-cols-3 gap-8">
				<div class="p-8 bg-white/[0.07] border border-white/10 rounded-lg">
					<div class="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-6">
						<svg
							class="w-6 h-6 text-white"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							stroke-width="2"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M13 10V3L4 14h7v7l9-11h-7z"
							/>
						</svg>
					</div>
					<h3 class="text-2xl font-semibold text-white mb-4">Research-Backed</h3>
					<p class="text-white/60 leading-relaxed">
						Every methodology we apply is validated through tracked experiments. No guesswork—just
						proven approaches with real metrics.
					</p>
				</div>

				<div class="p-8 bg-white/[0.07] border border-white/10 rounded-lg">
					<div class="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-6">
						<svg
							class="w-6 h-6 text-white"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							stroke-width="2"
						>
							<circle cx="12" cy="12" r="10" />
							<path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6l4 2" />
						</svg>
					</div>
					<h3 class="text-2xl font-semibold text-white mb-4">Results-Oriented</h3>
					<p class="text-white/60 leading-relaxed">
						We track time, costs, and errors on every project. Transparent metrics mean you know
						exactly what you're getting.
					</p>
				</div>

				<div class="p-8 bg-white/[0.07] border border-white/10 rounded-lg">
					<div class="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-6">
						<svg
							class="w-6 h-6 text-white"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							stroke-width="2"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
					</div>
					<h3 class="text-2xl font-semibold text-white mb-4">Production-Ready</h3>
					<p class="text-white/60 leading-relaxed">
						Built on Cloudflare's edge infrastructure with Claude Code. Modern stack, proven
						reliability, scalable from day one.
					</p>
				</div>
			</div>
		</div>
	</section>

	<!-- Services Overview -->
	<section class="py-24 px-6 border-t border-white/10">
		<div class="max-w-7xl mx-auto">
			<div class="text-center mb-16">
				<h2 class="text-4xl md:text-5xl font-bold text-white mb-6">How We Work</h2>
				<p class="text-xl text-white/60 max-w-3xl mx-auto">
					Three ways to bring AI-native development to your organization
				</p>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-3 gap-8">
				{#each [ { title: 'Consulting', description: 'Strategic guidance for teams exploring AI-native development', features: ['Assessment & roadmap', 'Methodology training', 'Architecture review', 'Team enablement'], cta: 'Learn More', href: '/services#consulting' }, { title: 'Implementation', description: 'Full-stack development of AI-native systems', features: ['Production-ready builds', 'Claude Code + Cloudflare', 'Complete documentation', '30-day support'], cta: 'Learn More', href: '/services#implementation' }, { title: 'Training', description: 'Hands-on workshops for adopting AI-native workflows', features: ['Claude Code fundamentals', 'Tracked experiments', 'Best practices', 'Certification program'], cta: 'Learn More', href: '/services#training' } ] as service}
					<div
						class="p-8 bg-white/[0.07] border border-white/10 rounded-lg hover:border-white/30 transition-all"
					>
						<h3 class="text-2xl font-semibold text-white mb-3">{service.title}</h3>
						<p class="text-white/60 mb-6">{service.description}</p>
						<ul class="space-y-3 mb-8">
							{#each service.features as feature}
								<li class="flex items-start gap-3">
									<svg
										class="w-5 h-5 text-white/60 mt-0.5 flex-shrink-0"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
										stroke-width="2"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
										/>
									</svg>
									<span class="text-white/70">{feature}</span>
								</li>
							{/each}
						</ul>
						<a
							href={service.href}
							class="text-white hover:text-white/80 font-medium inline-flex items-center gap-2 group"
						>
							{service.cta}
							<svg
								class="w-4 h-4 transition-transform group-hover:translate-x-1"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								stroke-width="2"
							>
								<path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
							</svg>
						</a>
					</div>
				{/each}
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
