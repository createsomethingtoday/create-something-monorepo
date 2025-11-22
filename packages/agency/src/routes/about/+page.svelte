<script lang="ts">
	import { fly } from 'svelte/transition';
	import { Footer } from '@create-something/components';

	const quickLinks = [
		{ label: 'Home', href: '/' },
		{ label: 'Services', href: '/services' },
		{ label: 'Work', href: '/work' },
		{ label: 'About', href: '/about' }
	];
</script>

<svelte:head>
	<title>About | CREATE SOMETHING SPACE</title>
	<meta name="description" content="CREATE SOMETHING SPACE is a community playground for testing AI-native development ideas. Fork experiments, break things, learn in public." />
	<meta name="keywords" content="AI experiments, community playground, fork experiments, learn in public, Claude Code, experimental development" />
	<!-- Open Graph -->
	<meta property="og:title" content="About CREATE SOMETHING SPACE | The Experimental Layer" />
	<meta property="og:description" content="Community playground for AI-native development experiments. Every experiment feeds back into createsomething.io research." />
	<meta property="og:url" content="https://createsomething.space/about" />
	<!-- Twitter -->
	<meta name="twitter:title" content="About CREATE SOMETHING SPACE" />
	<meta name="twitter:description" content="The experimental layer for testing AI-native development ideas with the community." />
	<link rel="canonical" href="https://createsomething.space/about" />
</svelte:head>

<!-- Hero Section -->
	<section class="relative pt-32 pb-16 px-6">
		<div class="max-w-4xl mx-auto">
			<div class="space-y-8" in:fly={{ y: 20, duration: 600 }}>
				<h1 class="text-4xl md:text-6xl font-bold text-white mb-8">
					The Experimental Layer
				</h1>

				<div class="space-y-8">
					<!-- Core Identity -->
					<div class="space-y-6 text-lg text-white/70 leading-relaxed">
						<p class="text-xl text-white/90 font-medium">
							CREATE SOMETHING SPACE is a community playground for testing ideas around AI-native development. Fork experiments, break things, learn in public.
						</p>

						<p>
							This is the experimental layer that sits alongside <a href="https://createsomething.io" class="text-white hover:underline">createsomething.io</a> — where the rigorous research happens. While the main site documents tracked experiments with precise metrics, .space is where the community can fork those experiments, try variations, and share learnings.
						</p>

						<p>
							Every experiment here feeds back into the research. Your forks, modifications, and results help inform what works in AI-native development. It's a collaborative space for testing what happens when humans and AI build together.
						</p>
					</div>

					<!-- Philosophy -->
					<div class="p-6 bg-white/5 border border-white/10 rounded-lg space-y-4">
						<h3 class="text-xl font-semibold text-white">How it works</h3>
						<p class="text-white/70 leading-relaxed">
							Browse experiments, fork the ones that interest you, modify them however you want, and share what you learn. Break things. Try crazy ideas. Test edge cases. The goal is to collectively understand what works in AI-native development — not through theory, but through actual experimentation with real systems.
						</p>
					</div>

					<!-- Background -->
					<div class="space-y-4 text-white/60 text-base">
						<p>
							I studied at Texas A&M and earned a UI/UX Design Certification from Boulder Digital Arts. My career has taken me through Webflow development, API integrations, marketplace architecture, and now full-time system design at Webflow — always with a focus on automation and developer experience.
						</p>
						<p>
							Based in Kennedale, Texas. Available on <a href="https://www.linkedin.com/in/micahryanjohnson/" class="text-white hover:underline" target="_blank" rel="noopener noreferrer">LinkedIn</a> for collaboration and conversation about systems.
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
					What You'll Find Here
				</h2>

				<p class="text-lg text-white/70 leading-relaxed">
					Community experiments testing AI-native development patterns. Real implementations you can fork, modify, and learn from. Each experiment documents what was tried, what worked, what didn't, and why. No theory — just practical tests of building production systems with AI.
				</p>
			</div>
		</div>
	</section>

	<!-- Topics Section -->
	<section class="py-16 px-6 border-t border-white/10">
		<div class="max-w-4xl mx-auto">
			<div class="space-y-8">
				<h2 class="text-2xl md:text-3xl font-bold text-white">
					Experiment Categories
				</h2>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					{#each [
						{
							title: 'Browser Automation',
							description: 'Testing AI-generated browser automation scripts with Cloudflare Workers and Puppeteer'
						},
						{
							title: 'API Integration',
							description: 'Experiments connecting various APIs and services using AI-assisted development'
						},
						{
							title: 'Database Patterns',
							description: 'Testing different database patterns with D1, KV, and other Cloudflare services'
						},
						{
							title: 'UI Components',
							description: 'Building and testing reusable UI components with AI assistance'
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
