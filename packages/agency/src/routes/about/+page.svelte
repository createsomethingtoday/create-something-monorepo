<script lang="ts">
	import { fly } from 'svelte/transition';
	import { Footer } from '@create-something/components';
	import SEO from '$lib/components/SEO.svelte';

	const quickLinks = [
		{ label: 'Home', href: '/' },
		{ label: 'Services', href: '/services' },
		{ label: 'Work', href: '/work' },
		{ label: 'About', href: '/about' }
	];
</script>

<SEO
	title="About"
	description="Agentic systems engineering: building AI automation workflows and autonomous systems that run businesses. Research-backed, production-tested methodologies."
	keywords="agentic engineering, AI automation, autonomous systems, Cloudflare Workers, Claude Code, AI agents, background automation"
	ogImage="/og-image.svg"
	propertyName="agency"
/>

<!-- Hero Section -->
	<section class="relative pt-32 pb-16 px-6">
		<div class="max-w-4xl mx-auto">
			<div class="space-y-8" in:fly={{ y: 20, duration: 600 }}>
				<h1 class="text-4xl md:text-6xl font-bold text-white mb-8">
					Agentic Systems Engineering
				</h1>

				<div class="space-y-8">
					<!-- Core Identity -->
					<div class="space-y-6 text-lg text-white/70 leading-relaxed">
						<p class="text-xl text-white/90 font-medium">
							We build AI systems that run businesses autonomously — from background automation workflows to long-running intelligent agents.
						</p>

						<p>
							This isn't generic "AI consulting." We're systems engineers who build production infrastructure. Every project is backed by research from <a href="https://createsomething.io" class="text-white hover:underline">createsomething.io</a>, tracked with real metrics (time, cost, errors), and published as case studies.
						</p>

						<p>
							Web development is our entry point. During builds, we discover workflow inefficiencies in your operations. Then we propose automation systems. Eventually, we build autonomous agents that make decisions and orchestrate complex processes while you sleep.
						</p>
					</div>

					<!-- Philosophy -->
					<div class="p-6 bg-white/5 border border-white/10 rounded-lg space-y-4">
						<h3 class="text-xl font-semibold text-white">Our Approach</h3>
						<p class="text-white/70 leading-relaxed">
							Every system we build becomes a research experiment. We track precise metrics. We document what works and what doesn't. We publish honest results. Your production systems contribute to the collective knowledge of AI-native engineering — and you benefit from insights across our entire client base.
						</p>
					</div>

					<!-- Background -->
					<div class="space-y-4 text-white/60 text-base">
						<p>
							Led by Micah Johnson — Texas A&M graduate, UI/UX Design certified (Boulder Digital Arts), systems architect at Webflow. Career spanning Webflow development, API integrations, marketplace architecture, and now full-time agentic systems engineering.
						</p>
						<p>
							Based in Kennedale, Texas. Available on <a href="https://www.linkedin.com/in/micahryanjohnson/" class="text-white hover:underline" target="_blank" rel="noopener noreferrer">LinkedIn</a> for collaboration on complex automation challenges.
						</p>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Mission Section -->
	<section class="py-16 px-6 border-t border-white/10">
		<div class="max-w-4xl mx-auto">
			<div class="space-y-6" in:fly={{ y: 20, duration: 600, delay: 200 }}>
				<h2 class="text-2xl md:text-3xl font-bold text-white">
					What We Build
				</h2>

				<p class="text-lg text-white/70 leading-relaxed">
					Production-grade automation systems and autonomous AI agents. Multi-user OAuth integrations. Background processing pipelines. Long-running workflows with durable execution. These aren't experiments — they're business-critical infrastructure running on Cloudflare's global edge network.
				</p>
			</div>
		</div>
	</section>

	<!-- Topics Section -->
	<section class="py-16 px-6 border-t border-white/10">
		<div class="max-w-4xl mx-auto">
			<div class="space-y-8">
				<h2 class="text-2xl md:text-3xl font-bold text-white">
					Service Categories
				</h2>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					{#each [
						{
							title: 'Web Development',
							description: 'Fast, template-based websites that serve as your entry point to automation discovery'
						},
						{
							title: 'AI Automation Systems',
							description: 'Background workflows with OAuth, API orchestration, and intelligent data processing'
						},
						{
							title: 'Agentic Engineering',
							description: 'Long-running AI agents with autonomous decision-making and workflow orchestration'
						},
						{
							title: 'Systems Partnership',
							description: 'Ongoing optimization and expansion of your AI infrastructure with tracked experiments'
						}
					] as topic, index}
						<div
							class="p-6 bg-white/[0.07] border border-white/10 rounded-lg"
							in:fly={{ y: 20, duration: 500, delay: index * 100 }}
						>
							<h3 class="text-xl font-semibold text-white mb-2">
								{topic.title}
							</h3>
							<p class="text-white/60">
								{topic.description}
							</p>
						</div>
					{/each}
				</div>
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
