<script lang="ts">
	import { Footer } from '@create-something/components';

	const quickLinks = [
		{ label: 'Home', href: '/' },
		{ label: 'Services', href: '/services' },
		{ label: 'Work', href: '/work' },
		{ label: 'About', href: '/about' }
	];

	const services = [
		{
			id: 'consulting',
			title: 'Consulting',
			tagline: 'Strategic guidance for teams exploring AI-native development',
			description:
				'Get expert guidance on adopting AI-native development practices. We assess your current state, identify opportunities, and create a roadmap for transformation based on proven methodologies.',
			features: [
				'Current state assessment and opportunity mapping',
				'AI-native development roadmap and strategy',
				'Architecture review and system design',
				'Team enablement and change management',
				'Tool and platform recommendations',
				'Success metrics and KPI definition'
			],
			deliverables: [
				'Comprehensive assessment report',
				'Strategic roadmap document',
				'Architecture recommendations',
				'Implementation plan with milestones'
			],
			pricing: 'Starting at $5,000',
			timeline: '2-4 weeks',
			icon: 'lightbulb'
		},
		{
			id: 'implementation',
			title: 'Implementation',
			tagline: 'Full-stack development of AI-native systems',
			description:
				'We build production-ready systems using Claude Code and Cloudflare Workers. Every project is tracked with real metrics (time, cost, errors) and delivered with complete documentation.',
			features: [
				'Production-ready system development',
				'Claude Code + Cloudflare Workers stack',
				'Tracked experiments with real metrics',
				'Complete technical documentation',
				'Testing and quality assurance',
				'30-day post-launch support'
			],
			deliverables: [
				'Production-ready codebase',
				'Deployment and infrastructure setup',
				'Complete documentation',
				'Tracked metrics and learnings',
				'Knowledge transfer sessions'
			],
			pricing: 'Starting at $15,000',
			timeline: '4-8 weeks',
			icon: 'code'
		},
		{
			id: 'training',
			title: 'Training',
			tagline: 'Hands-on workshops for adopting AI-native workflows',
			description:
				'Intensive training programs to get your team productive with AI-native development. Hands-on exercises, real code, and tracked experiments ensure practical learning.',
			features: [
				'Claude Code fundamentals and best practices',
				'Hands-on coding exercises with real projects',
				'Tracked experiment methodology',
				'Prompt engineering and AI collaboration',
				'Cloudflare Workers and edge computing',
				'Certification program for completion'
			],
			deliverables: [
				'Custom training curriculum',
				'Hands-on workshop materials',
				'Code examples and templates',
				'Best practices guide',
				'Completion certificates'
			],
			pricing: 'Starting at $8,000',
			timeline: '1-2 weeks',
			icon: 'graduation'
		}
	];
</script>

<svelte:head>
	<title>Services | CREATE SOMETHING Agency</title>
	<meta
		name="description"
		content="Consulting, implementation, and training services for AI-native development. Research-backed approaches applied to real business challenges."
	/>
</svelte:head>

<!-- Hero Section -->
	<section class="relative pt-32 pb-16 px-6">
		<div class="max-w-7xl mx-auto">
			<div class="text-center space-y-6 max-w-4xl mx-auto">
				<h1 class="text-4xl md:text-6xl font-bold text-white">How We Work</h1>
				<p class="text-lg text-white/60">
					Three ways to bring AI-native development to your organization. Research-backed
					methodologies from
					<a href="https://createsomething.io" class="text-white hover:text-white/80 underline">
						createsomething.io
					</a>, applied to your business reality.
				</p>
			</div>
		</div>
	</section>

	<!-- Services Sections -->
	<section class="py-16 px-6">
		<div class="max-w-7xl mx-auto space-y-24">
			{#each services as service, index}
				<div id={service.id} class="scroll-mt-24">
					<div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
						<!-- Left Column - Description -->
						<div>
							<div
								class="inline-flex items-center justify-center w-16 h-16 bg-white/5 rounded-full mb-6"
							>
								{#if service.icon === 'lightbulb'}
									<svg
										class="w-8 h-8 text-white"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
										stroke-width="2"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
										/>
									</svg>
								{:else if service.icon === 'code'}
									<svg
										class="w-8 h-8 text-white"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
										stroke-width="2"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
										/>
									</svg>
								{:else if service.icon === 'graduation'}
									<svg
										class="w-8 h-8 text-white"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
										stroke-width="2"
									>
										<path d="M12 14l9-5-9-5-9 5 9 5z" />
										<path
											d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"
										/>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222"
										/>
									</svg>
								{/if}
							</div>

							<h2 class="text-4xl font-bold text-white mb-4">{service.title}</h2>

							<p class="text-xl text-white/70 mb-6">{service.tagline}</p>

							<p class="text-white/60 leading-relaxed mb-8">{service.description}</p>

							<!-- Pricing & Timeline -->
							<div
								class="grid grid-cols-2 gap-4 p-6 bg-white/[0.07] border border-white/10 rounded-lg"
							>
								<div>
									<div class="text-white/40 text-sm mb-1">Starting Price</div>
									<div class="text-white font-semibold">{service.pricing}</div>
								</div>
								<div>
									<div class="text-white/40 text-sm mb-1">Timeline</div>
									<div class="text-white font-semibold">{service.timeline}</div>
								</div>
							</div>
						</div>

						<!-- Right Column - Features & Deliverables -->
						<div class="space-y-8">
							<!-- Features -->
							<div class="p-8 bg-white/[0.07] border border-white/10 rounded-lg">
								<h3 class="text-xl font-semibold text-white mb-6">What's Included</h3>
								<ul class="space-y-4">
									{#each service.features as feature}
										<li class="flex items-start gap-3">
											<svg
												class="w-5 h-5 text-white/40 mt-0.5 flex-shrink-0"
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
							</div>

							<!-- Deliverables -->
							<div class="p-8 bg-white/[0.07] border border-white/10 rounded-lg">
								<h3 class="text-xl font-semibold text-white mb-6">Deliverables</h3>
								<ul class="space-y-4">
									{#each service.deliverables as deliverable}
										<li class="flex items-start gap-3">
											<svg
												class="w-5 h-5 text-white/40 mt-0.5 flex-shrink-0"
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
											<span class="text-white/70">{deliverable}</span>
										</li>
									{/each}
								</ul>
							</div>

							<!-- CTA Button -->
							<a
								href="/contact"
								class="w-full inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-black text-lg font-semibold rounded-full hover:bg-white/90 transition-all group"
							>
								Get Started with {service.title}
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

					<!-- Divider (except for last item) -->
					{#if index < services.length - 1}
						<div class="mt-24 border-t border-white/10" />
					{/if}
				</div>
			{/each}
		</div>
	</section>

<Footer
	mode="agency"
	showNewsletter={false}
	aboutText="Professional AI-native development services backed by research from createsomething.io"
	quickLinks={quickLinks}
	showSocial={true}
/>
