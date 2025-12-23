<script lang="ts">
	/**
	 * Universal Utility
	 *
	 * The Eameses' "the best for the most for the least."
	 * Tools should serve everyone without compromise.
	 */
</script>

<svelte:head>
	<title>Universal Utility — CREATE SOMETHING.ltd</title>
	<meta
		name="description"
		content="The best for the most for the least. Charles and Ray Eames' democratic design philosophy applied to software. Accessibility by default. Progressive enhancement."
	/>
</svelte:head>

<!-- Header -->
<section class="pt-24 pb-16 px-6 border-b border-canon">
	<div class="max-w-3xl mx-auto">
		<a href="/patterns" class="text-sm-canon opacity-40-canon hover:opacity-70-canon transition-opacity mb-8 inline-block">
			← All Patterns
		</a>
		<p class="text-sm-canon tracking-widest uppercase opacity-60-canon mb-4">Pattern</p>
		<h1 class="mb-6">Universal Utility</h1>
		<p class="text-xl-canon opacity-70-canon leading-relaxed">
			"The best for the most for the least." Charles and Ray Eames' democratic
			design philosophy. Tools that serve everyone without compromise.
		</p>
	</div>
</section>

<!-- Quote -->
<section class="py-12 px-6">
	<div class="max-w-3xl mx-auto">
		<div class="p-6 border border-canon">
			<p class="text-lg-canon opacity-70-canon italic">
				"The role of the designer is that of a very good, thoughtful host
				anticipating the needs of his guests."
			</p>
			<p class="text-sm-canon opacity-40-canon mt-2">— Charles Eames</p>
		</div>
	</div>
</section>

<!-- Definition -->
<section class="py-16 px-6">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">Definition</h2>

		<div class="space-y-6 text-base-canon opacity-70-canon leading-relaxed">
			<p>
				<strong>Universal Utility</strong> is the Eames commitment to democratic design:
				create the best possible solution, make it available to the most people, at the
				lowest possible cost. No compromises on quality. No exclusive pricing.
			</p>

			<p>
				The Eames molded plywood chair wasn't a luxury item—it was designed for mass
				production. The quality matched or exceeded handcrafted furniture, but the
				manufacturing process made it accessible to ordinary households.
			</p>

			<p>
				In software, this means accessibility by default, not as an afterthought.
				Progressive enhancement so the tool works everywhere. Zero-config options
				so beginners aren't excluded. The best experience for the broadest audience.
			</p>

			<div class="p-6 border border-canon my-8">
				<p class="text-sm-canon opacity-60-canon italic">
					"Universal doesn't mean average. It means excellent for everyone."
				</p>
			</div>
		</div>
	</div>
</section>

<!-- Principles -->
<section class="py-16 px-6 border-t border-canon">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">Principles</h2>

		<div class="space-y-8">
			<div class="border border-canon p-6">
				<h3 class="text-lg-canon font-semibold mb-3">Accessibility by Default</h3>
				<p class="text-sm-canon opacity-60-canon mb-4">
					Accessibility isn't a feature—it's a baseline. Screen readers, keyboard
					navigation, color contrast: these aren't enhancements, they're requirements.
				</p>
				<div class="text-xs-canon opacity-40-canon font-mono">
					<p class="mb-1">✓ Semantic HTML before ARIA</p>
					<p class="mb-1">✓ WCAG AA minimum, AAA preferred</p>
					<p>✓ Test with actual assistive technologies</p>
				</div>
			</div>

			<div class="border border-canon p-6">
				<h3 class="text-lg-canon font-semibold mb-3">Progressive Enhancement</h3>
				<p class="text-sm-canon opacity-60-canon mb-4">
					Start with core functionality that works everywhere. Layer enhancements
					for capable environments. Never require the latest technology.
				</p>
				<div class="text-xs-canon opacity-40-canon font-mono">
					<p class="mb-1">✓ Works without JavaScript where possible</p>
					<p class="mb-1">✓ Graceful degradation for older browsers</p>
					<p>✓ Core paths work on slow connections</p>
				</div>
			</div>

			<div class="border border-canon p-6">
				<h3 class="text-lg-canon font-semibold mb-3">Zero-Config Options</h3>
				<p class="text-sm-canon opacity-60-canon mb-4">
					Beginners shouldn't need to configure. The default experience should be
					excellent. Power users can customize, but the out-of-box experience works.
				</p>
				<div class="text-xs-canon opacity-40-canon font-mono">
					<p class="mb-1">✓ Sensible defaults for all options</p>
					<p class="mb-1">✓ Configuration optional, not required</p>
					<p>✓ Progressive disclosure of advanced features</p>
				</div>
			</div>

			<div class="border border-canon p-6">
				<h3 class="text-lg-canon font-semibold mb-3">No Exclusive Pricing</h3>
				<p class="text-sm-canon opacity-60-canon mb-4">
					The best features shouldn't be paywalled. Core functionality should be
					affordable or free. Premium tiers add convenience, not capability.
				</p>
				<div class="text-xs-canon opacity-40-canon font-mono">
					<p class="mb-1">✓ Free tier that actually works</p>
					<p class="mb-1">✓ Open source when possible</p>
					<p>✓ Premium = more, not premium = usable</p>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- When to Use -->
<section class="py-16 px-6 border-t border-canon">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">When to Apply</h2>

		<div class="grid md:grid-cols-2 gap-8">
			<div class="p-6 bg-success-subtle border border-success">
				<h3 class="text-lg-canon font-semibold text-success mb-4">Apply When</h3>
				<ul class="space-y-2 text-sm-canon opacity-70-canon">
					<li>• Building public-facing tools</li>
					<li>• Audience includes diverse abilities</li>
					<li>• Global reach is a goal</li>
					<li>• Democratizing access to capability</li>
					<li>• Long-term sustainability matters</li>
				</ul>
			</div>

			<div class="p-6 bg-warning-subtle border border-warning">
				<h3 class="text-lg-canon font-semibold text-warning mb-4">Balance With</h3>
				<ul class="space-y-2 text-sm-canon opacity-70-canon">
					<li>• Expert-focused tools (universal ≠ dumbed down)</li>
					<li>• Sustainable business models</li>
					<li>• Performance for power users</li>
					<li>• Specialized needs that require depth</li>
				</ul>
			</div>
		</div>
	</div>
</section>

<!-- Eames Example -->
<section class="py-16 px-6 border-t border-canon">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">The Eames Example</h2>

		<div class="border border-canon p-8">
			<h3 class="text-xl-canon font-semibold mb-4">The Molded Plywood Chair (1946)</h3>

			<div class="grid md:grid-cols-3 gap-6 mb-6">
				<div class="text-center p-4 bg-surface-subtle">
					<div class="text-2xl-canon font-bold mb-1">Best</div>
					<div class="text-xs-canon opacity-50-canon">Museum-quality design</div>
				</div>
				<div class="text-center p-4 bg-surface-subtle">
					<div class="text-2xl-canon font-bold mb-1">Most</div>
					<div class="text-xs-canon opacity-50-canon">Mass production enabled</div>
				</div>
				<div class="text-center p-4 bg-surface-subtle">
					<div class="text-2xl-canon font-bold mb-1">Least</div>
					<div class="text-xs-canon opacity-50-canon">Affordable price point</div>
				</div>
			</div>

			<p class="text-sm-canon opacity-60-canon">
				The chair is in MoMA's permanent collection—yet it was designed for
				Herman Miller's mass production. The Eameses refused to compromise on
				quality to achieve accessibility. They innovated in manufacturing instead.
			</p>
		</div>
	</div>
</section>

<!-- Related Patterns -->
<section class="py-16 px-6 border-t border-canon">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">Related Patterns</h2>

		<div class="grid md:grid-cols-2 gap-6">
			<a href="/patterns/constraint-as-liberation" class="block border border-canon p-6 hover:border-hover transition-colors">
				<h3 class="text-lg-canon font-semibold mb-2">Constraint as Liberation</h3>
				<p class="text-sm-canon opacity-60-canon">
					Manufacturing constraints drove Eames innovation. Limitation enabled universality.
				</p>
			</a>

			<a href="/patterns/timeless-materials" class="block border border-canon p-6 hover:border-hover transition-colors">
				<h3 class="text-lg-canon font-semibold mb-2">Timeless Materials</h3>
				<p class="text-sm-canon opacity-60-canon">
					Universal tools age well. Build on standards that everyone can access.
				</p>
			</a>
		</div>
	</div>
</section>

<!-- Footer -->
<section class="py-16 px-6 border-t border-canon">
	<div class="max-w-3xl mx-auto text-center">
		<p class="text-sm-canon opacity-40-canon">
			Part of the <a href="/patterns" class="underline hover:opacity-70-canon">CREATE SOMETHING Pattern Library</a>
		</p>
	</div>
</section>

<style>
	/* Typography */
	.text-xs-canon {
		font-size: var(--text-caption);
	}

	.text-sm-canon {
		font-size: var(--text-body-sm);
	}

	.text-base-canon {
		font-size: var(--text-body);
	}

	.text-lg-canon {
		font-size: var(--text-body-lg);
	}

	.text-xl-canon {
		font-size: var(--text-h3);
	}

	.text-2xl-canon {
		font-size: var(--text-h2);
	}

	/* Opacity as color tokens */
	.opacity-40-canon {
		color: var(--color-fg-muted);
	}

	.opacity-50-canon {
		color: var(--color-fg-muted);
	}

	.opacity-60-canon {
		color: var(--color-fg-tertiary);
	}

	.opacity-70-canon {
		color: var(--color-fg-secondary);
	}

	/* Borders */
	.border-canon {
		border-color: var(--color-border-default);
	}


	/* Backgrounds */

	/* Semantic colors */
	.text-success {
		color: #4ade80;
	}

	.text-warning {
		color: #fbbf24;
	}

	.bg-success-subtle {
		background: var(--color-success-muted);
	}

	.bg-warning-subtle {
		background: var(--color-warning-muted);
	}

	.border-success {
		border-color: var(--color-success-border);
	}

	.border-warning {
		border-color: var(--color-warning-border);
	}

	/* Universal element styles */
	section {
		border-color: var(--color-border-default);
	}
</style>
