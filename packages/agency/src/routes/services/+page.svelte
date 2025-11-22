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
			id: 'web-development',
			title: 'Web Development',
			tagline: 'Fast, research-backed web presence — your entry point to AI automation',
			description:
				'Modern websites built with CREATE SOMETHING component templates. Fast delivery (25-30% time savings), production-ready code, and built-in discovery of automation opportunities in your business.',
			features: [
				'CREATE SOMETHING component library (battle-tested patterns)',
				'Type-safe TypeScript throughout',
				'Cloudflare Pages deployment (global edge)',
				'Data-driven architecture (API-ready)',
				'Automation opportunity assessment included',
				'Contact forms, newsletters, content management'
			],
			deliverables: [
				'Production-deployed website',
				'Complete source code and documentation',
				'Automation opportunities report',
				'Recommendations for Tier 2 systems',
				'30-day support and updates'
			],
			pricing: 'Starting at $5,000',
			timeline: '2-4 weeks',
			icon: 'globe',
			note: 'Most clients upgrade to AI Automation Systems after identifying workflow inefficiencies during the build.'
		},
		{
			id: 'automation',
			title: 'AI Automation Systems',
			tagline: 'Background systems that run your business while you sleep',
			description:
				'Production-grade automation workflows using Claude Code + Cloudflare Workers. OAuth integrations, API orchestration, background processing. Every project tracked with real metrics (time saved, cost, errors).',
			features: [
				'Multi-user OAuth integrations (Gmail, Slack, Notion, etc.)',
				'API sync workflows (X→Y automated pipelines)',
				'Background job processing (Cloudflare Workers/KV/D1)',
				'Tracked experiments with precise metrics',
				'HTML parsing, data transformation, enrichment',
				'Production monitoring and error handling'
			],
			deliverables: [
				'Production-ready automation system',
				'Multi-user authentication (OAuth 2.0)',
				'Complete API integration',
				'Tracked metrics report (time/cost/errors)',
				'Published research paper on createsomething.io',
				'60-day support and optimization'
			],
			pricing: 'Starting at $15,000',
			timeline: '4-8 weeks',
			icon: 'automation',
			examples: [
				'Gmail→Notion sync with multi-user OAuth',
				'Zoom→Transcript→Summary automation',
				'Contact form→CRM→Enrichment pipeline',
				'Newsletter→Analytics→Segment routing'
			]
		},
		{
			id: 'agentic-systems',
			title: 'Agentic Systems Engineering',
			tagline: 'Long-running AI agents that make autonomous decisions',
			description:
				'Sophisticated AI systems that run continuously, make decisions, and orchestrate complex workflows. Built with Cloudflare Workflows for durable execution. These aren\'t chatbots — they\'re autonomous business systems.',
			features: [
				'Long-running workflows (hours to days)',
				'Multi-step decision trees with branching logic',
				'Cloudflare Workflows for durable execution',
				'Claude Code integration for intelligent decisions',
				'State management and workflow orchestration',
				'Production monitoring, optimization, cost control'
			],
			deliverables: [
				'Production agentic system',
				'Workflow orchestration (Cloudflare Workflows)',
				'Monitoring dashboard and metrics',
				'Cost optimization report',
				'Research paper published on createsomething.io',
				'90-day support + quarterly optimization'
			],
			pricing: 'Starting at $35,000',
			timeline: '8-16 weeks',
			icon: 'robot',
			examples: [
				'A&R Discovery Agent (music industry automation)',
				'Autonomous customer support routing',
				'Research synthesis and insight generation',
				'Content pipeline with quality control'
			]
		},
		{
			id: 'partnership',
			title: 'Ongoing Systems Partnership',
			tagline: 'Continuous optimization and expansion of your AI infrastructure',
			description:
				'Monthly retainer for clients running production AI systems. We maintain, optimize, and expand your automation infrastructure. Bug fixes become sustainability experiments. Performance improvements are tracked and published.',
			features: [
				'System maintenance and monitoring',
				'Performance optimization (speed + cost)',
				'New automation development (2-4 features/month)',
				'Quarterly tracked experiments',
				'Priority support (4-hour response)',
				'Research collaboration (your systems → .io papers)'
			],
			deliverables: [
				'Monthly optimization report',
				'Quarterly experiment results',
				'New feature deployments',
				'Cost reduction initiatives',
				'Published research from your systems',
				'Strategic planning sessions'
			],
			pricing: 'Starting at $5,000/month',
			timeline: 'Ongoing',
			icon: 'partnership',
			note: 'Your production systems become research material. We publish anonymized case studies on createsomething.io, establishing you as a thought leader in AI-native operations.'
		},
		{
			id: 'transformation',
			title: 'AI-Native Transformation',
			tagline: 'Onboard your team to build autonomous systems themselves',
			description:
				'Comprehensive consulting program that transforms your team into AI-native engineers. We assess current capabilities, design a transformation roadmap, and guide hands-on implementation. Your team learns to build the automation systems and intelligent agents — we teach the methodology.',
			features: [
				'Current state assessment and workflow audit',
				'AI opportunity mapping with ROI projections',
				'Hands-on Claude Code training',
				'Guided first automation project',
				'Internal playbook development',
				'Team certification program'
			],
			deliverables: [
				'Comprehensive assessment report',
				'90-day transformation roadmap',
				'Customized training curriculum',
				'Internal AI-native playbook',
				'Certified team members',
				'First automation system built by your team'
			],
			pricing: 'Starting at $50,000',
			timeline: '12-16 weeks',
			icon: 'academy',
			note: 'Limited to 3 transformation clients per quarter. This is a premium consulting engagement focused on building internal capability, not outsourced implementation.'
		},
		{
			id: 'advisory',
			title: 'Strategic Advisory',
			tagline: 'Ongoing guidance for teams building AI-native systems',
			description:
				'Monthly retainer for executive teams scaling AI-native operations. Quarterly strategy sessions, architecture reviews, performance optimization guidance. Your team builds, we advise. Access to all research, priority support, and strategic planning for your AI infrastructure roadmap.',
			features: [
				'Quarterly strategic planning sessions',
				'Architecture review of team systems',
				'Performance optimization guidance',
				'Priority Slack/email support (4-hour response)',
				'Pre-publication access to createsomething.io research',
				'Speaking/workshop opportunities for your team'
			],
			deliverables: [
				'Quarterly strategy reports',
				'Architecture recommendations',
				'Performance optimization plans',
				'Access to research library',
				'Monthly office hours (2 hours)',
				'Annual AI maturity assessment'
			],
			pricing: 'Starting at $10,000/month',
			timeline: 'Ongoing (6-month minimum)',
			icon: 'advisor',
			note: 'For teams who have completed AI-Native Transformation or have existing AI infrastructure. Advisory only — no implementation work included.'
		}
	];
</script>

<svelte:head>
	<title>Services | CREATE SOMETHING Agency</title>
	<meta
		name="description"
		content="Agentic systems engineering: AI automation, background workflows, and autonomous systems. Web development that becomes intelligent infrastructure."
	/>
</svelte:head>

<!-- Hero Section -->
	<section class="relative pt-32 pb-16 px-6">
		<div class="max-w-7xl mx-auto">
			<div class="text-center space-y-6 max-w-4xl mx-auto">
				<h1 class="text-4xl md:text-6xl font-bold text-white">How We Work</h1>
				<p class="text-lg text-white/60 max-w-3xl mx-auto">
					Two service tracks: <span class="text-white font-semibold">Implementation</span> (we build autonomous systems for you) and <span class="text-white font-semibold">Transformation</span> (we teach your team to build them). Both backed by research from
					<a href="https://createsomething.io" class="text-white hover:text-white/80 underline">
						createsomething.io
					</a>.
				</p>

				<!-- Track selector -->
				<div class="flex flex-col sm:flex-row gap-4 justify-center pt-4">
					<a
						href="#web-development"
						class="px-6 py-3 bg-white/5 border border-white/20 text-white text-sm font-semibold rounded-full hover:bg-white/10 transition-all"
					>
						Implementation Track →
					</a>
					<a
						href="#transformation"
						class="px-6 py-3 bg-white/5 border border-white/20 text-white text-sm font-semibold rounded-full hover:bg-white/10 transition-all"
					>
						Transformation Track →
					</a>
				</div>
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
								{#if service.icon === 'globe'}
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
											d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
										/>
									</svg>
								{:else if service.icon === 'automation'}
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
											d="M13 10V3L4 14h7v7l9-11h-7z"
										/>
									</svg>
								{:else if service.icon === 'robot'}
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
											d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
										/>
									</svg>
								{:else if service.icon === 'partnership'}
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
											d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
										/>
									</svg>
								{:else if service.icon === 'academy'}
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
											d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
										/>
									</svg>
								{:else if service.icon === 'advisor'}
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

							<!-- Examples (if provided) -->
							{#if service.examples && service.examples.length > 0}
								<div class="p-8 bg-white/[0.07] border border-white/10 rounded-lg">
									<h3 class="text-xl font-semibold text-white mb-6">Example Projects</h3>
									<ul class="space-y-3">
										{#each service.examples as example}
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
														d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
													/>
												</svg>
												<span class="text-white/70">{example}</span>
											</li>
										{/each}
									</ul>
								</div>
							{/if}

							<!-- Note (if provided) -->
							{#if service.note}
								<div class="p-6 bg-white/[0.04] border border-white/5 rounded-lg">
									<p class="text-white/50 text-sm leading-relaxed italic">{service.note}</p>
								</div>
							{/if}

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
