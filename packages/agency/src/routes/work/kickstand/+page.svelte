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
	<title>Kickstand — Case Study | CREATE SOMETHING Agency</title>
	<meta
		name="description"
		content="Venue intelligence system audit using the Subtractive Triad framework. Achieved 92% script reduction and 48% health score improvement."
	/>
</svelte:head>

<div class="min-h-screen bg-black text-white">
	<!-- Hero -->
	<section class="pt-32 pb-16 px-6 border-b border-white/10">
		<div class="max-w-4xl mx-auto">
			<div class="mb-6">
				<a href="/work" class="text-sm opacity-60 hover:opacity-100">← Back to Work</a>
			</div>
			<p class="text-sm tracking-widest uppercase opacity-60 mb-4">Client: Half Dozen</p>
			<h1 class="mb-6">Kickstand</h1>
			<p class="text-2xl opacity-70 leading-relaxed mb-8">
				Venue intelligence system with health monitoring, automated cleanup scripts, and real-time status dashboards
			</p>
			<div class="flex flex-wrap gap-4 text-sm opacity-50">
				<span>• Cloudflare Workers</span>
				<span>• D1 Database</span>
				<span>• TypeScript</span>
				<span>• Subtractive Triad</span>
			</div>
		</div>
	</section>

	<!-- Overview -->
	<section class="py-16 px-6">
		<div class="max-w-3xl mx-auto">
			<h2 class="mb-8">The Challenge</h2>

			<div class="space-y-6 text-lg opacity-80 leading-relaxed">
				<p>
					Kickstand had grown organically over time, accumulating technical debt: 155 active scripts,
					30 TypeScript errors, and documentation scattered across multiple formats. The system
					worked but was becoming difficult to maintain and extend.
				</p>

				<p><strong>Initial assessment:</strong></p>

				<ul class="space-y-3 text-base opacity-70 pl-6">
					<li class="flex items-start gap-3">
						<span class="opacity-40 mt-1">—</span>
						<span>155 active scripts (many redundant or orphaned)</span>
					</li>
					<li class="flex items-start gap-3">
						<span class="opacity-40 mt-1">—</span>
						<span>30 TypeScript errors blocking type safety</span>
					</li>
					<li class="flex items-start gap-3">
						<span class="opacity-40 mt-1">—</span>
						<span>Documentation inconsistency across README, CLAUDE.md, ARCHITECTURE.md</span>
					</li>
					<li class="flex items-start gap-3">
						<span class="opacity-40 mt-1">—</span>
						<span>Health score: 6.2/10</span>
					</li>
				</ul>
			</div>
		</div>
	</section>

	<!-- The Subtractive Triad -->
	<section class="py-16 px-6 border-t border-white/10">
		<div class="max-w-3xl mx-auto">
			<h2 class="mb-8">Applying the Subtractive Triad</h2>

			<div class="space-y-6 text-lg opacity-80 leading-relaxed">
				<p>
					This project was the first formal application of the <a
						href="https://createsomething.ltd/ethos"
						class="underline hover:opacity-70">Subtractive Triad</a
					> framework: DRY → Rams → Heidegger.
				</p>

				<div class="my-8 p-8 border border-white/10 rounded-xl bg-white/5">
					<p class="text-sm font-mono opacity-60 mb-4">The Three Levels:</p>
					<pre class="text-sm opacity-70 font-mono leading-loose overflow-x-auto">
Level 1: DRY (Implementation)
  → "Have I built this before?"
  → Action: Unify
  → Result: Consolidated 155 → 13 scripts

Level 2: Rams (Artifact)
  → "Does this earn its existence?"
  → Action: Remove
  → Result: Fixed 30 → 0 TypeScript errors

Level 3: Heidegger (System)
  → "Does this serve the whole?"
  → Action: Reconnect
  → Result: Unified documentation canon
					</pre>
				</div>

				<p><strong>Key insight:</strong></p>
				<p class="italic opacity-70">
					"Creation is the discipline of removing what obscures. Each level of the triad
					subtracts differently—duplication, excess, disconnection—but all reveal the same truth."
				</p>
			</div>
		</div>
	</section>

	<!-- Results -->
	<section class="py-16 px-6 border-t border-white/10">
		<div class="max-w-3xl mx-auto">
			<h2 class="mb-8">Results</h2>

			<div class="space-y-6 text-lg opacity-80 leading-relaxed">
				<div class="grid grid-cols-1 md:grid-cols-3 gap-6 my-8">
					<div class="text-center p-6 border border-white/10 rounded-xl">
						<p class="text-3xl font-bold mb-2">92%</p>
						<p class="text-sm opacity-60">Script reduction</p>
						<p class="text-xs opacity-40 mt-1">155 → 13</p>
					</div>
					<div class="text-center p-6 border border-white/10 rounded-xl">
						<p class="text-3xl font-bold mb-2">100%</p>
						<p class="text-sm opacity-60">Type errors fixed</p>
						<p class="text-xs opacity-40 mt-1">30 → 0</p>
					</div>
					<div class="text-center p-6 border border-white/10 rounded-xl">
						<p class="text-3xl font-bold mb-2">9.2</p>
						<p class="text-sm opacity-60">Health score</p>
						<p class="text-xs opacity-40 mt-1">Up from 6.2</p>
					</div>
				</div>

				<p><strong>Validated outcomes:</strong></p>

				<ul class="space-y-3 text-base opacity-70 pl-6">
					<li class="flex items-start gap-3">
						<span class="opacity-40 mt-1">✓</span>
						<span>Removed 142 orphaned/redundant scripts</span>
					</li>
					<li class="flex items-start gap-3">
						<span class="opacity-40 mt-1">✓</span>
						<span>TypeScript strict mode enabled with zero errors</span>
					</li>
					<li class="flex items-start gap-3">
						<span class="opacity-40 mt-1">✓</span>
						<span>Documentation unified into canonical UNDERSTANDING.md format</span>
					</li>
					<li class="flex items-start gap-3">
						<span class="opacity-40 mt-1">✓</span>
						<span>48% health score improvement (6.2 → 9.2)</span>
					</li>
				</ul>
			</div>
		</div>
	</section>

	<!-- Pattern Validation -->
	<section class="py-16 px-6 border-t border-white/10">
		<div class="max-w-3xl mx-auto">
			<h2 class="mb-8">Why This Validates the Triad</h2>

			<div class="space-y-6 text-lg opacity-80 leading-relaxed">
				<p>
					Kickstand was the first production application of the Subtractive Triad. The framework
					proved that systematic subtraction at three levels—implementation, artifact, system—yields
					compounding benefits.
				</p>

				<p>
					The triad has since been formalized into the <a
						href="https://createsomething.io/experiments/kickstand-triad-audit"
						class="underline hover:opacity-70">Kickstand Triad Audit experiment</a
					> and documented in the CREATE SOMETHING canon.
				</p>

				<p class="pt-6 text-base opacity-60 italic">
					Full experiment documentation available at <a
						href="https://createsomething.io/experiments/kickstand-triad-audit"
						class="underline hover:opacity-100">createsomething.io</a
					>.
				</p>
			</div>
		</div>
	</section>

	<!-- CTA -->
	<section class="py-16 px-6 border-t border-white/10">
		<div class="max-w-3xl mx-auto text-center">
			<h2 class="mb-6">Need a Codebase Audit?</h2>
			<p class="text-lg opacity-70 mb-8 leading-relaxed">
				The Subtractive Triad can be applied to any system: legacy codebases, overgrown projects,
				or architectural reviews.
			</p>
			<a
				href="/contact"
				class="inline-block px-8 py-4 bg-white text-black font-medium hover:opacity-90 transition-opacity"
			>
				Start a Conversation
			</a>
		</div>
	</section>

<Footer
	mode="agency"
	showNewsletter={false}
	aboutText="Professional AI-native development services backed by research from createsomething.io"
	quickLinks={quickLinks}
	showSocial={true}
/>
</div>
