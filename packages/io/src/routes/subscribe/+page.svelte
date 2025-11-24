<script lang="ts">
	import { SEO } from '@create-something/components';
	import {
		Bot,
		Component,
		Video,
		BookOpen,
		Zap,
		MessageCircle,
		Check,
		Circle,
		ArrowRight
	} from 'lucide-svelte';

	let email = '';
	let submitted = false;
	let error = '';

	async function handleSubmit(e: Event) {
		e.preventDefault();
		error = '';

		try {
			const response = await fetch('/api/newsletter', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email })
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Failed to subscribe');
			}

			submitted = true;
			email = '';
		} catch (err) {
			error = err instanceof Error ? err.message : 'Something went wrong';
		}
	}
</script>

<SEO
	title="Subscribe | CREATE SOMETHING.io"
	description="Get early access to autonomous agents, agentic component libraries, and recorded workshops. Launch January 2025."
	keywords="subscription, autonomous agents, agentic systems, component library, workshops"
	ogImage="/og-image.svg"
	propertyName="io"
/>

<div class="min-h-screen bg-black text-white">
	<div class="max-w-4xl mx-auto px-6 py-16">
		<!-- Header -->
		<div class="mb-12">
			<div
				class="inline-block px-4 py-1.5 mb-6 text-sm font-mono bg-white/10 border border-white/20 rounded"
			>
				LAUNCHING JANUARY 2025
			</div>
			<h1 class="text-5xl font-bold mb-6">Build Autonomous Software</h1>
			<p class="text-xl text-white/70 max-w-2xl">
				Get access to production-ready agents, agentic component libraries, and recorded workshops.
				Everything you need to build software that encodes expertise.
			</p>
		</div>

		<!-- What's Included -->
		<div class="mb-16">
			<h2 class="text-2xl font-bold mb-8">What's Included</h2>

			<div class="grid md:grid-cols-2 gap-6">
				<!-- Autonomous Agents -->
				<div class="p-6 bg-white/5 border border-white/10 rounded-lg">
					<Bot class="w-8 h-8 mb-3 text-white/80" />
					<h3 class="text-lg font-bold mb-2">Autonomous Agents</h3>
					<p class="text-white/60 text-sm mb-4">
						Production-ready agents built from real client projects
					</p>
					<ul class="space-y-2 text-sm text-white/70">
						<li class="flex items-start gap-2">
							<Check class="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
							<span>Gmail to Notion sync agent</span>
						</li>
						<li class="flex items-start gap-2">
							<Check class="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
							<span>Notion deduplication agent</span>
						</li>
						<li class="flex items-start gap-2">
							<Check class="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
							<span>Claude Code skills & patterns</span>
						</li>
						<li class="flex items-start gap-2">
							<Circle class="w-4 h-4 text-white/30 mt-0.5 flex-shrink-0" />
							<span>More agents added as projects complete</span>
						</li>
					</ul>
				</div>

				<!-- Component Libraries -->
				<div class="p-6 bg-white/5 border border-white/10 rounded-lg">
					<Component class="w-8 h-8 mb-3 text-white/80" />
					<h3 class="text-lg font-bold mb-2">Agentic Components</h3>
					<p class="text-white/60 text-sm mb-4">
						UI components that embody expert knowledge
					</p>
					<ul class="space-y-2 text-sm text-white/70">
						<li class="flex items-start gap-2">
							<Check class="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
							<span>@create-something/tufte (visualization)</span>
						</li>
						<li class="flex items-start gap-2">
							<Check class="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
							<span>@create-something/components (UI primitives)</span>
						</li>
						<li class="flex items-start gap-2">
							<Circle class="w-4 h-4 text-white/30 mt-0.5 flex-shrink-0" />
							<span>@create-something/agents (coming soon)</span>
						</li>
						<li class="flex items-start gap-2">
							<Circle class="w-4 h-4 text-white/30 mt-0.5 flex-shrink-0" />
							<span>@create-something/claude-patterns (coming soon)</span>
						</li>
					</ul>
				</div>

				<!-- Video Walkthroughs -->
				<div class="p-6 bg-white/5 border border-white/10 rounded-lg">
					<Video class="w-8 h-8 mb-3 text-white/80" />
					<h3 class="text-lg font-bold mb-2">Video Walkthroughs</h3>
					<p class="text-white/60 text-sm mb-4">
						Recorded tutorials showing how to use and extend each agent
					</p>
					<ul class="space-y-2 text-sm text-white/70">
						<li class="flex items-start gap-2">
							<Circle class="w-4 h-4 text-white/30 mt-0.5 flex-shrink-0" />
							<span>Installation & configuration (15-20 min each)</span>
						</li>
						<li class="flex items-start gap-2">
							<Circle class="w-4 h-4 text-white/30 mt-0.5 flex-shrink-0" />
							<span>Extension & customization (20-30 min each)</span>
						</li>
						<li class="flex items-start gap-2">
							<Circle class="w-4 h-4 text-white/30 mt-0.5 flex-shrink-0" />
							<span>Real-world deployment examples</span>
						</li>
					</ul>
				</div>

				<!-- Recorded Workshops -->
				<div class="p-6 bg-white/5 border border-white/10 rounded-lg">
					<BookOpen class="w-8 h-8 mb-3 text-white/80" />
					<h3 class="text-lg font-bold mb-2">Recorded Workshops</h3>
					<p class="text-white/60 text-sm mb-4">
						Deep-dive workshops on building agentic systems (60-90 min)
					</p>
					<ul class="space-y-2 text-sm text-white/70">
						<li class="flex items-start gap-2">
							<Circle class="w-4 h-4 text-white/30 mt-0.5 flex-shrink-0" />
							<span>Building agentic integrations</span>
						</li>
						<li class="flex items-start gap-2">
							<Circle class="w-4 h-4 text-white/30 mt-0.5 flex-shrink-0" />
							<span>Cloudflare Workers AI patterns</span>
						</li>
						<li class="flex items-start gap-2">
							<Circle class="w-4 h-4 text-white/30 mt-0.5 flex-shrink-0" />
							<span>Claude Code skills development</span>
						</li>
					</ul>
				</div>

				<!-- Templates & Starter Projects -->
				<div class="p-6 bg-white/5 border border-white/10 rounded-lg">
					<Zap class="w-8 h-8 mb-3 text-white/80" />
					<h3 class="text-lg font-bold mb-2">Templates & Starters</h3>
					<p class="text-white/60 text-sm mb-4">
						Ready-to-deploy infrastructure and configuration templates
					</p>
					<ul class="space-y-2 text-sm text-white/70">
						<li class="flex items-start gap-2">
							<Circle class="w-4 h-4 text-white/30 mt-0.5 flex-shrink-0" />
							<span>Cloudflare Workers deployment templates</span>
						</li>
						<li class="flex items-start gap-2">
							<Circle class="w-4 h-4 text-white/30 mt-0.5 flex-shrink-0" />
							<span>SvelteKit + Cloudflare starter</span>
						</li>
						<li class="flex items-start gap-2">
							<Circle class="w-4 h-4 text-white/30 mt-0.5 flex-shrink-0" />
							<span>Agent architecture patterns</span>
						</li>
					</ul>
				</div>

				<!-- Support & Community -->
				<div class="p-6 bg-white/5 border border-white/10 rounded-lg">
					<MessageCircle class="w-8 h-8 mb-3 text-white/80" />
					<h3 class="text-lg font-bold mb-2">Async Support</h3>
					<p class="text-white/60 text-sm mb-4">
						Email support and asynchronous community resources
					</p>
					<ul class="space-y-2 text-sm text-white/70">
						<li class="flex items-start gap-2">
							<Circle class="w-4 h-4 text-white/30 mt-0.5 flex-shrink-0" />
							<span>Priority email support (24-48hr response)</span>
						</li>
						<li class="flex items-start gap-2">
							<Circle class="w-4 h-4 text-white/30 mt-0.5 flex-shrink-0" />
							<span>GitHub Discussions access</span>
						</li>
						<li class="flex items-start gap-2">
							<Circle class="w-4 h-4 text-white/30 mt-0.5 flex-shrink-0" />
							<span>Quarterly recorded Q&A sessions</span>
						</li>
					</ul>
				</div>
			</div>
		</div>

		<!-- The Philosophy -->
		<div class="mb-16 p-8 bg-white/5 border border-white/10 rounded-lg">
			<h2 class="text-2xl font-bold mb-4">Why This Model?</h2>
			<div class="space-y-4 text-white/70">
				<p>
					CREATE SOMETHING practices what it preaches. If agentic systems are about encoding
					expertise so humans don't need to be constantly involved, then our business model should
					reflect that.
				</p>
				<p>
					<strong class="text-white">No forced schedules.</strong> New agents, videos, and workshops
					are released when projects complete—quality over arbitrary deadlines.
				</p>
				<p>
					<strong class="text-white">No mandatory community.</strong> Everything works asynchronously.
					Recorded videos, documented code, self-service resources. Engage when you want, how you want.
				</p>
				<p>
					<strong class="text-white">Real client work.</strong> Every agent in the library has been
					battle-tested in production. Not toy examples—actual systems that solve real problems.
				</p>
			</div>
		</div>

		<!-- Pricing Preview -->
		<div class="mb-16">
			<h2 class="text-2xl font-bold mb-8">Pricing (Preview)</h2>

			<div class="grid md:grid-cols-3 gap-6">
				<!-- Free Tier -->
				<div class="p-6 bg-white/5 border border-white/10 rounded-lg">
					<div class="text-sm font-mono text-white/40 mb-2">EXPLORE</div>
					<div class="text-3xl font-bold mb-4">Free</div>
					<ul class="space-y-3 text-sm text-white/70 mb-6">
						<li class="flex items-start gap-2">
							<Check class="w-4 h-4 text-white/40 flex-shrink-0" />
							<span>Component documentation</span>
						</li>
						<li class="flex items-start gap-2">
							<Check class="w-4 h-4 text-white/40 flex-shrink-0" />
							<span>Selected experiments & papers</span>
						</li>
						<li class="flex items-start gap-2">
							<Check class="w-4 h-4 text-white/40 flex-shrink-0" />
							<span>Sample agent code</span>
						</li>
					</ul>
				</div>

				<!-- Paid Tier -->
				<div class="p-6 bg-white/10 border-2 border-white/30 rounded-lg relative">
					<div
						class="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-white text-black text-xs font-bold rounded-full"
					>
						RECOMMENDED
					</div>
					<div class="text-sm font-mono text-white/60 mb-2">BUILD</div>
					<div class="text-3xl font-bold mb-1">$40</div>
					<div class="text-xs text-white/40 mb-4">/month</div>
					<ul class="space-y-3 text-sm text-white/70 mb-6">
						<li class="flex items-start gap-2">
							<Check class="w-4 h-4 text-green-400 flex-shrink-0" />
							<span>Full agent library</span>
						</li>
						<li class="flex items-start gap-2">
							<Check class="w-4 h-4 text-green-400 flex-shrink-0" />
							<span>All video walkthroughs</span>
						</li>
						<li class="flex items-start gap-2">
							<Check class="w-4 h-4 text-green-400 flex-shrink-0" />
							<span>All recorded workshops</span>
						</li>
						<li class="flex items-start gap-2">
							<Check class="w-4 h-4 text-green-400 flex-shrink-0" />
							<span>Template repositories</span>
						</li>
						<li class="flex items-start gap-2">
							<Check class="w-4 h-4 text-green-400 flex-shrink-0" />
							<span>Email support</span>
						</li>
						<li class="flex items-start gap-2">
							<Check class="w-4 h-4 text-green-400 flex-shrink-0" />
							<span>Early access to new releases</span>
						</li>
					</ul>
				</div>

				<!-- Enterprise Tier -->
				<div class="p-6 bg-white/5 border border-white/10 rounded-lg">
					<div class="text-sm font-mono text-white/40 mb-2">DEPLOY</div>
					<div class="text-3xl font-bold mb-4">Custom</div>
					<ul class="space-y-3 text-sm text-white/70 mb-6">
						<li class="flex items-start gap-2">
							<Check class="w-4 h-4 text-white/40 flex-shrink-0" />
							<span>Everything in Build</span>
						</li>
						<li class="flex items-start gap-2">
							<Check class="w-4 h-4 text-white/40 flex-shrink-0" />
							<span>Consultancy hours</span>
						</li>
						<li class="flex items-start gap-2">
							<Check class="w-4 h-4 text-white/40 flex-shrink-0" />
							<span>Custom agent development</span>
						</li>
						<li class="flex items-start gap-2">
							<Check class="w-4 h-4 text-white/40 flex-shrink-0" />
							<span>Private repository access</span>
						</li>
					</ul>
				</div>
			</div>
		</div>

		<!-- Early Access Signup -->
		<div class="max-w-xl mx-auto text-center">
			<h2 class="text-3xl font-bold mb-4">Get Early Access</h2>
			<p class="text-white/70 mb-8">
				Sign up to be notified when subscriptions launch in January 2025. Early subscribers get
				founding member pricing.
			</p>

			{#if submitted}
				<div class="p-6 bg-green-500/10 border border-green-500/30 rounded-lg">
					<div class="text-green-400 text-lg font-medium mb-2">You're on the list!</div>
					<p class="text-white/70 text-sm">
						We'll email you when subscriptions open in January.
					</p>
				</div>
			{:else}
				<form on:submit={handleSubmit} class="space-y-4">
					<div>
						<input
							type="email"
							bind:value={email}
							placeholder="your@email.com"
							required
							class="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-white/40"
						/>
					</div>

					{#if error}
						<div class="p-3 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-sm">
							{error}
						</div>
					{/if}

					<button
						type="submit"
						class="w-full px-6 py-3 bg-white text-black font-medium rounded-lg hover:bg-white/90 transition-colors"
					>
						Notify Me at Launch
					</button>
				</form>
			{/if}

			<p class="text-xs text-white/40 mt-4">
				No spam. Just one email when subscriptions open in January 2025.
			</p>
		</div>

		<!-- Footer Links -->
		<div class="mt-16 pt-8 border-t border-white/10 text-center text-sm text-white/40">
			<p>
				Questions? Email <a href="mailto:micah@createsomething.io" class="underline hover:text-white/60">micah@createsomething.io</a>
				·
				<a href="/" class="underline hover:text-white/60">Back to experiments</a>
			</p>
		</div>
	</div>
</div>
