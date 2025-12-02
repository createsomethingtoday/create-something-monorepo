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
	<title>Viralytics — Case Study | CREATE SOMETHING Agency</title>
	<meta
		name="description"
		content="Social media analytics platform with viral content tracking and engagement optimization."
	/>
</svelte:head>

<div class="min-h-screen bg-black text-white">
	<!-- Hero -->
	<section class="pt-32 pb-16 px-6 border-b border-white/10">
		<div class="max-w-4xl mx-auto">
			<div class="mb-6">
				<a href="/work" class="text-sm opacity-60 hover:opacity-100">← Back to Work</a>
			</div>
			<p class="text-sm tracking-widest uppercase opacity-60 mb-4">Client: Viralytics</p>
			<h1 class="mb-6">Viralytics</h1>
			<p class="text-2xl opacity-70 leading-relaxed mb-8">
				Social media analytics platform with viral content tracking and engagement optimization
			</p>
			<div class="flex flex-wrap gap-4 text-sm opacity-50">
				<span>• Real-time Analytics</span>
				<span>• Content Scoring</span>
				<span>• Trend Prediction</span>
			</div>
		</div>
	</section>

	<!-- Overview -->
	<section class="py-16 px-6">
		<div class="max-w-3xl mx-auto">
			<h2 class="mb-8">The Challenge</h2>

			<div class="space-y-6 text-lg opacity-80 leading-relaxed">
				<p>
					Viralytics needed a way to track viral content performance across social media platforms,
					identifying patterns that predict engagement and helping creators optimize their content strategy.
				</p>

				<p><strong>Technical requirements:</strong></p>

				<ul class="space-y-3 text-base opacity-70 pl-6">
					<li class="flex items-start gap-3">
						<span class="opacity-40 mt-1">—</span>
						<span>Real-time analytics dashboard</span>
					</li>
					<li class="flex items-start gap-3">
						<span class="opacity-40 mt-1">—</span>
						<span>Content performance scoring algorithms</span>
					</li>
					<li class="flex items-start gap-3">
						<span class="opacity-40 mt-1">—</span>
						<span>Trend prediction and pattern recognition</span>
					</li>
					<li class="flex items-start gap-3">
						<span class="opacity-40 mt-1">—</span>
						<span>Cross-platform data aggregation</span>
					</li>
				</ul>
			</div>
		</div>
	</section>

	<!-- Pattern Applied -->
	<section class="py-16 px-6 border-t border-white/10">
		<div class="max-w-3xl mx-auto">
			<h2 class="mb-8">Applying Tufte's Principles</h2>

			<div class="space-y-6 text-lg opacity-80 leading-relaxed">
				<p>
					This project applied Edward Tufte's data visualization principles: maximize the data-ink ratio,
					eliminate chartjunk, and let the data speak.
				</p>

				<div class="my-8 p-8 border border-white/10 rounded-xl bg-white/5">
					<p class="text-sm font-mono opacity-60 mb-4">Core Principles Applied:</p>
					<ul class="space-y-3 text-sm opacity-70">
						<li>• <strong>Data-ink ratio:</strong> Every pixel earns its existence</li>
						<li>• <strong>Small multiples:</strong> Patterns emerge through repetition</li>
						<li>• <strong>Minimize chartjunk:</strong> Remove decorative elements</li>
						<li>• <strong>Data density:</strong> Maximize information per square inch</li>
					</ul>
				</div>
			</div>
		</div>
	</section>

	<!-- Results -->
	<section class="py-16 px-6 border-t border-white/10">
		<div class="max-w-3xl mx-auto">
			<h2 class="mb-8">Results</h2>

			<div class="space-y-6 text-lg opacity-80 leading-relaxed">
				<p class="italic opacity-60">
					Case study details coming soon. Contact us to learn more about this project.
				</p>
			</div>
		</div>
	</section>

	<!-- CTA -->
	<section class="py-16 px-6 border-t border-white/10">
		<div class="max-w-3xl mx-auto text-center">
			<h2 class="mb-6">Need Analytics Visualization?</h2>
			<p class="text-lg opacity-70 mb-8 leading-relaxed">
				Tufte's principles can transform any data-heavy application into a clear, actionable dashboard.
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
