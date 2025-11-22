<script lang="ts">
	import { fly } from 'svelte/transition';
	

	const quickLinks = [
		{ label: 'Home', href: '/' },
		{ label: 'All Experiments', href: '/experiments' },
		{ label: 'Methodology', href: '/methodology' },
		{ label: 'About', href: '/about' }
	];
</script>

<svelte:head>
	<title>About | CREATE SOMETHING</title>
	<meta name="description" content="CREATE SOMETHING is a space for systems thinking — exploring how complex systems work, evolve, and scale through real-world technology implementations." />
	<meta name="keywords" content="systems thinking, system architecture, mental models, complexity, design patterns, automation, resilient systems, Micah Johnson" />
	<!-- Open Graph -->
	<meta property="og:title" content="About CREATE SOMETHING | Systems Thinking" />
	<meta property="og:description" content="A space for exploring how complex systems work, evolve, and scale through architecture, automation, and design patterns." />
	<meta property="og:url" content="https://createsomething.io/about" />
	<!-- Twitter -->
	<meta name="twitter:title" content="About CREATE SOMETHING" />
	<meta name="twitter:description" content="Exploring systems thinking through real-world technology — architecture, automation, and mental models for complexity." />
	<link rel="canonical" href="https://createsomething.io/about" />
</svelte:head>

<!-- Hero Section -->
	<section class="relative pt-32 pb-16 px-6">
		<div class="max-w-4xl mx-auto">
			<div class="space-y-8" in:fly={{ y: 20, duration: 600 }}>
				<h1 class="text-4xl md:text-6xl font-bold text-white mb-8">
					Hi, I'm Micah Johnson
				</h1>

				<div class="space-y-8">
					<!-- Core Identity -->
					<div class="space-y-6 text-lg text-white/70 leading-relaxed">
						<p class="text-xl text-white/90 font-medium">
							I'm a System Architect, automation builder, and proponent of "less, but better" — focused on how systems work, evolve, and scale.
						</p>

						<p>
							By day, I architect systems on the <a href="https://webflow.com" class="text-white hover:underline">Webflow</a> Marketplace team, building developer experiences that serve thousands of creators. By night, I'm building the future of workflow automation with <a href="https://workway.co" class="text-white hover:underline" target="_blank" rel="noopener noreferrer">WORKWAY</a> — the first open-source marketplace for TypeScript workflows, running entirely on Cloudflare's edge infrastructure.
						</p>

						<p>
							I'm also co-founder of <a href="https://halfdozen.co" class="text-white hover:underline" target="_blank" rel="noopener noreferrer">Half Dozen</a>, where we build business operating systems for the live events industry — helping venues, promoters, and agencies orchestrate complex operations through clean system design.
						</p>
					</div>

					<!-- Philosophy -->
					<div class="p-6 bg-white/5 border border-white/10 rounded-lg space-y-4">
						<h3 class="text-xl font-semibold text-white">The experiment</h3>
						<p class="text-white/70 leading-relaxed">
							I'm building production systems agentically — working with LLMs as actual development partners, not just code generators. CREATE SOMETHING documents what I'm learning through rigorous testing: running experiments, writing papers to prove or disprove approaches, and sharing honest results. Not blog posts about AI, but real data from building real systems with AI agents. What works, what doesn't, and why.
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
					Systems thinking applied to real-world challenges — exploring architecture patterns, automation design, mental models for complexity, and the principles that make systems resilient. Each piece examines how systems work through the lens of production implementations, drawing insights that transcend specific technologies.
				</p>
			</div>
		</div>
	</section>

	<!-- Topics Section -->
	<section class="py-16 px-6 border-t border-white/10">
		<div class="max-w-4xl mx-auto">
			<div class="space-y-8">
				<h2 class="text-2xl md:text-3xl font-bold text-white">
					Systems Thinking Themes
				</h2>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					{#each [
						{
							title: 'System Architecture',
							description: 'How systems are designed, structured, and composed — patterns for building resilient, scalable architectures'
						},
						{
							title: 'Automation & Workflow',
							description: 'Mental models for automation design, orchestration patterns, and building self-healing systems'
						},
						{
							title: 'Complexity & Scale',
							description: 'Understanding emergent behavior, managing complexity, and designing systems that evolve gracefully'
						},
						{
							title: 'Mental Models',
							description: 'Frameworks for thinking about systems — from feedback loops to constraint theory to design patterns'
						}
					] as topic, index}
						<div
							class="p-6 bg-[#111111] border border-white/10 rounded-lg"
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

<!-- Footer -->
